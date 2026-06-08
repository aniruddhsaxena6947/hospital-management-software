const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

router.get('/', (req, res) => {
  const { role, status } = req.query;
  let sql = 'SELECT * FROM staff WHERE 1=1';
  const args = [];
  if (role)   { sql += ' AND role = ?'; args.push(role); }
  if (status) { sql += ' AND status = ?'; args.push(status); }
  sql += ' ORDER BY id ASC';
  res.json(db.prepare(sql).all(...args));
});

router.post('/', (req, res) => {
  const { name, role, department, shift, status } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name required' });
  const code = 'S' + String(100 + (db.prepare('SELECT COUNT(*) AS c FROM staff').get().c) + 1).padStart(3, '0');
  const info = db.prepare(`INSERT INTO staff (code, name, role, department, shift, status) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(code, name, role || 'Staff', department || 'General', shift || 'Morning', status || 'On Duty');
  res.status(201).json({ id: info.lastInsertRowid, code });
});

router.put('/:id', (req, res) => {
  const fields = ['name','role','department','shift','status'];
  const sets = []; const args = [];
  for (const f of fields) if (req.body[f] !== undefined) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  if (!sets.length) return res.status(400).json({ error: 'No fields' });
  args.push(req.params.id);
  db.prepare(`UPDATE staff SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM staff WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
