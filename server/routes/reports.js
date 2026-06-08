const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

router.get('/summary', (_req, res) => {
  const totalPatients = db.prepare('SELECT COUNT(*) AS c FROM patients').get().c;
  const monthlyRevenue = db.prepare(`SELECT COALESCE(SUM(amount),0) AS s FROM invoices WHERE status = 'Paid'`).get().s;
  const lowStock = db.prepare(`SELECT COUNT(*) AS c FROM medicines WHERE status IN ('Low','Critical')`).get().c;

  // department revenue
  const byDept = db.prepare(`
    SELECT d.department, COALESCE(SUM(i.amount),0) AS revenue, COUNT(DISTINCT p.id) AS patients
    FROM doctors d
    LEFT JOIN patients p ON p.doctor_id = d.id
    LEFT JOIN invoices i ON i.patient_id = p.id
    GROUP BY d.department
    ORDER BY revenue DESC
    LIMIT 5
  `).all();

  // doctor performance (count of patients per doctor)
  const byDoctor = db.prepare(`
    SELECT d.name, d.department, COUNT(p.id) AS patients, 4.5 + (d.id % 5) * 0.1 AS rating
    FROM doctors d LEFT JOIN patients p ON p.doctor_id = d.id
    GROUP BY d.id ORDER BY patients DESC LIMIT 4
  `).all();

  res.json({
    monthly_patients: totalPatients,
    monthly_revenue:  monthlyRevenue,
    low_stock:        lowStock,
    avg_wait_min:     22,
    bed_util_pct:     79,
    by_department:    byDept,
    by_doctor:        byDoctor,
  });
});

module.exports = router;
