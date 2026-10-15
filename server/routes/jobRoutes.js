const express = require('express');
const { User, Assessment, Job, Application } = require('../models');
const { wrap, fail, auth } = require('../middleware/auth');

const router = express.Router();

// ---------- Jobs ----------

// GET /api/jobs
router.get('/jobs', auth(), wrap(async (req, res) => {
  res.json(await Job.find().sort('-createdAt'));
}));

// POST /api/jobs (Admin)
router.post('/jobs', auth('admin'), wrap(async (req, res) => {
  const body = {
    ...req.body,
    skills: String(req.body.skills || '').split(',').map((s) => s.trim()).filter(Boolean)
  };
  res.status(201).json(await Job.create(body));
}));

// DELETE /api/jobs/:id (Admin)
router.delete('/jobs/:id', auth('admin'), wrap(async (req, res) => {
  await Job.findByIdAndDelete(req.params.id);
  await Application.deleteMany({ job: req.params.id });
  res.json({ ok: true });
}));

// ---------- Applications (Admin) ----------

// GET /api/applications (Admin)
router.get('/applications', auth('admin'), wrap(async (req, res) => {
  res.json(
    await Application.find()
      .sort('-createdAt')
      .populate('user', 'name email branch cgpa')
      .populate('job', 'title company')
  );
}));

// PUT /api/applications/:id (Admin)
router.put('/applications/:id', auth('admin'), wrap(async (req, res) => {
  res.json(
    await Application.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    )
  );
}));

// ---------- Analytics ----------

// GET /api/analytics
router.get('/analytics', auth(), wrap(async (req, res) => {
  if (req.user.role === 'admin') {
    const [students, jobs, applications, byStatus, avgBySkill] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Job.countDocuments(),
      Application.countDocuments(),
      Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Assessment.aggregate([
        {
          $group: {
            _id: '$skill',
            avg: { $avg: { $multiply: [{ $divide: ['$score', '$total'] }, 100] } },
            attempts: { $sum: 1 }
          }
        }
      ])
    ]);
    return res.json({
      role: 'admin',
      students,
      jobs,
      applications,
      byStatus: byStatus.map((x) => ({ label: x._id, value: x.count })),
      avgBySkill: avgBySkill.map((x) => ({ label: x._id, value: Math.round(x.avg), attempts: x.attempts }))
    });
  }

  // Student analytics
  const [user, assessments, apps] = await Promise.all([
    User.findById(req.user.id),
    Assessment.find({ user: req.user.id }),
    Application.find({ user: req.user.id })
  ]);
  
  res.json({
    role: 'student',
    skills: user.skills.map((s) => ({ label: s.name, value: s.level })),
    assessments: assessments.length,
    applications: apps.length,
    selected: apps.filter((a) => a.status === 'Selected').length,
    roadmapDone: user.progress.length
  });
}));

module.exports = router;
