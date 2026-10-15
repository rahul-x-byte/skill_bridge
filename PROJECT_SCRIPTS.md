# SkillBridge – Complete MERN Stack Project Scripts

This document provides the modular script files for the SkillBridge application, organized following industry-standard MERN architecture.

---

## Architecture Overview
```
skillbridge/
├── server/
│   ├── middleware/
│   │   └── auth.js             # JWT verification & role guard middleware
│   ├── models/
│   │   └── models.js           # Mongoose schemas (User, Job, Assessment, Application)
│   ├── routes/
│   │   ├── authRoutes.js       # /api/auth (register, login)
│   │   ├── studentRoutes.js    # /api/me, skills, assessments, applications
│   │   └── jobRoutes.js        # /api/jobs, placements, analytics
│   ├── server.js               # Express entrypoint & MongoDB connection
│   └── .env                    # Local MongoDB Compass connection string
├── client/ (frontend)
│   ├── index.html              # HTML5 root template
│   ├── src/
│   │   ├── services/
│   │   │   └── api.js          # API client with token authorization
│   │   ├── pages/
│   │   │   └── Login.jsx       # Student & Admin Login / Registration
│   │   ├── App.jsx             # React Router shell & navigation
│   │   ├── App.css             # Unified CSS styles
│   │   └── main.jsx            # React root DOM mounting
└── package.json                # Root launcher
```

---

## 1. Backend: `server/server.js`
Main Express server connecting to local MongoDB (viewable in MongoDB Compass) and registering modular routes:

```javascript
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

// ---------- Server Initialization ----------
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
    process.exit(1);
  });
```

---

## 2. Backend Middleware: `server/middleware/auth.js`
Token authentication and route protection:

```javascript
const jwt = require('jsonwebtoken');

const sign = (u) => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const clean = (u) => {
  const o = u.toObject ? u.toObject() : u;
  delete o.password;
  return o;
};

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((e) =>
    res.status(e.status || 400).json({ error: e.message })
  );

const fail = (status, message) => Object.assign(new Error(message), { status });

const auth = (...roles) => (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Please log in again' });
  }
  if (roles.length && !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  next();
};

module.exports = { sign, clean, wrap, fail, auth };
```

---

## 3. Backend Routes: `server/routes/authRoutes.js`
Handles user registration and login with bcrypt password hashing:

```javascript
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
```

---

## 4. Backend Routes: `server/routes/studentRoutes.js`
Handles student profile, technical skills, quizzes/assessments, and job applications:

```javascript
const express = require('express');
const { User, Assessment, Job, Application } = require('../models');
const QUESTIONS = require('../questions');
const { clean, wrap, fail, auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/me - Get current profile
router.get('/me', auth(), wrap(async (req, res) => {
  res.json(clean(await User.findById(req.user.id)));
}));

// PUT /api/me - Update profile
router.put('/me', auth(), wrap(async (req, res) => {
  const { name, branch, cgpa } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, branch, cgpa: cgpa === '' ? undefined : cgpa },
    { new: true, runValidators: true }
  );
  res.json(clean(user));
}));

// POST /api/me/skills - Add or update skill
router.post('/me/skills', auth(), wrap(async (req, res) => {
  const name = (req.body.name || '').trim();
  const level = Math.max(0, Math.min(100, Number(req.body.level) || 0));
  if (!name) throw fail(400, 'Skill name is required');
  
  const user = await User.findById(req.user.id);
  const existing = user.skills.find((s) => s.name.toLowerCase() === name.toLowerCase());
  existing ? (existing.level = level) : user.skills.push({ name, level });
  await user.save();
  res.json(clean(user));
}));

// DELETE /api/me/skills/:name
router.delete('/me/skills/:name', auth(), wrap(async (req, res) => {
  const user = await User.findById(req.user.id);
  user.skills = user.skills.filter((s) => s.name !== req.params.name);
  await user.save();
  res.json(clean(user));
}));

// PUT /api/me/progress - Roadmap progress
router.put('/me/progress', auth(), wrap(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { progress: req.body.progress || [] },
    { new: true }
  );
  res.json(clean(user));
}));

// GET /api/assessments/skills
router.get('/assessments/skills', auth(), (req, res) => {
  res.json(Object.keys(QUESTIONS));
});

// GET /api/assessments/questions/:skill
router.get('/assessments/questions/:skill', auth(), (req, res) => {
  const set = QUESTIONS[req.params.skill];
  if (!set) return res.status(404).json({ error: 'Unknown skill' });
  res.json(set.map(({ q, o }) => ({ q, o })));
});

// POST /api/assessments/:skill - Submit test and calculate score
router.post('/assessments/:skill', auth(), wrap(async (req, res) => {
  const set = QUESTIONS[req.params.skill];
  if (!set) throw fail(404, 'Unknown skill');
  
  const answers = req.body.answers || [];
  const score = set.filter((item, i) => answers[i] === item.a).length;
  await Assessment.create({ user: req.user.id, skill: req.params.skill, score, total: set.length });
  
  const level = Math.round((score / set.length) * 100);
  const user = await User.findById(req.user.id);
  const existing = user.skills.find((s) => s.name === req.params.skill);
  existing ? (existing.level = level) : user.skills.push({ name: req.params.skill, level });
  await user.save();
  
  res.json({ score, total: set.length, level });
}));

// GET /api/assessments - Recent results
router.get('/assessments', auth(), wrap(async (req, res) => {
  res.json(await Assessment.find({ user: req.user.id }).sort('-createdAt').limit(20));
}));

// GET /api/applications/mine - My job applications
router.get('/applications/mine', auth(), wrap(async (req, res) => {
  res.json(await Application.find({ user: req.user.id }).populate('job'));
}));

// POST /api/jobs/:id/apply - Apply for job/internship
router.post('/jobs/:id/apply', auth('student'), wrap(async (req, res) => {
  const [job, user] = await Promise.all([Job.findById(req.params.id), User.findById(req.user.id)]);
  if (!job) throw fail(404, 'Job not found');
  if (job.minCgpa && (user.cgpa || 0) < job.minCgpa) {
    throw fail(400, `Minimum CGPA required: ${job.minCgpa}. Update your CGPA on the Dashboard.`);
  }
  if (job.deadline && job.deadline < new Date()) {
    throw fail(400, 'Application deadline has passed');
  }
  try {
    res.status(201).json(await Application.create({ user: user._id, job: job._id }));
  } catch (e) {
    throw e.code === 11000 ? fail(409, 'You have already applied') : e;
  }
}));

module.exports = router;
```

