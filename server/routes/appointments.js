const express = require('express');
const db = require('../db');
const { verifyToken, log } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

router.get('/', (req, res) => {
  const { status, date } = req.query;
  let sql = `SELECT a.*, p.name AS patient_name, d.name AS doctor_name, d.department
             FROM appointments a
             JOIN patients p ON p.id = a.patient_id
             JOIN doctors  d ON d.id = a.doctor_id
             WHERE 1=1`;
  const args = [];
  if (status) { sql += ' AND a.status = ?'; args.push(status); }
  if (date)   { sql += ' AND a.time LIKE ?'; args.push(`${date}%`); }
  sql += ' ORDER BY a.time ASC';
  res.json(db.prepare(sql).all(...args));
});

router.post('/', (req, res) => {
  const { time, patient_id, doctor_id, type, status, notes } = req.body || {};
  if (!time || !patient_id || !doctor_id) {
    return res.status(400).json({ error: 'time, patient_id and doctor_id are required' });
  }
  const info = db.prepare(`INSERT INTO appointments
    (time, patient_id, doctor_id, type, status, notes) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(time, patient_id, doctor_id, type || 'Consultation', status || 'Scheduled', notes || null);
  log(req.user.id, 'appointment_create', 'appointments', `Booked at ${time}`);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const fields = ['time','patient_id','doctor_id','type','status','notes'];
  const sets = []; const args = [];
  for (const f of fields) if (req.body[f] !== undefined) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
  args.push(req.params.id);
  db.prepare(`UPDATE appointments SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
