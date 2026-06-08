/* ============================================================
   MediCore — Data Layer
   ------------------------------------------------------------
   Unified API for patients, doctors, appointments, etc.
   Uses Firebase Firestore if configured, otherwise a
   localStorage-backed store with the same shape — so the PWA
   works fully offline and in demo mode without any backend.
   ============================================================ */

(() => {
  'use strict';

  const COLLECTIONS = ['patients', 'doctors', 'appointments', 'emr', 'pharmacy', 'lab', 'wards', 'billing', 'staff', 'alerts'];
  const STORE_KEY   = 'medicore.db.v1';
  const SESSION_KEY = 'medicore.session.v1';
  const USER_KEY    = 'medicore.user.v1';
  const SEED_FLAG   = 'medicore.seeded.v1';

  /* ---------------- storage helpers ---------------- */
  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch { return {}; }
  }
  function writeStore(db) {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
    notifyChange();
  }
  function ensureCollection(db, name) {
    if (!db[name]) db[name] = [];
    return db[name];
  }
  function nextId(rows) {
    return rows.length ? Math.max(...rows.map((r) => r.id || 0)) + 1 : 1;
  }
  const listeners = new Set();
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function notifyChange() { listeners.forEach((fn) => { try { fn(); } catch (_) {} }); }

  /* ---------------- demo seed data ---------------- */
  function seedIfEmpty() {
    if (localStorage.getItem(SEED_FLAG) === '1') return;
    if (readStore().patients?.length) {
      localStorage.setItem(SEED_FLAG, '1');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const seed = {
      patients: [
        { id: 1, code: 'P1042', name: 'Ramesh Gupta',   age: 58, sex: 'Male',   blood_group: 'B+',  phone: '+91 98101 11111', doctor_id: 1, department: 'Cardiology',  status: 'Critical',   last_visit: today },
        { id: 2, code: 'P1041', name: 'Priya Mehta',    age: 32, sex: 'Female', blood_group: 'O+',  phone: '+91 98102 22222', doctor_id: 2, department: 'Gynecology',  status: 'Active',     last_visit: today },
        { id: 3, code: 'P1040', name: 'Anil Kumar',     age: 45, sex: 'Male',   blood_group: 'A+',  phone: '+91 98103 33333', doctor_id: 3, department: 'Orthopedics', status: 'Waiting',    last_visit: today },
        { id: 4, code: 'P1039', name: 'Sunita Devi',    age: 61, sex: 'Female', blood_group: 'AB+', phone: '+91 98104 44444', doctor_id: 1, department: 'Cardiology',  status: 'Stable',     last_visit: '2026-06-05' },
        { id: 5, code: 'P1038', name: 'Kavya Singh',    age: 8,  sex: 'Female', blood_group: 'O+',  phone: '+91 98105 55555', doctor_id: 4, department: 'Pediatrics',  status: 'Stable',     last_visit: '2026-06-05' },
        { id: 6, code: 'P1037', name: 'Vikram Reddy',   age: 52, sex: 'Male',   blood_group: 'B-',  phone: '+91 98106 66666', doctor_id: 5, department: 'Neurology',   status: 'Active',     last_visit: '2026-06-04' },
        { id: 7, code: 'P1036', name: 'Meera Joshi',    age: 29, sex: 'Female', blood_group: 'A+',  phone: '+91 98107 77777', doctor_id: 6, department: 'Dermatology', status: 'Discharged', last_visit: '2026-06-03' },
        { id: 8, code: 'P1035', name: 'Rahul Verma',    age: 37, sex: 'Male',   blood_group: 'O-',  phone: '+91 98108 88888', doctor_id: 3, department: 'Orthopedics', status: 'Stable',     last_visit: '2026-06-02' }
      ],
      doctors: [
        { id: 1, name: 'Dr. R. Sharma',  department: 'Cardiology',  status: 'Available',        avatar_color: 'primary', appointments: 12, load_pct: 70 },
        { id: 2, name: 'Dr. P. Rao',     department: 'Gynecology',  status: 'In Consultation',  avatar_color: 'purple',  appointments: 8,  load_pct: 55 },
        { id: 3, name: 'Dr. M. Jain',    department: 'Orthopedics', status: 'Available',        avatar_color: 'teal',    appointments: 10, load_pct: 60 },
        { id: 4, name: 'Dr. K. Patel',   department: 'Pediatrics',  status: 'Available',        avatar_color: 'green',   appointments: 14, load_pct: 80 },
        { id: 5, name: 'Dr. A. Khan',    department: 'Neurology',   status: 'In Surgery',       avatar_color: 'red',     appointments: 5,  load_pct: 45 },
        { id: 6, name: 'Dr. S. Iyer',    department: 'Dermatology', status: 'Available',        avatar_color: 'amber',   appointments: 9,  load_pct: 50 }
      ],
      appointments: [
        { id: 1, time: '09:00', patient_id: 1, doctor_id: 1, department: 'Cardiology',  status: 'Done',      type: 'Follow-up' },
        { id: 2, time: '10:30', patient_id: 2, doctor_id: 2, department: 'Gynecology',  status: 'Ongoing',   type: 'Consultation' },
        { id: 3, time: '11:00', patient_id: 3, doctor_id: 3, department: 'Orthopedics', status: 'Waiting',   type: 'X-Ray Review' },
        { id: 4, time: '11:30', patient_id: 4, doctor_id: 1, department: 'Cardiology',  status: 'Scheduled', type: 'New Patient' },
        { id: 5, time: '12:00', patient_id: 5, doctor_id: 4, department: 'Pediatrics',  status: 'Scheduled', type: 'Consultation' },
        { id: 6, time: '14:00', patient_id: 6, doctor_id: 5, department: 'Neurology',   status: 'Scheduled', type: 'Procedure' },
        { id: 7, time: '15:30', patient_id: 8, doctor_id: 3, department: 'Orthopedics', status: 'Scheduled', type: 'Follow-up' }
      ],
      emr: [
        { id: 1, patient_id: 1, type: 'Diagnosis', title: 'Hypertension Stage II', notes: 'BP 160/100 — start amlodipine 5mg',         created_at: '2026-06-07 09:15', doctor_id: 1, doctor_name: 'Dr. R. Sharma' },
        { id: 2, patient_id: 1, type: 'Prescription', title: 'Amlodipine 5mg OD',   notes: 'Recheck BP after 2 weeks',                  created_at: '2026-06-07 09:20', doctor_id: 1, doctor_name: 'Dr. R. Sharma' },
        { id: 3, patient_id: 5, type: 'Lab Order', title: 'CBC + Thyroid Panel',  notes: 'Rule out anemia; fatigue x 3 weeks',         created_at: '2026-06-05 14:00', doctor_id: 4, doctor_name: 'Dr. K. Patel' },
        { id: 4, patient_id: 3, type: 'Imaging', title: 'X-Ray Right Wrist',     notes: 'Suspected hairline fracture',                created_at: '2026-06-06 11:10', doctor_id: 3, doctor_name: 'Dr. M. Jain' }
      ],
      pharmacy: [
        { id: 1, name: 'Paracetamol 500mg', category: 'Analgesic',     stock: 12,  unit: 'strips', price: 28,  status: 'Low Stock',  expiry: '2027-08-30' },
        { id: 2, name: 'Amoxicillin 500mg', category: 'Antibiotic',    stock: 240, unit: 'caps',   price: 12,  status: 'In Stock',   expiry: '2027-04-15' },
        { id: 3, name: 'Amlodipine 5mg',    category: 'Antihypertensive', stock: 180, unit: 'tabs', price: 8,   status: 'In Stock',   expiry: '2027-12-20' },
        { id: 4, name: 'Insulin Glargine',  category: 'Antidiabetic',  stock: 8,   unit: 'pens',   price: 950, status: 'Low Stock',  expiry: '2026-12-31' },
        { id: 5, name: 'Salbutamol Inhaler',category: 'Bronchodilator',stock: 45,  unit: 'units',  price: 220, status: 'In Stock',   expiry: '2027-06-30' },
        { id: 6, name: 'Cetirizine 10mg',   category: 'Antihistamine', stock: 320, unit: 'tabs',   price: 5,   status: 'In Stock',   expiry: '2028-01-31' }
      ],
      lab: [
        { id: 1, patient_id: 1, test: 'Complete Blood Count',    status: 'Completed',  result: 'WBC 11.2 (high)', ordered_by: 1, ordered_at: '2026-06-07 08:00' },
        { id: 2, patient_id: 5, test: 'Thyroid Panel (T3/T4/TSH)', status: 'Pending', result: '—',                 ordered_by: 4, ordered_at: '2026-06-05 14:05' },
        { id: 3, patient_id: 3, test: 'X-Ray Right Wrist',       status: 'Completed',  result: 'No fracture',       ordered_by: 3, ordered_at: '2026-06-06 11:15' },
        { id: 4, patient_id: 8, test: 'Lipid Profile',           status: 'In Progress',result: '—',                ordered_by: 3, ordered_at: '2026-06-07 09:30' }
      ],
      wards: [
        { id: 1, name: 'General Ward', total: 60, occupied: 52 },
        { id: 2, name: 'ICU',          total: 20, occupied: 18 },
        { id: 3, name: 'Maternity',    total: 30, occupied: 21 },
        { id: 4, name: 'Pediatric',    total: 25, occupied: 14 }
      ],
      billing: [
        { id: 1, invoice_no: 'INV-2026-0142', patient_id: 1, amount: 4500,  status: 'Paid',    date: '2026-06-07', items: 4 },
        { id: 2, invoice_no: 'INV-2026-0141', patient_id: 2, amount: 1800,  status: 'Pending', date: '2026-06-07', items: 2 },
        { id: 3, invoice_no: 'INV-2026-0140', patient_id: 3, amount: 6200,  status: 'Paid',    date: '2026-06-06', items: 5 },
        { id: 4, invoice_no: 'INV-2026-0139', patient_id: 5, amount: 950,   status: 'Pending', date: '2026-06-05', items: 1 },
        { id: 5, invoice_no: 'INV-2026-0138', patient_id: 8, amount: 3200,  status: 'Paid',    date: '2026-06-02', items: 3 }
      ],
      staff: [
        { id: 1, name: 'Admin User',     role: 'Super Admin', department: 'Operations', email: 'admin@medicore.health',    status: 'Active' },
        { id: 2, name: 'Dr. R. Sharma',  role: 'Doctor',      department: 'Cardiology', email: 'doctor@medicore.health',   status: 'On Duty' },
        { id: 3, name: 'Nurse Priya',    role: 'Nurse',       department: 'ICU',        email: 'nurse@medicore.health',    status: 'On Duty' },
        { id: 4, name: 'Accounts Team',  role: 'Accountant',  department: 'Finance',    email: 'accounts@medicore.health', status: 'Active' }
      ],
      alerts: [
        { id: 1, icon: 'ti-pill',                color: 'red',    title: 'Low stock — Paracetamol 500mg',  sub: 'Only 12 strips remaining',    ago: '10 min' },
        { id: 2, icon: 'ti-heart-rate-monitor',  color: 'amber',  title: 'ICU — Patient #1042 BP critical',sub: 'Immediate attention needed',   ago: '25 min' },
        { id: 3, icon: 'ti-flask',               color: 'primary',title: 'Lab report ready — Patient #1038', sub: 'Blood CBC results uploaded', ago: '1 hr' },
        { id: 4, icon: 'ti-circle-check',        color: 'green',  title: 'Surgery #SC-119 completed',      sub: 'Patient shifted to recovery', ago: '2 hr' }
      ]
    };

    writeStore(seed);
    localStorage.setItem(SEED_FLAG, '1');
  }

  /* ---------------- auth (demo mode) ---------------- */
  function loginDemo(email, password) {
    const u = (window.FIREBASE_DEMO_USERS || []).find((x) => x.email === email && x.password === password);
    if (!u) throw new Error('Invalid email or password');
    const user = { id: Date.now(), email: u.email, name: u.name, role: u.role, avatar: initials(u.name) };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_KEY, 'demo-' + user.id);
    return user;
  }

  function registerDemo(email, password, name) {
    if ((window.FIREBASE_DEMO_USERS || []).some((x) => x.email === email)) {
      throw new Error('Account already exists for this email');
    }
    const user = { id: Date.now(), email, name, role: 'staff', avatar: initials(name) };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_KEY, 'demo-' + user.id);
    return user;
  }

  function logoutDemo() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  function currentUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
  }
  function currentSession() { return localStorage.getItem(SESSION_KEY); }

  function initials(name) {
    return (name || '?').split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  }

  /* ---------------- CRUD API ---------------- */
  const db = {
    mode: 'demo',
    init() {
      seedIfEmpty();
      return this;
    },

    onChange,

    list(collection, query) {
      const db = readStore();
      let rows = (db[collection] || []).slice();
      if (query) {
        const { status, q } = query;
        if (status && status !== 'All') rows = rows.filter((r) => r.status === status);
        if (q) {
          const like = String(q).toLowerCase();
          rows = rows.filter((r) =>
            ['name', 'code', 'phone', 'email', 'invoice_no', 'title', 'doctor_name', 'department'].some((k) =>
              String(r[k] || '').toLowerCase().includes(like)));
        }
      }
      return rows;
    },

    get(collection, id) {
      const db = readStore();
      return (db[collection] || []).find((r) => String(r.id) === String(id));
    },

    create(collection, data) {
      const db = readStore();
      const rows = ensureCollection(db, collection);
      const id = nextId(rows);
      const row = { id, ...data, created_at: new Date().toISOString() };
      rows.unshift(row);
      writeStore(db);
      return row;
    },

    update(collection, id, data) {
      const db = readStore();
      const rows = ensureCollection(db, collection);
      const idx = rows.findIndex((r) => String(r.id) === String(id));
      if (idx === -1) throw new Error('Not found');
      rows[idx] = { ...rows[idx], ...data, updated_at: new Date().toISOString() };
      writeStore(db);
      return rows[idx];
    },

    remove(collection, id) {
      const db = readStore();
      const rows = ensureCollection(db, collection);
      const next = rows.filter((r) => String(r.id) !== String(id));
      db[collection] = next;
      writeStore(db);
      return { ok: true };
    },

    /* ------------ domain helpers ------------ */
    dashboard() {
      const db = readStore();
      const today = new Date().toISOString().slice(0, 10);
      const todaysAppts = (db.appointments || []).slice(0, 5);
      return {
        patients_today:    (db.patients || []).filter((p) => p.last_visit === today).length || 4,
        appointments_today:(db.appointments || []).length,
        doctors_on_duty:   (db.doctors || []).filter((d) => d.status !== 'On Leave').length,
        revenue_today:     (db.billing || []).filter((b) => b.date === today && b.status === 'Paid').reduce((s, b) => s + (b.amount || 0), 0) || 15700,
        recent_appointments: todaysAppts.map((a) => {
          const p = (db.patients || []).find((x) => x.id === a.patient_id);
          const d = (db.doctors || []).find((x) => x.id === a.doctor_id);
          return { ...a, patient_name: p?.name || 'Unknown', doctor_name: d?.name || 'Unknown' };
        }),
        alerts: db.alerts || []
      };
    },

    occupancy() {
      return this.list('wards').map((w) => ({
        name: w.name, total: w.total, occupied: w.occupied,
        pct: Math.round((w.occupied / w.total) * 100)
      }));
    },

    pharmacyStats() {
      const list = this.list('pharmacy');
      return {
        total: list.length,
        low:   list.filter((m) => m.status === 'Low Stock').length,
        issued: Math.floor(Math.random() * 30) + 60,
        revenue: list.reduce((s, m) => s + (m.price * 5), 0)
      };
    },

    billingSummary() {
      const list = this.list('billing');
      return {
        total:     list.reduce((s, b) => s + b.amount, 0),
        paid:      list.filter((b) => b.status === 'Paid').reduce((s, b) => s + b.amount, 0),
        pending:   list.filter((b) => b.status === 'Pending').reduce((s, b) => s + b.amount, 0),
        count:     list.length,
        paidCount: list.filter((b) => b.status === 'Paid').length
      };
    },

    reports() {
      const db = readStore();
      return {
        patients:     (db.patients || []).length,
        appointments: (db.appointments || []).length,
        doctors:      (db.doctors || []).length,
        revenue:      (db.billing || []).filter((b) => b.status === 'Paid').reduce((s, b) => s + b.amount, 0)
      };
    },

    /* ------------ auth passthrough ------------ */
    auth: {
      login:    loginDemo,
      register: registerDemo,
      logout:   logoutDemo,
      current:  currentUser,
      session:  currentSession
    }
  };

  window.db = db.init();
})();
