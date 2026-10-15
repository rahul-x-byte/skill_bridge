const express = require('express');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { sign, clean, wrap, fail } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', wrap(async (req, res) => {
  const { name, email, password, branch } = req.body;
  if (!name || !email || !password) throw fail(400, 'Name, email and password are required');
  if (password.length < 6) throw fail(400, 'Password must be at least 6 characters');
  if (await User.findOne({ email: email.toLowerCase() })) throw fail(409, 'Email already registered');
  
  const user = await User.create({
    name,
    email,
    branch,
    password: await bcrypt.hash(password, 10)
  });
  
  res.status(201).json({ token: sign(user), user: clean(user) });
}));

// POST /api/auth/login
router.post('/login', wrap(async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) {
    throw fail(401, 'Invalid email or password');
  }
  res.json({ token: sign(user), user: clean(user) });
}));

module.exports = router;
