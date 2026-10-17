![rpg](rpg.png)

# SolarisFortress CTF Platform

A modern, robust, full-featured Capture The Flag (CTF) platform built for cybersecurity competitions, school CTFs, and hackathons. Features an integrated React-based Administrative Command Center, live real-time scoreboards, persistent score adjustments ledger, immutable audit logging, and full deployment compatibility with **Vercel**.

> **Stack:** Django 5.2 + Django REST Framework · React 18 + Vite 5 · PostgreSQL (SQLite local dev fallback) · WhiteNoise · Vercel Serverless WSGI.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Architecture & Vercel Deployment Model](#architecture--vercel-deployment-model)
3. [Database Architecture & PostgreSQL Migration](#database-architecture--postgresql-migration)
4. [Project Structure](#project-structure)
5. [Local Development Setup](#local-development-setup)
6. [Administrator Account Provisioning](#administrator-account-provisioning)
7. [Seed Data & Demo Challenges](#seed-data--demo-challenges)
8. [React Admin Command Center](#react-admin-command-center)
9. [Vercel Deployment Guide](#vercel-deployment-guide)
10. [REST API Reference](#rest-api-reference)
11. [Data Model & Security Policy](#data-model--security-policy)
12. [Testing & Verification](#testing--verification)

---

## Key Features

### React Admin Command Center
- **Overview Dashboard:** Live KPI metrics (total players, published challenges, total submissions, correct solves), category distribution, and live activity streams.
- **Competition Settings:** Live control over competition title, description, markdown rules, start/end timestamps, registration lock, and instant scoreboard freeze.
- **Challenge Manager:** Full CRUD interface for challenges with categories, difficulty ratings (Easy, Medium, Hard, Insane), point values, hints, and secure flag configuration.
- **File Upload Manager:** Attach and manage challenge binary downloads, PCAPs, dumps, and images.
- **Player Accounts & Permissions:** Directory of registered players, solve histories, and one-click account disable/enable and staff role management.
- **Submissions & Solve Verification:** Real-time log of all flag submission attempts with search, verdict filters, and string investigation.
- **Manual Score Adjustments Ledger:** Audit-backed persistent ledger for issuing positive/negative point bonuses or penalties with mandatory reason tracking and atomic reversals.
- **Immutable Audit Trail:** Persistent security audit log recording every administrative action, actor, target entity, client IP, and payload details.
- **Broadcast Announcements:** Create, pin, and manage live competition announcements.
- **Data Export:** Instant one-click CSV export of the authoritative scoreboard and submission logs.

### Participant Experience (React Frontend)
- **Interactive Dashboard:** Live competition status, countdown/schedule indicators, announcements stream, personal score, completion progress bar, and category breakdown.
- **Challenges Catalog:** Filter by category pills, difficulty chips, and live keyword search. Visual status ribbons indicate solved vs open challenges.
- **Challenge Mission View:** Breadcrumb navigation, mission briefing, collapsible hint drawer, attached files download, and instant-feedback flag submission form.
- **Live Leaderboard:** Top 3 podium highlight cards (Gold, Silver, Bronze), participant search, rank badges, challenge points vs adjustment points breakdown, and tie-breaking indicators.
- **User Profile:** Identity card with role badges, statistics grid, category completion rates, solved challenges history, and account password change.

### Backend Integrity & Security
- **Strict Flag Concealment:** Challenge flags are stored server-side only and are **never** exposed in participant APIs or frontend bundles.
- **Server-Side Enforcement:** Administrative endpoints enforce `permissions.IsAdminUser` (`is_staff`). Frontend route guards act only as UX conveniences.
- **Atomic Scoring & Concurrency Safety:** Solves and score adjustments are processed within database transactions (`transaction.atomic()`) with unique constraints preventing duplicate awards or race conditions.
- **Authoritative Score Calculation:** Total scores are derived dynamically from challenge solve points plus net non-reversed score adjustments.

---

## Architecture & Vercel Deployment Model

Vercel is the required production deployment platform. The project is designed with a hybrid fullstack architecture compatible with Vercel's serverless infrastructure:

```text
[ Browser / Client ]
        │
        ├─── Static Assets & React SPA ──────────► [ Vercel Edge CDN (frontend service · Vite build) ]
        │
        └─── /api/*, /django-admin/*, /static/*, /media/* ──► [ Vercel Function (backend service · Django) ]
                                                                    │
                                                                    ▼
                                                            [ Django WSGI App ]
                                                                    │
                                                                    ▼
                                                        [ Managed PostgreSQL (Neon / Supabase) ]
```

The project is configured as a single Vercel **Services** project (`vercel.json`). Two services build independently and share one domain:

| Service | Root | Framework | Public paths | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `backend` | `backend/` | Django | `/api/*`, `/django-admin/*`, `/static/*`, `/media/*` | Vercel auto-runs `collectstatic`. |
| `frontend` | `frontend/` | Vite | everything else (SPA fallback to `/index.html`) | Serves the React app, including the `/admin` dashboard. |

> **Note:** The React admin dashboard owns `/admin`. Django's built-in admin was relocated to `/django-admin/` to avoid the collision. No service bindings are needed: the static frontend reaches the backend through the public `/api` rewrite (bindings only resolve in server-side functions at runtime, not in static builds).

### Why Vercel Serverless Requires PostgreSQL
On Vercel, Python Serverless Functions run inside isolated, ephemeral execution environments (AWS Lambda instances) that spin up on demand:
- **Local SQLite databases cannot persist** across cold starts or container recycles.
- **Multiple concurrent serverless lambdas** cannot share a local SQLite file without data corruption or split-brain discrepancies.
- **PostgreSQL** is therefore required in production. Managed serverless PostgreSQL providers like **Neon**, **Supabase**, or **Railway** provide persistent, pooled connections via `DATABASE_URL`.
- Local development retains the lightweight SQLite fallback by setting `USE_SQLITE=1`.

---

## Database Architecture & PostgreSQL Migration

The project utilizes `dj-database-url` to dynamically switch database engines:

1. **Production (PostgreSQL):** Provide a `DATABASE_URL` environment variable:
   ```env
   DATABASE_URL=postgresql://user:password@ep-host.region.aws.neon.tech/solarisfortress?sslmode=require
   ```
2. **Local Development (SQLite Fallback):** Set `USE_SQLITE=1` in your local `.env`:
   ```env
   USE_SQLITE=1
   ```

---

## Project Structure

```text
SolarisFortress_CTF-Platform/
├── backend/                   # Vercel service: "backend" (Django framework preset)
│   ├── manage.py
│   ├── requirements.txt       # Python dependencies
│   ├── config/                # Django core settings, urls, wsgi/asgi
│   │   ├── settings.py        # dj-database-url, whitenoise, CORS regex
│   │   ├── urls.py            # API + Django built-in admin (/django-admin/)
│   │   └── wsgi.py
│   └── challenges/            # CTF Core App
│       ├── models.py          # Challenge, Solve, ScoreAdjustment, AuditLog, etc.
│       ├── views.py           # Public and Admin REST API views
│       ├── serializers.py     # Public and Admin serializers
│       ├── urls.py            # API routing table
│       ├── utils.py           # Authoritative scoring, tie-breaking, audit logging
│       ├── admin.py           # Django built-in admin configuration
│       └── tests.py           # Automated test suite
├── frontend/                  # Vercel service: "frontend" (Vite framework preset)
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── api.js             # API client with VITE_API_BASE_URL support
│       ├── App.jsx            # Routing table (Public + Admin routes)
│       ├── styles.css         # Complete design system & responsive styling
│       ├── components/        # Navbar, ProtectedRoute, AdminRoute, common/
│       └── pages/
│           ├── DashboardPage.jsx
│           ├── ChallengesPage.jsx
│           ├── ChallengeDetailPage.jsx
│           ├── LeaderboardPage.jsx
│           ├── ProfilePage.jsx
│           └── admin/         # React Admin Dashboard
│               ├── AdminLayout.jsx
│               ├── AdminOverviewPage.jsx
│               ├── AdminCompetitionPage.jsx
│               ├── AdminChallengesPage.jsx
│               ├── AdminPlayersPage.jsx
│               ├── AdminSubmissionsPage.jsx
│               ├── AdminScoreAdjustmentsPage.jsx
│               ├── AdminAuditLogsPage.jsx
│               ├── AdminAnnouncementsPage.jsx
│               └── AdminExportPage.jsx
├── vercel.json                # Single-project Vercel Services config (backend + frontend)
├── .env.example               # Environment variables template
└── README.md
```

---

## Local Development Setup

### 1. Backend Setup

```bash
# 1. Create and activate virtual environment
python -m venv .venv

# Windows:
.\.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Configure environment
cp .env.example .env
# Ensure USE_SQLITE=1 is set in .env for local SQLite dev

# 4. Apply migrations and collect static assets
python backend/manage.py migrate
python backend/manage.py collectstatic --noinput

# 5. Start Django development server
python backend/manage.py runserver 8000
```

### 2. Frontend Setup

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server will start at `http://localhost:5173`. API requests to `/api/*` and `/media/*` will proxy automatically to `http://127.0.0.1:8000`.

---

## Administrator Account Provisioning

To create your initial superuser administrator account:

```bash
python backend/manage.py createsuperuser
```

Enter your desired username (e.g. `admin`), email, and password.

Once created, log in through the React frontend at `/login`. Users with `is_staff=True` will see the **Admin Dashboard** link in the navigation bar and gain full access to `/admin`.

---

## Seed Data & Demo Challenges

To populate the database with competition settings, announcements, and demo challenges across all categories:

```bash
python backend/manage.py seed_demo
```

This seeds:
- Competition platform settings and rules.
- Pinned and news announcements.
- 5 multi-category challenges:
  1. **Hidden Evidence** (Forensics, Easy, 100 pts) — `solaris{hidden_in_plain_sight}`
  2. **Simple Login** (Web, Medium, 150 pts) — `solaris{always_check_the_backdoor}`
  3. **Caesar's Message** (Cryptography, Easy, 75 pts) — `solaris{rotten_caesar_is_not_caesar}`
  4. **Lost File** (Miscellaneous, Easy, 50 pts) — `solaris{lost_and_found}`
  5. **Silent Image** (Steganography, Hard, 200 pts) — `solaris{lsb_can_carry_a_secret}`

---

## React Admin Command Center

Access the admin dashboard by navigating to `/admin` while logged in as a staff user:

| Section | Route | Capabilities |
| :--- | :--- | :--- |
| **Overview** | `/admin` | Real-time platform KPI statistics, live submissions feed, audit trail, freeze toggle. |
| **Competition** | `/admin/competition` | Manage event name, rules, schedule, active status, and registration gates. |
| **Challenges** | `/admin/challenges` | Challenge catalog, create/edit modals, flag setup, difficulty, hints, files upload. |
| **Players** | `/admin/players` | User accounts directory, solve inspect modal, account disable/enable, role promotion. |
| **Submissions** | `/admin/submissions` | Complete flag submission stream with verdict filtering and cheating investigation. |
| **Score Adjustments** | `/admin/score-adjustments` | Issue positive/negative points with mandatory reasons; atomic reversal support. |
| **Audit Logs** | `/admin/audit-logs` | Immutable audit trail tracking administrative actions, client IPs, and JSON payloads. |
| **Announcements** | `/admin/announcements` | Create and pin broadcasts to all participant dashboards. |
| **Data Export** | `/admin/export` | Download official Scoreboard and Submissions CSV archives. |

---

## Vercel Deployment Guide

### Option 1: Services Deployment (Recommended)

1. **Push your repository** to GitHub/GitLab.
2. In the **Vercel Dashboard**, click **Add New Project** and import the repository.
3. Keep the **Root Directory** as `./` (the repository root) and select the **Services** application preset. The root `vercel.json` defines the `backend` and `frontend` services and their public routing.
4. **Provision PostgreSQL** (required — Vercel's serverless filesystem is read-only, so SQLite cannot be used). In **Project → Storage**, create a **Neon** database (or connect Neon/Supabase/Railway). This injects `DATABASE_URL` automatically.
5. In **Project Settings → Environment Variables**, add:
   - `DJANGO_SECRET_KEY`: A long, random cryptographic string.
   - `DJANGO_DEBUG`: `False`
   - `DATABASE_URL`: Your managed PostgreSQL connection URL (skip if the Storage integration added it).
   - `DJANGO_ALLOWED_HOSTS`: `localhost,.vercel.app`
   - `FRONTEND_ORIGIN`: Your Vercel deployment URL (e.g. `https://solarisfortress.vercel.app`).
   - `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: The initial administrator account. The backend build runs `manage.py migrate` and `manage.py bootstrap`, which creates this superuser automatically.
   - `SEED_DEMO`: `1` to also load the demo challenges/config/announcements (optional).
6. Click **Deploy**. The backend build migrates the schema, provisions the admin, and collects static files; the frontend is served at `/`, and Django handles `/api`, `/django-admin`, `/static`, and `/media`.

> **Important:** Without `DATABASE_URL` the build fails on purpose with a clear message. The login error `unable to open database file` means the app fell back to SQLite on the read-only serverless filesystem.

To provision or update the admin later (e.g. locally against the production DB):

```bash
python backend/manage.py bootstrap
```

### Option 2: Decoupled Deployment

If you prefer to deploy the frontend independently:
1. Set the Vercel **Root Directory** to `frontend`.
2. Add the environment variable:
   - `VITE_API_BASE_URL`: The URL of your deployed Django backend (e.g. `https://api.yourdomain.com`).
3. Deploy the backend to any WSGI/ASGI or Vercel Python serverless project, ensuring `CORS_ALLOWED_ORIGINS` includes your frontend domain.

---

## REST API Reference

All endpoints are prefixed with `/api/`.

### Authentication
- `POST /api/auth/register/`: Register a new participant account.
- `POST /api/auth/login/`: Authenticate and receive session cookie + API Token.
- `POST /api/auth/logout/`: Invalidate current session.
- `GET /api/auth/me/`: Retrieve current user profile, roles, and score breakdown.
- `POST /api/auth/password/`: Change account password with verification.

### Participant Endpoints
- `GET /api/competition/`: Retrieve platform status, rules, and event times.
- `GET /api/announcements/`: Retrieve live broadcast announcements.
- `GET /api/challenges/`: List all published, non-archived challenges (flags omitted).
- `GET /api/challenges/<id>/`: Retrieve challenge mission details and attachments.
- `POST /api/challenges/<id>/submit/`: Submit a flag string for instant validation and scoring.
- `GET /api/challenges/<id>/files/<file_id>/`: Download attached challenge file.
- `GET /api/leaderboard/`: Authoritative ranked scoreboard with tie-breaking.
- `GET /api/progress/`: Solved challenge IDs and score breakdown for current user.
- `GET /api/submissions/mine/`: Recent submissions log for current user.

### Administrative Endpoints (`IsAdminUser` Required)
- `GET /api/admin/overview/`: Platform KPI metrics and live feeds.
- `GET, PUT /api/admin/competition/`: Retrieve and update platform settings.
- `GET, POST /api/admin/challenges/`: List (including drafts/archived) and create challenges.
- `GET, PUT, DELETE /api/admin/challenges/<id>/`: Retrieve, edit, or delete a challenge.
- `POST /api/admin/challenges/<id>/toggle-publish/`: Toggle published status.
- `POST /api/admin/challenges/<id>/toggle-archive/`: Toggle archive status.
- `POST /api/admin/challenges/<id>/upload-file/`: Upload attachment file.
- `DELETE /api/admin/challenges/<id>/files/<fid>/`: Delete attachment file.
- `GET /api/admin/players/`: List all user accounts with solve and score stats.
- `GET, PATCH /api/admin/players/<id>/`: View player details and toggle status/staff role.
- `GET /api/admin/submissions/`: Query submissions with search and verdict filters.
- `GET, POST /api/admin/score-adjustments/`: Query ledger and issue manual score adjustments.
- `POST /api/admin/score-adjustments/<id>/reverse/`: Reverse a score adjustment.
- `GET /api/admin/audit-logs/`: Query immutable security audit trail.
- `GET, POST /api/admin/announcements/`: List and broadcast announcements.
- `PUT, DELETE /api/admin/announcements/<id>/`: Edit or delete announcement.
- `GET /api/admin/export/scores/`: Download Scoreboard CSV archive.
- `GET /api/admin/export/submissions/`: Download Submissions Log CSV archive.

---

## Data Model & Security Policy

### Core Models
- **`Challenge`:** `name`, `category`, `difficulty`, `points`, `flag`, `published`, `is_archived`, `description`, `hints`, `author`.
- **`ChallengeFile`:** `challenge` (FK), `file`, `original_name`, `uploaded_at`.
- **`Submission`:** `user` (FK), `challenge` (FK), `submitted_flag`, `is_correct`, `submitted_at`.
- **`Solve`:** `user` (FK), `challenge` (FK), `solved_at` (enforced by `unique_together = ("user", "challenge")`).
- **`ScoreAdjustment`:** `user` (FK), `points`, `reason`, `created_by` (FK), `is_reversed`, `reversed_by`, `reversed_at`, `reversal_reason`.
- **`AuditLog`:** `actor` (FK), `action`, `target_type`, `target_id`, `target_repr`, `details` (JSON), `ip_address`, `created_at`.
- **`CompetitionConfig`:** Singleton event configuration.
- **`Announcement`:** Broadcast notifications.

### Security Guarantees
- Correct flags are never included in public serializers or frontend code.
- Strict equality flag comparison prevents injection bypasses.
- Concurrent submissions are handled with atomic database transactions.
- Audit records log the actor, action, timestamp, and IP address for all sensitive operations.

---

## Testing & Verification

Run the automated backend test suite:

```bash
python backend/manage.py test challenges
```

Run the React production bundle check:

```bash
npm --prefix frontend run build
```

Run Django system checks:

```bash
python backend/manage.py check
```

---

## License

This project is licensed under the MIT License.
