require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const jobRoutes = require('./routes/jobRoutes');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', studentRoutes);
app.use('/api', jobRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: mongoose.connection.readyState === 1 });
});

// ---------- start ----------
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillbridge';
const JWT_SECRET = process.env.JWT_SECRET || 'skillbridge_local_dev_secret_key_2026';
process.env.JWT_SECRET = JWT_SECRET;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log(`Connected to MongoDB (${MONGODB_URI.includes('127.0.0.1') || MONGODB_URI.includes('localhost') ? 'Local / Compass' : 'Cloud'})`);
    console.log(`Database name: ${mongoose.connection.name}`);
    const server = app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is busy, retrying in 1s...`);
        setTimeout(() => {
          server.close();
          server.listen(PORT);
        }, 1000);
      } else {
        console.error('Server error:', err);
      }
    });
    process.on('SIGTERM', () => server.close());
    process.on('SIGINT', () => server.close());
  })
  .catch((e) => {
    console.error('MongoDB connection failed:', e.message);
    if (MONGODB_URI.includes('127.0.0.1') || MONGODB_URI.includes('localhost')) {
      console.error('\nTroubleshooting Local MongoDB / Compass:');
      console.error('1. Ensure the local MongoDB service (mongod) is running on port 27017.');
      console.error('2. In MongoDB Compass, verify you can connect to mongodb://127.0.0.1:27017');
      console.error(`3. Database target: ${MONGODB_URI}`);
    } else {
      console.error('\nCheck your Atlas credentials, Network Access (IP allow list), and MONGODB_URI.');
    }
    process.exit(1);
  });
