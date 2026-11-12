"""
AeroLicense — Backend API (FastAPI + Web3.py)

Main flow:
  1. A pilot uploads a file (PDF/JPG of the document)
  2. The backend computes the file's SHA-256
  3. The hash is sent to the smart contract on Ethereum
     (simulated in demo mode, without CONTRACT_ADDRESS)
  4. Metadata is stored via SQLAlchemy: SQLite by default,
     PostgreSQL if DATABASE_URL says so
  5. GET /documents/expiring lists documents about to expire (in production
     it would be called by a cron job)

Layout: config.py (env), schemas.py (models), deps.py (auth, upload checks,
rate limit, /documents guard), services/blockchain_service.py (web3),
routers/ (endpoints), chat_tools.py (the assistant's DB tools).
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import database
from config import CORS_ORIGINS
from database import init_db, seed_demo_data
from deps import DocumentsGuardMiddleware
from routers import analytics, chat, demo, documents
from services import blockchain_service as chain


# ── App ────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = database.SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="AeroLicense API",
    description="Plataforma de gestão documental para profissionais de aviação",
    version="1.0.0",
    lifespan=lifespan,
)

# The CORS middleware is registered after DocumentsGuardMiddleware, so it wraps
# it and early 401/413 responses still carry CORS headers.
app.add_middleware(DocumentsGuardMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)


@app.get("/", tags=["Geral"])
def root():
    return {
        "app": "AeroLicense API",
        "status": "online",
        "blockchain_connected": chain.w3.is_connected(),
        "contract_configured": chain.contract is not None,
        "modo": "Smart contract em modo simulação" if chain.contract is None else "Smart contract · Produção",
    }


app.include_router(documents.router)
app.include_router(demo.router)
app.include_router(analytics.router)
app.include_router(chat.router)
