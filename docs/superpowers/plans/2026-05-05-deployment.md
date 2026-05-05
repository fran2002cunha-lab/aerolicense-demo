# AeroLicense Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy AeroLicense backend to Railway with PostgreSQL and frontend to Vercel.

**Architecture:** FastAPI backend + PostgreSQL on Railway; React frontend on Vercel. Backend reads `DATABASE_URL` from env (PostgreSQL in prod, SQLite locally). Frontend reads `REACT_APP_API_URL` from env to point at the Railway backend.

**Tech Stack:** Python/FastAPI, SQLAlchemy, psycopg2-binary, Railway CLI, Vercel CLI, React

---

## File Map

| File | Change |
|------|--------|
| `backend/database.py` | Read `DATABASE_URL` from env; remove SQLite-only `connect_args` when using PostgreSQL |
| `backend/requirements.txt` | Add `psycopg2-binary==2.9.10` |
| `backend/main.py` | Pass `DATABASE_URL` env var to `init_db()` on startup |

---

### Task 1: Support PostgreSQL in database.py

**Files:**
- Modify: `backend/database.py:32-36`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_database_pg.py
import os
import pytest

def test_init_db_reads_database_url_env(monkeypatch, tmp_path):
    """init_db() with no args should use DATABASE_URL env var."""
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    # Re-import to pick up env
    import importlib
    import database
    importlib.reload(database)
    database.init_db()
    assert database._engine is not None
    assert str(database._engine.url) == f"sqlite:///{db_path}"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest ../tests/test_database_pg.py -v
```

Expected: FAIL — `init_db()` ignores `DATABASE_URL` env var currently.

- [ ] **Step 3: Update `backend/database.py`**

Replace the `init_db` function (lines 32–36) with:

```python
import os

def init_db(url: str | None = None):
    global _engine, SessionLocal
    if url is None:
        url = os.getenv("DATABASE_URL", "sqlite:///./aerolicense.db")
    # SQLite needs check_same_thread=False; PostgreSQL does not accept it
    kwargs = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {}
    _engine = create_engine(url, **kwargs)
    Base.metadata.create_all(_engine)
    SessionLocal = sessionmaker(bind=_engine)
```

Also add `import os` at the top of `backend/database.py` if not already present.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && python -m pytest ../tests/test_database_pg.py -v
```

Expected: PASS

- [ ] **Step 5: Run existing tests to check for regressions**

```bash
cd backend && python -m pytest ../tests/ -v
```

Expected: all previously passing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add backend/database.py tests/test_database_pg.py
git commit -m "feat: init_db reads DATABASE_URL env var, supports PostgreSQL"
```

---

### Task 2: Add psycopg2-binary to requirements

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add the dependency**

Append to `backend/requirements.txt`:

```
psycopg2-binary==2.9.10
```

- [ ] **Step 2: Verify it installs cleanly**

```bash
pip install psycopg2-binary==2.9.10
```

Expected: Successfully installed psycopg2-binary-2.9.10

- [ ] **Step 3: Commit**

```bash
git add backend/requirements.txt
git commit -m "chore: add psycopg2-binary for PostgreSQL support"
```

---

### Task 3: Pass DATABASE_URL in startup

**Files:**
- Modify: `backend/main.py:44-51`

- [ ] **Step 1: Update the startup handler**

Replace the `startup` function in `backend/main.py` (lines 44–51):

```python
@app.on_event("startup")
def startup():
    init_db()  # reads DATABASE_URL from env automatically
    db = database.SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()
```

No code change needed — `init_db()` now reads `DATABASE_URL` automatically. This step is a verification that the call signature is already correct after Task 1.

- [ ] **Step 2: Smoke-test locally**

```bash
cd backend && uvicorn main:app --reload
```

Open `http://localhost:8000` — should return `{"mode": "demo", ...}` without errors.

- [ ] **Step 3: Commit if any change was needed**

```bash
git add backend/main.py
git commit -m "chore: verify startup uses updated init_db"
```

