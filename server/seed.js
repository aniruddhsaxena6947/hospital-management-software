const bcrypt = require('bcryptjs');
const db = require('./db');

console.log('🌱  Seeding CareStation database…');

/* ============== USERS ============== */
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  const hash = bcrypt.hashSync('carestation123', 10);
  const insertUser = db.prepare(`INSERT INTO users (email, password_hash, name, role, avatar) VALUES (?, ?, ?, ?, ?)`);
  insertUser.run('admin@carestation.health', hash, 'Admin User',    'admin',         'AD');
  insertUser.run('doctor@carestation.health', hash, 'Dr. R. Sharma', 'doctor',        'RS');
  insertUser.run('nurse@carestation.health',   hash, 'Meena Kumari',  'nurse',         'MK');
  insertUser.run('accounts@carestation.health',hash, 'Pooja Shah',    'accountant',    'PS');
  console.log('  ✓ 4 users  (admin@carestation.health / carestation123)');
}

/* ============== DOCTORS ============== */
const docCount = db.prepare('SELECT COUNT(*) AS c FROM doctors').get().c;
if (docCount === 0) {
  const ins = db.prepare(`INSERT INTO doctors (code, name, department, status, appointments, load_pct, avatar_color) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const docs = [
    ['D001', 'Dr. R. Sharma', 'Cardiology',  'Available',       8, 80, 'primary'],
    ['D002', 'Dr. P. Rao',    'Gynecology',  'In Consultation', 6, 60, 'purple'],
    ['D003', 'Dr. M. Jain',   'Orthopedics', 'In Surgery',      4, 40, 'green'],
    ['D004', 'Dr. K. Patel',  'Pediatrics',  'Available',       9, 90, 'amber'],
    ['D005', 'Dr. A. Verma',  'Neurology',   'On Leave',        0,  0, 'red'],
    ['D006', 'Dr. S. Gupta',  'Dermatology', 'Available',       5, 50, 'teal'],
  ];
  docs.forEach(d => ins.run(...d));
  console.log(`  ✓ ${docs.length} doctors`);
}

/* ============== PATIENTS ============== */
const patCount = db.prepare('SELECT COUNT(*) AS c FROM patients').get().c;
if (patCount === 0) {
  const ins = db.prepare(`INSERT INTO patients (code, name, age, sex, blood_group, phone, doctor_id, department, status, last_visit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const patients = [
    ['P1042', 'Ramesh Gupta',  54, 'M', 'B+',  '+91 98100 11122', 1, 'Cardiology',  'Admitted',   'Today'],
    ['P1041', 'Priya Mehta',   29, 'F', 'O+',  '+91 98220 22233', 2, 'Gynecology',  'OPD',        'Today'],
    ['P1040', 'Anil Kumar',    41, 'M', 'A+',  '+91 98330 33344', 3, 'Orthopedics', 'OPD',        'Today'],
    ['P1039', 'Kavya Singh',    7, 'F', 'AB+', '+91 98440 44455', 4, 'Pediatrics',  'Admitted',   'Yesterday'],
    ['P1038', 'Mohammed Ali',  62, 'M', 'O-',  '+91 98550 55566', 5, 'Neurology',   'Discharged', '3 Jun'],
    ['P1037', 'Sunita Devi',   35, 'F', 'A-',  '+91 98660 66677', 1, 'Cardiology',  'Pending',    '2 Jun'],
    ['P1036', 'Ravi Tiwari',   48, 'M', 'B+',  '+91 98770 77788', 6, 'Dermatology', 'OPD',        '2 Jun'],
    ['P1035', 'Asha Reddy',    26, 'F', 'O+',  '+91 98880 88899', 2, 'Gynecology',  'OPD',        '1 Jun'],
  ];
  patients.forEach(p => ins.run(...p));
  console.log(`  ✓ ${patients.length} patients`);
}

/* ============== APPOINTMENTS ============== */
const apptCount = db.prepare('SELECT COUNT(*) AS c FROM appointments').get().c;
if (apptCount === 0) {
  const ins = db.prepare(`INSERT INTO appointments (time, patient_id, doctor_id, type, status, notes) VALUES (?, ?, ?, ?, ?, ?)`);
  const appts = [
    ['09:00', 1, 1, 'Follow-up',    'Done',      ''],
    ['10:30', 2, 2, 'Consultation', 'Ongoing',   ''],
    ['11:00', 3, 3, 'X-Ray Review', 'Waiting',   ''],
    ['11:30', 6, 1, 'New Patient',  'Scheduled', ''],
    ['12:00', 4, 4, 'Consultation', 'Scheduled', ''],
    ['12:30', 7, 6, 'Skin check',   'Scheduled', ''],
    ['14:00', 5, 5, 'Follow-up',    'Scheduled', ''],
  ];
  appts.forEach(a => ins.run(...a));
  console.log(`  ✓ ${appts.length} appointments`);
}

/* ============== MEDICINES ============== */
const medCount = db.prepare('SELECT COUNT(*) AS c FROM medicines').get().c;
if (medCount === 0) {
  const ins = db.prepare(`INSERT INTO medicines (name, category, stock, unit, status, threshold) VALUES (?, ?, ?, ?, ?, ?)`);
  const meds = [
    ['Paracetamol 500mg', 'Analgesic', 12,  'Strips', 'Critical', 50],
    ['Amlodipine 5mg',    'Cardiac',   84,  'Strips', 'OK',       50],
    ['Metformin 500mg',   'Diabetic',  45,  'Strips', 'Low',      50],
    ['Amoxicillin 250mg', 'Antibiotic',120, 'Caps',   'OK',       50],
    ['Omeprazole 20mg',   'GI',        30,  'Caps',   'Low',      50],
    ['Atorvastatin 10mg', 'Cardiac',   78,  'Strips', 'OK',       50],
    ['Aspirin 75mg',      'Cardiac',   95,  'Strips', 'OK',       50],
    ['Cetirizine 10mg',   'Antihist.', 200, 'Strips', 'OK',       50],
  ];
  meds.forEach(m => ins.run(...m));
  console.log(`  ✓ ${meds.length} medicines`);
}

/* ============== LAB TESTS ============== */
const labCount = db.prepare('SELECT COUNT(*) AS c FROM lab_tests').get().c;
if (labCount === 0) {
  const ins = db.prepare(`INSERT INTO lab_tests (patient_id, doctor_id, test, time, status) VALUES (?, ?, ?, ?, ?)`);
  const tests = [
    [1, 1, 'CBC + ECG',     '09:15', 'Ready'],
    [2, 2, 'HbA1c',         '10:45', 'Processing'],
    [4, 4, 'Dengue NS1',    '11:00', 'Processing'],
    [7, 6, 'Blood Sugar F', '11:30', 'Collected'],
  ];
  tests.forEach(t => ins.run(...t));
  console.log(`  ✓ ${tests.length} lab tests`);
}

/* ============== WARDS ============== */
const wardCount = db.prepare('SELECT COUNT(*) AS c FROM wards').get().c;
if (wardCount === 0) {
  const ins = db.prepare(`INSERT INTO wards (name, total_beds, occupied) VALUES (?, ?, ?)`);
  const wards = [
    ['General Ward A', 30, 26],
    ['ICU',            20, 18],
    ['Maternity Ward', 30, 21],
    ['Pediatric Ward', 25, 14],
    ['Private Rooms',  40, 35],
    ['General Ward B', 55, 39],
  ];
  wards.forEach(w => ins.run(...w));
  console.log(`  ✓ ${wards.length} wards`);
}

/* ============== INVOICES ============== */
const invCount = db.prepare('SELECT COUNT(*) AS c FROM invoices').get().c;
if (invCount === 0) {
  const ins = db.prepare(`INSERT INTO invoices (code, patient_id, amount, mode, date, status) VALUES (?, ?, ?, ?, ?, ?)`);
  const invs = [
    ['INV2241', 1, 12500, 'Card',      '2026-06-07', 'Paid'],
    ['INV2240', 2,  3200, 'UPI',       '2026-06-07', 'Paid'],
    ['INV2239', 4,  8700, 'Cash',      '2026-06-06', 'Paid'],
    ['INV2238', 5, 45000, 'Insurance', '2026-06-04', 'Pending'],
    ['INV2237', 6,  5600, 'Cash',      '2026-06-03', 'Overdue'],
    ['INV2236', 3,  2100, 'UPI',       '2026-06-02', 'Paid'],
    ['INV2235', 7,  1500, 'Cash',      '2026-06-01', 'Paid'],
  ];
  invs.forEach(i => ins.run(...i));
  console.log(`  ✓ ${invs.length} invoices`);
}

/* ============== STAFF ============== */
const stfCount = db.prepare('SELECT COUNT(*) AS c FROM staff').get().c;
if (stfCount === 0) {
  const ins = db.prepare(`INSERT INTO staff (code, name, role, department, shift, status) VALUES (?, ?, ?, ?, ?, ?)`);
  const staff = [
    ['S001', 'Dr. R. Sharma', 'Doctor',      'Cardiology', 'Morning', 'On Duty'],
    ['S002', 'Meena Kumari',  'Nurse',       'ICU',        'Morning', 'On Duty'],
    ['S003', 'Raj Mishra',    'Receptionist','OPD',        'Morning', 'On Duty'],
    ['S004', 'Pooja Shah',    'Pharmacist',  'Pharmacy',   'Morning', 'On Duty'],
    ['S005', 'Dr. A. Verma',  'Doctor',      'Neurology',  '—',       'On Leave'],
    ['S006', 'Arjun Das',     'Lab Tech',    'Pathology',  'Evening', 'Off Shift'],
  ];
  staff.forEach(s => ins.run(...s));
  console.log(`  ✓ ${staff.length} staff`);
}

/* ============== SETTINGS ============== */
const setCount = db.prepare('SELECT COUNT(*) AS c FROM settings').get().c;
if (setCount === 0) {
  const ins = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`);
  const sets = [
    ['hospital_name',    'CareStation Hospital'],
    ['registration_no',  'MH-REG-2019-041'],
    ['city',             'Aligarh, UP'],
    ['contact',          '+91 9876543210'],
  ];
  sets.forEach(s => ins.run(...s));
  console.log(`  ✓ ${sets.length} settings`);
}

/* ============== PERMISSIONS ============== */
const permCount = db.prepare('SELECT COUNT(*) AS c FROM permissions').get().c;
if (permCount === 0) {
  const ins = db.prepare(`INSERT INTO permissions (role, resource, allowed) VALUES (?, ?, ?)`);
  const perms = [
    ['admin',        'patients', 1],['admin',        'billing',  1],['admin',        'reports', 1],['admin',        'admin', 1],
    ['doctor',       'patients', 1],['doctor',       'billing',  0],['doctor',       'reports', 0],['doctor',       'admin', 0],
    ['receptionist', 'patients', 1],['receptionist', 'billing',  1],['receptionist', 'reports', 0],['receptionist', 'admin', 0],
    ['nurse',        'patients', 1],['nurse',        'billing',  0],['nurse',        'reports', 0],['nurse',        'admin', 0],
    ['accountant',   'patients', 0],['accountant',   'billing',  1],['accountant',   'reports', 1],['accountant',   'admin', 0],
  ];
  perms.forEach(p => ins.run(...p));
  console.log(`  ✓ ${perms.length} permission rules`);
}

/* ============== ALERTS ============== */
const alertCount = db.prepare('SELECT COUNT(*) AS c FROM alerts').get().c;
if (alertCount === 0) {
  const ins = db.prepare(`INSERT INTO alerts (type, title, sub, ago, icon, color) VALUES (?, ?, ?, ?, ?, ?)`);
  const alerts = [
    ['stock',    'Low stock — Paracetamol 500mg',     'Only 12 strips remaining',  '10 min', 'ti ti-pill',               'red'],
    ['icu',      'ICU — Patient #1042 BP critical',   'Immediate attention needed', '25 min', 'ti ti-heart-rate-monitor', 'amber'],
    ['lab',      'Lab report ready — Patient #1038',  'Blood CBC results uploaded', '1 hr',   'ti ti-flask',              'primary'],
    ['surgery',  'Surgery #SC-119 completed',         'Patient shifted to recovery','2 hr',   'ti ti-circle-check',       'green'],
  ];
  alerts.forEach(a => ins.run(...a));
  console.log(`  ✓ ${alerts.length} alerts`);
}

/* ============== EMR / PRESCRIPTIONS ============== */
const emrCount = db.prepare('SELECT COUNT(*) AS c FROM emr_records').get().c;
if (emrCount === 0) {
  const rec = db.prepare(`INSERT INTO emr_records (patient_id, doctor_id, type, title, notes) VALUES (?, ?, ?, ?, ?)`).run(1, 1, 'admission', 'Chest pain — admitted to cardiology', 'ICU Bed 4');
  const pres = db.prepare(`INSERT INTO prescriptions (record_id, medicine, dose, frequency, duration, notes) VALUES (?, ?, ?, ?, ?, ?)`);
  pres.run(rec.lastInsertRowid, 'Amlodipine 5mg',    '1 tab', 'Morning', '30 days', 'After food');
  pres.run(rec.lastInsertRowid, 'Aspirin 75mg',      '1 tab', 'Morning', '30 days', 'After food');
  pres.run(rec.lastInsertRowid, 'Atorvastatin 10mg', '1 tab', 'Night',   '30 days', '');
  db.prepare(`INSERT INTO emr_records (patient_id, doctor_id, type, title, notes) VALUES (?, ?, ?, ?, ?)`).run(1, 1, 'follow-up', 'BP follow-up — OPD consultation', '14 Apr 2026');
  db.prepare(`INSERT INTO emr_records (patient_id, doctor_id, type, title, notes) VALUES (?, ?, ?, ?, ?)`).run(1, 5, 'diagnosis', 'Hypertension diagnosis — new patient', '2 Jan 2026');
  console.log(`  ✓ 3 EMR records + 3 prescriptions`);
}

console.log('🌿  Seed complete.\n');
process.exit(0);
