# CareStation HMS — Progressive Web App

A complete, installable hospital management system that runs in any modern browser on **Android, Windows, Mac, and Linux**. Works offline, syncs through Firebase, and ships as a single static codebase.

```
┌──────────────────────────────────────────────────────────────┐
│  •  Installable PWA (Add to Home Screen on iOS/Android)      │
│  •  Offline-first (service worker + IndexedDB / localStorage)│
│  •  Firebase Auth + Firestore when configured                │
│  •  Demo mode with local data when Firebase isn't set up     │
│  •  12 modules: Dashboard, Patients, Appointments, Doctors,  │
│    EMR, Pharmacy, Lab, Wards, Billing, Reports, Staff, …     │
│  •  Responsive — works on phones, tablets, and desktops      │
│  •  No build step — pure HTML/CSS/JS, runs anywhere          │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick start (60 seconds, no setup)

```bash
cd pwa
python3 -m http.server 8080
# → open http://localhost:8080
```

**Or with Node:**
```bash
cd pwa
npx serve . -l 8080
```

Then sign in with one of the demo accounts (pre-filled):

| Email | Password | Role |
|---|---|---|
| `admin@carestation.health` | `carestation123` | Super Admin |
| `doctor@carestation.health` | `carestation123` | Doctor |
| `nurse@carestation.health` | `carestation123` | Nurse |
| `accounts@carestation.health` | `carestation123` | Accountant |

All 60+ sample patients, doctors, appointments, prescriptions, lab orders, ward beds, and invoices load automatically on first run.

---

## 📱 Install on your device

### Android (Chrome / Edge)
1. Open the deployed URL in Chrome
2. Tap the **⋮** menu → **"Install app"** (or "Add to Home screen")
3. The app appears on your home screen and launches fullscreen

### iOS / iPadOS (Safari)
1. Open the URL in Safari
2. Tap the **Share** button → **"Add to Home Screen"**
3. The app launches without the browser chrome

### Windows / Mac / Linux (Chrome / Edge)
1. Open the URL
2. Click the **install icon** in the address bar (or **⋮** menu → Install)
3. The app opens in its own window

### From the in-app prompt
The app shows a **download icon** in the top bar when installation is available. Click it.

---

## ☁️ Enable real Firebase (production)

The app works fully offline in **demo mode** with localStorage. To enable real multi-device sync with Firebase:

### 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `carestation-hms`)
3. Inside the project, click the **Web** icon (`</>`) to register a web app
4. Copy the `firebaseConfig` object

### 2. Enable Authentication

- Go to **Authentication → Sign-in method**
- Enable **Email/Password**
- (Optional) Enable Google and Microsoft providers for SSO

### 3. Create a Firestore database

- Go to **Firestore Database → Create database**
- Start in **production mode** (we'll add rules below)
- Choose a region close to your users

### 4. Paste your config

Open `pwa/js/firebase-config.js` and replace the placeholder values:

```js
window.FIREBASE_CONFIG = {
  apiKey:            "AIza...",
  authDomain:        "carestation-hms.firebaseapp.com",
  projectId:         "carestation-hms",
  storageBucket:     "carestation-hms.appspot.com",
  messagingSenderId: "1234567890",
  appId:             "1:1234567890:web:abc..."
};
```

### 5. Set Firestore security rules

In **Firestore → Rules**, paste:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 6. Reload the app

Hard-refresh (`Cmd+Shift+R` / `Ctrl+F5`). The "Connecting…" chip should turn **green with "Firebase ready"**. All your local data will continue to work, and any new sign-ups use Firebase Auth.

---

## 🛠 Build & deployment

The PWA is **zero-build** — there's no webpack, no bundler, no transpiler. The `pwa/` directory is the deployable artifact as-is.

### Option A — Firebase Hosting (recommended)

```bash
npm install -g firebase-tools
firebase login
cd pwa
firebase init hosting   # choose your project, set public=. , single-page app = yes
firebase deploy
```

Your app will be live at `https://<project-id>.web.app` with a free SSL cert.

### Option B — Vercel

```bash
npm i -g vercel
cd pwa
vercel                 # follow prompts, framework = "Other"
```

Vercel auto-detects the static site, gives you a URL like `https://carestation-xxx.vercel.app`, and provisions HTTPS.

### Option C — Netlify

```bash
npm i -g netlify-cli
cd pwa
netlify deploy --dir=. --prod
```

Or drag-and-drop the `pwa/` folder onto https://app.netlify.com/drop.

### Option D — GitHub Pages

1. Push the repo to GitHub
2. Settings → Pages → Source: `main` branch, `/pwa` folder
3. Live at `https://<user>.github.io/<repo>/`

### Option E — Any static host (S3, Cloudflare Pages, Surge, Render, …)

Upload the entire `pwa/` folder. Done.

### Option F — Self-host (Nginx / Apache)

```nginx
server {
  listen 80;
  server_name carestation.example.com;
  root /var/www/carestation/pwa;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.(js|css|png|svg|woff2)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
  }

  location = /service-worker.js {
    add_header Cache-Control "no-cache";
  }
}
```

```bash
# install certbot and get a free Let's Encrypt cert
sudo certbot --nginx -d carestation.example.com
```

---

## 📂 Project structure

