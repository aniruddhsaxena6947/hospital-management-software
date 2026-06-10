const path = require('path');
const express = require('express');
const cors = require('cors');

const db = require('./db');
const { log } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

/* tiny request logger */
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`${new Date().toISOString().slice(11, 19)}  ${req.method}  ${req.path}`);
  }
  next();
});

/* ============== Health ============== */
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

/* ============== Routes ============== */
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/patients',    require('./routes/patients'));
app.use('/api/appointments',require('./routes/appointments'));
app.use('/api/doctors',     require('./routes/doctors'));
app.use('/api/emr',         require('./routes/emr'));
app.use('/api/pharmacy',    require('./routes/pharmacy'));
app.use('/api/lab',         require('./routes/lab'));
app.use('/api/wards',       require('./routes/wards'));
app.use('/api/billing',     require('./routes/billing'));
app.use('/api/reports',     require('./routes/reports'));
app.use('/api/staff',       require('./routes/staff'));
app.use('/api/settings',    require('./routes/settings'));
app.use('/api/alerts',      require('./routes/alerts'));

/* ============== Static front-end ============== */
app.use(express.static(path.join(__dirname, '../pwa')));

/* ============== 404 for API ============== */
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

/* ============== Global error handler ============== */
app.use((err, _req, res, _next) => {
  console.error('ERROR:', err);
  res.status(500).json({ error: err.message || 'Server error' });
});

/* ============== Auto-seed on first run ============== */
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  console.log('First run detected — seeding…');
  require('child_process').execSync('node seed.js', { stdio: 'inherit', cwd: __dirname });
}

app.listen(PORT, () => {
  console.log('');
  console.log('  ┌──────────────────────────────────────────┐');
  console.log('  │   CareStation HMS  •  Server running         │');
  console.log(`  │   http://localhost:${PORT}                  │`);
  console.log('  └──────────────────────────────────────────┘');
  console.log('');
  console.log('  Demo login  →  admin@carestation.health / carestation123');
  console.log('');
});
