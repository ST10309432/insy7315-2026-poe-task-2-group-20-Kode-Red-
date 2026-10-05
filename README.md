# Thabang Phala — Food Truck Ordering System

INSY7315 WIL · Task 2 · Group 20 (Kode Red)

A mobile-first ordering and payment system for Thabang Phala's food truck at Emereis(Varsity College). Students order kotas ahead, pick a collection time and pay with a prepaid wallet, card or Student Credit (buy now, pay month-end). Thabang runs the truck from an admin portal: live order queue, menu and specials, student verification and credit limits, and reports.

| Live | URL |
|---|---|
| Marketing website / student app | https://thabang-phala.vercel.app |
| Admin portal | https://thabang-phala.vercel.app/admin |
| REST API | https://thabang-phala-api.onrender.com |
| API docs (Swagger UI) | https://thabang-phala-api.onrender.com/api/docs/ |

[![CI](https://github.com/EMGPPT/insy7315-2026-poe-task-2-group-20/actions/workflows/ci.yml/badge.svg)](https://github.com/EMGPPT/insy7315-2026-poe-task-2-group-20/actions/workflows/ci.yml)
[![Mirror Sync](https://github.com/EMGPPT/insy7315-2026-poe-task-2-group-20/actions/workflows/mirror-sync.yml/badge.svg)](https://github.com/EMGPPT/insy7315-2026-poe-task-2-group-20/actions/workflows/mirror-sync.yml)

CI runs on every pull request in this repository. Deployments (CD), weekly backups and mirror sync run in the deploy mirror — see **Repositories: original and deploy mirror** below.

| Part | Folder | Tech |
|---|---|---|
| Marketing website, student app (PWA), admin portal | `client/` | React 19 + Vite, React Router |
| REST API | `server/` | Node.js, Express 5, zod, JWT, bcrypt |
| Database | `server/src/db/` | PostgreSQL |
| Hosting | `render.yaml`, `client/vercel.json` | Vercel · Render · Neon (all free plans) |

## Entity Relationship Diagram

The database uses a single `users` table with a `role` column (`STUDENT`, `GUEST`, `VENDOR`, `ADMIN`), so students, vendors and admins all share one identity table.

Later migrations add loyalty points, notifications, order reviews and menu-item photos. Apply them with `npm run db:migrate` inside `server/`.

## Run it locally

Prerequisites: Node.js 20+, and PostgreSQL running locally (or a free Neon database).

```bash
# 1. API
cd server
cp .env.example .env          # set DATABASE_URL
npm install
npm run db:seed               # creates tables + demo data
npm run dev                   # http://localhost:4000/api/health

# 2. Front end (new terminal)
cd client
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

Demo accounts (password `Password123!`):

| Role | Email |
|---|---|
| Student (verified, has credit) | lerato@vcconnect.edu.za |
| Student (pending verification) | kabelo@vcconnect.edu.za |
| Admin (Thabang) | admin@thabangphala.co.za |
| Vendor (staff) | vendor@thabangphala.co.za |

Run the tests: `cd server && npm test`

## Architecture

Layered client–server design with a REST API (Task 1 §9):

```
React client ──HTTPS/JSON──▶ routes/ (HTTP + validation) ──▶ services/ (business rules) ──▶ repositories/ (SQL) ──▶ PostgreSQL
```

- **Strategy pattern:** `services/paymentStrategies.js`, with Wallet, Credit and Card payment strategies.
- **Repository pattern:** `repositories/` keeps SQL out of the business logic.
- **Transactions:** orders, wallet and credit changes run in a single DB transaction with row locks, so a student can never be double-charged or go over their limit.

## Branching strategy

| Branch | Purpose | Deploys to |
|---|---|---|
| `main` | Production. Only merged from `develop` via reviewed PR. | Vercel + Render (auto) |
| `develop` | Integration. Feature branches merge here first. | — |
| `feature/<name>` | One feature or fix, branched from `develop`, PR back into `develop`. | — |

Rules:

- No direct commits to `main` or `develop`.
- Every PR is reviewed and its CI checks must pass before merging.
- Commit messages follow `feat:`, `fix:`, `test:`, `docs:`, `ci:`, `chore:`.

Flow: `feature/*` → `develop` → `main` → mirror sync → CD.

## CI/CD pipeline

Four GitHub Actions workflows live in `.github/workflows/`:

| Workflow | Trigger | Runs in | What it does |
|---|---|---|---|
| `ci.yml` | push / PR to `main` or `develop` | EMGPPT repo | Server: Postgres 16 service, seed, Jest + Supertest. Client: install, oxlint, Vite build. |
| `mirror-sync.yml` | push to `main` | EMGPPT repo | Pushes `main` to the deploy mirror so Render/Vercel see the update. |
| `cd.yml` | push to `main` (mirror) | Deploy mirror | Triggers the Render and Vercel deploy hooks, then smoke-tests `/api/health` and the client root URL. |
| `backup.yml` | Sundays 02:00 SAST (cron) + manual | Deploy mirror | `pg_dump` of Neon → gzip → GitHub artifact (28-day retention). |

`cd.yml` and `backup.yml` **skip gracefully** if their secrets are missing — so the pipeline doesn't fail on forks or in environments without deploy credentials.

### Secrets (names only)

| Secret | Used by | Purpose |
|---|---|---|
| `MIRROR_PUSH_TOKEN` | `mirror-sync.yml` | Push access to the deploy mirror repo |
| `RENDER_DEPLOY_HOOK` | `cd.yml` | Trigger Render redeploy of the API |
| `VERCEL_DEPLOY_HOOK` | `cd.yml` | Trigger Vercel redeploy of the client |
| `NEON_DATABASE_URL` | `backup.yml` | `pg_dump` connection string for Neon |

## Repositories: original and deploy mirror

Two repositories:

| Repo | Purpose | Who has access |
|---|---|---|
| `EMGPPT/insy7315-2026-poe-task-2-group-20` | **Original.** Source of truth. All PRs, reviews and CI runs happen here. | All group members |
| Deploy mirror | **Mirror.** Read-only copy of `main`, used by Render and Vercel to deploy. CD, backup and sync workflows run here. | Group lead + deploy accounts |

**Why the mirror exists:** the EMGPPT organisation blocks GitHub Apps, and members don't have admin rights to configure secrets or connect third-party deploy platforms. A mirror under the group lead's personal account works around both restrictions without changing the original repo's role as the source of truth.

**How it stays 1:1:** `mirror-sync.yml` runs on every push to `main` and force-pushes the same commit to the mirror. The mirror's `main` always matches the original's `main`.

To check parity:

```bash
git fetch origin main
git rev-parse origin/main
git ls-remote <mirror-remote-url> refs/heads/main
```

Both hashes should match.

## API reference

Interactive docs (Swagger UI): `/api/docs` · OpenAPI spec: `/api/openapi.json`. Log in via `POST /api/auth/login`, click **Authorize** and paste the token to try protected endpoints.

All responses are `{ "data": ... }` or `{ "error": { "message", "details" } }`.

| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| GET | `/api/health` | public | Health check (API + DB) |
| POST | `/api/auth/register` | public | Register (student number → student account) · 201 |
| POST | `/api/auth/login` | public | Log in → JWT (30 min) |
| GET / PATCH | `/api/auth/me` | logged in | View / update own details |
| GET | `/api/menu?category=` | public | Menu with extras |
| GET | `/api/menu/:id` | public | One item |
| POST | `/api/menu` | admin | Add item · 201 |
| PUT | `/api/menu/:id` | admin | Edit price, sale price, extras |
| PATCH | `/api/menu/:id/availability` | admin, vendor | Sold out for today (auto-resets at midnight) or until changed |
| GET | `/api/menu/:id/image` | public | Item photo (cached, versioned URL) |
| PUT / DELETE | `/api/menu/:id/image` | admin | Upload (raw JPEG/PNG/WebP, max 1 MB) or remove the photo |
| DELETE | `/api/menu/:id` | admin | Delete (409 if it has orders) · 204 |
| GET / PATCH | `/api/truck` | public / staff | Open status, location, hours |
| POST | `/api/orders` | logged in | Place order + pay, optionally with `usePoints` / `useFreeMeal` · 201 (422 if credit/wallet declined, 409 if sold out) |
| GET | `/api/orders/mine` | logged in | Order history |
| GET | `/api/orders/:orderNumber` | owner, staff | Track an order |
| GET | `/api/orders?scope=active|today` | staff | Live order queue |
| PATCH | `/api/orders/:orderNumber/status` | staff, owner (cancel) | Move through lifecycle · 409 for invalid moves |
| GET | `/api/wallet` | student | Wallet, credit, activity |
| POST | `/api/wallet/top-up` | student | Load wallet (R10–R2000) |
| POST | `/api/wallet/repay` | student | Repay credit from wallet or card |
| POST | `/api/auth/me/student` | guest | Add a student number (becomes an unverified student) |
| POST | `/api/orders/:orderNumber/review` | owner | Rate a collected order once (1–5 stars + comment) · 201 |
| GET | `/api/reviews?limit=6` | public | Latest reviews + average rating |
| GET | `/api/settings/public` | public | Service fee and loyalty rules |
| GET | `/api/notifications` | logged in | Latest notifications + unread count |
| PATCH | `/api/notifications/read-all`, `/:id/read` | logged in | Mark notifications as read |
| GET | `/api/admin/dashboard` | staff | Today's figures |
| GET | `/api/admin/reports?days=7` | admin | Sales by day, top sellers, payment mix |
| GET | `/api/admin/students` | admin | Students with credit balances |
| PATCH | `/api/admin/students/:id/verify` | admin | Verify a student |
| PATCH | `/api/admin/students/:id/credit-limit` | admin | Set a student's limit |
| PATCH | `/api/admin/students/:id/credit-status` | admin | Suspend or re-activate a student's credit |
| GET | `/api/admin/students/export.csv` | admin | Export customer data (FR-28) |
| GET | `/api/admin/reports/export.csv?days=30` | admin | Export sales report (FR-26) |
| GET / PATCH | `/api/admin/settings` | admin | Default limit, service fee, loyalty rate |

## Hosting

| Part | Platform | Live URL |
|---|---|---|
| Marketing website / student app | Vercel | https://thabang-phala.vercel.app |
| Admin portal | Vercel | https://thabang-phala.vercel.app/admin |
| REST API | Render | https://thabang-phala-api.onrender.com |
| API docs (Swagger) | Render | https://thabang-phala-api.onrender.com/api/docs/ |
| Database | Neon (managed PostgreSQL) | (private connection string) |

**Why these platforms:** all three offer free tiers, deploy directly from GitHub, terminate HTTPS by default, and match the PaaS plan in Task 1 §10. Vercel is built for Vite/React SPAs (edge caching + SPA rewrites via `client/vercel.json`). Render runs the Express API as a long-lived Node service with a health check on `/api/health`. Neon provides serverless PostgreSQL with 7-day point-in-time recovery, satisfying NFR-12 without a self-managed server.

> **Note:** the Render free plan spins down after 15 minutes of inactivity. The first request after a period of inactivity takes roughly a minute to wake the service up. Subsequent requests are fast.

## Backup Plan (NFR-12)

The database runs on Neon PostgreSQL.

- **Automated backups:** Neon provides Point-in-Time Recovery (PITR) with a 7-day retention window on the free tier.
- **Manual weekly backup:** `backup.yml` runs `pg_dump` every Sunday at 02:00 SAST and uploads a gzipped SQL dump as a **GitHub Actions artifact**. Artifacts are retained for **28 days** (four rolling weeks). The dump uses the `NEON_DATABASE_URL` secret, which holds the same connection string as `DATABASE_URL` on Render — the credential lives on Render and in GitHub Secrets, never in the repository.

### Recovery procedure

1. Open Neon Console → Project → **Restore**.
2. Select a timestamp within the retention window.
3. Neon creates a new branch with the restored data.
4. Update `DATABASE_URL` in the Render environment to point at the restored branch.
5. Smoke test `/api/menu` to confirm.

## Presentation

- youtube link will be pasted here

## Definition of done

Every feature: works locally and on the hosted version; matches the prototype and the requirement IDs it covers; has validation, error handling and user feedback; has at least one test where it contains logic; merged through a reviewed PR with a clear description.

## Team

| Member | Role | Owns |
|---|---|---|
| Tadiwanashe (Tadi) Mapillar | UI development, APIs & hosting | `client/`, `server/src/routes/`, hosting |
| Boipelo Ntokozo Yende | Database | `server/src/db/`, `server/src/repositories/` |
| Liyabona Xinti | Business logic & data flow | `server/src/services/` |
| Molemo Chikane | Security & automated testing | `server/src/middleware/`, `server/tests/` |
| Muofhe Washu Mukheli | GitHub & DevOps | `.github/workflows/`, README |
