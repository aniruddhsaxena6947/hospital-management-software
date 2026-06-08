const express = require('express');
const db = require('../db');
const { verifyToken, log } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

router.get('/', (_req, res) => {
  res.json(db.prepare(`SELECT * FROM doctors ORDER BY id ASC`).all());
});

router.post('/', (req, res) => {
  const { name, department, status, appointments, load_pct, avatar_color } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name required' });
  const code = 'D' + String(100 + (db.prepare('SELECT COUNT(*) AS c FROM doctors').get().c) + 1);
  const info = db.prepare(`INSERT INTO doctors (code, name, department, status, appointments, load_pct, avatar_color)
                           VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(code, name, department || 'General', status || 'Available',
         appointments || 0, load_pct || 0, avatar_color || 'primary');
  log(req.user.id, 'doctor_create', 'doctors', `Added ${name}`);
  res.status(201).json({ id: info.lastInsertRowid, code });
});

router.put('/:id', (req, res) => {
  const fields = ['name','department','status','appointments','load_pct','avatar_color'];
  const sets = []; const args = [];
  for (const f of fields) if (req.body[f] !== undefined) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  if (!sets.length) return res.status(400).json({ error: 'No fields' });
  args.push(req.params.id);
  db.prepare(`UPDATE doctors SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM doctors WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
