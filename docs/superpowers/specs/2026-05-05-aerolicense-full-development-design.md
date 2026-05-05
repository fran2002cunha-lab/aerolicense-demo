# AeroLicense — Full Development Design

**Date:** 2026-05-05  
**Status:** Approved

---

## Overview

Three sequential development phases to evolve AeroLicense from a demo scaffold into a working local application:

1. **Phase A** — Complete React frontend (SPA)
2. **Phase B** — Real SQLite database (replace hardcoded demo data)
3. **Phase C** — Local Hardhat Ethereum node + contract deployment

Each phase is independently runnable. Phase B and C make the backend progressively more "real" while the frontend from Phase A works throughout.

---

## Phase A — React Frontend

### Goal
Build a complete single-page app using the two existing components (`DocumentCard`, `UploadDocument`) as building blocks.

### Pages & Routing

| Route | Component | Source data |
|-------|-----------|-------------|
| `/` | Dashboard — pilot cards grid | `GET /demo/pilotos` |
| `/pilots/:id` | Pilot detail — document cards | `GET /demo/pilotos/:id` |
| `/pilots/:id/upload` | Upload form | `POST /documents/upload` |
| `/alerts` | Expiry alert list | `GET /demo/alertas` |
| `/blockchain` | Hash forgery demo | `GET /demo/blockchain` |

### Architecture
- Entry: `frontend/src/index.js` + `frontend/src/App.jsx`
- Router: `react-router-dom` (hash router, no server config needed)
- Pages live in `frontend/src/pages/`
- Shared layout: `Header` + `Sidebar` nav components in `frontend/src/components/`
- Global API helper: `frontend/src/api.js` (reads `REACT_APP_API_URL`)
- Style: inline styles matching existing dark-blue palette (`#0A1F44`, `#1A3F7A`, `#0087CC`)

### Error Handling
- All pages show an "API offline" banner if the backend is unreachable
- Loading states shown with a spinner while fetching

---

## Phase B — SQLite Database

### Goal
Replace `DEMO_PILOTOS` hardcoded list in `backend/main.py` with a real SQLite database via SQLAlchemy.

### Schema

**pilots**
- `id` TEXT PK (e.g. "P001")
- `name` TEXT
- `role` TEXT
- `ethereum_address` TEXT

**documents**
- `id` INTEGER PK autoincrement
- `pilot_id` TEXT FK → pilots.id
- `doc_type` TEXT (enum values)
- `description` TEXT
- `hash` TEXT UNIQUE
- `tx_blockchain` TEXT
- `issued_at` DATE
- `expires_at` DATE
- `issuer` TEXT

### Implementation
- New file: `backend/database.py` — SQLAlchemy engine, session, Base, models
- `backend/main.py` imports `get_db` dependency; all `/demo/*` endpoints query the DB
- On startup (`@app.on_event("startup")`): if DB is empty, seed from the existing `DEMO_PILOTOS` constant (then the constant can be removed)
- DB file: `backend/aerolicense.db` (gitignored)
- New endpoint: `POST /pilots` — add a pilot (for future use)
- New endpoint: `POST /documents` — register document metadata without file upload

### Error Handling
- DB errors return HTTP 500 with a descriptive message
- Missing pilot IDs return HTTP 404

---

## Phase C — Local Hardhat + Contract Deployment

### Goal
Deploy `AeroLicenseRegistry.sol` to a local Hardhat node and wire it to the backend so the API runs in real blockchain mode.

### Steps
1. Initialize Hardhat in `smart_contract/` (`npx hardhat init --yes`)
2. Copy `AeroLicenseRegistry.sol` into `smart_contract/contracts/`
3. Write deploy script `smart_contract/scripts/deploy.js`
4. Add npm scripts: `start:node`, `deploy:local`
5. Update ABI in `backend/main.py` to include all v2 functions (renewDocument, verifyDocument with issuedBy, revokeDocument, emitAlert, issueLicense, registerDID, certifyEntity)
6. Write `smart_contract/setup.sh` — one-shot script that starts node, deploys, and writes `backend/.env`

### Configuration
After running the setup script, `backend/.env` will contain:
```
BLOCKCHAIN_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=<deployed address>
PRIVATE_KEY=<first Hardhat account private key>
```

### Error Handling
- If the Hardhat node is not running, the backend falls back to demo mode (existing behaviour)
- The setup script prints clear instructions if any step fails

---

## Sequence / Dependencies

```
Phase A  ──────────────────────────►  works with demo backend (no DB required)
Phase B  ─► replaces hardcoded data ► Phase A frontend continues to work
Phase C  ─► real blockchain mode    ► /documents/verify now hits Ethereum
```

All three phases can be developed and tested independently.
