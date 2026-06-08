/* ============================================================
   MediCore — Firebase Configuration
   ------------------------------------------------------------
   This file configures Firebase for the PWA. If no real config
   is provided, the app falls back to "demo mode" which uses
   localStorage and works fully offline.
   ------------------------------------------------------------
   To enable real Firebase:
     1. Create a Firebase project at https://console.firebase.google.com
     2. Add a Web app and copy the config object
     3. Replace FIREBASE_CONFIG below with your config
     4. Enable Email/Password auth in Authentication
     5. Create a Firestore database (start in production mode)
   ============================================================ */

window.FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

window.isFirebaseConfigured = function () {
  const c = window.FIREBASE_CONFIG || {};
  return !!(c.apiKey && c.projectId && !c.apiKey.startsWith('YOUR_'));
};

window.FIREBASE_DEMO_USERS = [
  { email: 'admin@medicore.health',    password: 'medicore123', name: 'Admin User',    role: 'admin' },
  { email: 'doctor@medicore.health',   password: 'medicore123', name: 'Dr. A. Sharma', role: 'doctor' },
  { email: 'nurse@medicore.health',    password: 'medicore123', name: 'Nurse Priya',   role: 'nurse' },
  { email: 'accounts@medicore.health', password: 'medicore123', name: 'Accounts Team', role: 'accountant' }
];
