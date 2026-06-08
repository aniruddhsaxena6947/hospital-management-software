/* ============================================================
   CareStation PWA — Main App
   ============================================================ */

(() => {
  'use strict';

  /* ---------------- helpers ---------------- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const initials = (n) => (n || '?').split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  let toastTimer = null;
  function showToast(text) {
    const t = $('#toast'), txt = $('#toast-text');
    if (!t || !txt) return;
    txt.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ============================================================
     SERVICE WORKER
     ============================================================ */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js')
        .then((reg) => {
          console.log('[SW] registered, scope:', reg.scope);
          reg.addEventListener('updatefound', () => {
            const w = reg.installing;
            w?.addEventListener('statechange', () => {
              if (w.state === 'installed' && navigator.serviceWorker.controller) {
                showToast('Update available — refresh to apply');
              }
            });
          });
        })
        .catch((err) => console.warn('[SW] registration failed:', err));
    });
  }

  /* ============================================================
     OFFLINE DETECTION
     ============================================================ */
  function updateOnline() {
    const bar = $('#offline-bar');
    if (!bar) return;
    bar.hidden = navigator.onLine;
  }
  window.addEventListener('online',  () => { updateOnline(); showToast('Back online — syncing data'); });
  window.addEventListener('offline', () => { updateOnline(); showToast('You are offline'); });
  updateOnline();

  /* ============================================================
     PWA INSTALL PROMPT
     ============================================================ */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = $('#install-btn');
    if (btn) btn.hidden = false;
  });
  $('#install-btn')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') showToast('CareStation installed');
    deferredPrompt = null;
    $('#install-btn').hidden = true;
  });
  window.addEventListener('appinstalled', () => { showToast('App installed'); $('#install-btn') && ($('#install-btn').hidden = true); });

  /* ============================================================
     SERVER STATUS
     ============================================================ */
  function setServerStatus(state, text) {
    const el = $('#server-status');
    if (!el) return;
    el.classList.remove('checking', 'online', 'offline');
    el.classList.add(state);
    el.innerHTML = `<i class="ti ${state === 'online' ? 'ti-circle-check' : state === 'offline' ? 'ti-circle-x' : 'ti-loader'}"></i> ${text}`;
  }
  setServerStatus('checking', 'Connecting…');

  /* ============================================================
     MODAL SYSTEM
     ============================================================ */
  const modalRoot = $('#modal-root');
  function openModal({ title, body, primaryLabel = 'Save', onSubmit, wide = false, danger = false }) {
    modalRoot.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal ${wide ? 'wide' : ''}">
        <div class="modal-head">
          <h3>${esc(title)}</h3>
          <button class="modal-close" aria-label="Close"><i class="ti ti-x"></i></button>
        </div>
        <form class="modal-form" id="modal-form">
          <div class="modal-body">${body}</div>
          <div class="modal-foot">
            <button type="button" class="btn-out" data-cancel>Cancel</button>
            <button type="submit" class="btn-prim ${danger ? 'danger' : ''}" data-submit>${esc(primaryLabel)}</button>
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
    new FormData(form).forEach((v, k) => { if (v !== '' && v != null) o[k] = v; });
    return o;
  }

  function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm }) {
    openModal({
      title,
      body: `<p style="color:var(--ink-700);line-height:1.6">${esc(message)}</p>`,
      primaryLabel: confirmLabel,
      danger,
      onSubmit: async () => { await onConfirm(); }
    });
  }

  /* ============================================================
     FORM TEMPLATES
     ============================================================ */
  function patientForm(p = {}) {
    const doctors = db.list('doctors');
    return `
      <div class="form-grid">
        <div class="fg"><label>Full name *</label><input name="name" required value="${esc(p.name || '')}" placeholder="Ramesh Gupta"></div>
        <div class="fg"><label>Phone</label><input name="phone" value="${esc(p.phone || '')}" placeholder="+91 ..."></div>
        <div class="fg"><label>Age</label><input name="age" type="number" min="0" value="${p.age || ''}"></div>
        <div class="fg"><label>Sex</label><select name="sex">
          <option value="">—</option>
          ${['Male','Female','Other'].map((s) => `<option ${p.sex===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
        <div class="fg"><label>Blood group</label><select name="blood_group">
          <option value="">—</option>
          ${['A+','A-','B+','B-','O+','O-','AB+','AB-'].map((s) => `<option ${p.blood_group===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
        <div class="fg"><label>Department</label><input name="department" value="${esc(p.department || '')}" placeholder="Cardiology"></div>
        <div class="fg"><label>Attending doctor</label><select name="doctor_id">
          <option value="">—</option>
          ${doctors.map((d) => `<option value="${d.id}" ${p.doctor_id===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}
        </select></div>
        <div class="fg"><label>Status</label><select name="status">
          ${['OPD','Admitted','Pending','Discharged','Critical','Stable','Active','Waiting'].map((s) => `<option ${p.status===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
      </div>
    `;
  }

  function apptForm(a = {}) {
    const patients = db.list('patients');
    const doctors  = db.list('doctors');
    return `
      <div class="form-grid">
        <div class="fg"><label>Patient *</label><select name="patient_id" required>
          <option value="">— Select patient —</option>
          ${patients.map((p) => `<option value="${p.id}" ${a.patient_id===p.id?'selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}
        </select></div>
        <div class="fg"><label>Doctor *</label><select name="doctor_id" required>
          <option value="">— Select doctor —</option>
          ${doctors.map((d) => `<option value="${d.id}" ${a.doctor_id===d.id?'selected':''}>${esc(d.name)} (${esc(d.department || '')})</option>`).join('')}
        </select></div>
        <div class="fg"><label>Time *</label><input name="time" type="time" required value="${esc(a.time || '10:00')}"></div>
        <div class="fg"><label>Type</label><select name="type">
          ${['Consultation','Follow-up','New Patient','X-Ray Review','Procedure'].map((s) => `<option ${a.type===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
        <div class="fg" style="grid-column:1/-1"><label>Notes</label><textarea name="notes" rows="2">${esc(a.notes || '')}</textarea></div>
      </div>
    `;
  }

  function doctorForm(d = {}) {
    return `
      <div class="form-grid">
        <div class="fg"><label>Full name *</label><input name="name" required value="${esc(d.name || '')}" placeholder="Dr. A. Kumar"></div>
        <div class="fg"><label>Department *</label><input name="department" required value="${esc(d.department || '')}" placeholder="Cardiology"></div>
        <div class="fg"><label>Status</label><select name="status">
          ${['Available','In Consultation','In Surgery','On Leave'].map((s) => `<option ${d.status===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
        <div class="fg"><label>Avatar color</label><select name="avatar_color">
          ${['primary','purple','teal','green','red','amber'].map((c) => `<option value="${c}" ${d.avatar_color===c?'selected':''}>${c}</option>`).join('')}
        </select></div>
      </div>
    `;
  }

  function medicineForm(m = {}) {
    return `
      <div class="form-grid">
        <div class="fg"><label>Medicine name *</label><input name="name" required value="${esc(m.name || '')}" placeholder="Paracetamol 500mg"></div>
        <div class="fg"><label>Category</label><input name="category" value="${esc(m.category || '')}" placeholder="Analgesic"></div>
        <div class="fg"><label>Stock</label><input name="stock" type="number" min="0" value="${m.stock ?? 0}"></div>
        <div class="fg"><label>Unit</label><input name="unit" value="${esc(m.unit || 'tabs')}" placeholder="tabs / strips / pens"></div>
        <div class="fg"><label>Unit price (₹)</label><input name="price" type="number" min="0" step="0.5" value="${m.price ?? 0}"></div>
        <div class="fg"><label>Expiry</label><input name="expiry" type="date" value="${esc(m.expiry || '')}"></div>
      </div>
    `;
  }

  function labForm(l = {}) {
    const patients = db.list('patients');
    const doctors  = db.list('doctors');
    return `
      <div class="form-grid">
        <div class="fg"><label>Patient *</label><select name="patient_id" required>
          <option value="">—</option>
          ${patients.map((p) => `<option value="${p.id}" ${l.patient_id===p.id?'selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}
        </select></div>
        <div class="fg"><label>Test *</label><input name="test" required value="${esc(l.test || '')}" placeholder="Complete Blood Count"></div>
        <div class="fg"><label>Ordered by *</label><select name="ordered_by" required>
          <option value="">—</option>
          ${doctors.map((d) => `<option value="${d.id}" ${l.ordered_by===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}
        </select></div>
        <div class="fg"><label>Status</label><select name="status">
          ${['Pending','In Progress','Completed'].map((s) => `<option ${l.status===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
        <div class="fg" style="grid-column:1/-1"><label>Result</label><input name="result" value="${esc(l.result || '')}" placeholder="Leave empty if pending"></div>
      </div>
    `;
  }

  function invoiceForm(b = {}) {
    const patients = db.list('patients');
    return `
      <div class="form-grid">
        <div class="fg"><label>Patient *</label><select name="patient_id" required>
          <option value="">—</option>
          ${patients.map((p) => `<option value="${p.id}" ${b.patient_id===p.id?'selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}
        </select></div>
        <div class="fg"><label>Date</label><input name="date" type="date" value="${esc(b.date || new Date().toISOString().slice(0, 10))}"></div>
        <div class="fg"><label>Amount (₹) *</label><input name="amount" type="number" min="0" step="1" required value="${b.amount ?? ''}"></div>
        <div class="fg"><label>Items</label><input name="items" type="number" min="1" value="${b.items ?? 1}"></div>
        <div class="fg"><label>Status</label><select name="status">
          ${['Pending','Paid'].map((s) => `<option ${b.status===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
      </div>
    `;
  }

  function staffForm(s = {}) {
    return `
      <div class="form-grid">
        <div class="fg"><label>Full name *</label><input name="name" required value="${esc(s.name || '')}"></div>
        <div class="fg"><label>Email</label><input name="email" type="email" value="${esc(s.email || '')}"></div>
        <div class="fg"><label>Role *</label><select name="role" required>
          ${['Doctor','Nurse','Receptionist','Accountant','Technician','Admin','Pharmacist','Lab Tech'].map((r) => `<option ${s.role===r?'selected':''}>${r}</option>`).join('')}
        </select></div>
        <div class="fg"><label>Department</label><input name="department" value="${esc(s.department || '')}"></div>
        <div class="fg"><label>Status</label><select name="status">
          ${['Active','On Duty','On Leave','Inactive'].map((st) => `<option ${s.status===st?'selected':''}>${st}</option>`).join('')}
        </select></div>
      </div>
    `;
  }

  function emrForm(r = {}) {
    const patients = db.list('patients');
    const doctors  = db.list('doctors').concat(db.list('staff').filter((s) => /doctor/i.test(s.role)));
    return `
      <div class="form-grid">
        <div class="fg"><label>Patient *</label><select name="patient_id" required>
          <option value="">—</option>
          ${patients.map((p) => `<option value="${p.id}" ${r.patient_id===p.id?'selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}
        </select></div>
        <div class="fg"><label>Type *</label><select name="type" required>
          ${['Diagnosis','Prescription','Lab Order','Imaging','Note'].map((s) => `<option ${r.type===s?'selected':''}>${s}</option>`).join('')}
        </select></div>
        <div class="fg" style="grid-column:1/-1"><label>Title *</label><input name="title" required value="${esc(r.title || '')}" placeholder="Hypertension Stage II"></div>
        <div class="fg" style="grid-column:1/-1"><label>Notes</label><textarea name="notes" rows="2">${esc(r.notes || '')}</textarea></div>
        <div class="fg"><label>Doctor</label><select name="doctor_id">
          <option value="">—</option>
          ${doctors.map((d) => `<option value="${d.id}" ${r.doctor_id===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}
        </select></div>
      </div>
    `;
  }

  /* ============================================================
     CRUD HANDLERS
     ============================================================ */
  function newPatient() {
    openModal({
      title: 'Register new patient',
      body: patientForm(),
      onSubmit: async (data) => {
        if (data.doctor_id) data.doctor_id = parseInt(data.doctor_id, 10);
        if (data.age) data.age = parseInt(data.age, 10);
        const code = 'P' + (1054 + db.list('patients').length);
        db.create('patients', { ...data, code, last_visit: new Date().toISOString().slice(0, 10) });
        showToast('Patient registered');
        await router.go('patients');
      }
    });
  }

  function editPatient(id) {
    const p = db.get('patients', id);
    if (!p) return;
    openModal({
      title: 'Edit patient',
      body: patientForm(p),
      onSubmit: async (data) => {
        if (data.doctor_id) data.doctor_id = parseInt(data.doctor_id, 10);
        if (data.age) data.age = parseInt(data.age, 10);
        db.update('patients', id, data);
        showToast('Patient updated');
        await router.go('patients');
      }
    });
  }

  function delPatient(id) {
    const p = db.get('patients', id);
    if (!p) return;
    confirmDialog({
      title: 'Delete patient?',
      message: `This will permanently delete ${p.name} (${p.code}). This action cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        db.remove('patients', id);
        showToast('Patient deleted');
        await router.go('patients');
      }
    });
  }

  function newAppt() {
    openModal({
      title: 'Book new appointment',
      body: apptForm(),
      onSubmit: async (data) => {
        data.patient_id = parseInt(data.patient_id, 10);
        data.doctor_id  = parseInt(data.doctor_id, 10);
        if (!data.patient_id || !data.doctor_id) throw new Error('Patient and doctor are required');
        const p = db.get('patients', data.patient_id);
        const d = db.get('doctors',  data.doctor_id);
        data.department = d?.department || '';
        data.status = 'Scheduled';
        db.create('appointments', data);
        showToast('Appointment booked');
        await router.go('appointments');
      }
    });
  }

  function newDoctor() {
    openModal({
      title: 'Add new doctor',
      body: doctorForm(),
      onSubmit: async (data) => {
        data.appointments = 0;
        data.load_pct = 30;
        db.create('doctors', data);
        showToast('Doctor added');
        await router.go('doctors');
      }
    });
  }

  function editDoctor(id) {
    const d = db.get('doctors', id);
    if (!d) return;
    openModal({
      title: 'Edit doctor',
      body: doctorForm(d),
      onSubmit: async (data) => {
        db.update('doctors', id, data);
        showToast('Doctor updated');
        await router.go('doctors');
      }
    });
  }

  function delDoctor(id) {
    confirmDialog({
      title: 'Remove doctor?',
      message: 'This will remove the doctor from your roster.',
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: async () => { db.remove('doctors', id); showToast('Doctor removed'); await router.go('doctors'); }
    });
  }

  function newMedicine() {
    openModal({
      title: 'Add medicine',
      body: medicineForm(),
      onSubmit: async (data) => {
        data.stock = parseInt(data.stock || 0, 10);
        data.price = parseFloat(data.price || 0);
        data.status = data.stock < 20 ? 'Low Stock' : 'In Stock';
        db.create('pharmacy', data);
        showToast('Medicine added');
        await router.go('pharmacy');
      }
    });
  }

  function editMedicine(id) {
    const m = db.get('pharmacy', id);
    if (!m) return;
    openModal({
      title: 'Edit medicine',
      body: medicineForm(m),
      onSubmit: async (data) => {
        data.stock = parseInt(data.stock || 0, 10);
        data.price = parseFloat(data.price || 0);
        data.status = data.stock < 20 ? 'Low Stock' : 'In Stock';
        db.update('pharmacy', id, data);
        showToast('Medicine updated');
        await router.go('pharmacy');
      }
    });
  }

  function delMedicine(id) {
    confirmDialog({
      title: 'Delete medicine?',
      message: 'This will remove the medicine from your inventory.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => { db.remove('pharmacy', id); showToast('Medicine deleted'); await router.go('pharmacy'); }
    });
  }

  function newLab() {
    openModal({
      title: 'New test order',
      body: labForm(),
      onSubmit: async (data) => {
        data.patient_id = parseInt(data.patient_id, 10);
        data.ordered_by = parseInt(data.ordered_by, 10);
        if (!data.patient_id || !data.ordered_by || !data.test) throw new Error('All fields are required');
        data.ordered_at = new Date().toISOString().slice(0, 16).replace('T', ' ');
        db.create('lab', data);
        showToast('Test ordered');
        await router.go('lab');
      }
    });
  }

  function newInvoice() {
    openModal({
      title: 'Create invoice',
      body: invoiceForm(),
      onSubmit: async (data) => {
        data.patient_id = parseInt(data.patient_id, 10);
        data.amount = parseFloat(data.amount || 0);
        data.items  = parseInt(data.items || 1, 10);
        const lastInv = db.list('billing')[0];
        const nextNum = (parseInt((lastInv?.invoice_no || 'INV-2026-0142').split('-').pop(), 10) || 142) + 1;
        data.invoice_no = 'INV-2026-' + String(nextNum).padStart(4, '0');
        db.create('billing', data);
        showToast('Invoice created');
        await router.go('billing');
      }
    });
  }

  function newStaff() {
    openModal({
      title: 'Add staff member',
      body: staffForm(),
      onSubmit: async (data) => {
        db.create('staff', data);
        showToast('Staff added');
        await router.go('staff');
      }
    });
  }

  function editStaff(id) {
    const s = db.get('staff', id);
    if (!s) return;
    openModal({
      title: 'Edit staff',
      body: staffForm(s),
      onSubmit: async (data) => {
        db.update('staff', id, data);
        showToast('Staff updated');
        await router.go('staff');
      }
    });
  }

  function delStaff(id) {
    confirmDialog({
      title: 'Remove staff?',
      message: 'This will remove the staff member from the directory.',
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: async () => { db.remove('staff', id); showToast('Staff removed'); await router.go('staff'); }
    });
  }

  function newEMR() {
    openModal({
      title: 'New medical record',
      body: emrForm(),
      onSubmit: async (data) => {
        data.patient_id = parseInt(data.patient_id, 10);
        if (data.doctor_id) data.doctor_id = parseInt(data.doctor_id, 10);
        if (!data.patient_id) throw new Error('Patient is required');
        const d = db.get('doctors', data.doctor_id) || db.get('staff', data.doctor_id);
        data.doctor_name = d?.name || '';
        data.created_at = new Date().toISOString().slice(0, 16).replace('T', ' ');
        db.create('emr', data);
        showToast('Record added');
        await router.go('emr');
      }
    });
  }

  function delEMR(id) {
    confirmDialog({
      title: 'Delete record?',
      message: 'This medical record will be permanently deleted.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => { db.remove('emr', id); showToast('Record deleted'); await router.go('emr'); }
    });
  }

  function delBill(id) {
    confirmDialog({
      title: 'Delete invoice?',
      message: 'This invoice will be permanently deleted.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => { db.remove('billing', id); showToast('Invoice deleted'); await router.go('billing'); }
    });
  }

  function toggleBill(id) {
    const b = db.get('billing', id);
    if (!b) return;
    db.update('billing', id, { status: b.status === 'Paid' ? 'Pending' : 'Paid' });
    showToast('Invoice updated');
    router.go('billing');
  }

  /* ============================================================
     CSV EXPORT
     ============================================================ */
  function exportCSV() {
    const patients = db.list('patients');
    if (!patients.length) { showToast('No data to export'); return; }
    const cols = ['code', 'name', 'age', 'sex', 'blood_group', 'phone', 'department', 'status', 'last_visit'];
    const rows = [cols.join(',')];
    patients.forEach((p) => {
      rows.push(cols.map((c) => `"${String(p[c] ?? '').replace(/"/g, '""')}"`).join(','));
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carestation-patients-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported');
  }

  /* ============================================================
     ACTION DISPATCH
     ============================================================ */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action], [data-edit-patient], [data-del-patient], [data-edit-doctor], [data-del-doctor], [data-edit-medicine], [data-del-medicine], [data-del-emr], [data-edit-staff], [data-del-staff], [data-del-bill], [data-toggle-bill]');
    if (!t) return;
    if (t.dataset.action === 'new-patient')   { e.preventDefault(); newPatient(); }
    if (t.dataset.action === 'new-appt')      { e.preventDefault(); newAppt(); }
    if (t.dataset.action === 'new-doctor')    { e.preventDefault(); newDoctor(); }
    if (t.dataset.action === 'new-medicine')  { e.preventDefault(); newMedicine(); }
    if (t.dataset.action === 'new-lab')       { e.preventDefault(); newLab(); }
    if (t.dataset.action === 'new-invoice')   { e.preventDefault(); newInvoice(); }
    if (t.dataset.action === 'new-staff')     { e.preventDefault(); newStaff(); }
    if (t.dataset.action === 'new-emr')       { e.preventDefault(); newEMR(); }
    if (t.dataset.editPatient)  editPatient(t.dataset.editPatient);
    if (t.dataset.delPatient)   delPatient(t.dataset.delPatient);
    if (t.dataset.editDoctor)   editDoctor(t.dataset.editDoctor);
    if (t.dataset.delDoctor)    delDoctor(t.dataset.delDoctor);
    if (t.dataset.editMedicine) editMedicine(t.dataset.editMedicine);
    if (t.dataset.delMedicine)  delMedicine(t.dataset.delMedicine);
    if (t.dataset.delEmr)       delEMR(t.dataset.delEmr);
    if (t.dataset.editStaff)    editStaff(t.dataset.editStaff);
    if (t.dataset.delStaff)     delStaff(t.dataset.delStaff);
    if (t.dataset.delBill)      delBill(t.dataset.delBill);
    if (t.dataset.toggleBill)   toggleBill(t.dataset.toggleBill);
  });

  /* ============================================================
     SEARCH / FILTER
     ============================================================ */
  document.addEventListener('input', (e) => {
    if (e.target.id === 'patients-search') window.pages.afterRender('patients');
    if (e.target.id === 'appt-search')     window.pages.afterRender('appointments');
    if (e.target.id === 'ph-search')       window.pages.afterRender('pharmacy');
    if (e.target.id === 'bi-search')       window.pages.afterRender('billing');
    if (e.target.id === 'emr-search')      window.pages.afterRender('emr');
    if (e.target.id === 'emr-type')        window.pages.afterRender('emr');
  });

  document.addEventListener('click', (e) => {
    const f = e.target.closest('.filter-chip[data-filter]');
    if (f) {
      f.parentElement.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('on'));
      f.classList.add('on');
      window.__patientFilter = f.dataset.filter;
      window.pages.afterRender('patients');
    }
    const bf = e.target.closest('[data-bill-filter]');
    if (bf) {
      bf.parentElement.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('on'));
      bf.classList.add('on');
      window.__billFilter = bf.dataset.billFilter;
      window.pages.afterRender('billing');
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-update-appt]')) {
      const id = e.target.dataset.updateAppt;
      db.update('appointments', id, { status: e.target.value });
      showToast('Status updated');
      router.go('appointments');
    }
  });

  /* ============================================================
     GLOBAL SEARCH (⌘K)
     ============================================================ */
  const gs = $('#global-search');
  gs?.addEventListener('input', () => {
    const q = gs.value.toLowerCase().trim();
    if (!q) return;
    const patients = db.list('patients').filter((p) => p.name.toLowerCase().includes(q));
    if (patients.length) {
      window.__patientFilter = 'All';
      router.go('patients');
      setTimeout(() => { const s = $('#patients-search'); if (s) { s.value = q; window.pages.afterRender('patients'); } }, 80);
    }
  });
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); gs?.focus();
    }
    if (e.key === 'Escape' && modalRoot.classList.contains('show')) {
      modalRoot.classList.remove('show'); modalRoot.innerHTML = ''; document.body.style.overflow = '';
    }
  });

  /* ============================================================
     SIDEBAR TOGGLE
     ============================================================ */
  $('#sidebar-toggle')?.addEventListener('click', () => {
    $('.sidebar')?.classList.toggle('open');
    $('#sidebar-backdrop')?.classList.toggle('show');
  });
  $('#sidebar-backdrop')?.addEventListener('click', () => {
    $('.sidebar')?.classList.remove('open');
    $('#sidebar-backdrop')?.classList.remove('show');
  });

  /* ============================================================
     LOGIN / LOGOUT
     ============================================================ */
  $('#login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formToObject(e.target);
    try {
      const user = await auth.login(data.email.trim(), data.password);
      showApp(user);
      setServerStatus('online', auth.mode === 'firebase' ? 'Connected — Firebase' : 'Connected — Local demo');
    } catch (err) {
      showToast(err.message || 'Login failed');
      const banner = document.createElement('div');
      banner.className = 'auth-error';
      banner.innerHTML = `<i class="ti ti-alert-circle"></i> ${esc(err.message || 'Login failed')}`;
      const old = $('#login-form .auth-error');
      if (old) old.remove();
      $('#login-form').insertBefore(banner, $('#login-form button[type=submit]'));
      setTimeout(() => banner.remove(), 4000);
    }
  });

  $('#signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formToObject(e.target);
    try {
      const user = await auth.register(data.email.trim(), data.password, data.name.trim());
      showApp(user);
      showToast('Account created');
    } catch (err) { showToast(err.message || 'Sign up failed'); }
  });

  $('#show-signup')?.addEventListener('click', (e) => {
    e.preventDefault();
    $('#auth-card-login').classList.add('hidden');
    $('#auth-card-signup').classList.remove('hidden');
  });
  $('#show-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    $('#auth-card-signup').classList.add('hidden');
    $('#auth-card-login').classList.remove('hidden');
  });
  $('#forgot-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = prompt('Enter your work email:');
    if (!email) return;
    try { await auth.resetPassword(email); showToast('Password reset email sent'); }
    catch (err) { showToast(err.message); }
  });

  $('#logout-btn')?.addEventListener('click', async () => {
    await auth.logout();
    hideApp();
  });

  /* eye toggle for password */
  document.querySelectorAll('.eye-btn').forEach((b) => b.addEventListener('click', () => {
    const i = b.closest('.input-wrap').querySelector('input');
    i.type = i.type === 'password' ? 'text' : 'password';
    b.querySelector('i').className = i.type === 'password' ? 'ti ti-eye' : 'ti ti-eye-off';
  }));

  /* ============================================================
     SHOW / HIDE APP
     ============================================================ */
  function paintUser(user) {
    if (!user) return;
    $('#user-name').textContent  = user.name;
    $('#user-role').textContent  = user.role;
    $('#user-avatar').textContent = initials(user.name);
    $('#topbar-avatar').textContent = initials(user.name);
  }

  async function showApp(user) {
    paintUser(user);
    $('#auth-screen').classList.add('hidden');
    $('#app-shell').classList.remove('hidden');
    const start = (location.hash || '#dashboard').slice(1);
    await router.go(PAGE_TEMPLATES_FOR_HASH(start) ? start : 'dashboard');
  }

  function PAGE_TEMPLATES_FOR_HASH() { return true; }

  function hideApp() {
    $('#app-shell').classList.add('hidden');
    $('#auth-screen').classList.remove('hidden');
  }

  /* ============================================================
     EXPORT BUTTON (reports)
     ============================================================ */
  document.addEventListener('click', (e) => {
    if (e.target.closest('#export-csv')) exportCSV();
    if (e.target.closest('#sync-btn'))   { showToast('Syncing…'); router.go((location.hash || '#dashboard').slice(1)); }
    if (e.target.closest('#settings-reset')) {
      confirmDialog({
        title: 'Reset all data?',
        message: 'This will delete all patients, appointments, and records, and restore the default seed data.',
        confirmLabel: 'Reset',
        danger: true,
        onConfirm: async () => {
          localStorage.removeItem('carestation.db.v1');
          localStorage.removeItem('carestation.seeded.v1');
          db.init();
          showToast('Data reset');
          router.go('dashboard');
        }
      });
    }
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'settings-profile') {
      e.preventDefault();
      const data = formToObject(e.target);
      const u = auth.user;
      if (u) { u.name = data.name; localStorage.setItem('carestation.user.v1', JSON.stringify(u)); paintUser(u); }
      showToast('Profile updated');
    }
    if (e.target.id === 'settings-hospital') {
      e.preventDefault();
      showToast('Hospital info saved');
    }
  });

  /* ============================================================
     LIVE DATE
     ============================================================ */
  function tickDate() {
    const d = new Date();
    const opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const el = $('#live-date');
    if (el) el.textContent = d.toLocaleDateString('en-US', opts);
  }
  setInterval(tickDate, 60000);
  tickDate();

  /* ============================================================
     BOOT
     ============================================================ */
  async function boot() {
    router.init();
    setServerStatus(auth.mode === 'firebase' ? 'online' : 'online', auth.mode === 'firebase' ? 'Firebase ready' : 'Local demo ready');
    auth.onChange(async (u) => {
      if (u) {
        showApp(u);
      } else {
        hideApp();
      }
    });
    const u = auth.user;
    if (u) showApp(u);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await auth.init();
    await boot();
  });
})();