---

### Task 4: Deploy backend to Railway

These are manual steps in the Railway dashboard and CLI. No code changes.

- [ ] **Step 1: Install Railway CLI**

```bash
npm install -g @railway/cli
railway login
```

- [ ] **Step 2: Create Railway project and link**

```bash
cd /Users/franciscocunha/aerolicense-demo/backend
railway init        # creates new project called "aerolicense"
railway link        # links this directory to the project
```

- [ ] **Step 3: Add PostgreSQL plugin**

In the Railway dashboard (`railway.app`):
1. Open the `aerolicense` project
2. Click **New** → **Database** → **PostgreSQL**
3. Railway auto-creates `DATABASE_URL` env var linked to the backend service

- [ ] **Step 4: Set remaining env vars in Railway dashboard**

In **Variables** tab of the backend service, add:

| Key | Value |
|-----|-------|
| `CONTRACT_ADDRESS` | `0x0000000000000000000000000000000000000000` |
| `PRIVATE_KEY` | `0x0000000000000000000000000000000000000000000000000000000000000001` |
| `BLOCKCHAIN_URL` | `http://127.0.0.1:8545` |
| `PUBLIC_BASE_URL` | `https://<your-railway-url>.railway.app` (fill in after first deploy) |

- [ ] **Step 5: Deploy**

```bash
cd /Users/franciscocunha/aerolicense-demo/backend
railway up
```

Expected output ends with: `✓ Build successful` and a URL like `https://aerolicense-backend-production.up.railway.app`

- [ ] **Step 6: Verify backend is live**

```bash
curl https://<your-railway-url>.railway.app/
```

Expected: `{"status":"ok","mode":"demo",...}`

- [ ] **Step 7: Update PUBLIC_BASE_URL**

In Railway dashboard Variables tab, update `PUBLIC_BASE_URL` to the actual URL from Step 5, then redeploy:

```bash
railway up
```

---

### Task 5: Deploy frontend to Vercel

- [ ] **Step 1: Install Vercel CLI**

```bash
npm install -g vercel
vercel login
```

- [ ] **Step 2: Set the API URL env var**

```bash
cd /Users/franciscocunha/aerolicense-demo/frontend
vercel env add REACT_APP_API_URL production
```

When prompted, enter the Railway backend URL: `https://<your-railway-url>.railway.app`

- [ ] **Step 3: Deploy**

```bash
vercel --prod
```

Expected output ends with: `✓ Production: https://aerolicense-demo.vercel.app`

- [ ] **Step 4: Verify frontend is live**

Open the Vercel URL in a browser. The dashboard should load and show the 3 demo pilots. The API calls should reach Railway (check Network tab in DevTools — requests go to the Railway URL).

- [ ] **Step 5: Update CORS if needed**

If the browser console shows CORS errors, the backend `allow_origins=["*"]` already covers all origins — no change needed. If you want to tighten it later:

In `backend/main.py` line 38, replace `allow_origins=["*"]` with:
```python
allow_origins=["https://aerolicense-demo.vercel.app"],
```

Then redeploy: `railway up`

---

### Task 6: Smoke-test end-to-end

- [ ] **Step 1: Test demo pilots endpoint**

```bash
curl https://<railway-url>.railway.app/demo/pilotos
```

Expected: JSON array with 3 pilots (Miguel Ferreira, Ana Costa, João Matos).

- [ ] **Step 2: Test document upload via frontend**

1. Open the Vercel URL
2. Upload a PDF file
3. Verify a hash is returned and appears in the pilot's document list

- [ ] **Step 3: Test QR code**

```bash
curl https://<railway-url>.railway.app/documents/qr/<any-hash> --output qr.png && open qr.png
```

Expected: a QR code image opens.

- [ ] **Step 4: Final commit with deployment notes**

```bash
cd /Users/franciscocunha/aerolicense-demo
git add .
git commit -m "chore: deployment complete — Railway backend + Vercel frontend"
```
