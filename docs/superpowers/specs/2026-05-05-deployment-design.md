# AeroLicense Deployment Design

**Date:** 2026-05-05  
**Status:** Approved

## Goal

Deploy the AeroLicense platform to production:
- Backend (FastAPI) → Railway
- PostgreSQL database → Railway plugin
- Frontend (React) → Vercel

## Architecture

```
Vercel (frontend React)
    └─► Railway backend (FastAPI)
              └─► Railway PostgreSQL
```

## Components

### Backend (Railway)

- Service runs via `Procfile`: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
- Migrate from SQLite to PostgreSQL by updating `DATABASE_URL` env var
- `database.py` already uses SQLAlchemy — only the connection string changes
- Replace `sqlite:///./aerolicense.db` with `postgresql://...` from Railway env var
- Railway injects `DATABASE_URL` automatically when PostgreSQL plugin is added
- Backend runs in demo mode (no real blockchain node required)

### PostgreSQL (Railway Plugin)

- Added as a plugin to the Railway project
- Railway auto-injects `DATABASE_URL` into the backend service
- Schema created on first run via `init_db()` + `seed_demo_data()`

### Frontend (Vercel)

- Standard React build (`npm run build`)
- `REACT_APP_API_URL` env var set to the Railway backend URL
- Deployed via Vercel CLI or GitHub integration

## Environment Variables

| Service | Variable | Value |
|---------|----------|-------|
| Railway | `DATABASE_URL` | Auto-injected by Railway PostgreSQL plugin |
| Railway | `CONTRACT_ADDRESS` | `0x0000000000000000000000000000000000000000` (demo mode) |
| Railway | `PRIVATE_KEY` | `0x0000000000000000000000000000000000000000000000000000000000000001` (demo mode) |
| Railway | `BLOCKCHAIN_URL` | `http://127.0.0.1:8545` (unused in demo mode) |
| Vercel | `REACT_APP_API_URL` | Railway backend URL (e.g. `https://aerolicense-backend.railway.app`) |

## Changes Required

1. `backend/database.py` — read `DATABASE_URL` from env, support both SQLite (local) and PostgreSQL (production)
2. `backend/requirements.txt` — add `psycopg2-binary` for PostgreSQL driver
3. `frontend/.env.production` — set `REACT_APP_API_URL` (or configure via Vercel dashboard)
4. CORS in `backend/main.py` — add Vercel frontend URL to allowed origins

## Out of Scope

- Real Ethereum node / blockchain integration (stays in demo mode)
- Custom domain setup
- CI/CD pipeline (manual deploy for now)
