const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name, required: true });

const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  branch: String,
  cgpa: Number,
  skills: [{ _id: false, name: String, level: { type: Number, default: 0 } }],
  progress: [String]               // completed roadmap step ids
}, { timestamps: true }));

const Assessment = model('Assessment', new Schema({
  user: ref('User'), skill: String, score: Number, total: Number
}, { timestamps: true }));

const Job = model('Job', new Schema({
  title: { type: String, required: true }, company: { type: String, required: true },
  type: { type: String, enum: ['Placement', 'Internship'], default: 'Placement' },
  location: String, skills: [String], minCgpa: { type: Number, default: 0 },
  deadline: Date, description: String
}, { timestamps: true }));

const appSchema = new Schema({
  user: ref('User'), job: ref('Job'),
  status: { type: String, enum: ['Applied', 'Shortlisted', 'Selected', 'Rejected'], default: 'Applied' }
}, { timestamps: true });
appSchema.index({ user: 1, job: 1 }, { unique: true });
const Application = model('Application', appSchema);

module.exports = { User, Assessment, Job, Application };
