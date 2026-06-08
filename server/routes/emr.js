const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

router.get('/patient/:patientId', (req, res) => {
  const records = db.prepare(`
    SELECT r.*, d.name AS doctor_name
    FROM emr_records r
    LEFT JOIN doctors d ON d.id = r.doctor_id
    WHERE r.patient_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.patientId);

  // attach prescriptions to each record
  const prescStmt = db.prepare(`SELECT * FROM prescriptions WHERE record_id = ?`);
  records.forEach(r => { r.prescriptions = prescStmt.all(r.id); });

  res.json(records);
});

router.post('/', (req, res) => {
  const { patient_id, doctor_id, type, title, notes, prescriptions } = req.body || {};
  if (!patient_id || !title) return res.status(400).json({ error: 'patient_id and title required' });
  const info = db.prepare(`INSERT INTO emr_records (patient_id, doctor_id, type, title, notes) VALUES (?, ?, ?, ?, ?)`)
    .run(patient_id, doctor_id || null, type || 'note', title, notes || null);
  if (Array.isArray(prescriptions)) {
    const ins = db.prepare(`INSERT INTO prescriptions (record_id, medicine, dose, frequency, duration, notes) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const p of prescriptions) ins.run(info.lastInsertRowid, p.medicine, p.dose, p.frequency, p.duration, p.notes);
  }
  res.status(201).json({ id: info.lastInsertRowid });
});

module.exports = router;
