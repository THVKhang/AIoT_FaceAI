# AIoT FaceAI

Vietnamese version: see README.md

AIoT smart home system combining a web dashboard, real-time IoT data, user authentication, and AI face-recognition event logs.

This README is written for complete beginners. Follow the steps in order to run the system locally.

## 1. System overview

AIoT FaceAI includes 4 main blocks:

1. Frontend (web UI): dashboard, logs, settings, login/register.
2. Backend API (Next.js API Routes): business logic, auth, docs, database queries.
3. PostgreSQL database: current state, logs, command history, auth data.
4. IoT gateway + AI feed (Python): reads Adafruit IO feeds, writes to DB, stores AI events.

## 2. Simple architecture

```text
IoT Device / AI Module
          |
          v
  Adafruit IO feeds
          |
          v
Python gateway (adafruit_to_db.py)
          |
          v
    PostgreSQL (Supabase/local)
          |
          v
Next.js API (app/api/*)
          |
          v
Frontend Dashboard (app/*)
```

## 3. Frontend stack

Frontend is built with:

1. Next.js 15 + React 18.
2. App Router (`app/`) with modular pages and components.
3. Main screens:
   - `/dashboard`: sensor and status overview.
   - `/devices`: device page.
   - `/logs`: system logs.
   - `/settings`: configuration.
   - `/login`, `/register`, `/forgot-password`, `/reset-password`.

Frontend goal: clear data display, fast interactions, and straightforward authentication flow.

## 4. Backend stack

Backend uses Next.js API Routes in `app/api/`:

1. Auth APIs: register, login, logout, forgot/reset password, session.
2. Data APIs: gauges, history, logs, commands, alerts, settings, state.

Backend accesses PostgreSQL via `pg` and helpers in `app/lib/`.

## 5. Database

The system uses PostgreSQL (local or Supabase cloud).

Important table groups:

1. `current_state`: latest values for each feed.
2. `system_logs`, `commands`, `access_logs`: system event history.
3. `app_users`, `auth_sessions`, `password_reset_tokens`: auth and sessions.
4. `gauge_config`: min/max/warn thresholds used by UI.

SQL migrations are in `database/`, run with:

```bash
npm run db:init
```

## 6. How AI is used

In the current codebase, AI is integrated as an event/data pipeline:

1. External AI module (camera/edge/process) pushes results to feeds (for example `ai-face-result`).
2. Python gateway reads feeds and writes results to database.
3. Backend/Frontend renders AI results in logs and dashboard.
4. The system can trigger events such as door-open/deny based on AI results.

In short: the web app does not train models directly. It consumes AI results and turns them into operational workflows.

## 7. Main folder structure

```text
AIoT_FaceAI/
  app/                  # Frontend pages + API routes (Next.js)
  database/             # SQL schema + seed + migration files
   scripts/              # SQL runner scripts
  Report/               # LaTeX report documents
  adafruit.py           # Feed simulator script
  adafruit_to_db.py     # Feed-to-DB gateway script
  requirements.txt      # Python dependencies
  package.json          # Node dependencies + scripts
```

## 8. Run locally from scratch

### Step 1: Install tools

1. Node.js 18+ (20+ recommended)
2. npm 9+
3. Python 3.10+
4. PostgreSQL (local) or Supabase

### Step 2: Clone source

```bash
git clone https://github.com/THVKhang/AIoT_FaceAI.git
cd AIoT_FaceAI
```

### Step 3: Create environment file

Copy the template and fill in real values:

```bash
cp .env.example .env
```

`.env.example` documents every variable. The minimum you need:

- `DATABASE_URL` (or `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`)
- `FACE_API_SECRET`: shared key between Next.js and the Python face service. Face API routes refuse every request (503) when it is missing.
- `ADAFRUIT_WEBHOOK_SECRET`: required by `/api/webhooks/adafruit`.
- `AIO_USERNAME`, `AIO_KEY`: Adafruit IO.
- Mail settings (`RESEND_API_KEY` or `SMTP_*`, plus `MAIL_FROM`, `APP_BASE_URL`) for password reset.

> In production (`npm start`) the session cookie has the `Secure` flag, so login only works over HTTPS or on `localhost`.
> For a plain-HTTP LAN demo, set `COOKIE_SECURE=false`.

### Step 4: Install dependencies

Node:

```bash
npm install
```

Python (Windows PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Python (macOS/Linux):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Step 5: Initialize database

```bash
npm run db:init
```

### Step 6: Run web app

```bash
npm run dev
```

Open `http://localhost:3000`.

### Step 7: (Optional) Run IoT gateway

Open a new terminal (with active venv):

```bash
python adafruit_to_db.py
```

Optional feed simulation:

```bash
python adafruit.py
```

## 9. Important scripts

In `package.json`:

1. `npm run dev`: start local dev server.
2. `npm run build`: production build.
3. `npm run start`: run production build.
4. `npm run db:init`: run full SQL migration pipeline.
5. `npm test`: unit tests (Jest via `next/jest`, testing the real `app/lib` modules).
6. `npm run lint:types`: TypeScript type check.
7. `node scripts/set-admin.js <username>`: promote a user to admin.

Docker (web + gateway + FastAPI face server):

```bash
cp .env.example .env
docker compose up --build
```

The `faceai` container downloads the OpenCV/OpenFace models on first start and keeps them in a volume.

## 10. Production deployment

Recommended: Vercel + Supabase

1. Push source code to GitHub.
2. Connect repository to Vercel.
3. Set env vars on Vercel (DB + SMTP + APP_BASE_URL).
4. Run migrations on production database.
5. Validate register/login/forgot-password and dashboard data.

## 11. Common issues

1. Register/Login fails after deploy:
   - Usually missing env vars or database schema not migrated.
2. Password reset email is not sent:
   - Check SMTP vars and app password.
3. Dashboard shows no data:
   - Check whether Python gateway is running.
4. Local build fails:
   - Re-run `npm install` and `npm run db:init`.

## 12. Current security features

1. Password hashing (scrypt) and session tokens with expiration, `HttpOnly` + `Secure` (production) cookie.
2. Expiring password reset tokens and recovery codes.
3. Rate limiting: login 10/min, register 5/min, forgot-password 5/min, reset-password 5/min per IP.
4. Roles: `admin` / `user`.
   - Only admins can approve/revoke/delete faces and change thresholds.
   - A face registered by a normal user is always `Pending`, so it cannot open the door until an admin approves it.
5. Face API: `x-face-api-key` (constant-time comparison) or a valid session; biometric vectors are never returned to the browser.
6. Adafruit webhook protected by `ADAFRUIT_WEBHOOK_SECRET`.
7. In production, API errors do not expose internal database messages.

## 13. AI/ML expansion directions

If you add training/inference modules later:

1. Keep train/offline service separate from web app.
2. Keep web APIs focused on consuming AI results.
3. Store model metadata and access logs in database.
4. Add monitoring for inference latency and accuracy drift.

---

If you are new to this project, start from section 8 (local setup), then read sections 1-6 to understand the overall architecture.
