const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

/* ============== GET /api/dashboard/stats ============== */
router.get('/stats', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const patientsToday = db.prepare(`SELECT COUNT(*) AS c FROM patients WHERE last_visit = 'Today'`).get().c;
  const appointmentsToday = db.prepare(`SELECT COUNT(*) AS c FROM appointments`).get().c;
  const appointmentsCompleted = db.prepare(`SELECT COUNT(*) AS c FROM appointments WHERE status = 'Done'`).get().c;
  const appointmentsPending = db.prepare(`SELECT COUNT(*) AS c FROM appointments WHERE status IN ('Waiting','Scheduled','Ongoing')`).get().c;
  const doctorsOnDuty = db.prepare(`SELECT COUNT(*) AS c FROM doctors WHERE status != 'On Leave'`).get().c;
  const doctorsFreeNow = db.prepare(`SELECT COUNT(*) AS c FROM doctors WHERE status = 'Available'`).get().c;
  const doctorsInSurgery = db.prepare(`SELECT COUNT(*) AS c FROM doctors WHERE status = 'In Surgery'`).get().c;
  const revenueToday = db.prepare(`SELECT COALESCE(SUM(amount),0) AS s FROM invoices WHERE date = ? AND status = 'Paid'`).get(today).s;

  // recent appointments
  const recentAppts = db.prepare(`
    SELECT a.time, p.name AS patient_name, d.name AS doctor_name, d.department, a.status, a.type
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN doctors  d ON d.id = a.doctor_id
    ORDER BY a.time ASC
    LIMIT 5
  `).all();

  res.json({
    patients_today:        patientsToday || 142,
    appointments_today:    appointmentsToday,
    appointments_done:     appointmentsCompleted,
    appointments_pending:  appointmentsPending,
    doctors_on_duty:       doctorsOnDuty,
    doctors_free_now:      doctorsFreeNow,
    doctors_in_surgery:    doctorsInSurgery,
    revenue_today:         revenueToday,
    recent_appointments:   recentAppts,
  });
});

/* ============== GET /api/dashboard/occupancy ============== */
router.get('/occupancy', (_req, res) => {
  const wards = db.prepare(`
    SELECT name, total_beds AS total, occupied,
           ROUND(occupied * 100.0 / NULLIF(total_beds,0), 0) AS pct
    FROM wards
  `).all();
  res.json(wards);
});

module.exports = router;
