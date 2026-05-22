const express = require('express');
const auth = require('../middleware/auth');
const { getAsync, allAsync, runAsync } = require('../db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const uploadsDir = path.resolve(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${req.params.id}-${req.query.type}-${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

const parseBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';

const normalizeTask = (task) => ({
  ...task,
  _id: task.id,
  completed: parseBoolean(task.completed),
  progress: Number(task.progress || 0),
  pomodoroSessions: Number(task.pomodoroSessions || 0),
  slidesFile: task.slidesFile || null,
  notesFile: task.notesFile || null
});

router.get('/', auth, async (req, res) => {
  try {
    const tasks = await allAsync('SELECT * FROM tasks WHERE userId = ? ORDER BY createdAt DESC', [req.user.id]);
    console.log('GET ALL TASKS FOR USER:', req.user.id, tasks.map(t => ({ id: t.id, title: t.title, completed: t.completed, completedBoolean: Boolean(t.completed) })));
    res.json(tasks.map(normalizeTask));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, priority, completed, dueDate, progress, pomodoroSessions } = req.body;
    if (!title) return res.status(400).json({ message: 'Task title is required' });

    const createdAt = new Date().toISOString();
    const isCompleted = parseBoolean(completed);
    const result = await runAsync(
      'INSERT INTO tasks (title, description, completed, priority, progress, pomodoroSessions, slidesFile, notesFile, dueDate, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description || '', isCompleted ? 1 : 0, priority || 'medium', Number(progress) || 0, Number(pomodoroSessions) || 0, null, null, dueDate || null, req.user.id, createdAt]
    );

    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', [result.lastID]);
    res.json(normalizeTask(task));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, completed, priority, progress, pomodoroSessions, dueDate } = req.body;
    console.log('UPDATE REQUEST RECEIVED:', { taskId: req.params.id, completed, incoming: req.body });
    
    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.userId !== req.user.id) return res.status(401).json({ message: 'Unauthorized' });

    const updatedTitle = title ?? task.title;
    const updatedDescription = description ?? task.description;
    const updatedCompleted = completed !== undefined ? (parseBoolean(completed) ? 1 : 0) : task.completed;
    const updatedPriority = priority || task.priority;
    const updatedProgress = progress !== undefined ? (Number.isFinite(Number(progress)) ? Number(progress) : task.progress) : task.progress;
    const updatedPomodoroSessions = pomodoroSessions !== undefined ? (Number.isFinite(Number(pomodoroSessions)) ? Number(pomodoroSessions) : task.pomodoroSessions) : task.pomodoroSessions;
    const updatedDueDate = dueDate || null;
    const updatedSlidesFile = req.body.slidesFile ?? task.slidesFile;
    const updatedNotesFile = req.body.notesFile ?? task.notesFile;

    console.log('UPDATING TO:', { updatedCompleted, updatedTitle });

    await runAsync(
      'UPDATE tasks SET title = ?, description = ?, completed = ?, priority = ?, progress = ?, pomodoroSessions = ?, slidesFile = ?, notesFile = ?, dueDate = ? WHERE id = ?',
      [updatedTitle, updatedDescription, updatedCompleted, updatedPriority, updatedProgress, updatedPomodoroSessions, updatedSlidesFile, updatedNotesFile, updatedDueDate, req.params.id]
    );

    const updatedTask = await getAsync('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    console.log('TASK AFTER UPDATE:', { ...updatedTask, completed: updatedTask.completed, normalizedCompleted: Boolean(updatedTask.completed) });
    res.json(normalizeTask(updatedTask));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const type = req.query.type;
    if (!['slides', 'notes'].includes(type)) {
      return res.status(400).json({ message: 'Invalid upload type' });
    }

    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.userId !== req.user.id) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const filename = req.file.filename;
    const updateField = type === 'slides' ? 'slidesFile' : 'notesFile';

    await runAsync(
      `UPDATE tasks SET ${updateField} = ? WHERE id = ?`,
      [filename, req.params.id]
    );

    const updatedTask = await getAsync('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json(normalizeTask(updatedTask));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.userId !== req.user.id) return res.status(401).json({ message: 'Unauthorized' });

    await runAsync('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
