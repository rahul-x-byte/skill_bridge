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
