# MediCore — Hospital Management System

A production-ready hospital management system with a polished front-end, a real Node.js + SQLite backend, JWT authentication, and full CRUD across all 12 modules.

---

## Quick start

**macOS — just double-click** `Launch MediCore.command`

That's it. It will:
1. Install backend dependencies on first run (one-time, ~30 sec)
2. Seed the database with realistic hospital data
3. Start the API server on `http://localhost:3000`
4. Open your browser to the app

**Demo credentials** (all use the same password):
```
admin@medicore.health    /  medicore123    →  Super Admin
doctor@medicore.health   /  medicore123    →  Doctor
nurse@medicore.health    /  medicore123    →  Nurse
accounts@medicore.health /  medicore123    →  Accountant
```

**From a terminal:**
```bash
./start.sh
```

---

## Architecture

```
hospital managment /
├── index.html              # Front-end (12 modules + sign-in)
├── styles.css              # Premium teal/emerald design system
├── api.js                  # Front-end API client
├── app.js                  # Front-end logic (auth, routing, modals)
├── Launch MediCore.command # macOS one-click launcher
├── start.sh                # Terminal launcher
├── README.md
└── server/                 # Backend
    ├── package.json
    ├── server.js           # Express entry (serves API + static)
    ├── db.js               # SQLite schema + connection
    ├── seed.js             # Realistic demo data
    ├── middleware/
    │   └── auth.js         # JWT verify + audit log
    ├── routes/             # 12 API modules
    │   ├── auth.js
    │   ├── dashboard.js
    │   ├── patients.js
    │   ├── appointments.js
    │   ├── doctors.js
    │   ├── emr.js
    │   ├── pharmacy.js
    │   ├── lab.js
    │   ├── wards.js
    │   ├── billing.js
    │   ├── reports.js
    │   ├── staff.js
    │   ├── settings.js
    │   └── alerts.js
    └── data/
        └── hms.db          # SQLite database (auto-created)
```

---

## API reference

All routes are prefixed with `/api`. Auth routes are public; all others require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/health` | Health check |
| `POST` | `/auth/login` | `{email, password}` → `{token, user}` |
| `GET`  | `/auth/me` | Current user |
| `POST` | `/auth/logout` | Logout (audited) |
| `POST` | `/auth/register` | Admin-only: create user |
| `GET`  | `/dashboard/stats` | KPI numbers |
| `GET`  | `/dashboard/occupancy` | Ward occupancy |
| `GET`  | `/patients` | List (filter: `?status=`, `?q=`) |
| `GET`  | `/patients/:id` | Single patient |
| `POST` | `/patients` | Create |
| `PUT`  | `/patients/:id` | Update |
| `DELETE` | `/patients/:id` | Delete |
| `GET`  | `/appointments` | List |
| `POST` | `/appointments` | Book |
| `PUT`  | `/appointments/:id` | Update |
| `DELETE` | `/appointments/:id` | Cancel |
| `GET`  | `/doctors` | Roster |
| `POST` | `/doctors` | Add |
| `GET`  | `/emr/patient/:id` | Visit history + prescriptions |
| `POST` | `/emr` | New record |
| `GET`  | `/pharmacy` | Stock list |
| `GET`  | `/pharmacy/stats` | Tally |
| `POST` | `/pharmacy` | Add medicine |
| `GET`  | `/lab` | Test orders |
| `POST` | `/lab` | New test |
| `GET`  | `/wards` | All wards |
| `GET`  | `/wards/stats` | Bed counts |
| `GET`  | `/billing` | Invoices |
| `GET`  | `/billing/summary` | Revenue |
| `POST` | `/billing` | New invoice |
| `GET`  | `/reports/summary` | Analytics |
| `GET`  | `/staff` | Staff list |
| `POST` | `/staff` | Add staff |
| `GET`  | `/settings` | Hospital info |
| `PUT`  | `/settings` | Update hospital info |
| `GET`  | `/settings/permissions` | RBAC matrix |
| `GET`  | `/alerts` | Critical alerts |

---

## Tech stack

**Front-end**
- Vanilla HTML/CSS/JS — no build step
- Plus Jakarta Sans + Tabler Icons (CDN)
- Real `fetch()` against the API with Bearer token

**Back-end**
- Node.js 18+ / Express 4
- better-sqlite3 (synchronous, fast, file-based)
- bcryptjs (password hashing)
- jsonwebtoken (8h sessions)
- CORS, JSON, audit logging

**Storage**
- SQLite (single file, no separate DB server)
- 14 tables, 30+ endpoints, 60+ seed records
- Foreign keys, WAL mode, indexes

---

## Features

- ✅ **Real authentication** (bcrypt + JWT, 8h sessions)
- ✅ **Full CRUD** on patients, appointments, doctors, medicines, lab tests, invoices, staff, EMR records
- ✅ **Live data** — every page fetches from the API
- ✅ **Persistent state** — refresh the page, your data stays
- ✅ **Audit log** — login, create, update, delete events
- ✅ **RBAC** — 5 roles, 4 resources, 20 permission rules
- ✅ **Auto-seed** — first run populates realistic data
- ✅ **Polished UI** — premium teal/emerald, smooth animations
- ✅ **Modal-based create flows** for every entity
- ✅ **Search, filters, count-up numbers, toasts**
- ✅ **Responsive** — desktop, tablet, mobile
- ✅ **No build step** — clone, double-click, done

---

## Manual server control

```bash
# Install (one time)
cd server && npm install

# Seed only (idempotent — won't duplicate data)
npm run seed

# Wipe + re-seed
npm run reset

# Start the server
npm start

# Or with auto-reload
npm run dev
```

Default port: `3000`. Override with `PORT=4000 node server.js`.

---

## Customizing for production

- **Change JWT secret** — set `JWT_SECRET` env var
- **Switch to PostgreSQL/MySQL** — replace `server/db.js` (schema is portable)
- **Add HTTPS** — put behind nginx/Caddy with Let's Encrypt
- **Add file uploads** — `multer` is already widely supported; `uploads/` folder is created
- **Add real-time** — `socket.io` for live alerts
- **Containerize** — add a `Dockerfile` (Node 18-alpine + COPY . /app)

---

## Keyboard shortcuts

- `⌘K` / `Ctrl+K` — focus the topbar search
- `Esc` (mobile) — close the slide-in sidebar by tapping outside
