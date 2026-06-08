const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  rows.forEach(r => obj[r.key] = r.value);
  res.json(obj);
});

router.get('/permissions', (_req, res) => {
  res.json(db.prepare('SELECT * FROM permissions ORDER BY role, resource').all());
});

router.put('/', (req, res) => {
  const sets = []; const args = [];
  for (const [k, v] of Object.entries(req.body || {})) {
    sets.push({ k, v });
  }
  const upsert = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
                             ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
  const tx = db.transaction(items => items.forEach(i => upsert.run(i.k, String(i.v))));
  tx(sets);
  res.json({ ok: true, updated: sets.length });
});

module.exports = router;
