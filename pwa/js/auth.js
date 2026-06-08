/* ============================================================
   CareStation — Auth Layer
   ------------------------------------------------------------
   Uses Firebase Authentication when configured, otherwise
   falls back to the local demo accounts in db.js.
   ============================================================ */

(() => {
  'use strict';

  const AUTH_KEY = 'carestation.user.v1';
  const SESSION_KEY = 'carestation.session.v1';

  let firebaseAuth = null;
  let currentUser = null;
  const listeners = new Set();
  const onAuthChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
  const emit = (u) => listeners.forEach((fn) => { try { fn(u); } catch (_) {} });

  function persist(user, session) {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      if (session) localStorage.setItem(SESSION_KEY, session);
    } else {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(SESSION_KEY);
    }
    currentUser = user;
    emit(user);
  }

  function loadFromStorage() {
    try { currentUser = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch { currentUser = null; }
    return currentUser;
  }

  function initials(name) {
    return (name || '?').split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  }

  /* ---------------- Firebase init (lazy) ---------------- */
  async function tryInitFirebase() {
    if (!window.isFirebaseConfigured()) return null;
    if (firebaseAuth) return firebaseAuth;
    try {
      const app = firebase.initializeApp(window.FIREBASE_CONFIG);
      firebaseAuth = firebase.auth(app);
      await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      firebaseAuth.onAuthStateChanged((fbUser) => {
        if (fbUser) {
          const u = {
            id: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName || fbUser.email.split('@')[0],
            role: 'staff',
            avatar: initials(fbUser.displayName || fbUser.email)
          };
          persist(u, 'firebase-' + fbUser.uid);
        } else {
          persist(null, null);
        }
      });
      return firebaseAuth;
    } catch (e) {
      console.warn('[auth] Firebase init failed, falling back to demo mode:', e.message);
      return null;
    }
  }

  /* ---------------- public API ---------------- */
  const auth = {
    mode: 'demo',

    async init() {
      loadFromStorage();
      const fb = await tryInitFirebase();
      this.mode = fb ? 'firebase' : 'demo';
      return this;
    },

    onChange: onAuthChange,
    get user() { return currentUser; },

    async login(email, password) {
      if (this.mode === 'firebase') {
        const cred = await firebaseAuth.signInWithEmailAndPassword(email, password);
        const fbUser = cred.user;
        const u = {
          id: fbUser.uid,
          email: fbUser.email,
          name: fbUser.displayName || fbUser.email.split('@')[0],
          role: 'staff',
          avatar: initials(fbUser.displayName || fbUser.email)
        };
        persist(u, 'firebase-' + fbUser.uid);
        return u;
      }
      return db.auth.login(email, password);
    },

    async register(email, password, name) {
      if (this.mode === 'firebase') {
        const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
        if (name) await cred.user.updateProfile({ displayName: name });
        const fbUser = cred.user;
        const u = {
          id: fbUser.uid,
          email: fbUser.email,
          name: name || fbUser.email.split('@')[0],
          role: 'staff',
          avatar: initials(name || fbUser.email)
        };
        persist(u, 'firebase-' + fbUser.uid);
        return u;
      }
      return db.auth.register(email, password, name);
    },

    async logout() {
      if (this.mode === 'firebase') {
        try { await firebaseAuth.signOut(); } catch (_) {}
      }
      db.auth.logout();
      persist(null, null);
    },

    async resetPassword(email) {
      if (this.mode === 'firebase') {
        await firebaseAuth.sendPasswordResetEmail(email);
        return;
      }
      throw new Error('Password reset is only available with Firebase. Use the demo accounts shown on the sign-in page.');
    }
  };

  window.auth = auth;
})();
