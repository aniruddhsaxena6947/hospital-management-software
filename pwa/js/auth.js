/* ============================================================
   CareStation — Auth Layer
   ------------------------------------------------------------
   Uses the Express + SQLite backend JWT auth.
   Falls back to demo accounts when the server is offline.
   ============================================================ */

(() => {
  'use strict';

  const AUTH_KEY = 'carestation.user.v1';
  const TOKEN_KEY = 'carestation.token.v1';

  let currentUser = null;
  const listeners = new Set();
  const onAuthChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
  const emit = (u) => listeners.forEach((fn) => { try { fn(u); } catch (_) {} });

  function persist(user, token) {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      if (token) localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
    currentUser = user;
    emit(user);
  }

  function loadFromStorage() {
    try { currentUser = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch { currentUser = null; }
    return currentUser;
  }

  const DEMO_USERS = window.FIREBASE_DEMO_USERS || [];

  const auth = {
    mode: 'server',

    async init() {
      const stored = loadFromStorage();
      if (stored) {
        try {
          const res = await db.auth.me();
          if (res && res.user) {
            persist(res.user, db.auth.session());
          }
        } catch (e) {
          if (!e.message || (e.message !== 'Failed to fetch' && !e.message.includes('NetworkError'))) {
            persist(null, null);
          }
        }
      }
      return this;
    },

    onChange: onAuthChange,
    get user() { return currentUser; },

    async login(email, password) {
      try {
        const user = await db.auth.login(email, password);
        this.mode = 'server';
        persist(user, db.auth.session());
        return user;
      } catch (err) {
        this.mode = 'demo';
        const u = DEMO_USERS.find((x) => x.email === email && x.password === password);
        if (u) {
          const user = { id: Date.now(), email: u.email, name: u.name, role: u.role, avatar: (u.name.match(/\b\w/g) || []).slice(0, 2).join('').toUpperCase() };
          persist(user, 'demo');
          return user;
        }
        throw err;
      }
    },

    async register(email, password, name) {
      try {
        const user = await db.auth.signup(email, password, name);
        this.mode = 'server';
        persist(user, db.auth.session());
        return user;
      } catch (err) {
        if (DEMO_USERS.some((x) => x.email === email)) throw new Error('Email already registered');
        const user = { id: Date.now(), email, name, role: 'staff', avatar: (name.match(/\b\w/g) || []).slice(0, 2).join('').toUpperCase() };
        persist(user, 'demo');
        return user;
      }
    },

    async logout() {
      await db.auth.logout();
      persist(null, null);
    },

    async resetPassword(email) {
      throw new Error('Password reset is only available when connected to the server. Ask an admin to reset your password.');
    }
  };

  window.auth = auth;
})();
