/* ============================================================
   CareStation — Page Renderers
   ------------------------------------------------------------
   Each page function returns the HTML for that section.
   afterRender() wires up the data binding and event handlers.
   ============================================================ */

(() => {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const initials = (n) => (n || '?').split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
  const today = () => new Date().toISOString().slice(0, 10);

  function statusPill(status) {
    const m = {
      'Critical':   'p-red',
      'Active':     'p-blue',
      'Waiting':    'p-amber',
      'Stable':     'p-green',
      'Discharged': 'p-teal',
      'Done':       'p-green',
      'Ongoing':    'p-blue',
      'Scheduled':  'p-gray',
      'Paid':       'p-green',
      'Pending':    'p-amber',
      'Available':  'p-green',
      'In Consultation': 'p-blue',
      'In Surgery': 'p-red',
      'On Leave':   'p-gray',
      'On Duty':    'p-green',
      'Low Stock':  'p-red',
      'In Stock':   'p-green',
      'In Progress':'p-blue',
      'Completed':  'p-green'
    };
    return `<span class="pill ${m[status] || 'p-gray'}">${esc(status || '—')}</span>`;
  }

  function occColor(pct) { return pct >= 85 ? 'red' : pct >= 70 ? 'amber' : 'green'; }

  /* ============================================================
     DASHBOARD
     ============================================================ */
  function dashboard() {
    return `
      <div class="stat-grid" id="dashboard-stats">
        <div class="scard" style="--d:0ms">
          <div class="scard-top">
            <div class="scard-icon ic-primary"><i class="ti ti-users"></i></div>
            <span class="scard-badge p-green">+12 today</span>
          </div>
          <div><div class="scard-val" id="d-patients">0</div><div class="scard-label">Total Patients Today</div></div>
          <div class="scard-sub up"><i class="ti ti-trending-up"></i> 8% above avg</div>
        </div>
        <div class="scard" style="--d:80ms">
          <div class="scard-top">
            <div class="scard-icon ic-purple"><i class="ti ti-calendar-check"></i></div>
            <span class="scard-badge p-amber" id="d-pending-badge">— pending</span>
          </div>
          <div><div class="scard-val" id="d-appts">0</div><div class="scard-label">Appointments Today</div></div>
          <div class="scard-sub purple"><i class="ti ti-check"></i> <span id="d-appts-done">0</span> completed</div>
        </div>
        <div class="scard" style="--d:160ms">
          <div class="scard-top">
            <div class="scard-icon ic-green"><i class="ti ti-stethoscope"></i></div>
            <span class="scard-badge p-green" id="d-free-badge">— free now</span>
          </div>
          <div><div class="scard-val" id="d-doctors">0</div><div class="scard-label">Doctors On Duty</div></div>
          <div class="scard-sub muted"><i class="ti ti-clock"></i> <span id="d-surgery">0</span> in surgery</div>
        </div>
        <div class="scard" style="--d:240ms">
          <div class="scard-top">
            <div class="scard-icon ic-amber"><i class="ti ti-currency-rupee"></i></div>
            <span class="scard-badge p-green">+18k vs avg</span>
          </div>
          <div><div class="scard-val" id="d-revenue">₹0</div><div class="scard-label">Revenue Today</div></div>
          <div class="scard-sub up"><i class="ti ti-trending-up"></i> Strong day</div>
        </div>
      </div>

      <div class="row2">
        <div class="card anim-card" style="--d:120ms">
          <div class="card-header">
            <div class="card-title"><i class="ti ti-clock"></i> Recent Appointments</div>
            <a class="view-all" data-page="appointments">View all</a>
          </div>
          <div class="appt-list" id="d-appt-list"></div>
        </div>

        <div class="card anim-card" style="--d:180ms">
          <div class="card-header">
            <div class="card-title"><i class="ti ti-alert-triangle"></i> Critical Alerts</div>
            <span class="pill p-red" id="d-alert-count">0 active</span>
          </div>
          <div id="d-alerts"></div>
        </div>
      </div>

      <div class="card anim-card" style="--d:240ms">
        <div class="card-header">
          <div class="card-title"><i class="ti ti-bed"></i> Ward Occupancy</div>
          <a class="view-all" data-page="wards">Manage beds</a>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ward</th><th>Total</th><th>Occupied</th><th>Available</th><th>Status</th></tr></thead>
            <tbody id="d-occupancy"></tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderDashboard() {
    const d = db.dashboard();
    document.getElementById('d-patients').textContent = d.patients_today;
    document.getElementById('d-appts').textContent    = d.appointments_today;
    document.getElementById('d-doctors').textContent  = d.doctors_on_duty;
    document.getElementById('d-revenue').textContent  = fmtINR(d.revenue_today);

    const pending = d.recent_appointments.filter((a) => a.status === 'Waiting' || a.status === 'Scheduled').length;
    document.getElementById('d-pending-badge').textContent = pending + ' pending';
    document.getElementById('d-appts-done').textContent    = d.recent_appointments.filter((a) => a.status === 'Done').length;
    document.getElementById('d-free-badge').textContent    = Math.max(0, d.doctors_on_duty - 2) + ' free now';
    document.getElementById('d-surgery').textContent       = 1;

    document.getElementById('d-appt-list').innerHTML = d.recent_appointments.length
      ? d.recent_appointments.map((a) => `
          <div class="appt-item">
            <div class="appt-time">${esc(a.time)}</div>
            <div class="appt-dot ${(a.status || '').toLowerCase().replace(' ', '')}"></div>
            <div class="appt-info">
              <div class="appt-name">${esc(a.patient_name)}</div>
              <div class="appt-meta">${esc(a.department)} · ${esc(a.doctor_name)}</div>
            </div>
            ${statusPill(a.status)}
          </div>`).join('')
      : `<div class="empty">No appointments yet</div>`;

    document.getElementById('d-alerts').innerHTML = d.alerts.map((a) => `
      <div class="alert-row">
        <div class="alert-icon ${esc(a.color)}"><i class="ti ${esc(a.icon)}"></i></div>
        <div><div class="alert-title">${esc(a.title)}</div><div class="alert-sub">${esc(a.sub)}</div></div>
        <div class="alert-time">${esc(a.ago)}</div>
      </div>`).join('');
    document.getElementById('d-alert-count').textContent = d.alerts.length + ' active';

    const occ = db.occupancy();
    document.getElementById('d-occupancy').innerHTML = occ.map((o) => {
      const color = occColor(o.pct);
      return `<tr>
        <td><strong>${esc(o.name)}</strong></td>
        <td>${o.total}</td><td>${o.occupied}</td><td>${o.total - o.occupied}</td>
        <td><div class="occ-bar"><div class="occ-fill ${color}" style="width:${o.pct}%"></div></div>
        <span class="pill p-${color}">${o.pct}%</span></td>
      </tr>`;
    }).join('');
  }

  /* ============================================================
     PATIENTS
     ============================================================ */
  function patients() {
    return `
      <div class="section-header anim-card" style="--d:0ms">
        <div>
          <div class="section-title">Patient Management</div>
          <div class="section-sub">Search, register and manage all patient records</div>
        </div>
        <button class="btn-prim" data-action="new-patient"><i class="ti ti-plus"></i> Register Patient</button>
      </div>
      <div class="search-row anim-card" style="--d:60ms">
        <div class="search-box">
          <i class="ti ti-search"></i>
          <input type="search" id="patients-search" placeholder="Search by name, ID, phone number…">
        </div>
        <div class="filter-chip on" data-filter="All">All</div>
        <div class="filter-chip" data-filter="OPD">OPD</div>
        <div class="filter-chip" data-filter="Admitted">Admitted</div>
        <div class="filter-chip" data-filter="Discharged">Discharged</div>
        <div class="filter-chip" data-filter="Critical">Critical</div>
      </div>
      <div class="card anim-card" style="--d:120ms">
        <div class="table-wrap">
          <table id="patients-table">
            <thead><tr><th>Patient ID</th><th>Name</th><th>Age/Sex</th><th>Doctor</th><th>Department</th><th>Status</th><th>Last Visit</th><th></th></tr></thead>
            <tbody id="patients-tbody"></tbody>
          </table>
        </div>
        <div class="cards-list" id="patients-cards"></div>
      </div>
    `;
  }

  function renderPatients(query) {
    const q = query || (document.getElementById('patients-search')?.value || '');
    const status = window.__patientFilter || 'All';
    const list = db.list('patients', { q, status });
    const doctors = db.list('doctors');

    const tbody = document.getElementById('patients-tbody');
    const cards = document.getElementById('patients-cards');
    if (!tbody) return;

    const rows = list.map((p) => {
      const d = doctors.find((x) => x.id === p.doctor_id);
      return `<tr data-id="${p.id}">
        <td class="id">${esc(p.code)}</td>
        <td><strong>${esc(p.name)}</strong><div class="muted small">${esc(p.phone || '')}</div></td>
        <td>${p.age || '—'}, ${esc(p.sex || '—')}</td>
        <td>${esc(d?.name || '—')}</td>
        <td>${esc(p.department || '—')}</td>
        <td>${statusPill(p.status)}</td>
        <td>${esc(p.last_visit || '—')}</td>
        <td>
          <button class="icon-btn small" data-edit-patient="${p.id}" title="Edit"><i class="ti ti-edit"></i></button>
          <button class="icon-btn small danger" data-del-patient="${p.id}" title="Delete"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`;
    }).join('');

    tbody.innerHTML = rows || `<tr><td colspan="8" class="empty">No patients — click <strong>Register Patient</strong> to add one</td></tr>`;

    const cardsHtml = list.map((p) => {
      const d = doctors.find((x) => x.id === p.doctor_id);
      return `<div class="data-card" data-id="${p.id}">
        <div class="dc-head">
          <div class="dc-id">${esc(p.code)}</div>
          ${statusPill(p.status)}
        </div>
        <div class="dc-name">${esc(p.name)}</div>
        <div class="dc-meta">${p.age || '—'}, ${esc(p.sex || '—')} · ${esc(p.phone || '—')}</div>
        <div class="dc-row"><span>Doctor</span><strong>${esc(d?.name || '—')}</strong></div>
        <div class="dc-row"><span>Department</span><strong>${esc(p.department || '—')}</strong></div>
        <div class="dc-row"><span>Last visit</span><strong>${esc(p.last_visit || '—')}</strong></div>
        <div class="dc-actions">
          <button class="btn-out small" data-edit-patient="${p.id}"><i class="ti ti-edit"></i> Edit</button>
          <button class="btn-out small danger" data-del-patient="${p.id}"><i class="ti ti-trash"></i></button>
        </div>
      </div>`;
    }).join('');
    cards.innerHTML = cardsHtml;
  }

  /* ============================================================
     APPOINTMENTS
     ============================================================ */
  function appointments() {
    return `
      <div class="section-header anim-card" style="--d:0ms">
        <div>
          <div class="section-title">Appointments</div>
          <div class="section-sub">Today's schedule and upcoming bookings</div>
        </div>
        <button class="btn-prim" data-action="new-appt"><i class="ti ti-plus"></i> Book Appointment</button>
      </div>
      <div class="stat-grid appt-stats anim-card" style="--d:60ms">
        <div class="scard" style="--d:0ms"><div class="scard-top"><div class="scard-icon ic-primary"><i class="ti ti-calendar-event"></i></div></div><div><div class="scard-val" id="ap-total">0</div><div class="scard-label">Today's Total</div></div></div>
        <div class="scard" style="--d:60ms"><div class="scard-top"><div class="scard-icon ic-green"><i class="ti ti-check"></i></div></div><div><div class="scard-val" id="ap-completed">0</div><div class="scard-label">Completed</div></div></div>
        <div class="scard" style="--d:120ms"><div class="scard-top"><div class="scard-icon ic-amber"><i class="ti ti-clock"></i></div></div><div><div class="scard-val" id="ap-pending">0</div><div class="scard-label">Pending</div></div></div>
        <div class="scard" style="--d:180ms"><div class="scard-top"><div class="scard-icon ic-red"><i class="ti ti-x"></i></div></div><div><div class="scard-val" id="ap-cancelled">0</div><div class="scard-label">Cancelled</div></div></div>
      </div>
      <div class="card anim-card" style="--d:120ms">
        <div class="search-row" style="padding:14px 18px;border-bottom:1px solid var(--border)">
          <div class="search-box" style="flex:1"><i class="ti ti-search"></i><input type="search" id="appt-search" placeholder="Search appointments…"></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>Patient</th><th>Doctor</th><th>Type</th><th>Status</th><th></th></tr></thead>
            <tbody id="appt-tbody"></tbody>
          </table>
        </div>
        <div class="cards-list" id="appt-cards"></div>
      </div>
    `;
  }

  function renderAppointments() {
    const q = document.getElementById('appt-search')?.value || '';
    const list = db.list('appointments', { q });
    const patients = db.list('patients');
    const doctors  = db.list('doctors');

    const total = list.length;
    const completed = list.filter((a) => a.status === 'Done').length;
    const pending   = list.filter((a) => a.status === 'Waiting' || a.status === 'Scheduled').length;
    const cancelled = list.filter((a) => a.status === 'Cancelled').length;
    document.getElementById('ap-total').textContent     = total;
    document.getElementById('ap-completed').textContent = completed;
    document.getElementById('ap-pending').textContent   = pending;
    document.getElementById('ap-cancelled').textContent = cancelled;

    const html = list.map((a) => {
      const p = patients.find((x) => x.id === a.patient_id);
      const d = doctors.find((x) => x.id === a.doctor_id);
      return `<tr data-id="${a.id}">
        <td><span class="time-chip">${esc(a.time)}</span></td>
        <td><strong>${esc(p?.name || '—')}</strong><div class="muted small">${esc(p?.code || '')}</div></td>
        <td>${esc(d?.name || '—')}</td>
        <td>${esc(a.type || '—')}</td>
        <td>${statusPill(a.status)}</td>
        <td>
          <select class="status-select" data-update-appt="${a.id}">
            ${['Scheduled','Waiting','Ongoing','Done','Cancelled'].map((s) => `<option ${s===a.status?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`;
    }).join('');

    document.getElementById('appt-tbody').innerHTML = html || `<tr><td colspan="6" class="empty">No appointments scheduled</td></tr>`;

    const cardsHtml = list.map((a) => {
      const p = patients.find((x) => x.id === a.patient_id);
      const d = doctors.find((x) => x.id === a.doctor_id);
      return `<div class="data-card" data-id="${a.id}">
        <div class="dc-head"><div class="time-chip">${esc(a.time)}</div>${statusPill(a.status)}</div>
        <div class="dc-name">${esc(p?.name || 'Unknown')}</div>
        <div class="dc-meta">${esc(a.department || '')} · ${esc(d?.name || '—')}</div>
        <div class="dc-row"><span>Type</span><strong>${esc(a.type || '—')}</strong></div>
        <select class="status-select full" data-update-appt="${a.id}">
          ${['Scheduled','Waiting','Ongoing','Done','Cancelled'].map((s) => `<option ${s===a.status?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>`;
    }).join('');
    document.getElementById('appt-cards').innerHTML = cardsHtml;
  }

  /* ============================================================
     DOCTORS
     ============================================================ */
  function doctors() {
    return `
      <div class="section-header anim-card" style="--d:0ms">
        <div>
          <div class="section-title">Doctors</div>
          <div class="section-sub">Active consultants and on-call specialists</div>
        </div>
        <button class="btn-prim" data-action="new-doctor"><i class="ti ti-plus"></i> Add Doctor</button>
      </div>
      <div class="doc-grid" id="doctors-grid"></div>
    `;
  }

  function renderDoctors() {
    const list = db.list('doctors');
    document.getElementById('doctors-grid').innerHTML = list.map((d) => `
      <div class="doc-card" data-id="${d.id}">
        <div class="doc-av ${esc(d.avatar_color || 'primary')}">${esc(initials(d.name))}</div>
        <div class="doc-name">${esc(d.name)}</div>
        <div class="doc-dept">${esc(d.department || '—')}</div>
        ${statusPill(d.status)}
        <div class="doc-stat"><i class="ti ti-calendar-check"></i> ${d.appointments || 0} appointments</div>
        <div class="bar-wrap"><div class="bar-fill" style="width:${d.load_pct || 0}%"></div></div>
        <div class="dc-actions">
          <button class="btn-out small" data-edit-doctor="${d.id}"><i class="ti ti-edit"></i> Edit</button>
          <button class="btn-out small danger" data-del-doctor="${d.id}"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    `).join('') || `<div class="empty">No doctors yet</div>`;
  }

  /* ============================================================
     EMR
     ============================================================ */
  function emr() {
    return `
      <div class="section-header anim-card" style="--d:0ms">
        <div>
          <div class="section-title">EMR / Records</div>
          <div class="section-sub">Electronic medical records — diagnoses, prescriptions, lab orders, imaging</div>
        </div>
        <button class="btn-prim" data-action="new-emr"><i class="ti ti-plus"></i> New Record</button>
      </div>
      <div class="search-row anim-card" style="--d:60ms">
        <div class="search-box" style="flex:1">
          <i class="ti ti-search"></i>
          <input type="search" id="emr-search" placeholder="Search records by patient, title, or type…">
        </div>
        <select class="filter-select" id="emr-type">
          <option value="">All types</option>
          <option>Diagnosis</option><option>Prescription</option><option>Lab Order</option><option>Imaging</option><option>Note</option>
        </select>
      </div>
      <div class="card anim-card" style="--d:120ms">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Patient</th><th>Type</th><th>Title</th><th>Doctor</th><th></th></tr></thead>
            <tbody id="emr-tbody"></tbody>
          </table>
        </div>
        <div class="cards-list" id="emr-cards"></div>
      </div>
    `;
  }

  function renderEMR() {
    const q = document.getElementById('emr-search')?.value || '';
    const t = document.getElementById('emr-type')?.value || '';
    let list = db.list('emr');
    if (q) {
      const like = q.toLowerCase();
      list = list.filter((r) => [r.title, r.notes, r.doctor_name].some((x) => String(x || '').toLowerCase().includes(like)));
      const patients = db.list('patients');
      const matchingPids = patients.filter((p) => [p.name, p.code].some((x) => String(x || '').toLowerCase().includes(like))).map((p) => p.id);
      list = list.concat(db.list('emr').filter((r) => matchingPids.includes(r.patient_id)));
      list = [...new Map(list.map((r) => [r.id, r])).values()];
    }
    if (t) list = list.filter((r) => r.type === t);

    const patients = db.list('patients');
    const html = list.map((r) => {
      const p = patients.find((x) => x.id === r.patient_id);
      return `<tr data-id="${r.id}">
        <td>${esc((r.created_at || '').slice(0, 16).replace('T', ' '))}</td>
        <td><strong>${esc(p?.name || '—')}</strong><div class="muted small">${esc(p?.code || '')}</div></td>
        <td><span class="pill p-primary">${esc(r.type)}</span></td>
        <td>${esc(r.title)}<div class="muted small">${esc(r.notes || '')}</div></td>
        <td>${esc(r.doctor_name || '—')}</td>
        <td><button class="icon-btn small danger" data-del-emr="${r.id}" title="Delete"><i class="ti ti-trash"></i></button></td>
      </tr>`;
    }).join('');

    document.getElementById('emr-tbody').innerHTML = html || `<tr><td colspan="6" class="empty">No records — click <strong>New Record</strong> to add one</td></tr>`;

    const cardsHtml = list.map((r) => {
      const p = patients.find((x) => x.id === r.patient_id);
      return `<div class="data-card" data-id="${r.id}">
        <div class="dc-head"><span class="pill p-primary">${esc(r.type)}</span><div class="muted small">${esc((r.created_at || '').slice(0, 10))}</div></div>
        <div class="dc-name">${esc(r.title)}</div>
        <div class="dc-meta">${esc(p?.name || 'Unknown patient')} · ${esc(r.doctor_name || '—')}</div>
        <div class="dc-row"><span>Notes</span><strong>${esc(r.notes || '—')}</strong></div>
        <div class="dc-actions">
          <button class="btn-out small danger" data-del-emr="${r.id}"><i class="ti ti-trash"></i> Delete</button>
        </div>
      </div>`;
    }).join('');
    document.getElementById('emr-cards').innerHTML = cardsHtml;
  }

  /* ============================================================
     PHARMACY
     ============================================================ */
  function pharmacy() {
    return `
      <div class="section-header anim-card" style="--d:0ms">
        <div>
          <div class="section-title">Pharmacy</div>
          <div class="section-sub">Medicine inventory, stock levels, and expiry tracking</div>
        </div>
        <button class="btn-prim" data-action="new-medicine"><i class="ti ti-plus"></i> Add Medicine</button>
      </div>
      <div class="stat-grid anim-card" style="--d:60ms">
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-primary"><i class="ti ti-pill"></i></div></div><div><div class="scard-val" id="ph-total">0</div><div class="scard-label">Total Medicines</div></div></div>
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-red"><i class="ti ti-alert-triangle"></i></div></div><div><div class="scard-val red" id="ph-low">0</div><div class="scard-label">Low Stock Alerts</div></div></div>
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-green"><i class="ti ti-check"></i></div></div><div><div class="scard-val" id="ph-issued">0</div><div class="scard-label">Issued Today</div></div></div>
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-amber"><i class="ti ti-currency-rupee"></i></div></div><div><div class="scard-val" id="ph-revenue">₹0</div><div class="scard-label">Revenue Today</div></div></div>
      </div>
      <div class="card anim-card" style="--d:120ms">
        <div class="search-row" style="padding:14px 18px;border-bottom:1px solid var(--border)">
          <div class="search-box" style="flex:1"><i class="ti ti-search"></i><input type="search" id="ph-search" placeholder="Search medicines…"></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Medicine</th><th>Category</th><th>Stock</th><th>Unit Price</th><th>Expiry</th><th>Status</th><th></th></tr></thead>
            <tbody id="ph-tbody"></tbody>
          </table>
        </div>
        <div class="cards-list" id="ph-cards"></div>
      </div>
    `;
  }

  function renderPharmacy() {
    const q = document.getElementById('ph-search')?.value || '';
    const list = db.list('pharmacy', { q });
    const stats = db.pharmacyStats();
    document.getElementById('ph-total').textContent   = stats.total;
    document.getElementById('ph-low').textContent     = stats.low;
    document.getElementById('ph-issued').textContent  = stats.issued;
    document.getElementById('ph-revenue').textContent = fmtINR(stats.revenue);

    const html = list.map((m) => `
      <tr data-id="${m.id}">
        <td><strong>${esc(m.name)}</strong></td>
        <td>${esc(m.category || '—')}</td>
        <td>${m.stock} ${esc(m.unit || '')}</td>
        <td>${fmtINR(m.price)}</td>
        <td>${esc(m.expiry || '—')}</td>
        <td>${statusPill(m.stock < 20 ? 'Low Stock' : 'In Stock')}</td>
        <td>
          <button class="icon-btn small" data-edit-medicine="${m.id}" title="Edit"><i class="ti ti-edit"></i></button>
          <button class="icon-btn small danger" data-del-medicine="${m.id}" title="Delete"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`).join('');

    document.getElementById('ph-tbody').innerHTML = html || `<tr><td colspan="7" class="empty">No medicines — click <strong>Add Medicine</strong></td></tr>`;
    document.getElementById('ph-cards').innerHTML = list.map((m) => `
      <div class="data-card">
        <div class="dc-head"><strong>${esc(m.name)}</strong>${statusPill(m.stock < 20 ? 'Low Stock' : 'In Stock')}</div>
        <div class="dc-meta">${esc(m.category || '—')} · ${fmtINR(m.price)}</div>
        <div class="dc-row"><span>Stock</span><strong>${m.stock} ${esc(m.unit || '')}</strong></div>
        <div class="dc-row"><span>Expiry</span><strong>${esc(m.expiry || '—')}</strong></div>
      </div>`).join('');
  }

  /* ============================================================
     LAB
     ============================================================ */
  function lab() {
    return `
      <div class="section-header anim-card" style="--d:0ms">
        <div>
          <div class="section-title">Laboratory</div>
          <div class="section-sub">Test orders, results, and turnaround times</div>
        </div>
        <button class="btn-prim" data-action="new-lab"><i class="ti ti-plus"></i> New Test Order</button>
      </div>
      <div class="card anim-card" style="--d:120ms">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Order ID</th><th>Patient</th><th>Test</th><th>Ordered By</th><th>Ordered At</th><th>Result</th><th>Status</th></tr></thead>
            <tbody id="lab-tbody"></tbody>
          </table>
        </div>
        <div class="cards-list" id="lab-cards"></div>
      </div>
    `;
  }

  function renderLab() {
    const list = db.list('lab');
    const patients = db.list('patients');
    const doctors  = db.list('doctors');
    const html = list.map((l) => {
      const p = patients.find((x) => x.id === l.patient_id);
      const d = doctors.find((x) => x.id === l.ordered_by);
      return `<tr>
        <td class="id">#${l.id.toString().padStart(4, '0')}</td>
        <td><strong>${esc(p?.name || '—')}</strong></td>
        <td>${esc(l.test)}</td>
        <td>${esc(d?.name || '—')}</td>
        <td>${esc((l.ordered_at || '').slice(0, 16).replace('T', ' '))}</td>
        <td>${esc(l.result || '—')}</td>
        <td>${statusPill(l.status)}</td>
      </tr>`;
    }).join('');

    document.getElementById('lab-tbody').innerHTML = html || `<tr><td colspan="7" class="empty">No test orders</td></tr>`;
    document.getElementById('lab-cards').innerHTML = list.map((l) => {
      const p = patients.find((x) => x.id === l.patient_id);
      return `<div class="data-card">
        <div class="dc-head"><div class="dc-id">#${l.id.toString().padStart(4, '0')}</div>${statusPill(l.status)}</div>
        <div class="dc-name">${esc(l.test)}</div>
        <div class="dc-meta">${esc(p?.name || 'Unknown')}</div>
        <div class="dc-row"><span>Result</span><strong>${esc(l.result || '—')}</strong></div>
      </div>`;
    }).join('');
  }

  /* ============================================================
     WARDS
     ============================================================ */
  function wards() {
    return `
      <div class="section-header anim-card" style="--d:0ms">
        <div>
          <div class="section-title">Wards & Beds</div>
          <div class="section-sub">Real-time bed availability across all wards</div>
        </div>
      </div>
      <div class="stat-grid anim-card" style="--d:60ms">
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-primary"><i class="ti ti-bed"></i></div></div><div><div class="scard-val" id="w-total">0</div><div class="scard-label">Total Beds</div></div></div>
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-red"><i class="ti ti-users"></i></div></div><div><div class="scard-val red" id="w-occ">0</div><div class="scard-label">Occupied</div></div></div>
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-green"><i class="ti ti-circle-check"></i></div></div><div><div class="scard-val green" id="w-avail">0</div><div class="scard-label">Available</div></div></div>
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-red"><i class="ti ti-heart-rate-monitor"></i></div></div><div><div class="scard-val" id="w-icu">0%</div><div class="scard-label">ICU Occupancy</div></div></div>
      </div>
      <div class="card anim-card" style="--d:120ms">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ward</th><th>Total</th><th>Occupied</th><th>Available</th><th>Status</th></tr></thead>
            <tbody id="w-tbody"></tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderWards() {
    const list = db.list('wards');
    const total = list.reduce((s, w) => s + w.total, 0);
    const occ   = list.reduce((s, w) => s + w.occupied, 0);
    const avail = total - occ;
    const icu   = list.find((w) => /icu/i.test(w.name));
    const icuPct = icu ? Math.round((icu.occupied / icu.total) * 100) : 0;

    document.getElementById('w-total').textContent = total;
    document.getElementById('w-occ').textContent   = occ;
    document.getElementById('w-avail').textContent = avail;
    document.getElementById('w-icu').textContent   = icuPct + '%';

    document.getElementById('w-tbody').innerHTML = list.map((w) => {
      const pct = Math.round((w.occupied / w.total) * 100);
      const color = occColor(pct);
      return `<tr>
        <td><strong>${esc(w.name)}</strong></td>
        <td>${w.total}</td><td>${w.occupied}</td><td>${w.total - w.occupied}</td>
        <td><div class="occ-bar"><div class="occ-fill ${color}" style="width:${pct}%"></div></div><span class="pill p-${color}">${pct}%</span></td>
      </tr>`;
    }).join('');
  }

  /* ============================================================
     BILLING
     ============================================================ */
  function billing() {
    return `
      <div class="section-header anim-card" style="--d:0ms">
        <div>
          <div class="section-title">Billing</div>
          <div class="section-sub">Invoices, payments, and revenue tracking</div>
        </div>
        <button class="btn-prim" data-action="new-invoice"><i class="ti ti-plus"></i> New Invoice</button>
      </div>
      <div class="stat-grid anim-card" style="--d:60ms">
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-primary"><i class="ti ti-receipt-2"></i></div></div><div><div class="scard-val" id="bi-total">₹0</div><div class="scard-label">Total Billed</div></div></div>
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-green"><i class="ti ti-check"></i></div></div><div><div class="scard-val" id="bi-paid">₹0</div><div class="scard-label">Paid</div></div></div>
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-amber"><i class="ti ti-clock"></i></div></div><div><div class="scard-val" id="bi-pending">₹0</div><div class="scard-label">Pending</div></div></div>
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-purple"><i class="ti ti-file-invoice"></i></div></div><div><div class="scard-val" id="bi-count">0</div><div class="scard-label">Invoices</div></div></div>
      </div>
      <div class="card anim-card" style="--d:120ms">
        <div class="search-row" style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap">
          <div class="search-box" style="flex:1"><i class="ti ti-search"></i><input type="search" id="bi-search" placeholder="Search invoices…"></div>
          <div class="filter-chip on" data-bill-filter="All">All</div>
          <div class="filter-chip" data-bill-filter="Paid">Paid</div>
          <div class="filter-chip" data-bill-filter="Pending">Pending</div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Invoice #</th><th>Patient</th><th>Date</th><th>Items</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody id="bi-tbody"></tbody>
          </table>
        </div>
        <div class="cards-list" id="bi-cards"></div>
      </div>
    `;
  }

  function renderBilling() {
    const q = document.getElementById('bi-search')?.value || '';
    const status = window.__billFilter || 'All';
    const list = db.list('billing', { q, status });
    const summary = db.billingSummary();
    const patients = db.list('patients');

    document.getElementById('bi-total').textContent   = fmtINR(summary.total);
    document.getElementById('bi-paid').textContent    = fmtINR(summary.paid);
    document.getElementById('bi-pending').textContent = fmtINR(summary.pending);
    document.getElementById('bi-count').textContent   = summary.count;

    const html = list.map((b) => {
      const p = patients.find((x) => x.id === b.patient_id);
      return `<tr data-id="${b.id}">
        <td class="id">${esc(b.invoice_no)}</td>
        <td><strong>${esc(p?.name || '—')}</strong></td>
        <td>${esc(b.date || '—')}</td>
        <td>${b.items || 1}</td>
        <td><strong>${fmtINR(b.amount)}</strong></td>
        <td>${statusPill(b.status)}</td>
        <td>
          <button class="icon-btn small" data-toggle-bill="${b.id}" title="Toggle status"><i class="ti ti-switch-horizontal"></i></button>
          <button class="icon-btn small danger" data-del-bill="${b.id}" title="Delete"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`;
    }).join('');

    document.getElementById('bi-tbody').innerHTML = html || `<tr><td colspan="7" class="empty">No invoices</td></tr>`;
    document.getElementById('bi-cards').innerHTML = list.map((b) => {
      const p = patients.find((x) => x.id === b.patient_id);
      return `<div class="data-card">
        <div class="dc-head"><div class="dc-id">${esc(b.invoice_no)}</div>${statusPill(b.status)}</div>
        <div class="dc-name">${esc(p?.name || '—')}</div>
        <div class="dc-meta">${esc(b.date || '—')}</div>
        <div class="dc-row"><span>Amount</span><strong>${fmtINR(b.amount)}</strong></div>
      </div>`;
    }).join('');
  }

  /* ============================================================
     REPORTS
     ============================================================ */
  function reports() {
    return `
      <div class="section-header anim-card" style="--d:0ms">
        <div>
          <div class="section-title">Reports & Analytics</div>
          <div class="section-sub">Hospital-wide performance insights and trends</div>
        </div>
        <button class="btn-prim" id="export-csv"><i class="ti ti-file-export"></i> Export CSV</button>
      </div>
      <div class="stat-grid anim-card" style="--d:60ms">
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-primary"><i class="ti ti-users"></i></div></div><div><div class="scard-val" id="r-patients">0</div><div class="scard-label">Total Patients</div></div><div class="scard-sub up"><i class="ti ti-trending-up"></i> +8% vs last month</div></div>
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-amber"><i class="ti ti-currency-rupee"></i></div></div><div><div class="scard-val" id="r-revenue">₹0</div><div class="scard-label">Total Revenue</div></div><div class="scard-sub up"><i class="ti ti-trending-up"></i> +12% vs last</div></div>
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-purple"><i class="ti ti-calendar-event"></i></div></div><div><div class="scard-val" id="r-appts">0</div><div class="scard-label">Appointments</div></div><div class="scard-sub muted"><i class="ti ti-clock"></i> This month</div></div>
        <div class="scard"><div class="scard-top"><div class="scard-icon ic-green"><i class="ti ti-stethoscope"></i></div></div><div><div class="scard-val" id="r-doctors">0</div><div class="scard-label">Active Doctors</div></div><div class="scard-sub up"><i class="ti ti-check"></i> All on duty</div></div>
      </div>
      <div class="row2">
        <div class="card anim-card" style="--d:120ms">
          <div class="card-header"><div class="card-title"><i class="ti ti-chart-line"></i> Department Distribution</div></div>
          <div id="r-departments"></div>
        </div>
        <div class="card anim-card" style="--d:180ms">
          <div class="card-header"><div class="card-title"><i class="ti ti-pill"></i> Pharmacy Stock Status</div></div>
          <div id="r-pharmacy"></div>
        </div>
      </div>
    `;
  }

  function renderReports() {
    const r = db.reports();
    document.getElementById('r-patients').textContent = r.patients;
    document.getElementById('r-revenue').textContent  = fmtINR(r.revenue);
    document.getElementById('r-appts').textContent    = r.appointments;
    document.getElementById('r-doctors').textContent  = r.doctors;

    const patients = db.list('patients');
    const deptCounts = {};
    patients.forEach((p) => { deptCounts[p.department || 'Other'] = (deptCounts[p.department || 'Other'] || 0) + 1; });
    const maxDept = Math.max(...Object.values(deptCounts), 1);
    document.getElementById('r-departments').innerHTML = Object.entries(deptCounts).map(([dept, n]) => {
      const pct = Math.round((n / maxDept) * 100);
      return `<div class="report-row">
        <div class="report-label">${esc(dept)}</div>
        <div class="report-bar"><div class="report-fill" style="width:${pct}%"></div></div>
        <div class="report-val">${n}</div>
      </div>`;
    }).join('') || `<div class="empty">No data</div>`;

    const meds = db.list('pharmacy');
    const low = meds.filter((m) => m.stock < 20).length;
    const ok  = meds.length - low;
    document.getElementById('r-pharmacy').innerHTML = `
      <div class="report-row"><div class="report-label">In Stock</div><div class="report-bar"><div class="report-fill green" style="width:${(ok/meds.length*100)||0}%"></div></div><div class="report-val">${ok}</div></div>
      <div class="report-row"><div class="report-label">Low Stock</div><div class="report-bar"><div class="report-fill red" style="width:${(low/meds.length*100)||0}%"></div></div><div class="report-val">${low}</div></div>
      <div class="report-row"><div class="report-label">Total SKUs</div><div class="report-bar"><div class="report-fill" style="width:100%"></div></div><div class="report-val">${meds.length}</div></div>
    `;
  }

  /* ============================================================
     STAFF
     ============================================================ */
  function staff() {
    return `
      <div class="section-header anim-card" style="--d:0ms">
        <div>
          <div class="section-title">Staff</div>
          <div class="section-sub">Employees, roles, and department assignments</div>
        </div>
        <button class="btn-prim" data-action="new-staff"><i class="ti ti-plus"></i> Add Staff</button>
      </div>
      <div class="card anim-card" style="--d:120ms">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Email</th><th>Status</th><th></th></tr></thead>
            <tbody id="staff-tbody"></tbody>
          </table>
        </div>
        <div class="cards-list" id="staff-cards"></div>
      </div>
    `;
  }

  function renderStaff() {
    const list = db.list('staff');
    const html = list.map((s) => `
      <tr>
        <td><div class="user-av small">${esc(initials(s.name))}</div><strong>${esc(s.name)}</strong></td>
        <td>${esc(s.role)}</td>
        <td>${esc(s.department || '—')}</td>
        <td class="muted">${esc(s.email || '—')}</td>
        <td>${statusPill(s.status)}</td>
        <td>
          <button class="icon-btn small" data-edit-staff="${s.id}"><i class="ti ti-edit"></i></button>
          <button class="icon-btn small danger" data-del-staff="${s.id}"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`).join('');
    document.getElementById('staff-tbody').innerHTML = html;
    document.getElementById('staff-cards').innerHTML = list.map((s) => `
      <div class="data-card">
        <div class="dc-head"><div class="user-av small">${esc(initials(s.name))}</div>${statusPill(s.status)}</div>
        <div class="dc-name">${esc(s.name)}</div>
        <div class="dc-meta">${esc(s.role)} · ${esc(s.department || '—')}</div>
        <div class="dc-row"><span>Email</span><strong>${esc(s.email || '—')}</strong></div>
      </div>`).join('');
  }

  /* ============================================================
     SETTINGS
     ============================================================ */
  function settings() {
    const u = auth.user || {};
    return `
      <div class="section-header anim-card" style="--d:0ms">
        <div>
          <div class="section-title">Settings</div>
          <div class="section-sub">Profile, hospital information, and app preferences</div>
        </div>
      </div>
      <div class="row2">
        <div class="card anim-card" style="--d:60ms">
          <div class="card-header"><div class="card-title"><i class="ti ti-user"></i> Profile</div></div>
          <form id="settings-profile" class="modal-form inline">
            <div class="form-grid">
              <div class="fg"><label>Full name</label><input name="name" value="${esc(u.name || '')}"></div>
              <div class="fg"><label>Email</label><input name="email" value="${esc(u.email || '')}" disabled></div>
              <div class="fg"><label>Role</label><input value="${esc(u.role || 'staff')}" disabled></div>
            </div>
            <button type="submit" class="btn-prim" style="margin-top:14px"><i class="ti ti-device-floppy"></i> Save profile</button>
          </form>
        </div>
        <div class="card anim-card" style="--d:120ms">
          <div class="card-header"><div class="card-title"><i class="ti ti-building-hospital"></i> Hospital</div></div>
          <form id="settings-hospital" class="modal-form inline">
            <div class="form-grid">
              <div class="fg"><label>Hospital name</label><input name="name" value="CareStation General Hospital"></div>
              <div class="fg"><label>Address</label><input name="address" value="123 Health Street, Bengaluru, India"></div>
              <div class="fg"><label>Contact</label><input name="contact" value="+91 80 4000 1234"></div>
              <div class="fg"><label>Total beds</label><input name="beds" type="number" value="200"></div>
            </div>
            <button type="submit" class="btn-prim" style="margin-top:14px"><i class="ti ti-device-floppy"></i> Save hospital info</button>
          </form>
        </div>
      </div>
      <div class="card anim-card" style="--d:180ms">
        <div class="card-header"><div class="card-title"><i class="ti ti-database"></i> Data & Sync</div></div>
        <div class="settings-grid">
          <div class="setting-row">
            <div><strong>Mode</strong><div class="muted small" id="settings-mode">—</div></div>
            <span class="pill p-primary" id="settings-mode-badge">—</span>
          </div>
          <div class="setting-row">
            <div><strong>Patients</strong><div class="muted small">Total records in local store</div></div>
            <span class="pill p-blue" id="settings-count">0</span>
          </div>
          <div class="setting-row">
            <div><strong>Clear all data</strong><div class="muted small">Reset the local database to factory defaults</div></div>
            <button class="btn-out small danger" id="settings-reset"><i class="ti ti-rotate"></i> Reset</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSettings() {
    document.getElementById('settings-mode').textContent = auth.mode === 'firebase' ? 'Connected to Firebase' : 'Running in demo (local) mode';
    document.getElementById('settings-mode-badge').textContent = auth.mode === 'firebase' ? 'Cloud' : 'Demo';
    document.getElementById('settings-mode-badge').className = 'pill ' + (auth.mode === 'firebase' ? 'p-green' : 'p-amber');
    document.getElementById('settings-count').textContent = db.list('patients').length;
  }

  /* ============================================================
     registration
     ============================================================ */
  router.registerPage('dashboard',    dashboard);
  router.registerPage('patients',     patients);
  router.registerPage('appointments', appointments);
  router.registerPage('doctors',      doctors);
  router.registerPage('emr',          emr);
  router.registerPage('pharmacy',     pharmacy);
  router.registerPage('lab',          lab);
  router.registerPage('wards',        wards);
  router.registerPage('billing',      billing);
  router.registerPage('reports',      reports);
  router.registerPage('staff',        staff);
  router.registerPage('settings',     settings);

  window.pages = {
    async afterRender(name) {
      if (name === 'dashboard')    return renderDashboard();
      if (name === 'patients')     return renderPatients();
      if (name === 'appointments') return renderAppointments();
      if (name === 'doctors')      return renderDoctors();
      if (name === 'emr')          return renderEMR();
      if (name === 'pharmacy')     return renderPharmacy();
      if (name === 'lab')          return renderLab();
      if (name === 'wards')        return renderWards();
      if (name === 'billing')      return renderBilling();
      if (name === 'reports')      return renderReports();
      if (name === 'staff')        return renderStaff();
      if (name === 'settings')     return renderSettings();
    }
  };
})();