```
pwa/
├── index.html              # PWA shell (auth screen + app)
├── offline.html            # Offline fallback page
├── manifest.json           # PWA manifest (install metadata)
├── service-worker.js       # Service worker (caching + offline)
│
├── css/
│   └── styles.css          # All styles — responsive, mobile-first
│
├── js/
│   ├── firebase-config.js  # Firebase config (replace with yours)
│   ├── db.js               # Data layer (Firestore / localStorage)
│   ├── auth.js             # Auth (Firebase Auth / demo)
│   ├── router.js           # SPA router
│   ├── pages.js            # Page renderers
│   └── app.js              # Main app — login, modals, CRUD
│
├── assets/
│   ├── icon.svg            # Source icon
│   ├── icon-72.png         # All required PWA sizes
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
│
└── README.md
```

---

## 🧪 Test the PWA

### Lighthouse PWA audit
1. Open Chrome DevTools (`F12`) → **Lighthouse** tab
2. Check **Progressive Web App** + **Performance**
3. Click **Analyze page load**
4. You should score **100/100** on PWA criteria

### Manual offline test
1. Open the app, sign in
2. Open DevTools → **Application** → **Service Workers** → check **Offline**
3. The app should still load, navigate between pages, and let you create records
4. Uncheck Offline — the changes sync (or stay local in demo mode)

### Mobile test
1. Find your local IP: `ipconfig getifaddr en0` (Mac) / `ip addr` (Linux)
2. Start the server: `python3 -m http.server 8080`
3. On your phone (same WiFi), open `http://<your-ip>:8080`
4. Tap the browser menu → **Install** / **Add to Home Screen**
5. Launch the installed app — it works fullscreen, offline, and feels native

---

## ✨ Features

| Module | Features |
|---|---|
| **Auth** | Email/password (Firebase or demo), Google/Microsoft SSO buttons, signup, password reset, "Remember me", session persistence, "Backend connected" status chip |
| **Dashboard** | Real-time stat cards (patients, appointments, doctors, revenue), recent appointments, critical alerts, ward occupancy with color-coded bars |
| **Patients** | List, search, filter, register, edit, delete; unique patient IDs; status pills; mobile cards |
| **Appointments** | Book, status updates (inline select), totals/completed/pending/cancelled stats, mobile cards |
| **Doctors** | Card grid with avatars, departments, status, load bars, add/edit/remove |
| **EMR / Records** | Diagnoses, prescriptions, lab orders, imaging, freeform notes; type filter & search |
| **Pharmacy** | Inventory, stock alerts, expiry tracking, low-stock highlights, add/edit/delete |
| **Lab** | Test orders, status, results, ordered-by doctor, timestamps |
| **Wards & Beds** | Real-time occupancy, ICU %, capacity stats, color-coded bars |
| **Billing** | Invoice creation, paid/pending tracking, totals, status toggle, delete |
| **Reports & Analytics** | Department distribution, pharmacy stock, revenue; **CSV export** |
| **Staff** | Directory, roles, departments, add/edit/remove |
| **Settings** | Profile, hospital info, mode indicator (Cloud/Demo), reset data |

### PWA features
- ✅ Installable (Android, iOS, Windows, Mac, Linux)
- ✅ Service worker with cache-first + network-first strategies
- ✅ Offline indicator + offline fallback page
- ✅ `beforeinstallprompt` integration → in-app install button
- ✅ App shortcuts (long-press app icon on Android → "New Patient", "Book Appointment", "Dashboard")
- ✅ Maskable icon (Android adaptive)
- ✅ Apple touch icon, status bar styling
- ✅ Theme color in browser chrome
- ✅ Viewport meta with `viewport-fit=cover` for notched devices
- ✅ Safe-area-inset padding for bottom nav
- ✅ Update notification when new SW version is available

### Responsive design
- Mobile: ≤ 480px — single-column cards, bottom nav, hamburger sidebar
- Tablet: 481–1024px — 2-column stat grid, collapsible sidebar
- Desktop: ≥ 1025px — full sidebar, 4-column grid, multi-column tables

---

## 🔒 Security notes

- The default Firestore rule (`request.auth != null`) lets any signed-in user read/write anything. For production, tighten the rules per role and per collection. See [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started).
- Never commit your real `FIREBASE_CONFIG` to a public repo if you've enabled billing or restricted API keys. Use environment variables or a separate config file excluded by `.gitignore`.
- The service worker caches the app shell only — it does **not** cache user data. User data lives in Firestore (or localStorage in demo mode).

---

## 📜 License

MIT — use it, modify it, ship it. Attribution appreciated but not required.

---

## 🙋 Troubleshooting

**"The PWA is not installable"**
- PWA install requires HTTPS (or `localhost`). Use Firebase Hosting, Vercel, or Netlify for a free HTTPS URL.
- Make sure `manifest.json` is served with the correct `Content-Type: application/manifest+json` header.
- Run the Lighthouse PWA audit to see what's missing.

**"Service worker won't register"**
- Service workers require HTTPS or localhost.
- Check the browser console — the SW logs `[SW] registered, scope: …`.

**"Firebase mode isn't activating"**
- Verify your config in `js/firebase-config.js` has real values (not starting with `YOUR_`).
- Hard-refresh the page.
- Check the browser console for Firebase errors.

**"I want to add a new field"**
- Edit `js/db.js` (add to the `seed` object) and `js/pages.js` (render the field in the table/card).

**"How do I customize the theme?"**
- All colors live in `css/styles.css` under `:root { --brand-XXX: ...; }`. Change them once and the whole app updates.

**"Data disappeared after clearing browser storage"**
- Demo mode data lives in localStorage. Enable Firebase to persist data in the cloud.

---

Built with ❤️ for hospitals that want a fast, installable, offline-capable HMS without the bloat of a native app.
