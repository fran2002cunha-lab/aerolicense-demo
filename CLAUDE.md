# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

AeroLicense is a blockchain-backed document management platform for aviation professionals (pilots, cabin crew, technicians). Each document is hashed with SHA-256 and the hash is stored on the Ethereum blockchain via a Solidity smart contract, making forgery instantly detectable. The project is a demo/academic project (ISEC Lisboa) — no real PostgreSQL is used; demo data is hardcoded in `backend/main.py`.

## Running the project

**Quick demo (no server needed):**
```bash
python3 backend/blockchain.py
```

**Backend API:**
```bash
cd backend
pip3 install fastapi web3 uvicorn python-multipart pydantic
uvicorn main:app --reload
# API at http://localhost:8000 · Swagger UI at http://localhost:8000/docs
```

**Standalone demo UI** (no React needed):
```bash
open demo.html   # requires the backend running at localhost:8000
```

**Frontend (React):**
```bash
cd frontend
npm install react react-dom react-scripts
# Create frontend/.env with: REACT_APP_API_URL=http://localhost:8000
npm start        # http://localhost:3000
```

**Backend environment variables** (`backend/.env`):
```
BLOCKCHAIN_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0xYourContractAddressHere
PRIVATE_KEY=0xYourPrivateKeyHere
```
If `CONTRACT_ADDRESS` is missing or set to the placeholder string, the backend runs in **demo mode** — all blockchain calls are simulated and no real node is required.

## Architecture

```
browser/demo.html ──────────────► FastAPI (backend/main.py)
React (frontend/)  ──────────────►   │
                                      ├─ SHA-256 hash of uploaded file
                                      ├─ Web3.py → Ethereum node
                                      │    └─ AeroLicenseRegistry.sol (smart_contract/)
                                      └─ Demo data (DEMO_PILOTOS list in main.py)
```

**Key design decisions:**

- The file itself is **never stored on-chain** — only its SHA-256 hash (`bytes32`) is. Verification by third parties (ANAC, airlines) hits the blockchain endpoint without needing the original file.
- The backend has a **demo mode**: if `CONTRACT_ADDRESS` env var is absent or is the placeholder, `contract` and `account` are `None` and all blockchain writes are faked with a deterministic SHA-256 of the hash. This lets the full API run without a local Ethereum node.
- OCR (`backend/ocr.py`) similarly degrades gracefully: if `pytesseract`/`PIL` are not installed (`OCR_AVAILABLE = False`), it returns a hardcoded demo result.
- Notifications (`backend/notifications.py`) are fully simulated — all send functions log to an in-memory list `_notification_log`. Production integration points (Firebase, SendGrid, Twilio) are commented inline.

## Document types

Both Python and Solidity share the same enum:
`ATPL | MEDICAL_CLASS1 | ICAO_ENGLISH | TYPE_RATING | CRM_TRAINING | OTHER`

The Python side maps these to integers (`DOC_TYPES` dict in `main.py`) that correspond to the Solidity `DocType` enum order.

## Smart contract (`AeroLicenseRegistry.sol`)

- `registerDocument` — requires `onlyIssuer`; stores hash, docType, description, timestamps, owner, and issuer address.
- `renewDocument` — links new hash to old (sets `previousVersion`), marks old as revoked.
- `verifyDocument` — public view; returns `(valid, expired, expiresAt, issuedBy)`.
- `revokeDocument` — sets `isRevoked = true`.
- `issueLicense` — mints a simplified ERC-721-style NFT token for a pilot licence number (e.g. `PT.FCL.A.123456`).
- `registerDID` / `resolveDID` — decentralised identity per pilot wallet address.
- `certifyEntity` — owner-only; adds medical clinics / training centres to a marketplace registry.

The ABI embedded in `main.py` only covers the four original functions (`registerDocument`, `verifyDocument`, `daysUntilExpiry`, `getDocumentsByPilot`) — it does not expose the v2 additions (renewal, NFT, DID, marketplace). Update the ABI in `main.py` before using those v2 functions from Python.

## API endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | Health check, reports demo vs production mode |
| POST | `/documents/upload` | Hash file → register on-chain (or simulate) |
| POST | `/documents/hash` | Hash only, no blockchain write |
| GET | `/documents/verify/{hash}` | Verify authenticity |
| GET | `/documents/expiring?days=30` | Expiry alert list |
| GET | `/demo/pilotos` | Hardcoded demo pilots summary |
| GET | `/demo/pilotos/{id}` | Detail for P001, P002, P003 |
| GET | `/demo/alertas` | Expiring/expired docs across all demo pilots |
| GET | `/demo/blockchain` | SHA-256 forgery detection demo |

## Deploying the smart contract

Local (Hardhat):
```bash
npm install --global hardhat
npx hardhat init
# copy AeroLicenseRegistry.sol to contracts/
npx hardhat compile
npx hardhat node                            # port 8545
npx hardhat run scripts/deploy.js --network localhost
```
Copy the printed contract address into `backend/.env` as `CONTRACT_ADDRESS`.
