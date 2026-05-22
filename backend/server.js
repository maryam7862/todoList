const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
require('./db');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
