const express = require('express');
const db = require('../db');
const { verifyToken, log } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

router.get('/', (req, res) => {
  const { status, q } = req.query;
  let sql = `SELECT p.*, d.name AS doctor_name FROM patients p
             LEFT JOIN doctors d ON d.id = p.doctor_id WHERE 1=1`;
  const args = [];
  if (status && status !== 'All') { sql += ' AND p.status = ?'; args.push(status); }
  if (q) { sql += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.phone LIKE ?)'; const like = `%${q}%`; args.push(like, like, like); }
  sql += ' ORDER BY p.id DESC';
  res.json(db.prepare(sql).all(...args));
});

router.get('/:id', (req, res) => {
  const p = db.prepare(`SELECT p.*, d.name AS doctor_name FROM patients p
                         LEFT JOIN doctors d ON d.id = p.doctor_id WHERE p.id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  res.json(p);
});

router.post('/', (req, res) => {
  const { name, age, sex, blood_group, phone, doctor_id, department, status, last_visit } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const code = 'P' + (1043 + (db.prepare('SELECT COUNT(*) AS c FROM patients').get().c));
  const info = db.prepare(`INSERT INTO patients
    (code, name, age, sex, blood_group, phone, doctor_id, department, status, last_visit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(code, name, age || null, sex || null, blood_group || null, phone || null,
         doctor_id || null, department || null, status || 'OPD', last_visit || 'Today');

  log(req.user.id, 'patient_create', 'patients', `Created ${code} ${name}`);
  res.status(201).json({ id: info.lastInsertRowid, code });
});

router.put('/:id', (req, res) => {
  const fields = ['name','age','sex','blood_group','phone','doctor_id','department','status','last_visit'];
  const sets = []; const args = [];
  for (const f of fields) if (req.body[f] !== undefined) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
  args.push(req.params.id);
  db.prepare(`UPDATE patients SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  log(req.user.id, 'patient_update', 'patients', `Updated id ${req.params.id}`);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
  log(req.user.id, 'patient_delete', 'patients', `Deleted id ${req.params.id}`);
  res.json({ ok: true });
});

module.exports = router;