---

## 5. Frontend API Service: `client/src/services/api.js`
Handles HTTP communication and automatic JWT token attachment:

```javascript
const base = import.meta.env.VITE_API_URL || '/api';

export async function api(path, method = 'GET', body) {
  const token = localStorage.getItem('token');
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: 'Bearer ' + token })
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default api;
```

---

## 6. Frontend Login Page: `client/src/pages/Login.jsx`
Dedicated authentication component for students and placement officers:

```jsx
import React, { useState } from 'react';
import { api } from '../services/api';

export default function Login({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '', branch: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const endpoint = register ? '/auth/register' : '/auth/login';
      const data = await api(endpoint, 'POST', f);
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <form className="card" onSubmit={submit}>
        <h1>SkillBridge</h1>
        <p className="muted">Student Skill Development and Placement Management</p>
        
        {register && (
          <input
            placeholder="Full name"
            value={f.name}
            onChange={set('name')}
            required
          />
        )}
        
        <input
          type="email"
          placeholder="Email address"
          value={f.email}
          onChange={set('email')}
          required
        />
        
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={f.password}
          onChange={set('password')}
          required
        />
        
        {register && (
          <input
            placeholder="Branch (e.g. AI & DS, CSE, IT)"
            value={f.branch}
            onChange={set('branch')}
          />
        )}
        
        {err && <p className="err">{err}</p>}
        
        <button className="primary" disabled={loading}>
          {loading ? 'Please wait…' : register ? 'Create account' : 'Log in'}
        </button>
        
        <p
          className="muted link"
          onClick={() => {
            setRegister(!register);
            setErr('');
          }}
        >
          {register
            ? 'Already have an account? Log in'
            : 'New student? Register here'}
        </p>
      </form>
    </div>
  );
}
```

---

## 7. Frontend Main App: `client/src/App.jsx`
Main layout, authentication check, sidebar navigation, and page routing:

```jsx
import React, { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { api } from './services/api';
import Login from './pages/Login';
import { Analytics, Dashboard, Jobs, Roadmap, Skills } from './pages.jsx';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api('/me')
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refresh = () => api('/me').then(setUser);

  if (loading) return <p className="muted center">Loading…</p>;
  if (!user) return <Login onLogin={setUser} />;

  const admin = user.role === 'admin';

  return (
    <div className="shell">
      <aside>
        <h2>SkillBridge</h2>
        <p className="muted small">
          {user.name} · {admin ? 'Placement Officer' : 'Student'}
        </p>
        <nav>
          <NavLink to="/">📊 Dashboard</NavLink>
          {!admin && <NavLink to="/skills">🧠 Skill Assessment</NavLink>}
          <NavLink to="/jobs">💼 {admin ? 'Placement Portal' : 'Jobs & Internships'}</NavLink>
          {!admin && <NavLink to="/roadmap">🗺 Learning Roadmap</NavLink>}
          <NavLink to="/analytics">📈 Analytics</NavLink>
        </nav>
        <button className="ghost" onClick={logout}>Log out</button>
      </aside>

      <main>
        <Routes>
          <Route path="/" element={<Dashboard user={user} setUser={setUser} />} />
          <Route path="/skills" element={<Skills refresh={refresh} />} />
          <Route path="/jobs" element={<Jobs user={user} />} />
          <Route path="/roadmap" element={<Roadmap user={user} setUser={setUser} />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
```

