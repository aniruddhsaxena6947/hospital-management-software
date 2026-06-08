const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

router.get('/', (_req, res) => {
  const rows = db.prepare(`
    SELECT name, total_beds AS total, occupied,
           ROUND(occupied * 100.0 / NULLIF(total_beds,0), 0) AS pct
    FROM wards ORDER BY id ASC
  `).all();
  res.json(rows);
});

router.get('/stats', (_req, res) => {
  const total = db.prepare('SELECT COALESCE(SUM(total_beds),0) AS t FROM wards').get().t;
  const occ   = db.prepare('SELECT COALESCE(SUM(occupied),0) AS o FROM wards').get().o;
  const avail = total - occ;
  res.json({ total_beds: total, occupied: occ, available: avail });
});

module.exports = router;
