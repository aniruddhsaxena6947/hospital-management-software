/* ============================================================
   MediCore — Hospital Management System
   Front-end application logic (API-driven)
   ============================================================ */

(() => {
  'use strict';

  /* ============== DOM helpers ============== */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ============== Live date ============== */
  const liveDate = $('#live-date');
  if (liveDate) {
    const d = new Date();
    liveDate.textContent = d.toLocaleDateString('en-US', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  /* ============================================================
     AUTH GATE
     ============================================================ */
  const authScreen = $('#auth-screen');
  const appShell   = $('#app-shell');
  const token      = api.getToken();
  const user       = api.getUser();

  if (token && user) {
    authScreen.style.display = 'none';
    appShell.hidden = false;
    // Personalize the user-footer
    paintUser(user);
    // boot
    bootDashboard();
  } else if (location.search.includes('demo=1')) {
    // Demo link — auto-login via API then skip the form
    (async () => {
      authLoader?.classList.add('show');
      try {
        const r = await api.auth.login('admin@medicore.health', 'medicore123');
        api.setToken(r.token);
        api.setUser(r.user);
        authScreen.style.display = 'none';
        appShell.hidden = false;
        paintUser(r.user);
        await bootDashboard();
        showToast('Welcome back, Admin User');
      } catch (e) {
        authLoader?.classList.remove('show');
        showAuthError('Demo login failed: ' + (e.message || 'unknown error'));
      }
    })();
  } else {
    authScreen.style.display = 'grid';
    appShell.hidden = true;
  }

  function paintUser(u) {
    const av   = $('.user-av');
    const name = $('.user-name');
    const role = $('.user-role');
    if (av && u.avatar)   av.textContent   = u.avatar;
    if (name && u.name)   name.textContent = u.name;
    if (role && u.role)   role.textContent = u.role[0].toUpperCase() + u.role.slice(1);
    const tAv = $('.topbar-av'); if (tAv && u.avatar) tAv.textContent = u.avatar;
  }

  /* ============================================================
     SIGN-IN
     ============================================================ */
  const loginForm  = $('#login-form');
  const loginBtn   = $('#login-btn');
  const authLoader = $('#auth-loader');
  const authCard   = $('#auth-card');
  const eyeBtn     = $('#eye-btn');
  const passwordEl = $('#password');

  if (eyeBtn) eyeBtn.addEventListener('click', () => {
    const isPw = passwordEl.type === 'password';
    passwordEl.type = isPw ? 'text' : 'password';
    eyeBtn.innerHTML = `<i class="ti ti-eye${isPw ? '-off' : ''}"></i>`;
  });

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    // Also handle button click as a safety net
    loginBtn?.addEventListener('click', (e) => {
      // The form submit will handle it, but if for any reason
      // the form doesn't submit, this gives us a fallback
      if (!loginBtn.disabled) {
        e.preventDefault();
        loginForm.requestSubmit ? loginForm.requestSubmit() : loginForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    });

    // Quick backend health check on load
    checkBackendHealth();
  }

  async function checkBackendHealth() {
    const chip = $('#server-status');
    if (!chip) return;
    try {
      const res = await fetch(api.API_BASE + '/health', { cache: 'no-store' });
      if (res.ok) {
        chip.className = 'server-status online';
        chip.innerHTML = '<i class="ti ti-circle-check-filled"></i> Backend connected';
      } else {
        throw new Error('not ok');
      }
    } catch (e) {
      chip.className = 'server-status offline';
      chip.innerHTML = '<i class="ti ti-alert-circle-filled"></i> Backend offline — start the server';
    }
  }

  async function handleLogin(e) {
    if (e) e.preventDefault();
    const email = $('#email').value.trim();
    const pw    = passwordEl.value.trim();

    if (!email || !pw) {
      shake(authCard);
      return showAuthError('Please enter both email and password.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      shake(authCard);
      flashInput($('#email'));
      return showAuthError('Please enter a valid email address.');
    }

    loginBtn.classList.add('loading');
    loginBtn.disabled = true;
    authLoader.classList.add('show');
    hideAuthError();

    console.log('🔐 Attempting login as:', email);

    try {
      const res = await api.auth.login(email, pw);
      console.log('✅ Login success');
      api.setToken(res.token);
      api.setUser(res.user);

      authScreen.classList.add('switching');
      setTimeout(() => {
        authScreen.style.display = 'none';
        appShell.hidden = false;
        try { paintUser(res.user); } catch (e) { console.error('paintUser error:', e); }
        try { bootDashboard(); }   catch (e) { console.error('bootDashboard error:', e); }
        showToast(`Welcome back, ${friendlyName(res.user.name || res.user.email)}`);
      }, 480);
    } catch (err) {
      console.error('❌ Login failed:', err);
      loginBtn.classList.remove('loading');
      loginBtn.disabled = false;
      authLoader.classList.remove('show');
      shake(authCard);
      const msg = (err && err.message) || 'Sign in failed. Please try again.';
      showAuthError(err.status === 401 ? 'Invalid email or password.' : msg);
    }
  }

  function showAuthError(msg) {
    let el = $('#auth-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'auth-error';
      el.className = 'auth-error';
      el.innerHTML = '<i class="ti ti-alert-circle"></i> <span class="auth-error-text"></span>';
      loginForm.insertBefore(el, loginForm.firstChild);
    }
    el.querySelector('.auth-error-text').textContent = msg;
    el.classList.add('show');
    clearTimeout(showAuthError._t);
    showAuthError._t = setTimeout(() => el.classList.remove('show'), 6000);
  }
  function hideAuthError() {
    const el = $('#auth-error');
    if (el) el.classList.remove('show');
  }

  function friendlyName(s) {
    if (!s) return 'there';
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/[._-]/g, ' ');
  }

  function shake(el) {
    el.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' },
       { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
      { duration: 420, easing: 'cubic-bezier(.36,.07,.19,.97)' }
    );
  }

  function flashInput(el) {
    const wrap = el.closest('.input-wrap');
    if (!wrap) return;
    wrap.animate(
      [{ borderColor: '#ef4444', boxShadow: '0 0 0 4px rgba(239,68,68,.15)' },
       { borderColor: '#e2e8f0', boxShadow: '0 0 0 0 rgba(0,0,0,0)' }],
      { duration: 600, easing: 'ease-out' }
    );
  }

  /* ============================================================
     LOGOUT
     ============================================================ */
  $('#logout-btn')?.addEventListener('click', async () => {
    try { await api.auth.logout(); } catch (_) {}
    api.clear();
    location.reload();
  });

  /* ============================================================
     NAVIGATION
     ============================================================ */
  const navItems = $$('.nav-item[data-page]');
  const pages    = $$('.page');
  const pTag     = $('#ptag');
  const pTitle   = $('#ptitle');

  async function goTo(pageId) {
    const target = $(`#pg-${pageId}`);
    if (!target || target.classList.contains('active')) return;
    const current = pages.find(p => p.classList.contains('active'));
    if (current) { current.style.opacity = '0'; current.style.transform = 'translateY(6px)'; }

    setTimeout(async () => {
      pages.forEach(p => p.classList.remove('active'));
      navItems.forEach(n => n.classList.remove('active'));
      target.classList.add('active');
      const nav = $(`.nav-item[data-page="${pageId}"]`);
      if (nav) nav.classList.add('active');
      pTitle.textContent = target.dataset.title || pageId;
      pTag.textContent   = target.dataset.tag   || 'Overview';

      $('#content').scrollTo({ top: 0, behavior: 'smooth' });

      // Load data for this page
      try { await loadPage(pageId, target); }
      catch (e) { console.error('loadPage error:', e); }

      animateCounters(target);
      reanimateBars(target);
      $('#sidebar').classList.remove('open');
    }, 180);
  }

  navItems.forEach(item => item.addEventListener('click', () => goTo(item.dataset.page)));

  $('#sidebar-toggle')?.addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  document.addEventListener('click', (e) => {
    const sb = $('#sidebar');
    if (!sb || !sb.classList.contains('open')) return;
    if (e.target.closest('.sidebar') || e.target.closest('#sidebar-toggle')) return;
    sb.classList.remove('open');
  });

  /* ============================================================
     PAGE LOADER — fetches data and renders each section
     ============================================================ */
  async function loadPage(pageId, root) {
    switch (pageId) {
      case 'dashboard':   return loadDashboard(root);
      case 'patients':    return loadPatients(root);
      case 'appointments':return loadAppointments(root);
      case 'doctors':     return loadDoctors(root);
      case 'emr':         return loadEMR(root);
      case 'pharmacy':    return loadPharmacy(root);
      case 'lab':         return loadLab(root);
      case 'wards':       return loadWards(root);
      case 'billing':     return loadBilling(root);
      case 'reports':     return loadReports(root);
      case 'staff':       return loadStaff(root);
      case 'settings':    return loadSettings(root);
    }
  }

  /* ============== DASHBOARD ============== */
  async function loadDashboard(root) {
    const [stats, occ, alerts, appts] = await Promise.all([
      api.dashboard.stats(),
      api.dashboard.occupancy(),
      api.alerts.list(),
      api.appointments.list(),
    ]);

    // stat cards
    const sc = $$('.scard-val[data-count]', root);
    sc.forEach(el => {
      const k = el.dataset.k || el.dataset.field;
      if (k && stats[k] != null) el.dataset.count = String(stats[k]);
    });

    // revenue special case
    const rev = $('.scard-val[data-field="revenue"]', root);
    if (rev) {
      const r = (stats.revenue_today || 0) / 100000;
      rev.dataset.count = r.toFixed(1);
    }

    // recent appointments
    const apptList = $('.appt-list', root);
    if (apptList) {
      apptList.innerHTML = (appts.length ? appts : stats.recent_appointments || []).slice(0, 5).map(a => `
        <div class="appt-item">
          <div class="appt-time">${escape(a.time)}</div>
          <div class="appt-dot ${apptStatusClass(a.status)}"></div>
          <div class="appt-info">
            <div class="appt-name">${escape(a.patient_name)}</div>
            <div class="appt-meta">${escape(a.department || '')} · ${escape(a.doctor_name)}</div>
          </div>
          <span class="pill ${apptPillClass(a.status)}">${escape(a.status)}</span>
        </div>`).join('') || `<div class="empty">No appointments yet</div>`;
    }

    // alerts
    const alertRows = $$('.alert-row', root);
    alertRows.forEach((row, i) => {
      const a = alerts[i];
      if (!a) { row.style.display = 'none'; return; }
      row.style.display = '';
      row.querySelector('.alert-icon').className = `alert-icon ${a.color || 'primary'}`;
      row.querySelector('.alert-icon i').className = a.icon || 'ti ti-bell';
      row.querySelector('.alert-title').textContent = a.title;
      row.querySelector('.alert-sub').textContent   = a.sub;
      row.querySelector('.alert-time').textContent  = a.ago;
    });

    // occupancy
    const occRows = $$('#pg-dashboard tbody tr', root);
    occRows.forEach((tr, i) => {
      const o = occ[i];
      if (!o) return;
      tr.children[0].innerHTML = `<strong>${escape(o.name)}</strong>`;
      tr.children[1].textContent = o.total;
      tr.children[2].textContent = o.occupied;
      tr.children[3].textContent = o.total - o.occupied;
      const pct = o.pct || 0;
      const color = pct >= 85 ? 'red' : pct >= 70 ? 'amber' : 'green';
      tr.children[4].innerHTML = `<div class="occ-bar"><div class="occ-fill ${color}" style="width:${pct}%"></div></div><span class="pill p-${color}">${pct}%</span>`;
    });
  }

  /* ============== PATIENTS ============== */
  async function loadPatients(root) {
    const list = await api.patients.list();
    const tbody = $('#pg-patients tbody', root);
    if (!tbody) return;
    tbody.innerHTML = list.length ? list.map(p => `
      <tr data-id="${p.id}">
        <td class="id">${escape(p.code)}</td>
        <td><strong>${escape(p.name)}</strong></td>
        <td>${p.age || '—'}, ${p.sex || '—'}</td>
        <td>${escape(p.doctor_name || '—')}</td>
        <td>${escape(p.department || '—')}</td>
        <td><span class="pill ${patientPill(p.status)}">${escape(p.status)}</span></td>
        <td>${escape(p.last_visit || '—')}</td>
      </tr>`).join('') : `<tr><td colspan="7" class="empty">No patients — click <strong>Register Patient</strong> to add one</td></tr>`;
  }

  /* ============== APPOINTMENTS ============== */
  async function loadAppointments(root) {
    const [list, doctors] = await Promise.all([api.appointments.list(), api.doctors.list()]);
    const tbody = $('#pg-appointments tbody', root);
    if (tbody) {
      tbody.innerHTML = list.length ? list.map(a => `
        <tr data-id="${a.id}">
          <td><span class="time-chip">${escape(a.time)}</span></td>
          <td><strong>${escape(a.patient_name)}</strong></td>
          <td>${escape(a.doctor_name)}</td>
          <td>${escape(a.type || '—')}</td>
          <td><span class="pill ${apptPillClass(a.status)}">${escape(a.status)}</span></td>
          <td><span class="action-link" data-emr="${a.patient_id}">Open</span></td>
        </tr>`).join('') : `<tr><td colspan="6" class="empty">No appointments scheduled</td></tr>`;
    }
    // populate patient + doctor selects in modal
    const patients = await api.patients.list();
    fillSelect('#appt-patient', patients.map(p => ({ v: p.id, l: `${p.code} · ${p.name}` })));
    fillSelect('#appt-doctor',  doctors.map(d => ({ v: d.id, l: `${d.name} (${d.department || ''})` })));
  }

  /* ============== DOCTORS ============== */
  async function loadDoctors(root) {
    const list = await api.doctors.list();
    const grid = $('.doc-grid', root);
    if (!grid) return;
    grid.innerHTML = list.length ? list.map(d => {
      const initials = (d.name.match(/\b\w/g) || []).slice(0, 2).join('').toUpperCase();
      return `
        <div class="doc-card" data-id="${d.id}">
          <div class="doc-av ${d.avatar_color || 'primary'}">${escape(initials)}</div>
          <div class="doc-name">${escape(d.name)}</div>
          <div class="doc-dept">${escape(d.department || '—')}</div>
          <span class="pill ${doctorPill(d.status)}">${escape(d.status)}</span>
          <div class="doc-stat"><i class="ti ti-calendar-check"></i>${d.appointments || 0} appointments</div>
          <div class="bar-wrap"><div class="bar-fill ${d.avatar_color && d.avatar_color !== 'primary' ? d.avatar_color : ''}" style="width:${d.load_pct || 0}%"></div></div>
        </div>`;
    }).join('') : `<div class="empty">No doctors yet</div>`;
  }

  /* ============== EMR ============== */
  async function loadEMR(root) {
    // pick the first patient by default
    const patients = await api.patients.list();
    const sel = $('#emr-patient', root);
    if (sel && patients.length) {
      sel.innerHTML = patients.map(p => `<option value="${p.id}">${escape(p.code)} — ${escape(p.name)}</option>`).join('');
      sel.value = sel.value || patients[0].id;
    }
    if (sel && patients.length) await renderEMR(sel.value);
  }

  async function renderEMR(patientId) {
    const [patient, records] = await Promise.all([
      api.patients.get(patientId).catch(() => null),
      api.emr.forPatient(patientId).catch(() => []),
    ]);
    const head = $('#emr-patient-head', document);
    if (head && patient) {
      const initials = (patient.name.match(/\b\w/g) || []).slice(0, 2).join('').toUpperCase();
      head.innerHTML = `
        <div class="patient-head">
          <div class="patient-av">${initials}</div>
          <div>
            <div class="patient-name">${escape(patient.name)}</div>
            <div class="patient-meta">${patient.age || '—'} yrs · ${patient.sex || '—'} · ${patient.blood_group || '—'}</div>
          </div>
        </div>
        <table class="kv-table">
          <tr><td>Attending Doctor</td><td><strong>${escape(patient.doctor_name || '—')}</strong></td></tr>
          <tr><td>Department</td><td>${escape(patient.department || '—')}</td></tr>
          <tr><td>Status</td><td><span class="pill ${patientPill(patient.status)}">${escape(patient.status)}</span></td></tr>
          <tr><td>Phone</td><td>${escape(patient.phone || '—')}</td></tr>
        </table>`;
    }

    // timeline
    const tl = $('#emr-timeline', document);
    if (tl) {
      tl.innerHTML = records.length ? records.map((r, i) => {
        const color = i === 0 ? '' : i === 1 ? 'green' : 'amber';
        const isLast = i === records.length - 1;
        return `<div class="tl-item">
          <div class="tl-line-wrap">
            <div class="tl-dot ${color}"></div>
            ${isLast ? '' : '<div class="tl-vline"></div>'}
          </div>
          <div class="tl-body">
            <div class="tl-event">${escape(r.title)}</div>
            <div class="tl-meta">${escape(r.created_at || '')} · ${escape(r.doctor_name || '—')}${r.notes ? ' · ' + escape(r.notes) : ''}</div>
          </div>
        </div>`;
      }).join('') : `<div class="empty">No visit history yet</div>`;
    }

    // latest prescription
    const prescBody = $('#emr-prescriptions', document);
    if (prescBody) {
      const latest = records.find(r => (r.prescriptions || []).length) || records[0];
      const list = latest ? latest.prescriptions : [];
      prescBody.innerHTML = list.length ? list.map(p => `
        <tr><td><strong>${escape(p.medicine)}</strong></td><td>${escape(p.dose || '')}</td>
            <td>${escape(p.frequency || '')}</td><td>${escape(p.duration || '')}</td>
            <td class="muted">${escape(p.notes || '—')}</td></tr>
      `).join('') : `<tr><td colspan="5" class="empty">No prescriptions on file</td></tr>`;
    }
  }

  $('#emr-patient')?.addEventListener('change', (e) => renderEMR(e.target.value));

  /* ============== PHARMACY ============== */
  async function loadPharmacy(root) {
    const [list, stats] = await Promise.all([api.pharmacy.list(), api.pharmacy.stats()]);
    // top stats
    const total = $('.scard-val[data-field="ph-total"]', root);
    const low   = $('.scard-val[data-field="ph-low"]', root);
    if (total) total.dataset.count = stats.total;
    if (low)   low.dataset.count   = stats.low_stock;

    const tbody = $('#pg-pharmacy tbody', root);
    if (tbody) {
      tbody.innerHTML = list.length ? list.map(m => `
        <tr data-id="${m.id}">
          <td><strong>${escape(m.name)}</strong></td>
          <td>${escape(m.category || '—')}</td>
          <td class="${m.status === 'Critical' ? 'red' : m.status === 'Low' ? 'amber' : ''}"><strong>${m.stock}</strong></td>
          <td>${escape(m.unit)}</td>
          <td><span class="pill ${medPill(m.status)}">${escape(m.status)}</span></td>
        </tr>`).join('') : `<tr><td colspan="5" class="empty">No medicines in stock</td></tr>`;
    }
  }

  /* ============== LAB ============== */
  async function loadLab(root) {
    const [list, patients, doctors] = await Promise.all([api.lab.list(), api.patients.list(), api.doctors.list()]);
    const tbody = $('#pg-lab tbody', root);
    if (tbody) {
      tbody.innerHTML = list.length ? list.map(t => `
        <tr data-id="${t.id}">
          <td><strong>${escape(t.patient_name)}</strong></td>
          <td>${escape(t.test)}</td>
          <td>${escape(t.doctor_name)}</td>
          <td>${escape(t.time || '')}</td>
          <td><span class="pill ${labPill(t.status)}">${escape(t.status)}</span></td>
          <td>${t.status === 'Ready' ? '<span class="action-link">View PDF</span>' : '<span class="muted">—</span>'}</td>
        </tr>`).join('') : `<tr><td colspan="6" class="empty">No test orders</td></tr>`;
    }
    fillSelect('#lab-patient', patients.map(p => ({ v: p.id, l: `${p.code} · ${p.name}` })));
    fillSelect('#lab-doctor',  doctors.map(d => ({ v: d.id, l: d.name })));
  }

  /* ============== WARDS ============== */
  async function loadWards(root) {
    const [rows, stats] = await Promise.all([api.wards.list(), api.wards.stats()]);
    const tb = stats.total_beds || 0, oc = stats.occupied || 0, av = stats.available || 0, icu = rows.find(r => /icu/i.test(r.name));
    const icuPct = icu ? icu.pct : 0;

    setCardVal(root, 'ward-total', tb);
    setCardVal(root, 'ward-occ',   oc, true);
    setCardVal(root, 'ward-avail', av, true);
    setCardVal(root, 'ward-icu',   icuPct, false, '%');

    const tbody = $('#pg-wards tbody', root);
    if (tbody) {
      tbody.innerHTML = rows.length ? rows.map(w => {
        const color = w.pct >= 85 ? 'red' : w.pct >= 70 ? 'amber' : 'green';
        return `<tr><td><strong>${escape(w.name)}</strong></td>
          <td>${w.total}</td><td>${w.occupied}</td><td>${w.total - w.occupied}</td>
          <td><div class="occ-bar"><div class="occ-fill ${color}" style="width:${w.pct}%"></div></div><span class="pill p-${color}">${w.pct}%</span></td></tr>`;
      }).join('') : `<tr><td colspan="5" class="empty">No wards configured</td></tr>`;
    }
  }

  /* ============== BILLING ============== */
  async function loadBilling(root) {
    const [list, summary, patients] = await Promise.all([api.billing.list(), api.billing.summary(), api.patients.list()]);
    const hero = $('.billing-hero', root);
    if (hero) {
      hero.innerHTML = `
        <div>
          <div class="bh-label">Total Revenue — All Time</div>
          <div class="bh-val">₹${formatLakh(summary.total_revenue || 0)}</div>
          <div class="bh-sub up"><i class="ti ti-trending-up"></i>+12% vs last month</div>
        </div>
        <div class="bh-right">
          <div class="bh-label">Outstanding Dues</div>
          <div class="bh-val gold">₹${formatLakh(summary.outstanding || 0)}</div>
          <div class="bh-sub">${summary.pending_invoices || 0} invoices pending</div>
        </div>`;
    }
    const tbody = $('#pg-billing tbody', root);
    if (tbody) {
      tbody.innerHTML = list.length ? list.map(i => `
        <tr data-id="${i.id}">
          <td class="id">${escape(i.code)}</td>
          <td><strong>${escape(i.patient_name || '—')}</strong></td>
          <td><strong>₹${Number(i.amount).toLocaleString('en-IN')}</strong></td>
          <td>${escape(i.mode || '—')}</td>
          <td>${escape(i.date || '—')}</td>
          <td><span class="pill ${invPill(i.status)}">${escape(i.status)}</span></td>
        </tr>`).join('') : `<tr><td colspan="6" class="empty">No invoices yet</td></tr>`;
    }
    fillSelect('#inv-patient', patients.map(p => ({ v: p.id, l: `${p.code} · ${p.name}` })));
  }

  /* ============== REPORTS ============== */
  async function loadReports(root) {
    const r = await api.reports.summary();
    setCardVal(root, 'rep-patients',  r.monthly_patients);
    setCardVal(root, 'rep-revenue',   r.monthly_revenue, false, '', 'L', '₹', true);
    setCardVal(root, 'rep-wait',      r.avg_wait_min,    false, ' min');
    setCardVal(root, 'rep-bed',       r.bed_util_pct,    false, '%');

    const deptBody = $('#pg-reports .card:nth-of-type(1) tbody', root) || $('#pg-reports tbody', root);
    if (deptBody && r.by_department) {
      deptBody.innerHTML = r.by_department.map(d => `
        <tr><td><strong>${escape(d.department || '—')}</strong></td>
        <td><strong>₹${(d.revenue/100000).toFixed(1)}L</strong></td>
        <td>${d.patients}</td></tr>`).join('');
    }
    const docBody = $$('#pg-reports tbody', root)[1];
    if (docBody && r.by_doctor) {
      docBody.innerHTML = r.by_doctor.map(d => `
        <tr><td><strong>${escape(d.name)}</strong></td><td>${d.patients}</td>
        <td><span class="pill p-amber">${d.rating.toFixed(1)} ★</span></td></tr>`).join('');
    }
  }

  /* ============== STAFF ============== */
  async function loadStaff(root) {
    const list = await api.staff.list();
    const tbody = $('#pg-staff tbody', root);
    if (tbody) {
      tbody.innerHTML = list.length ? list.map(s => `
        <tr data-id="${s.id}">
          <td class="id">${escape(s.code)}</td>
          <td><strong>${escape(s.name)}</strong></td>
          <td><span class="pill ${staffPill(s.role)}">${escape(s.role)}</span></td>
          <td>${escape(s.department || '—')}</td>
          <td>${escape(s.shift || '—')}</td>
          <td><span class="pill ${s.status === 'On Duty' ? 'p-green' : 'p-gray'}">${escape(s.status)}</span></td>
        </tr>`).join('') : `<tr><td colspan="6" class="empty">No staff</td></tr>`;
    }
  }

  /* ============== SETTINGS ============== */
  async function loadSettings(root) {
    const [s, perms] = await Promise.all([api.settings.get(), api.settings.permissions()]);
    const setVal = (id, v) => { const el = $(`#${id}`, root); if (el) el.value = v || ''; };
    setVal('set-hospital',  s.hospital_name);
    setVal('set-reg',       s.registration_no);
    setVal('set-city',      s.city);
    setVal('set-contact',   s.contact);

    const tbody = $('#perm-tbody', root);
    if (tbody && perms.length) {
      const byRole = {};
      perms.forEach(p => { (byRole[p.role] = byRole[p.role] || []).push(p); });
      const roleClass = { admin:'p-red', doctor:'p-blue', receptionist:'p-gray', nurse:'p-purple', accountant:'p-amber' };
      tbody.innerHTML = Object.keys(byRole).map(role => {
        const cells = ['patients','billing','reports','admin'].map(res => {
          const rule = byRole[role].find(p => p.resource === res);
          return `<div class="perm-cols-cell"><div class="perm-check ${rule && rule.allowed ? 'pch-y' : 'pch-n'}">${rule && rule.allowed ? '✓' : '✗'}</div></div>`;
        }).join('');
        return `<div class="perm-row">
          <div class="perm-role"><span class="pill ${roleClass[role] || 'p-gray'}">${escape(role[0].toUpperCase()+role.slice(1))}</span></div>
          <div class="perm-cols">${cells}</div>
        </div>`;
      }).join('');
    }
  }

  /* ============================================================
     BOOT DASHBOARD ON LOGIN
     ============================================================ */
  async function bootDashboard() {
    try { await loadPage('dashboard', $('#pg-dashboard')); }
    catch (e) { console.error(e); }
    animateCounters($('#pg-dashboard'));
  }

  /* ============================================================
     COUNTERS / BARS
     ============================================================ */
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  function animateCounters(root) {
    if (!root) return;
    $$('.scard-val[data-count]', root).forEach((el, i) => {
      const final = parseFloat(el.dataset.count) || 0;
      const isFloat = el.dataset.count.includes('.');
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const dur = 1100, delay = i * 90;
      const start = performance.now() + delay;
      function frame(now) {
        const t = Math.min(1, Math.max(0, (now - start) / dur));
        const v = final * easeOutCubic(t);
        el.textContent = prefix + (isFloat ? v.toFixed(1) : Math.round(v).toLocaleString()) + suffix;
        if (t < 1) requestAnimationFrame(frame);
        else el.textContent = prefix + (isFloat ? final.toFixed(1) : final.toLocaleString()) + suffix;
      }
      requestAnimationFrame(frame);
    });
  }

  function reanimateBars(root) {
    if (!root) return;
    $$('.bar-fill, .occ-fill', root).forEach(bar => {
      const w = bar.style.width; bar.style.width = '0%';
      void bar.offsetWidth; requestAnimationFrame(() => { bar.style.width = w; });
    });
  }

  /* ============================================================
     TOAST
     ============================================================ */
  const toast = $('#toast');
  const toastText = $('#toast-text');
  let toastTimer = null;
  function showToast(text) {
    if (!toast) return;
    toastText.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  /* ============================================================
     MODALS (create flows)
     ============================================================ */
  const modalRoot = $('#modal-root');

  function openModal({ title, body, primaryLabel = 'Save', onSubmit, wide = false }) {
    modalRoot.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal ${wide ? 'wide' : ''}">
        <div class="modal-head">
          <h3>${escape(title)}</h3>
          <button class="modal-close" aria-label="Close"><i class="ti ti-x"></i></button>
        </div>
        <form class="modal-form" id="modal-form">
          <div class="modal-body">${body}</div>
          <div class="modal-foot">
            <button type="button" class="btn-out" data-cancel>Cancel</button>
            <button type="submit" class="btn-prim" data-submit>${escape(primaryLabel)}</button>
          </div>
        </form>
      </div>`;
    modalRoot.classList.add('show');
    document.body.style.overflow = 'hidden';

    const close = () => { modalRoot.classList.remove('show'); modalRoot.innerHTML = ''; document.body.style.overflow = ''; };
    modalRoot.querySelector('.modal-backdrop').addEventListener('click', close);
    modalRoot.querySelector('.modal-close').addEventListener('click', close);
    modalRoot.querySelector('[data-cancel]').addEventListener('click', close);

    const form = modalRoot.querySelector('#modal-form');
    const submitBtn = modalRoot.querySelector('[data-submit]');
    const handleSubmit = async (e) => {
      if (e) e.preventDefault();
      const data = formToObject(form);
      submitBtn.classList.add('loading'); submitBtn.disabled = true;
      try { await onSubmit(data); close(); }
      catch (err) {
        showToast(err.message || 'Save failed');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    };
    form.addEventListener('submit', handleSubmit);
    submitBtn.addEventListener('click', (e) => { e.preventDefault(); handleSubmit(); });

    setTimeout(() => modalRoot.querySelector('input, select, textarea')?.focus(), 50);
  }

  function formToObject(form) {
    const o = {};
    new FormData(form).forEach((v, k) => {
      if (v === '' || v == null) return;
      o[k] = v;
    });
    return o;
  }

  /* ============== Button → modal wiring ============== */
  $$('.btn-prim').forEach(btn => {
    const txt = btn.textContent.trim().toLowerCase();
    const sec = btn.closest('.page')?.id || '';
    if (sec === 'pg-settings') return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (/register patient/i.test(txt)) openPatientModal();
      else if (/book appointment/i.test(txt)) openApptModal();
      else if (/add doctor/i.test(txt)) openDoctorModal();
      else if (/add medicine/i.test(txt)) openMedicineModal();
      else if (/new test order/i.test(txt)) openLabModal();
      else if (/new invoice/i.test(txt)) openInvoiceModal();
      else if (/add staff/i.test(txt)) openStaffModal();
      else if (/new record/i.test(txt)) openEMRModal();
    });
  });

  function openPatientModal() {
    api.doctors.list().then(doctors => {
      openModal({
        title: 'Register new patient',
        body: `
          <div class="form-grid">
            <div class="fg"><label>Full name *</label><input name="name" required placeholder="Ramesh Gupta" /></div>
            <div class="fg"><label>Phone</label><input name="phone" placeholder="+91 ..." /></div>
            <div class="fg"><label>Age</label><input name="age" type="number" min="0" placeholder="54" /></div>
            <div class="fg"><label>Sex</label><select name="sex"><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div class="fg"><label>Blood group</label><select name="blood_group"><option value="">—</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select></div>
            <div class="fg"><label>Department</label><input name="department" placeholder="Cardiology" /></div>
            <div class="fg"><label>Attending doctor</label><select name="doctor_id">
              <option value="">—</option>
              ${doctors.map(d => `<option value="${d.id}">${escape(d.name)}</option>`).join('')}
            </select></div>
            <div class="fg"><label>Status</label><select name="status">
              <option>OPD</option><option>Admitted</option><option>Pending</option><option>Discharged</option>
            </select></div>
          </div>`,
        onSubmit: async (data) => {
          if (data.doctor_id) data.doctor_id = parseInt(data.doctor_id);
          if (data.age) data.age = parseInt(data.age);
          await api.patients.create(data);
          showToast('Patient registered');
          await loadPatients($('#pg-patients'));
        }
      });
    });
  }

  function openApptModal() {
    Promise.all([api.patients.list(), api.doctors.list()]).then(([patients, doctors]) => {
      openModal({
        title: 'Book new appointment',
        body: `
          <div class="form-grid">
            <div class="fg"><label>Patient *</label><select name="patient_id" required>
              <option value="">— Select patient —</option>
              ${patients.map(p => `<option value="${p.id}">${escape(p.code)} · ${escape(p.name)}</option>`).join('')}
            </select></div>
            <div class="fg"><label>Doctor *</label><select name="doctor_id" required>
              <option value="">— Select doctor —</option>
              ${doctors.map(d => `<option value="${d.id}">${escape(d.name)} (${escape(d.department || '')})</option>`).join('')}
            </select></div>
            <div class="fg"><label>Time *</label><input name="time" type="time" required value="10:00" /></div>
            <div class="fg"><label>Type</label><select name="type">
              <option>Consultation</option><option>Follow-up</option><option>New Patient</option><option>X-Ray Review</option><option>Procedure</option>
            </select></div>
            <div class="fg" style="grid-column:1/-1"><label>Notes</label><textarea name="notes" rows="2" placeholder="Optional"></textarea></div>
          </div>`,
        onSubmit: async (data) => {
          data.patient_id = parseInt(data.patient_id);
          data.doctor_id  = parseInt(data.doctor_id);
          await api.appointments.create(data);
          showToast('Appointment booked');
          await loadAppointments($('#pg-appointments'));
          // refresh dashboard numbers
          await loadDashboard($('#pg-dashboard'));
        }
      });
    });
  }

  function openDoctorModal() {
    openModal({
      title: 'Add new doctor',
      body: `
        <div class="form-grid">
          <div class="fg"><label>Full name *</label><input name="name" required placeholder="Dr. A. Kumar" /></div>
          <div class="fg"><label>Department *</label><input name="department" required placeholder="Cardiology" /></div>
          <div class="fg"><label>Status</label><select name="status">
            <option>Available</option><option>In Consultation</option><option>In Surgery</option><option>On Leave</option>
          </select></div>
          <div class="fg"><label>Avatar color</label><select name="avatar_color">
            <option value="primary">Teal</option><option value="purple">Purple</option>
            <option value="green">Green</option><option value="amber">Amber</option>
            <option value="red">Red</option><option value="teal">Mint</option>
          </select></div>
        </div>`,
      onSubmit: async (data) => {
        data.appointments = 0; data.load_pct = 0;
        await api.doctors.create(data);
        showToast('Doctor added');
        await loadDoctors($('#pg-doctors'));
      }
    });
  }

  function openMedicineModal() {
    openModal({
      title: 'Add new medicine',
      body: `
        <div class="form-grid">
          <div class="fg"><label>Medicine name *</label><input name="name" required placeholder="Paracetamol 500mg" /></div>
          <div class="fg"><label>Category</label><input name="category" placeholder="Analgesic" /></div>
          <div class="fg"><label>Stock *</label><input name="stock" type="number" min="0" required value="0" /></div>
          <div class="fg"><label>Unit</label><select name="unit"><option>Strips</option><option>Caps</option><option>Bottles</option><option>Vials</option></select></div>
          <div class="fg"><label>Low-stock threshold</label><input name="threshold" type="number" min="0" value="50" /></div>
        </div>`,
      onSubmit: async (data) => {
        data.stock = parseInt(data.stock); data.threshold = parseInt(data.threshold);
        await api.pharmacy.create(data);
        showToast('Medicine added');
        await loadPharmacy($('#pg-pharmacy'));
      }
    });
  }

  function openLabModal() {
    Promise.all([api.patients.list(), api.doctors.list()]).then(([patients, doctors]) => {
      openModal({
        title: 'New lab test order',
        body: `
          <div class="form-grid">
            <div class="fg"><label>Patient *</label><select name="patient_id" required>
              <option value="">—</option>${patients.map(p => `<option value="${p.id}">${escape(p.code)} · ${escape(p.name)}</option>`).join('')}
            </select></div>
            <div class="fg"><label>Doctor *</label><select name="doctor_id" required>
              <option value="">—</option>${doctors.map(d => `<option value="${d.id}">${escape(d.name)}</option>`).join('')}
            </select></div>
            <div class="fg"><label>Test *</label><input name="test" required placeholder="CBC, HbA1c, X-Ray..." /></div>
            <div class="fg"><label>Time</label><input name="time" type="time" value="${new Date().toTimeString().slice(0,5)}" /></div>
          </div>`,
        onSubmit: async (data) => {
          data.patient_id = parseInt(data.patient_id); data.doctor_id = parseInt(data.doctor_id);
          await api.lab.create(data);
          showToast('Test order created');
          await loadLab($('#pg-lab'));
        }
      });
    });
  }

  function openInvoiceModal() {
    api.patients.list().then(patients => {
      openModal({
        title: 'Create new invoice',
        body: `
          <div class="form-grid">
            <div class="fg"><label>Patient</label><select name="patient_id">
              <option value="">— Walk-in / Other —</option>
              ${patients.map(p => `<option value="${p.id}">${escape(p.code)} · ${escape(p.name)}</option>`).join('')}
            </select></div>
            <div class="fg"><label>Amount (₹) *</label><input name="amount" type="number" min="0" step="0.01" required value="0" /></div>
            <div class="fg"><label>Payment mode</label><select name="mode">
              <option>Cash</option><option>Card</option><option>UPI</option><option>Insurance</option>
            </select></div>
            <div class="fg"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}" /></div>
            <div class="fg"><label>Status</label><select name="status">
              <option>Paid</option><option>Pending</option><option>Overdue</option>
            </select></div>
          </div>`,
        onSubmit: async (data) => {
          if (data.patient_id) data.patient_id = parseInt(data.patient_id);
          data.amount = parseFloat(data.amount);
          await api.billing.create(data);
          showToast('Invoice created');
          await loadBilling($('#pg-billing'));
        }
      });
    });
  }

  function openStaffModal() {
    openModal({
      title: 'Add new staff member',
      body: `
        <div class="form-grid">
          <div class="fg"><label>Full name *</label><input name="name" required placeholder="Anita Sharma" /></div>
          <div class="fg"><label>Role *</label><select name="role" required>
            <option>Doctor</option><option>Nurse</option><option>Receptionist</option>
            <option>Pharmacist</option><option>Lab Tech</option><option>Accountant</option>
            <option>Admin</option>
          </select></div>
          <div class="fg"><label>Department</label><input name="department" placeholder="OPD" /></div>
          <div class="fg"><label>Shift</label><select name="shift">
            <option>Morning</option><option>Evening</option><option>Night</option><option>—</option>
          </select></div>
        </div>`,
      onSubmit: async (data) => {
        await api.staff.create(data);
        showToast('Staff added');
        await loadStaff($('#pg-staff'));
      }
    });
  }

  function openEMRModal() {
    Promise.all([api.patients.list(), api.doctors.list()]).then(([patients, doctors]) => {
      openModal({
        title: 'New EMR record',
        body: `
          <div class="form-grid">
            <div class="fg"><label>Patient *</label><select name="patient_id" required>
              <option value="">—</option>${patients.map(p => `<option value="${p.id}">${escape(p.code)} · ${escape(p.name)}</option>`).join('')}
            </select></div>
            <div class="fg"><label>Doctor</label><select name="doctor_id">
              <option value="">—</option>${doctors.map(d => `<option value="${d.id}">${escape(d.name)}</option>`).join('')}
            </select></div>
            <div class="fg"><label>Type</label><select name="type">
              <option>admission</option><option>follow-up</option><option>diagnosis</option><option>procedure</option><option>discharge</option>
            </select></div>
            <div class="fg"><label>Title *</label><input name="title" required placeholder="e.g. Routine check-up" /></div>
            <div class="fg" style="grid-column:1/-1"><label>Notes</label><textarea name="notes" rows="3"></textarea></div>
          </div>`,
        onSubmit: async (data) => {
          if (data.patient_id) data.patient_id = parseInt(data.patient_id);
          if (data.doctor_id)  data.doctor_id  = parseInt(data.doctor_id);
          await api.emr.create(data);
          showToast('EMR record added');
          if ($('#pg-emr').classList.contains('active')) await renderEMR($('#emr-patient').value);
        }
      });
    });
  }

  /* ============================================================
     UTILS
     ============================================================ */
  function escape(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  function fillSelect(selector, items) {
    const sel = $(selector);
    if (!sel) return;
    const current = sel.value;
    const first = sel.options[0] ? sel.options[0].outerHTML : '<option value="">—</option>';
    sel.innerHTML = first + items.map(i => `<option value="${i.v}">${escape(i.l)}</option>`).join('');
    sel.value = current;
  }

  function setCardVal(root, key, value, isColor = false, suffix = '', suffixOverride = '', prefix = '', forceFloat = false) {
    const el = $(`.scard-val[data-field="${key}"]`, root);
    if (!el) return;
    if (isColor) el.classList.add('red');
    if (value >= 100000 && !suffix && !suffixOverride) {
      el.dataset.count = (value / 100000).toFixed(1);
      el.dataset.suffix = 'L';
      el.dataset.prefix = '₹';
    } else {
      el.dataset.count = String(value);
      if (suffix) el.dataset.suffix = suffix;
      if (prefix) el.dataset.prefix = prefix;
    }
  }

  function formatLakh(n) {
    if (n >= 10000000) return (n / 10000000).toFixed(2) + 'Cr';
    if (n >= 100000)   return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000)     return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function apptStatusClass(s)  { return ({ Done:'done', Ongoing:'on', Waiting:'wait', Scheduled:'sched' }[s] || 'sched'); }
  function apptPillClass(s)    { return ({ Done:'p-green', Ongoing:'p-blue', Waiting:'p-amber', Scheduled:'p-gray' }[s] || 'p-gray'); }
  function patientPill(s)      { return ({ Admitted:'p-blue', OPD:'p-green', Pending:'p-amber', Discharged:'p-gray' }[s] || 'p-gray'); }
  function doctorPill(s)       { return ({ Available:'p-green', 'In Consultation':'p-blue', 'In Surgery':'p-amber', 'On Leave':'p-gray' }[s] || 'p-gray'); }
  function medPill(s)          { return ({ OK:'p-green', Low:'p-amber', Critical:'p-red' }[s] || 'p-gray'); }
  function labPill(s)          { return ({ Ready:'p-green', Processing:'p-amber', Collected:'p-blue' }[s] || 'p-gray'); }
  function invPill(s)          { return ({ Paid:'p-green', Pending:'p-amber', Overdue:'p-red' }[s] || 'p-gray'); }
  function staffPill(s)        { return ({ Doctor:'p-blue', Nurse:'p-purple', Receptionist:'p-gray', Pharmacist:'p-green', 'Lab Tech':'p-amber' }[s] || 'p-gray'); }

  /* ============================================================
     EXTRAS — topbar search, view-all, ⌘K
     ============================================================ */
  $$('.view-all, .action-link').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const txt = (el.textContent || '').trim().replace(/→$/, '').trim();
      showToast(txt || 'Opening…');
    });
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      $('.topbar-search input')?.focus();
    }
  });

  // Topbar search → simple alert (could be wired to a real search API)
  $('.topbar-search input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      showToast(`Searching for "${e.target.value.trim()}"…`);
      e.target.value = '';
    }
  });

  // Settings save
  $('#settings-save')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const data = {
      hospital_name:   $('#set-hospital')?.value,
      registration_no: $('#set-reg')?.value,
      city:            $('#set-city')?.value,
      contact:         $('#set-contact')?.value,
    };
    try { await api.settings.update(data); showToast('Settings saved ✓'); }
    catch (err) { showToast('Save failed: ' + err.message); }
  });

  // Console banner
  console.log('%cMediCore HMS%c\nHospital Management System • v1.0.0 — API ready',
    'color:#0d9488;font-weight:700;font-size:14px', 'color:#64748b;font-size:11px');
  console.log('API base:', window.api?.API_BASE);
})();
