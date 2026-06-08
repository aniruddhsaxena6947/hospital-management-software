/* ============================================================
   MediCore — Front-end API client
   ============================================================ */
(() => {
  'use strict';

  const API_BASE = (() => {
    // Allow override via global config
    if (window.MEDICORE_API) return window.MEDICORE_API;
    // Always try backend on port 3000 — works in every scenario
    // (same origin, file://, different port)
    return 'http://localhost:3000/api';
  })();

  const TOKEN_KEY = 'medicore.token';
  const USER_KEY  = 'medicore.user';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function getUser()  { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } }
  function setUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
  function clear()    { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }

  async function request(path, { method = 'GET', body, query } = {}) {
    let url = API_BASE + path;
    if (query) {
      const qs = new URLSearchParams(query).toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
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
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  /* ============== Public API ============== */
  const api = {
    API_BASE,
    getToken, setToken, getUser, setUser, clear,

    auth: {
      login:   (email, password) => request('/auth/login',  { method: 'POST', body: { email, password } }),
      me:      ()                => request('/auth/me'),
      logout:  ()                => request('/auth/logout', { method: 'POST' }),
    },

    dashboard: {
      stats:     () => request('/dashboard/stats'),
      occupancy: () => request('/dashboard/occupancy'),
    },

    patients: {
      list:   (q)        => request('/patients', { query: q || {} }),
      get:    (id)       => request(`/patients/${id}`),
      create: (data)     => request('/patients', { method: 'POST', body: data }),
      update: (id, data) => request(`/patients/${id}`, { method: 'PUT', body: data }),
      remove: (id)       => request(`/patients/${id}`, { method: 'DELETE' }),
    },

    appointments: {
      list:   (q)        => request('/appointments', { query: q || {} }),
      create: (data)     => request('/appointments', { method: 'POST', body: data }),
      update: (id, data) => request(`/appointments/${id}`, { method: 'PUT', body: data }),
      remove: (id)       => request(`/appointments/${id}`, { method: 'DELETE' }),
    },

    doctors: {
      list:   ()         => request('/doctors'),
      create: (data)     => request('/doctors', { method: 'POST', body: data }),
      update: (id, data) => request(`/doctors/${id}`, { method: 'PUT', body: data }),
      remove: (id)       => request(`/doctors/${id}`, { method: 'DELETE' }),
    },

    emr: {
      forPatient: (pid)      => request(`/emr/patient/${pid}`),
      create:     (data)     => request('/emr', { method: 'POST', body: data }),
    },

    pharmacy: {
      list:   (q)        => request('/pharmacy', { query: q || {} }),
      stats:  ()         => request('/pharmacy/stats'),
      create: (data)     => request('/pharmacy', { method: 'POST', body: data }),
      update: (id, data) => request(`/pharmacy/${id}`, { method: 'PUT', body: data }),
      remove: (id)       => request(`/pharmacy/${id}`, { method: 'DELETE' }),
    },

    lab: {
      list:   (q)        => request('/lab', { query: q || {} }),
      create: (data)     => request('/lab', { method: 'POST', body: data }),
      update: (id, data) => request(`/lab/${id}`, { method: 'PUT', body: data }),
      remove: (id)       => request(`/lab/${id}`, { method: 'DELETE' }),
    },

    wards: {
      list:  () => request('/wards'),
      stats: () => request('/wards/stats'),
    },

    billing: {
      list:    (q)    => request('/billing', { query: q || {} }),
      summary: ()     => request('/billing/summary'),
      create:  (data) => request('/billing', { method: 'POST', body: data }),
      update:  (id, data) => request(`/billing/${id}`, { method: 'PUT', body: data }),
      remove:  (id)   => request(`/billing/${id}`, { method: 'DELETE' }),
    },

    reports: {
      summary: () => request('/reports/summary'),
    },

    staff: {
      list:   (q)        => request('/staff', { query: q || {} }),
      create: (data)     => request('/staff', { method: 'POST', body: data }),
      update: (id, data) => request(`/staff/${id}`, { method: 'PUT', body: data }),
      remove: (id)       => request(`/staff/${id}`, { method: 'DELETE' }),
    },

    settings: {
      get:         () => request('/settings'),
      update:      (data) => request('/settings', { method: 'PUT', body: data }),
      permissions: ()    => request('/settings/permissions'),
    },

    alerts: {
      list: () => request('/alerts'),
    },
  };

  window.api = api;
})();
