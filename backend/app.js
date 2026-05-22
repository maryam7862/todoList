const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const isVercel = process.env.VERCEL === '1';
const defaultDbPath = path.resolve(__dirname, 'todo.db');
const defaultUploadsPath = path.resolve(__dirname, 'uploads');
const dbPath = process.env.DB_PATH || (isVercel ? path.join('/tmp', 'todo.db') : defaultDbPath);
const uploadsPath = process.env.UPLOADS_PATH || (isVercel ? path.join('/tmp', 'uploads') : defaultUploadsPath);

if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

if (isVercel && !fs.existsSync(dbPath) && fs.existsSync(defaultDbPath)) {
  fs.copyFileSync(defaultDbPath, dbPath);
}

process.env.DB_PATH = dbPath;
process.env.UPLOADS_PATH = uploadsPath;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsPath));

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

module.exports = app;
