const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

router.get('/', (req, res) => {
  const { status } = req.query;
  let sql = `SELECT t.*, p.name AS patient_name, d.name AS doctor_name
             FROM lab_tests t
             JOIN patients p ON p.id = t.patient_id
             JOIN doctors  d ON d.id = t.doctor_id WHERE 1=1`;
  const args = [];
  if (status) { sql += ' AND t.status = ?'; args.push(status); }
  sql += ' ORDER BY t.id DESC';
  res.json(db.prepare(sql).all(...args));
});

router.post('/', (req, res) => {
  const { patient_id, doctor_id, test, time, status } = req.body || {};
  if (!patient_id || !doctor_id || !test) {
    return res.status(400).json({ error: 'patient_id, doctor_id, test required' });
  }
  const info = db.prepare(`INSERT INTO lab_tests (patient_id, doctor_id, test, time, status) VALUES (?, ?, ?, ?, ?)`)
    .run(patient_id, doctor_id, test, time || new Date().toTimeString().slice(0,5), status || 'Collected');
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const fields = ['test','time','status','result_url'];
  const sets = []; const args = [];
  for (const f of fields) if (req.body[f] !== undefined) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  if (!sets.length) return res.status(400).json({ error: 'No fields' });
  args.push(req.params.id);
  db.prepare(`UPDATE lab_tests SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM lab_tests WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
