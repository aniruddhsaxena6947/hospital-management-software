const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, verifyToken, log } = require('../middleware/auth');

const router = express.Router();

/* ============== POST /api/auth/login ============== */
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    log(null, 'login_failed', 'auth', `Unknown email: ${email}`);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    log(user.id, 'login_failed', 'auth', 'Wrong password');
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);
  log(user.id, 'login', 'auth', `User ${user.email} signed in`);

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar }
  });
});

/* ============== GET /api/auth/me ============== */
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

/* ============== POST /api/auth/logout ============== */
router.post('/logout', verifyToken, (req, res) => {
  log(req.user.id, 'logout', 'auth', `${req.user.email} signed out`);
  res.json({ ok: true });
});

/* ============== POST /api/auth/signup (public self-register) ============== */
router.post('/signup', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, name required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const initials = (name.match(/\b\w/g) || []).slice(0, 2).join('').toUpperCase();
  const info = db.prepare(
    'INSERT INTO users (email, password_hash, name, role, avatar) VALUES (?, ?, ?, ?, ?)'
  ).run(email.toLowerCase().trim(), hash, name, 'staff', initials);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user);
  log(user.id, 'signup', 'auth', `User ${email} signed up`);
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar }
  });
});

/* ============== POST /api/auth/register (admin-creates-user) ============== */
router.post('/register', verifyToken, (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, name required' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create users' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    'INSERT INTO users (email, password_hash, name, role, avatar) VALUES (?, ?, ?, ?, ?)'
  ).run(email.toLowerCase().trim(), hash, name, role || 'staff', (name.match(/\b\w/g) || []).slice(0, 2).join('').toUpperCase());

  log(req.user.id, 'user_create', 'users', `Created ${email}`);
  res.status(201).json({ id: info.lastInsertRowid });
});

module.exports = router;
