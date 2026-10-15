// Run with: npm run seed   (adds demo admin, student and jobs; safe to re-run)
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Job } = require('./models');

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillbridge';
  await mongoose.connect(uri);
  const users = [
    { name: 'Placement Officer', email: 'admin@skillbridge.com', password: 'admin123', role: 'admin' },
    { name: 'Rahul M', email: 'student@skillbridge.com', password: 'student123', branch: 'AI & DS', cgpa: 8.2,
      skills: [{ name: 'JavaScript', level: 70 }, { name: 'Python', level: 60 }] }
  ];
  for (const u of users) {
    if (!(await User.findOne({ email: u.email }))) await User.create({ ...u, password: await bcrypt.hash(u.password, 10) });
  }
  if (!(await Job.countDocuments())) {
    const next = (d) => new Date(Date.now() + d * 86400000);
    await Job.insertMany([
      { title: 'Frontend Developer', company: 'TechNova', type: 'Placement', location: 'Coimbatore', skills: ['JavaScript', 'React'], minCgpa: 7, deadline: next(30), description: 'Build web interfaces with React.' },
      { title: 'Data Analyst Intern', company: 'DataWorks', type: 'Internship', location: 'Remote', skills: ['Python', 'SQL'], minCgpa: 6.5, deadline: next(20), description: 'Dashboards and reporting.' },
      { title: 'Backend Engineer', company: 'CloudKart', type: 'Placement', location: 'Bengaluru', skills: ['JavaScript', 'SQL'], minCgpa: 7.5, deadline: next(45), description: 'Design REST APIs.' }
    ]);
  }
  console.log('Seed complete.\n  Admin:   admin@skillbridge.com / admin123\n  Student: student@skillbridge.com / student123');
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
