const express = require('express');
const db = require('../db');
const { verifyToken, log } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

const computeStatus = (stock, threshold) => {
  if (stock <= 0) return 'Critical';
  if (stock < threshold * 0.5) return 'Critical';
  if (stock < threshold) return 'Low';
  return 'OK';
};

router.get('/', (req, res) => {
  const { status, q } = req.query;
  let sql = 'SELECT * FROM medicines WHERE 1=1';
  const args = [];
  if (status) { sql += ' AND status = ?'; args.push(status); }
  if (q) { sql += ' AND name LIKE ?'; args.push(`%${q}%`); }
  sql += ' ORDER BY name ASC';
  res.json(db.prepare(sql).all(...args));
});

router.get('/stats', (_req, res) => {
  const total   = db.prepare('SELECT COUNT(*) AS c FROM medicines').get().c;
  const low     = db.prepare(`SELECT COUNT(*) AS c FROM medicines WHERE status IN ('Low','Critical')`).get().c;
  const ok      = db.prepare(`SELECT COUNT(*) AS c FROM medicines WHERE status = 'OK'`).get().c;
  res.json({ total, low_stock: low, in_stock: ok });
});

router.post('/', (req, res) => {
  const { name, category, stock, unit, threshold } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name required' });
  const status = computeStatus(stock || 0, threshold || 50);
  const info = db.prepare(`INSERT INTO medicines (name, category, stock, unit, status, threshold) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(name, category || 'General', stock || 0, unit || 'Strips', status, threshold || 50);
  log(req.user.id, 'medicine_create', 'pharmacy', `Added ${name}`);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const fields = ['name','category','stock','unit','threshold'];
  const sets = []; const args = [];
  for (const f of fields) if (req.body[f] !== undefined) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  if (!sets.length) return res.status(400).json({ error: 'No fields' });
  // recompute status if stock or threshold changed
  if (req.body.stock !== undefined || req.body.threshold !== undefined) {
    const cur = db.prepare('SELECT stock, threshold FROM medicines WHERE id = ?').get(req.params.id);
    if (cur) sets.push('status = ?'), args.push(computeStatus(req.body.stock ?? cur.stock, req.body.threshold ?? cur.threshold));
  }
  args.push(req.params.id);
  db.prepare(`UPDATE medicines SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM medicines WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
