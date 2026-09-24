# Hosting guide (Owner: Tadi)

All three parts run on free plans, so hosting costs R0 for Task 2.

| Part | Platform | Free plan notes |
|---|---|---|
| Website + student app + admin portal (`client/`) | **Vercel** (Hobby) | Free for personal / non-commercial projects. 100 GB bandwidth a month. HTTPS included. |
| REST API (`server/`) | **Render** (Free web service) | 750 hours a month. **Sleeps after 15 min idle**; the first request after that takes about 1 minute. |
| PostgreSQL database | **Neon** (Free) | 0.5 GB storage, scales to zero after 5 min idle, **does not expire** (Render's free Postgres expires after 30 days, so we don't use it). |

## Why this setup (rationale for the rubric)

- **Matches the Task 1 cloud plan:** a PaaS app host for the API, a managed SQL database and a hosted static front end.
- **Separation of services:** the browser only ever talks to the API over HTTPS. The database has no public app-facing endpoint and only the API holds its connection string.
- **Automatic deploys from GitHub:** Vercel and Render both redeploy when `main` changes, which fits the CI/CD pipeline (Washu).
- **Cost:** R0 for development and marking. Task 1's running-cost section covers the paid tiers for real use, since the Vercel Hobby plan is non-commercial only.
- **Scaling path:** each part can be upgraded on its own (Render paid instance = no sleep; Neon Launch plan; Vercel Pro).

## One-time setup

### 1. Database — Neon
1. Sign up at neon.tech → **Create project** → name `thabang-phala`, region closest to South Africa (e.g. AWS Europe / Frankfurt).
2. Copy the **connection string** (it ends in `?sslmode=require`).
3. On your computer, create the tables and demo data:
   ```bash
   cd server
   DATABASE_URL="<neon connection string>" npm run db:seed
   ```

### 2. API — Render
1. Sign up at render.com with GitHub → **New → Blueprint** → pick this repo. Render reads `render.yaml`.
2. When asked, paste the Neon `DATABASE_URL`. Leave `CORS_ORIGINS` for now.
3. Deploy. Test `https://<your-api>.onrender.com/api/health`; it should return `"database":"up"`.

### 3. Front end — Vercel
1. Sign up at vercel.com with GitHub → **Add New → Project** → import this repo.
2. Set **Root Directory** to `client`. Framework preset: **Vite**.
3. Add environment variable `VITE_API_URL = https://<your-api>.onrender.com` (no `/api`, no trailing slash).
4. Deploy, then copy the Vercel URL (e.g. `https://thabang-phala.vercel.app`).

### 4. Connect them
In Render → the API service → **Environment**, set `CORS_ORIGINS` to the Vercel URL, then save (it redeploys).

## Live URLs (fill in after deploying)

| Part | URL |
|---|---|
| Website / app | https://… |
| API | https://… |
| API health | https://…/api/health |

## Before the demo
Open the API health URL about **1 minute before presenting** so the free Render instance is awake.
The front end also waits up to 60 seconds and shows a loading state while it wakes.
