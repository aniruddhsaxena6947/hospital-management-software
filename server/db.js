const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'hms.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ============================================================
   Schema
   ============================================================ */
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'admin',
    avatar        TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS patients (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    code         TEXT UNIQUE NOT NULL,
    name         TEXT NOT NULL,
    age          INTEGER,
    sex          TEXT,
    blood_group  TEXT,
    phone        TEXT,
    doctor_id    INTEGER REFERENCES doctors(id),
    department   TEXT,
    status       TEXT DEFAULT 'OPD',
    last_visit   TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS doctors (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    code         TEXT UNIQUE NOT NULL,
    name         TEXT NOT NULL,
    department   TEXT,
    status       TEXT DEFAULT 'Available',
    appointments INTEGER DEFAULT 0,
    load_pct     INTEGER DEFAULT 0,
    avatar_color TEXT DEFAULT 'primary'
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    time        TEXT NOT NULL,
    patient_id  INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id   INTEGER REFERENCES doctors(id),
    type        TEXT,
    status      TEXT DEFAULT 'Scheduled',
    notes       TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS emr_records (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id  INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id   INTEGER REFERENCES doctors(id),
    type        TEXT,
    title       TEXT,
    notes       TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS prescriptions (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL REFERENCES emr_records(id) ON DELETE CASCADE,
    medicine  TEXT,
    dose      TEXT,
    frequency TEXT,
    duration  TEXT,
    notes     TEXT
  );

  CREATE TABLE IF NOT EXISTS medicines (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT UNIQUE NOT NULL,
    category  TEXT,
    stock     INTEGER DEFAULT 0,
    unit      TEXT DEFAULT 'Strips',
    status    TEXT DEFAULT 'OK',
    threshold INTEGER DEFAULT 50
  );

  CREATE TABLE IF NOT EXISTS lab_tests (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id  INTEGER REFERENCES doctors(id),
    test       TEXT,
    time       TEXT,
    status     TEXT DEFAULT 'Collected',
    result_url TEXT
  );

  CREATE TABLE IF NOT EXISTS wards (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT UNIQUE NOT NULL,
    total_beds  INTEGER DEFAULT 0,
    occupied    INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    code       TEXT UNIQUE NOT NULL,
    patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    amount     REAL DEFAULT 0,
    mode       TEXT,
    date       TEXT,
    status     TEXT DEFAULT 'Paid'
  );

  CREATE TABLE IF NOT EXISTS staff (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    code       TEXT UNIQUE NOT NULL,
    name       TEXT NOT NULL,
    role       TEXT,
    department TEXT,
    shift      TEXT,
    status     TEXT DEFAULT 'On Duty'
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS permissions (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    role     TEXT NOT NULL,
    resource TEXT NOT NULL,
    allowed  INTEGER DEFAULT 0,
    UNIQUE(role, resource)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    type    TEXT,
    title   TEXT,
    sub     TEXT,
    ago     TEXT,
    icon    TEXT,
    color   TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER,
    action    TEXT,
    target    TEXT,
    detail    TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_patients_status    ON patients(status);
  CREATE INDEX IF NOT EXISTS idx_appointments_time  ON appointments(time);
  CREATE INDEX IF NOT EXISTS idx_emr_patient        ON emr_records(patient_id);
  CREATE INDEX IF NOT EXISTS idx_lab_patient        ON lab_tests(patient_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_date      ON invoices(date);
`);

module.exports = db;
