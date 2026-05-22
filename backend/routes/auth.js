const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getAsync, runAsync } = require('../db');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Please fill all fields' });

    const existingUser = await getAsync('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const createdAt = new Date().toISOString();
    const result = await runAsync(
      'INSERT INTO users (name, email, password, createdAt) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, createdAt]
    );

    const payload = { user: { id: result.lastID } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: result.lastID, name, email } });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Please enter email and password' });

    const user = await getAsync('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
