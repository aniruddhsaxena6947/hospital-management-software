const express = require('express');
const db = require('../db');
const { verifyToken, log } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

router.get('/', (req, res) => {
  const { status, q } = req.query;
  let sql = `SELECT i.*, p.name AS patient_name
             FROM invoices i LEFT JOIN patients p ON p.id = i.patient_id WHERE 1=1`;
  const args = [];
  if (status) { sql += ' AND i.status = ?'; args.push(status); }
  if (q) { sql += ' AND (i.code LIKE ? OR p.name LIKE ?)'; args.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY i.id DESC';
  res.json(db.prepare(sql).all(...args));
});

router.get('/summary', (_req, res) => {
  const total   = db.prepare(`SELECT COALESCE(SUM(amount),0) AS s FROM invoices WHERE status = 'Paid'`).get().s;
  const pending = db.prepare(`SELECT COALESCE(SUM(amount),0) AS s FROM invoices WHERE status IN ('Pending','Overdue')`).get().s;
  const invs    = db.prepare(`SELECT COUNT(*) AS c FROM invoices WHERE status IN ('Pending','Overdue')`).get().c;
  res.json({ total_revenue: total, outstanding: pending, pending_invoices: invs });
});

router.post('/', (req, res) => {
  const { patient_id, amount, mode, date, status } = req.body || {};
  if (!amount) return res.status(400).json({ error: 'Amount required' });
  const code = 'INV' + (2242 + (db.prepare('SELECT COUNT(*) AS c FROM invoices').get().c));
  const info = db.prepare(`INSERT INTO invoices (code, patient_id, amount, mode, date, status) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(code, patient_id || null, amount, mode || 'Cash', date || new Date().toISOString().slice(0,10), status || 'Paid');
  log(req.user.id, 'invoice_create', 'billing', `${code} ₹${amount}`);
  res.status(201).json({ id: info.lastInsertRowid, code });
});

router.put('/:id', (req, res) => {
  const fields = ['patient_id','amount','mode','date','status'];
  const sets = []; const args = [];
  for (const f of fields) if (req.body[f] !== undefined) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  if (!sets.length) return res.status(400).json({ error: 'No fields' });
  args.push(req.params.id);
  db.prepare(`UPDATE invoices SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
