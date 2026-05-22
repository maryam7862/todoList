const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.resolve(__dirname, 'todo.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ SQLite connection error:', err);
    process.exit(1);
  }
  console.log('✅ SQLite connected');
});

const runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const getAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

const allAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'medium',
      progress INTEGER DEFAULT 0,
      pomodoroSessions INTEGER DEFAULT 0,
      slidesFile TEXT,
      notesFile TEXT,
      dueDate TEXT,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.all('PRAGMA table_info(tasks)', [], (err, rows) => {
    if (err) return console.error(err);
    const columns = rows.map((row) => row.name);
    if (!columns.includes('completed')) {
      db.run('ALTER TABLE tasks ADD COLUMN completed INTEGER DEFAULT 0');
    }
    if (!columns.includes('progress')) {
      db.run('ALTER TABLE tasks ADD COLUMN progress INTEGER DEFAULT 0');
    }
    if (!columns.includes('pomodoroSessions')) {
      db.run('ALTER TABLE tasks ADD COLUMN pomodoroSessions INTEGER DEFAULT 0');
    }
    if (!columns.includes('slidesFile')) {
      db.run('ALTER TABLE tasks ADD COLUMN slidesFile TEXT');
    }
    if (!columns.includes('notesFile')) {
      db.run('ALTER TABLE tasks ADD COLUMN notesFile TEXT');
    }
  });
});

module.exports = { runAsync, getAsync, allAsync };
