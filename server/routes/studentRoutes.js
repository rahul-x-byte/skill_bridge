const express = require('express');
const { User, Assessment, Job, Application } = require('../models');
const QUESTIONS = require('../questions');
const { clean, wrap, fail, auth } = require('../middleware/auth');

const router = express.Router();

// ---------- Profile & Skills ----------

// GET /api/me
router.get('/me', auth(), wrap(async (req, res) => {
  res.json(clean(await User.findById(req.user.id)));
}));

// PUT /api/me
router.put('/me', auth(), wrap(async (req, res) => {
  const { name, branch, cgpa } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, branch, cgpa: cgpa === '' ? undefined : cgpa },
    { new: true, runValidators: true }
  );
  res.json(clean(user));
}));

// POST /api/me/skills
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

// PUT /api/me/progress
router.put('/me/progress', auth(), wrap(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { progress: req.body.progress || [] },
    { new: true }
  );
  res.json(clean(user));
}));

// ---------- Skill Assessments ----------

// GET /api/assessments/skills
router.get('/assessments/skills', auth(), (req, res) => {
  res.json(Object.keys(QUESTIONS));
});

// GET /api/assessments/questions/:skill
router.get('/assessments/questions/:skill', auth(), (req, res) => {
  const set = QUESTIONS[req.params.skill];
  if (!set) return res.status(404).json({ error: 'Unknown skill' });
  // Questions and options sent; correct answers never leave the server
  res.json(set.map(({ q, o }) => ({ q, o })));
});

// POST /api/assessments/:skill
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

// GET /api/assessments
router.get('/assessments', auth(), wrap(async (req, res) => {
  res.json(await Assessment.find({ user: req.user.id }).sort('-createdAt').limit(20));
}));

// ---------- Applications (Student) ----------

// GET /api/applications/mine
router.get('/applications/mine', auth(), wrap(async (req, res) => {
  res.json(await Application.find({ user: req.user.id }).populate('job'));
}));

// POST /api/jobs/:id/apply
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