---

## 8. Frontend Styles: `client/src/App.css`
The complete CSS design system:

```css
:root {
  --blue: #2563eb;
  --bg: #f4f7fb;
  --ink: #14213d;
  --mute: #64748b;
  --line: #dbe3ef;
  --green: #16a34a;
  --red: #dc2626;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--ink);
}

h1 { margin: 0 0 4px; font-size: 26px; }
h3 { margin: 0 0 12px; font-size: 16px; }

.muted { color: var(--mute); }
.small { font-size: 12px; }
.center { text-align: center; margin-top: 40px; }
.ok { color: var(--green); font-size: 14px; }
.err { color: var(--red); font-size: 14px; }

.shell { display: flex; min-height: 100vh; }

aside {
  width: 250px;
  background: #0f1b33;
  color: #e2e8f0;
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: sticky;
  top: 0;
  height: 100vh;
}

aside h2 { margin: 0; }
aside .muted { color: #93a3bd; margin: 0 0 14px; }

nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: auto;
}

nav a {
  color: #cbd5e1;
  text-decoration: none;
  padding: 11px 12px;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
}

nav a:hover { background: #16264a; }
nav a.active { background: #1d3a72; color: #fff; }

main { flex: 1; padding: 28px 36px; min-width: 0; }

.card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 10px; }
.grid2 .card, .grid3 .card { margin: 0; }

.stat { display: flex; flex-direction: column; gap: 6px; }
.stat strong { font-size: 30px; }

input, select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 10px;
  background: #fff;
  font-family: inherit;
}

input:focus, select:focus {
  outline: 2px solid var(--blue);
  outline-offset: 1px;
}

label { font-size: 13px; color: var(--mute); display: block; margin-bottom: 4px; }

button {
  border: 0;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.2s ease;
}

button.primary { background: var(--blue); color: #fff; }
button.primary:disabled { opacity: .5; cursor: not-allowed; }
button.ghost { background: #eaf0fb; color: var(--blue); }
aside button.ghost { background: #16264a; color: #cbd5e1; }

.x { background: none; color: var(--mute); padding: 4px 8px; }
.row { display: flex; gap: 8px; flex-wrap: wrap; margin: 14px 0; }
.inline { display: flex; gap: 8px; margin-top: 12px; }
.inline input { margin: 0; }

.skillrow { display: flex; align-items: center; gap: 6px; }
.skillrow .bar { flex: 1; }

.bar { margin-bottom: 12px; font-size: 13px; }
.bar .t { display: flex; justify-content: space-between; margin-bottom: 4px; color: var(--mute); }
.track { height: 9px; background: #e8eef8; border-radius: 6px; overflow: hidden; }
.fill { height: 100%; background: var(--blue); border-radius: 6px; }

.opt { display: flex; gap: 8px; align-items: center; color: var(--ink); font-size: 14px; margin: 8px 0; cursor: pointer; }
.opt input { width: auto; margin: 0; }
.q { margin-bottom: 16px; }

table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { text-align: left; color: var(--mute); font-size: 13px; padding: 8px; border-bottom: 1px solid var(--line); }
td { padding: 10px 8px; border-bottom: 1px solid #edf1f8; }

.tag { font-size: 12px; padding: 3px 10px; border-radius: 20px; background: #e0e7ff; color: #3730a3; }
.tag.Internship { background: #dcfce7; color: #166534; }
.chip { display: inline-block; font-size: 12px; padding: 3px 10px; margin: 0 6px 6px 0; border-radius: 20px; background: #eef2f7; }
.chip.on { background: #dcfce7; color: #166534; font-weight: 600; }

.auth { min-height: 100vh; display: grid; place-items: center; }
.auth .card { width: 380px; }
.auth h1 { color: var(--blue); }
.link { cursor: pointer; text-align: center; margin-top: 12px; font-size: 14px; }

@media (max-width: 820px) {
  .shell { flex-direction: column; }
  aside { width: 100%; height: auto; position: static; }
  .grid2, .grid3 { grid-template-columns: 1fr; }
  main { padding: 18px; }
}
```

---

## 9. Frontend HTML Entry: `client/index.html`
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SkillBridge – Student Skill & Placement Portal</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## 10. Database Connection: `server/.env`
Configured for local MongoDB and MongoDB Compass:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/skillbridge
JWT_SECRET=skillbridge_local_dev_secret_key_2026
CLIENT_URL=http://localhost:5173
```
