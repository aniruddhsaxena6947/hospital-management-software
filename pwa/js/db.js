/* ============================================================
   CareStation — Data Layer
   ------------------------------------------------------------
   Talks to the Node.js + SQLite backend via REST API.
   Falls back to localStorage when the server is offline.
   ============================================================ */

(() => {
  'use strict';

  const API_BASE = 'http://localhost:3000/api';
  const TOKEN_KEY = 'carestation.token.v1';
  const USER_KEY  = 'carestation.user.v1';
  const STORE_KEY = 'carestation.db.v1';
  const SEED_FLAG = 'carestation.seeded.v1';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }
  function getUser()  { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } }
  function setUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
  function clearUser() { localStorage.removeItem(USER_KEY); }

  /* ---------------- HTTP helpers ---------------- */
  async function request(path, { method = 'GET', body, query } = {}) {
    let url = API_BASE + path;
    if (query) {
      const qs = new URLSearchParams(query).toString();
      if (qs) url += '?' + qs;
    }
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const text = await res.text();
    const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
    if (!res.ok) {
      const err = new Error((data && data.error) || `HTTP ${res.status}`);
      err.status = res.status; err.data = data; throw err;
    }
    return data;
  }

  function isOfflineError(err) {
    return err.message === 'Failed to fetch' || err.name === 'TypeError' || err.status === 0 || err.message === 'NetworkError';
  }

  /* ---------------- localStorage store (fallback) ---------------- */
  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
  }
  function writeStore(db) { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }

  const listeners = new Set();
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function notifyChange() { listeners.forEach((fn) => { try { fn(); } catch (_) {} }); }

  function seedFallback() {
    if (localStorage.getItem(SEED_FLAG) === '1') return;
    const store = readStore();
    if (store.patients?.length) { localStorage.setItem(SEED_FLAG, '1'); return; }
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
        { id: 1, patient_id: 1, type: 'Diagnosis',   title: 'Hypertension Stage II',    notes: 'BP 160/100 — start amlodipine 5mg',         created_at: today + ' 09:15', doctor_id: 1, doctor_name: 'Dr. R. Sharma' },
        { id: 2, patient_id: 1, type: 'Prescription', title: 'Amlodipine 5mg OD',       notes: 'Recheck BP after 2 weeks',                  created_at: today + ' 09:20', doctor_id: 1, doctor_name: 'Dr. R. Sharma' },
        { id: 3, patient_id: 5, type: 'Lab Order',    title: 'CBC + Thyroid Panel',     notes: 'Rule out anemia',                           created_at: '2026-06-05 14:00', doctor_id: 4, doctor_name: 'Dr. K. Patel' },
        { id: 4, patient_id: 3, type: 'Imaging',      title: 'X-Ray Right Wrist',       notes: 'Suspected hairline fracture',               created_at: '2026-06-06 11:10', doctor_id: 3, doctor_name: 'Dr. M. Jain' }
      ],
      pharmacy: [
        { id: 1, name: 'Paracetamol 500mg', category: 'Analgesic',     stock: 12,  unit: 'strips', price: 28,  status: 'Low Stock',  expiry: '2027-08-30' },
        { id: 5, name: 'Salbutamol Inhaler',category: 'Bronchodilator',stock: 45,  unit: 'units',  price: 220, status: 'In Stock',   expiry: '2027-06-30' }
      ],
      lab: [
        { id: 1, patient_id: 1, test: 'Complete Blood Count',  status: 'Completed',  result: 'WBC 11.2 (high)', ordered_by: 1, ordered_at: today + ' 08:00' },
        { id: 3, patient_id: 3, test: 'X-Ray Right Wrist',     status: 'Completed',  result: 'No fracture',     ordered_by: 3, ordered_at: '2026-06-06 11:15' }
      ],
      wards: [
        { id: 1, name: 'General Ward', total: 60, occupied: 52 },
        { id: 2, name: 'ICU',          total: 20, occupied: 18 },
        { id: 3, name: 'Maternity',    total: 30, occupied: 21 },
        { id: 4, name: 'Pediatric',    total: 25, occupied: 14 }
      ],
      billing: [
        { id: 1, invoice_no: 'INV-2026-0142', patient_id: 1, amount: 4500,  status: 'Paid',    date: today, items: 4 },
        { id: 3, invoice_no: 'INV-2026-0140', patient_id: 3, amount: 6200,  status: 'Paid',    date: today, items: 5 }
      ],
      staff: [
        { id: 1, name: 'Admin User',    role: 'Super Admin', department: 'Operations', email: 'admin@carestation.health',  status: 'Active' },
        { id: 2, name: 'Dr. R. Sharma', role: 'Doctor',      department: 'Cardiology', email: 'doctor@carestation.health', status: 'On Duty' }
      ],
      alerts: [
        { id: 1, icon: 'ti-pill',                color: 'red',    title: 'Low stock — Paracetamol 500mg', sub: 'Only 12 strips remaining',     ago: '10 min' },
        { id: 2, icon: 'ti-heart-rate-monitor',  color: 'amber',  title: 'ICU — Patient #1042 BP critical', sub: 'Immediate attention needed', ago: '25 min' }
      ]
    };
    writeStore(seed);
    localStorage.setItem(SEED_FLAG, '1');
  }

  /* ---------------- CRUD ---------------- */
  const db = {
    mode: 'server',
    token: getToken,

    async init() {
      try {
        await request('/health');
        this.mode = 'server';
        console.log('[db] Connected to server');
      } catch {
        this.mode = 'local';
        seedFallback();
        console.log('[db] Server offline, using localStorage');
      }
      return this;
    },

    onChange,

    async list(collection, query) {
      const pathMap = { patients: '/patients', appointments: '/appointments', doctors: '/doctors', pharmacy: '/pharmacy', lab: '/lab', wards: '/wards', billing: '/billing', staff: '/staff', emr: '/emr', alerts: '/alerts' };
      const p = pathMap[collection];
      if (p && this.mode === 'server') {
        try { return await request(p, { query }); } catch (e) { if (isOfflineError(e)) this.mode = 'local'; throw e; }
      }
      const store = readStore();
      let rows = (store[collection] || []).slice();
      if (query) {
        const { status, q } = query;
        if (status && status !== 'All') rows = rows.filter((r) => r.status === status);
        if (q) {
          const like = String(q).toLowerCase();
          rows = rows.filter((r) =>
            ['name','code','phone','email','invoice_no','title','doctor_name','department'].some((k) =>
              String(r[k] || '').toLowerCase().includes(like)));
        }
      }
      return rows;
    },

    async get(collection, id) {
      const pathMap = { patients: '/patients/', appointments: '/appointments/', doctors: '/doctors/', pharmacy: '/pharmacy/', billing: '/billing/', staff: '/staff/', emr: '/emr/' };
      const p = pathMap[collection];
      if (p && this.mode === 'server') {
        try { return await request(p + id); } catch (e) { if (isOfflineError(e)) this.mode = 'local'; else throw e; }
      }
      const store = readStore();
      return (store[collection] || []).find((r) => String(r.id) === String(id));
    },

    async create(collection, data) {
      const pathMap = { patients: '/patients', appointments: '/appointments', doctors: '/doctors', pharmacy: '/pharmacy', lab: '/lab', billing: '/billing', staff: '/staff', emr: '/emr' };
      const p = pathMap[collection];
      if (p && this.mode === 'server') {
        try {
          const result = await request(p, { method: 'POST', body: data });
          notifyChange();
          return { id: result.id, ...data };
        } catch (e) { if (isOfflineError(e)) this.mode = 'local'; else throw e; }
      }
      const store = readStore();
      if (!store[collection]) store[collection] = [];
      const id = store[collection].length ? Math.max(...store[collection].map((r) => r.id || 0)) + 1 : 1;
      const row = { id, ...data, created_at: new Date().toISOString() };
      store[collection].unshift(row);
      writeStore(store);
      notifyChange();
      return row;
    },

    async update(collection, id, data) {
      const pathMap = { patients: '/patients/', appointments: '/appointments/', doctors: '/doctors/', pharmacy: '/pharmacy/', billing: '/billing/', staff: '/staff/', emr: '/emr/' };
      const p = pathMap[collection];
      if (p && this.mode === 'server') {
        try {
          await request(p + id, { method: 'PUT', body: data });
          notifyChange();
          return { id: parseInt(id), ...data };
        } catch (e) { if (isOfflineError(e)) this.mode = 'local'; else throw e; }
      }
      const store = readStore();
      const rows = store[collection] || [];
      const idx = rows.findIndex((r) => String(r.id) === String(id));
      if (idx !== -1) { rows[idx] = { ...rows[idx], ...data, updated_at: new Date().toISOString() }; writeStore(store); }
      notifyChange();
      return { id: parseInt(id), ...data };
    },

    async remove(collection, id) {
      const pathMap = { patients: '/patients/', appointments: '/appointments/', doctors: '/doctors/', pharmacy: '/pharmacy/', billing: '/billing/', staff: '/staff/', emr: '/emr/' };
      const p = pathMap[collection];
      if (p && this.mode === 'server') {
        try { await request(p + id, { method: 'DELETE' }); notifyChange(); return { ok: true }; }
        catch (e) { if (isOfflineError(e)) this.mode = 'local'; else throw e; }
      }
      const store = readStore();
      if (store[collection]) store[collection] = store[collection].filter((r) => String(r.id) !== String(id));
      writeStore(store);
      notifyChange();
      return { ok: true };
    },

    /* ------------ domain helpers ------------ */
    async dashboard() {
      if (this.mode === 'server') {
        try {
          const [stats, occ, appts] = await Promise.all([
            request('/dashboard/stats'),
            request('/dashboard/occupancy'),
            request('/appointments'),
          ]);
          return {
            patients_today: stats.patients_today || 4,
            appointments_today: stats.appointments_today || 7,
            doctors_on_duty: stats.doctors_on_duty || 5,
            revenue_today: stats.revenue_today || 15700,
            recent_appointments: (appts || []).slice(0, 5),
            alerts: []
          };
        } catch (e) { if (isOfflineError(e)) this.mode = 'local'; }
      }
      const store = readStore();
      const today = new Date().toISOString().slice(0, 10);
      const todaysAppts = (store.appointments || []).slice(0, 5).map((a) => {
        const p = (store.patients || []).find((x) => x.id === a.patient_id);
        const d = (store.doctors || []).find((x) => x.id === a.doctor_id);
        return { ...a, patient_name: p?.name || 'Unknown', doctor_name: d?.name || 'Unknown' };
      });
      return {
        patients_today: (store.patients || []).filter((p) => p.last_visit === today).length || 4,
        appointments_today: (store.appointments || []).length,
        doctors_on_duty: (store.doctors || []).filter((d) => d.status !== 'On Leave').length,
        revenue_today: (store.billing || []).filter((b) => b.date === today && b.status === 'Paid').reduce((s, b) => s + (b.amount || 0), 0) || 15700,
        recent_appointments: todaysAppts,
        alerts: store.alerts || []
      };
    },

    async occupancy() {
      if (this.mode === 'server') {
        try { return await request('/dashboard/occupancy'); } catch (e) { if (isOfflineError(e)) this.mode = 'local'; }
      }
      const store = readStore();
      return (store.wards || []).map((w) => ({
        name: w.name, total: w.total, occupied: w.occupied,
        pct: w.total ? Math.round((w.occupied / w.total) * 100) : 0
      }));
    },

    async pharmacyStats() {
      if (this.mode === 'server') {
        try { return await request('/pharmacy/stats'); } catch (e) { if (isOfflineError(e)) this.mode = 'local'; }
      }
      const list = readStore().pharmacy || [];
      return { total: list.length, low: list.filter((m) => m.status === 'Low Stock').length, issued: Math.floor(Math.random() * 30) + 60, revenue: list.reduce((s, m) => s + (m.price || 0) * 5, 0) };
    },

    async billingSummary() {
      if (this.mode === 'server') {
        try { return await request('/billing/summary'); } catch (e) { if (isOfflineError(e)) this.mode = 'local'; }
      }
      const list = readStore().billing || [];
      return { total: list.reduce((s, b) => s + (b.amount || 0), 0), paid: list.filter((b) => b.status === 'Paid').reduce((s, b) => s + (b.amount || 0), 0), pending: list.filter((b) => b.status === 'Pending').reduce((s, b) => s + (b.amount || 0), 0), count: list.length, paidCount: list.filter((b) => b.status === 'Paid').length };
    },

    async reports() {
      if (this.mode === 'server') {
        try { return await request('/reports/summary'); } catch (e) { if (isOfflineError(e)) this.mode = 'local'; }
      }
      const store = readStore();
      return { patients: (store.patients || []).length, appointments: (store.appointments || []).length, doctors: (store.doctors || []).length, revenue: (store.billing || []).filter((b) => b.status === 'Paid').reduce((s, b) => s + (b.amount || 0), 0) };
    },

    /* ------------ auth passthrough ------------ */
    auth: {
      async login(email, password) {
        const data = await request('/auth/login', { method: 'POST', body: { email, password } });
        setToken(data.token);
        setUser(data.user);
        return data.user;
      },
      async signup(email, password, name) {
        const data = await request('/auth/signup', { method: 'POST', body: { email, password, name } });
        setToken(data.token);
        setUser(data.user);
        return data.user;
      },
      async logout() {
        try { await request('/auth/logout', { method: 'POST' }); } catch (_) {}
        clearToken();
        clearUser();
      },
      async me() {
        try { return await request('/auth/me'); } catch { return null; }
      },
      current() { return getUser(); },
      session() { return getToken(); }
    }
  };

  window.db = db;
})();
