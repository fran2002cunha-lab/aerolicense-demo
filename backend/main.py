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
"""

import hashlib
import io
import json
import logging
import os
import re
import secrets
import threading
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime, timedelta
from typing import Literal

import qrcode
from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.orm import Session
from web3 import Web3

import chat as chat_module
import database
from anomaly import detect_anomalies
from compliance import api_status, pilot_compliant, status_from_days
from compliance import days_left as doc_days_left
from database import Document, Pilot, get_db, init_db, seed_demo_data
from risk import compute_pilot_score

logger = logging.getLogger(__name__)


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


# CORS: explicit allowlist from CORS_ORIGINS (comma-separated), never "*".
def parse_cors_origins(raw: str) -> list[str]:
    return [o.strip() for o in raw.split(",") if o.strip() and o.strip() != "*"]


CORS_ORIGINS = parse_cors_origins(os.getenv("CORS_ORIGINS", "http://localhost:3000"))
# The CORS middleware is registered after DocumentsGuardMiddleware (below), so it
# wraps it and early 401/413 responses still carry CORS headers.

# ── Ligação à blockchain (opcional em modo demo) ───────────────────────────
BLOCKCHAIN_URL = os.getenv("BLOCKCHAIN_URL", "http://127.0.0.1:8545")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")

# The signer only sends transactions on these networks (never mainnet).
SIGNING_NETWORKS = {"local", "hardhat", "sepolia", "holesky"}
# ...and only when the node itself reports one of these chain ids
# (31337 = Hardhat/local, 11155111 = Sepolia, 17000 = Holesky).
SIGNING_CHAIN_IDS = {31337, 11155111, 17000}


def _chain_id() -> int | None:
    """Chain id reported by the connected node, or None if it cannot be read."""
    try:
        return int(w3.eth.chain_id)
    except Exception:
        return None


def signing_allowed() -> bool:
    """
    True only when BLOCKCHAIN_NETWORK is an allowlisted testnet/local network AND
    the node's chain id is an allowlisted one (a mislabelled mainnet RPC is refused).
    """
    if os.getenv("BLOCKCHAIN_NETWORK", "").strip().lower() not in SIGNING_NETWORKS:
        return False
    return _chain_id() in SIGNING_CHAIN_IDS


def load_signer(private_key: str):
    """Return a signing account, or None if the key is empty or invalid (no startup crash)."""
    if not private_key:
        return None
    try:
        return w3.eth.account.from_key(private_key)
    except Exception:
        logger.error("PRIVATE_KEY is invalid; blockchain writes disabled")
        return None


w3 = Web3(Web3.HTTPProvider(BLOCKCHAIN_URL))

# Only set up the contract when a valid address is configured
contract = None
account = None
_zero = "0x" + "0" * 40
if (
    CONTRACT_ADDRESS
    and CONTRACT_ADDRESS.startswith("0x")
    and len(CONTRACT_ADDRESS) == 42
    and CONTRACT_ADDRESS != _zero
):
    CONTRACT_ABI = [
        {
            "inputs": [
                {"name": "_pilot", "type": "address"},
                {"name": "_hash", "type": "bytes32"},
                {"name": "_docType", "type": "uint8"},
                {"name": "_desc", "type": "string"},
                {"name": "_expiresAt", "type": "uint256"},
            ],
            "name": "registerDocument",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [
                {"name": "_oldHash", "type": "bytes32"},
                {"name": "_newHash", "type": "bytes32"},
                {"name": "_desc", "type": "string"},
                {"name": "_newExpiry", "type": "uint256"},
            ],
            "name": "renewDocument",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [{"name": "_hash", "type": "bytes32"}],
            "name": "verifyDocument",
            "outputs": [
                {"name": "valid", "type": "bool"},
                {"name": "expired", "type": "bool"},
                {"name": "expiresAt", "type": "uint256"},
                {"name": "issuedBy", "type": "address"},
            ],
            "stateMutability": "view",
            "type": "function",
        },
        {
            "inputs": [{"name": "_hash", "type": "bytes32"}],
            "name": "revokeDocument",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [{"name": "_hash", "type": "bytes32"}],
            "name": "daysUntilExpiry",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function",
        },
        {
            "inputs": [{"name": "_pilot", "type": "address"}],
            "name": "getDocumentsByPilot",
            "outputs": [{"name": "", "type": "bytes32[]"}],
            "stateMutability": "view",
            "type": "function",
        },
        {
            "inputs": [
                {"name": "_pilot", "type": "address"},
                {"name": "_licenseNumber", "type": "string"},
                {"name": "_licenseType", "type": "uint8"},
                {"name": "_expiresAt", "type": "uint256"},
            ],
            "name": "issueLicense",
            "outputs": [{"name": "tokenId", "type": "uint256"}],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [
                {"name": "_pilot", "type": "address"},
                {"name": "_did", "type": "string"},
            ],
            "name": "registerDID",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [{"name": "_pilot", "type": "address"}],
            "name": "resolveDID",
            "outputs": [{"name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function",
        },
    ]
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
    account = load_signer(PRIVATE_KEY)
    if account is None:
        logger.warning("CONTRACT_ADDRESS set but no valid PRIVATE_KEY: read-only blockchain mode")

# Document types (mirror the Solidity enum)
DOC_TYPES = {
    "ATPL": 0,
    "MEDICAL_CLASS1": 1,
    "ICAO_ENGLISH": 2,
    "TYPE_RATING": 3,
    "CRM_TRAINING": 4,
    "OTHER": 5,
}


# ── Schemas ────────────────────────────────────────────────────────────────
class DocumentResponse(BaseModel):
    hash: str
    filename: str
    doc_type: str
    description: str
    expires_at: datetime
    days_until_expiry: int
    status: str
    tx_hash: str


class VerifyResponse(BaseModel):
    hash: str
    is_authentic: bool
    is_expired: bool
    expires_at: datetime | None
    message: str


# /chat history limits (cost and size of the prompt sent to the LLM)
CHAT_HISTORY_MAX_ITEMS = 20
CHAT_HISTORY_MAX_ITEM_CHARS = 1000
CHAT_HISTORY_MAX_TOTAL_CHARS = 8000


class ChatMessage(BaseModel):
    # Only user/assistant: a client cannot inject "system" or "tool" messages
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=CHAT_HISTORY_MAX_ITEM_CHARS)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    history: list[ChatMessage] = Field(default_factory=list, max_length=CHAT_HISTORY_MAX_ITEMS)

    @field_validator("history")
    @classmethod
    def _cap_total_history(cls, history: list[ChatMessage]) -> list[ChatMessage]:
        total = sum(len(m.content) for m in history)
        if total > CHAT_HISTORY_MAX_TOTAL_CHARS:
            raise ValueError(f"history too long ({total} > {CHAT_HISTORY_MAX_TOTAL_CHARS} characters)")
        return history


# ── Helper: calcular SHA-256 ───────────────────────────────────────────────
def sha256_file(data: bytes) -> bytes:
    """Calcula o SHA-256 de um ficheiro — 32 bytes para bytes32 Solidity."""
    return hashlib.sha256(data).digest()


# ── Helper: enviar transação ───────────────────────────────────────────────
class SigningRefused(RuntimeError):
    """Raised when signing is requested on a non-allowlisted network."""


def send_transaction(fn_call):
    if not signing_allowed():
        raise SigningRefused("BLOCKCHAIN_NETWORK is not an allowlisted testnet/local network")
    tx = fn_call.build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": 300_000,
            "gasPrice": w3.eth.gas_price,
        }
    )
    signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    return w3.eth.wait_for_transaction_receipt(tx_hash)


# ── Auth for write endpoints ───────────────────────────────────────────────
def api_key_error(x_api_key: str | None) -> tuple[int, str] | None:
    """
    (status, detail) if the request may not use a write endpoint, else None.
    Write endpoints need X-API-Key == AEROLICENSE_API_KEY. If the env var is unset
    or only whitespace, write endpoints are disabled entirely (503).
    """
    expected = os.getenv("AEROLICENSE_API_KEY", "").strip()
    if not expected:
        return 503, "write endpoints disabled"
    if not x_api_key or not secrets.compare_digest(x_api_key.encode(), expected.encode()):
        return 401, "Chave de API inválida ou em falta."
    return None


def require_api_key(x_api_key: str | None = Header(None)):
    if err := api_key_error(x_api_key):
        raise HTTPException(*err)


# ── Upload validation ──────────────────────────────────────────────────────
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
_UPLOAD_CHUNK = 64 * 1024
# Accepted types, identified by magic bytes (the client's Content-Type is not trusted).
_MAGIC_BYTES = (b"%PDF", b"\x89PNG\r\n\x1a\n", b"\xff\xd8\xff")


async def read_upload(file: UploadFile) -> bytes:
    """Read the upload in chunks, stopping at 5 MB (413), and check magic bytes (415)."""
    buf = bytearray()
    while chunk := await file.read(_UPLOAD_CHUNK):
        buf.extend(chunk)
        if len(buf) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "Ficheiro demasiado grande (máximo 5 MB).")
    if not bytes(buf).startswith(_MAGIC_BYTES):
        raise HTTPException(415, "Tipo de ficheiro não suportado. Use PDF, PNG ou JPEG.")
    return bytes(buf)


# Multipart framing adds a little to the file itself; the file limit is still
# enforced exactly by read_upload.
MAX_DOCUMENTS_REQUEST_BYTES = MAX_UPLOAD_BYTES + 64 * 1024
_WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class DocumentsGuardMiddleware:
    """
    Pure ASGI guard for /documents/*, applied before multipart parsing:
      * writes: API key check (401/503), and a Content-Length is required (411);
      * any request with Content-Length > MAX_DOCUMENTS_REQUEST_BYTES gets 413.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not scope["path"].startswith("/documents/"):
            return await self.app(scope, receive, send)

        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope["headers"]}
        error = None
        if scope["method"] in _WRITE_METHODS:
            error = api_key_error(headers.get("x-api-key"))
        raw_length = headers.get("content-length")
        if error is None and raw_length is not None:
            try:
                too_big = int(raw_length) > MAX_DOCUMENTS_REQUEST_BYTES
            except ValueError:
                error = (400, "Content-Length inválido.")
            else:
                if too_big:
                    error = (413, "Ficheiro demasiado grande (máximo 5 MB).")
        elif error is None and scope["method"] in _WRITE_METHODS:
            error = (411, "Content-Length em falta.")

        if error is None:
            return await self.app(scope, receive, send)
        status, detail = error
        body = json.dumps({"detail": detail}, ensure_ascii=False).encode()
        await send(
            {
                "type": "http.response.start",
                "status": status,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode()),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})


app.add_middleware(DocumentsGuardMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)


# Used with fullmatch: "$" alone would accept a trailing newline.
HASH_RE = re.compile(r"0x[0-9a-fA-F]{64}")


def check_hash_format(doc_hash: str):
    if not HASH_RE.fullmatch(doc_hash):
        raise HTTPException(400, "Hash inválido. Formato esperado: 0x seguido de 64 caracteres hexadecimais.")


# ── /chat rate limit ───────────────────────────────────────────────────────
# Simple sliding window per client IP. It is per process and in memory: with
# several workers/instances each one counts separately, and it resets on restart.
# Production would use Redis or the API gateway/WAF instead.
CHAT_RATE_LIMIT = 10  # requests
CHAT_RATE_WINDOW = 60  # seconds
_chat_hits: dict[str, deque] = defaultdict(deque)
_chat_lock = threading.Lock()
_chat_last_sweep = 0.0


def _evict_stale_chat_keys(now: float):
    """Drop IPs with no hit inside the window, so the dict cannot grow without bound."""
    for ip in [ip for ip, hits in _chat_hits.items() if not hits or now - hits[-1] > CHAT_RATE_WINDOW]:
        del _chat_hits[ip]


def chat_rate_limit(request: Request):
    global _chat_last_sweep
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with _chat_lock:
        if now - _chat_last_sweep >= CHAT_RATE_WINDOW:
            _evict_stale_chat_keys(now)
            _chat_last_sweep = now
        hits = _chat_hits[ip]
        while hits and now - hits[0] > CHAT_RATE_WINDOW:
            hits.popleft()
        if len(hits) >= CHAT_RATE_LIMIT:
            raise HTTPException(429, "Demasiados pedidos. Tenta novamente daqui a um minuto.")
        hits.append(now)


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════


@app.get("/", tags=["Geral"])
def root():
    return {
        "app": "AeroLicense API",
        "status": "online",
        "blockchain_connected": w3.is_connected(),
        "contract_configured": contract is not None,
        "modo": "Smart contract em modo simulação" if contract is None else "Smart contract · Produção",
    }


@app.post("/documents/upload", tags=["Documentos"], dependencies=[Depends(require_api_key)])
async def upload_document(
    pilot_address: str,
    doc_type: str,
    description: str,
    expires_at: datetime,
    file: UploadFile = File(...),
):
    """
    Faz upload de um documento e regista o seu hash na blockchain.

    Passos:
      1. Lê o ficheiro e calcula SHA-256
      2. Chama registerDocument() no smart contract
      3. Devolve o hash e o tx_hash da transação
    """
    if doc_type not in DOC_TYPES:
        raise HTTPException(400, f"Tipo inválido. Use: {list(DOC_TYPES.keys())}")

    # 1. Compute the hash
    content = await read_upload(file)
    file_hash = sha256_file(content)
    hash_hex = "0x" + file_hash.hex()

    # 2. Register on the blockchain (if configured), else demo mode
    if contract and account:
        if not signing_allowed():
            logger.error(
                "Refusing to sign: BLOCKCHAIN_NETWORK=%r is not allowlisted", os.getenv("BLOCKCHAIN_NETWORK")
            )
            raise HTTPException(503, "Registo na blockchain indisponível.")
        try:
            fn = contract.functions.registerDocument(
                pilot_address,
                file_hash,
                DOC_TYPES[doc_type],
                description,
                int(expires_at.timestamp()),
            )
            receipt = send_transaction(fn)
            tx_hash = receipt.transactionHash.hex()
        except Exception:
            logger.exception("Blockchain registerDocument failed")
            raise HTTPException(502, "Erro ao registar o documento na blockchain.") from None
    else:
        # Demo mode: simulated tx_hash, no real blockchain
        tx_hash = "0x" + hashlib.sha256(f"demo_{hash_hex}".encode()).hexdigest()

    # 3. Document status
    expires_aware = expires_at.replace(tzinfo=UTC) if expires_at.tzinfo is None else expires_at
    days_left = doc_days_left(expires_aware.astimezone(UTC).date(), datetime.now(UTC).date())
    status = api_status(expires_aware.astimezone(UTC).date(), datetime.now(UTC).date())

    return {
        "hash": hash_hex,
        "filename": file.filename,
        "doc_type": doc_type,
        "description": description,
        "expires_at": expires_at.isoformat(),
        "days_until_expiry": max(0, days_left),
        "status": status,
        "tx_hash": tx_hash,
        "blockchain_mode": "real" if contract else "demo",
    }


@app.post("/documents/hash", tags=["Documentos"], dependencies=[Depends(require_api_key)])
async def calcular_hash(file: UploadFile = File(...)):
    """
    Calcula o SHA-256 de um ficheiro sem o registar na blockchain.
    Útil para demonstração do conceito de hashing.
    """
    content = await read_upload(file)
    file_hash = sha256_file(content)
    return {
        "filename": file.filename,
        "tamanho_kb": round(len(content) / 1024, 2),
        "sha256": "0x" + file_hash.hex(),
        "explicacao": "Este hash é a 'impressão digital' do ficheiro. "
        "Qualquer alteração ao ficheiro produz um hash completamente diferente.",
    }


@app.get("/documents/verify/{doc_hash}", response_model=VerifyResponse, tags=["Documentos"])
def verify_document(doc_hash: str):
    """
    Verifica autenticidade de um documento na blockchain.
    Qualquer entidade (ANAC, companhia aérea) pode usar este endpoint.
    """
    check_hash_format(doc_hash)
    if not contract:
        return VerifyResponse(
            hash=doc_hash,
            is_authentic=False,
            is_expired=False,
            expires_at=None,
            message="Modo demo: verificação blockchain inativa. Em produção, este endpoint verifica o hash diretamente na blockchain Ethereum.",
        )
    try:
        hash_bytes = bytes.fromhex(doc_hash.replace("0x", ""))
        valid, expired, expires_ts, issued_by = contract.functions.verifyDocument(hash_bytes).call()
    except Exception:
        logger.exception("Blockchain verifyDocument failed")
        raise HTTPException(404, "Documento não encontrado na blockchain.") from None

    expires_at = datetime.fromtimestamp(expires_ts, tz=UTC) if expires_ts else None
    if not valid:
        msg = "Documento REVOGADO — não é válido."
    elif expired:
        msg = "Documento EXPIRADO — precisa de renovação."
    else:
        msg = "Documento VÁLIDO e autêntico na blockchain."

    return VerifyResponse(
        hash=doc_hash, is_authentic=valid, is_expired=expired, expires_at=expires_at, message=msg
    )


@app.get("/documents/expiring", tags=["Alertas"])
def get_expiring_documents(days: int = Query(30, ge=0, le=3650)):
    """
    Sistema de alertas: documentos que expiram nos próximos N dias.
    Em produção, chamado diariamente por um cron job.
    """
    threshold = datetime.now(UTC) + timedelta(days=days)
    return {
        "alert_threshold_days": days,
        "threshold_date": threshold.isoformat(),
        "message": f"Documentos a expirar antes de {threshold.date()}",
        "exemplo_documentos": [
            {"piloto": "Miguel Ferreira", "doc": "Médico Classe 1", "expira_em": 12, "status": "URGENTE"},
            {"piloto": "Ana Costa", "doc": "ICAO English L5", "expira_em": 28, "status": "ATENÇÃO"},
            {"piloto": "João Matos", "doc": "Type Rating B737", "expira_em": days, "status": "ATENÇÃO"},
        ],
    }


@app.get("/documents/qr/{doc_hash}", tags=["Documentos"])
def get_document_qr(doc_hash: str):
    """
    Gera um QR Code que qualquer entidade pode escanear para verificar
    a autenticidade do documento diretamente na blockchain.
    """
    check_hash_format(doc_hash)

    verify_url = f"{PUBLIC_BASE_URL}/documents/verify/{doc_hash}"
    qr = qrcode.QRCode(box_size=10, border=4)
    qr.add_data(verify_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="image/png")


# ══════════════════════════════════════════════════════════════════════════
# DEMO ENDPOINTS — backed by SQLite via SQLAlchemy
# ══════════════════════════════════════════════════════════════════════════


@app.get("/demo/pilotos", tags=["Demo"])
def demo_pilotos(db: Session = Depends(get_db)):
    pilots = db.query(Pilot).all()
    today = date.today()
    resumo = []
    for p in pilots:
        docs = p.documents
        statuses = [status_from_days(doc_days_left(d.expires_at, today)) for d in docs]
        resumo.append(
            {
                "id": p.id,
                "nome": p.name,
                "cargo": p.role,
                "carteira_ethereum": p.ethereum_address,
                "total_documentos": len(docs),
                "validos": statuses.count("valid"),
                "a_expirar_em_breve": statuses.count("expiring"),
                "expirados": statuses.count("expired"),
                "compliance_ok": pilot_compliant([d.expires_at for d in docs], today),
            }
        )
    return {"pilotos": resumo, "total": len(resumo)}


@app.get("/demo/pilotos/{piloto_id}", tags=["Demo"])
def demo_piloto_detalhe(piloto_id: str, db: Session = Depends(get_db)):
    pilot = db.query(Pilot).filter(Pilot.id == piloto_id).first()
    if not pilot:
        raise HTTPException(404, f"Piloto '{piloto_id}' não encontrado.")
    today = date.today()
    docs = []
    for d in pilot.documents:
        days = doc_days_left(d.expires_at, today)
        status = api_status(d.expires_at, today)
        docs.append(
            {
                "tipo": d.doc_type,
                "descricao": d.description,
                "hash": d.hash,
                "tx_blockchain": d.tx_blockchain,
                "emitido_em": d.issued_at,
                "validade": d.expires_at,
                "dias_restantes": days,
                "status": status,
                "entidade_emissora": d.issuer,
            }
        )
    return {
        "id": pilot.id,
        "nome": pilot.name,
        "cargo": pilot.role,
        "carteira_ethereum": pilot.ethereum_address,
        "documentos": docs,
    }


@app.get("/demo/alertas", tags=["Demo"])
def demo_alertas(db: Session = Depends(get_db)):
    today = date.today()
    pilots = {p.id: p for p in db.query(Pilot).all()}
    alertas = []
    for d in db.query(Document).all():
        days = doc_days_left(d.expires_at, today)
        status = api_status(d.expires_at, today)
        if status == "valid":
            continue
        pilot = pilots[d.pilot_id]
        alertas.append(
            {
                "piloto": pilot.name,
                "cargo": pilot.role,
                "documento": d.description,
                "tipo": d.doc_type,
                "dias_restantes": days,
                "status": status,
                "hash_blockchain": d.hash,
                "acao_necessaria": "RENOVAR URGENTE" if status == "expired" else f"Renovar em {days} dias",
            }
        )
    alertas.sort(key=lambda x: x["dias_restantes"])
    return {
        "total_alertas": len(alertas),
        "alertas": alertas,
        "nota": "Em produção, este endpoint é chamado diariamente.",
    }


@app.get("/demo/blockchain", tags=["Demo"])
def demo_blockchain():
    """Shows how a SHA-256 hash detects a forged document."""
    doc_original = b"ATPL License - Miguel Ferreira - Valid until 2026-03-15 - ANAC PT"
    doc_falsified = b"ATPL License - Miguel Ferreira - Valid until 2028-03-15 - ANAC PT"

    hash_orig = hashlib.sha256(doc_original).hexdigest()
    hash_fake = hashlib.sha256(doc_falsified).hexdigest()

    return {
        "conceito": "SHA-256 — Impressão Digital de Documentos",
        "documento_original": {
            "conteudo": doc_original.decode(),
            "sha256": "0x" + hash_orig,
        },
        "documento_falsificado": {
            "conteudo": doc_falsified.decode(),
            "alteracao": "Apenas '2026' foi mudado para '2028'",
            "sha256": "0x" + hash_fake,
        },
        "hashes_iguais": hash_orig == hash_fake,
        "falsificacao_detetada": hash_orig != hash_fake,
        "conclusao": "A blockchain guarda o hash original. "
        "Qualquer alteração ao documento — mesmo 1 caracter — "
        "produz um hash completamente diferente e a falsificação é detetada.",
    }


# ══════════════════════════════════════════════════════════════════════════
# ANALYTICS ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════


@app.get("/analytics/summary", tags=["Analytics"])
def analytics_summary(db: Session = Depends(get_db)):
    """Global KPIs: pilots, documents by status, compliance rate (compliance.py rules)."""
    today = date.today()
    pilots = db.query(Pilot).all()
    docs = db.query(Document).all()

    statuses = [status_from_days(doc_days_left(d.expires_at, today)) for d in docs]
    expired = statuses.count("expired")
    expiring_30 = statuses.count("expiring")
    valid = statuses.count("valid")

    compliant = sum(1 for p in pilots if pilot_compliant([d.expires_at for d in p.documents], today))

    return {
        "total_pilots": len(pilots),
        "total_documents": len(docs),
        "valid": valid,
        "expiring_soon": expiring_30,
        "expired": expired,
        "compliance_rate": round(compliant / len(pilots) * 100, 1) if pilots else 0.0,
        "compliant_pilots": compliant,
    }


@app.get("/analytics/monthly", tags=["Analytics"])
def analytics_monthly(db: Session = Depends(get_db)):
    """Número de documentos a expirar por mês nos próximos 12 meses."""
    today = date.today()
    docs = db.query(Document).all()

    months = {}
    for i in range(12):
        total_months = today.month - 1 + i
        year = today.year + total_months // 12
        month = total_months % 12 + 1
        key = f"{year}-{month:02d}"
        months[key] = 0

    for d in docs:
        key = d.expires_at[:7]  # "YYYY-MM"
        if key in months:
            months[key] += 1

    return [{"month": k, "count": v} for k, v in months.items()]


@app.get("/analytics/distribution", tags=["Analytics"])
def analytics_distribution(db: Session = Depends(get_db)):
    """Contagem de documentos por tipo."""
    docs = db.query(Document).all()
    counts: dict = {}
    for d in docs:
        counts[d.doc_type] = counts.get(d.doc_type, 0) + 1
    return [{"type": k, "count": v} for k, v in counts.items()]


@app.get("/analytics/anomalies", tags=["Analytics"])
def analytics_anomalies(db: Session = Depends(get_db)):
    """
    Suspicious documents: explicit rules (unknown issuer, validity above the
    simplified regulatory maximum) plus an IsolationForest with a score threshold.
    Every anomaly carries its reasons. See anomaly.py.
    """
    docs = db.query(Document).all()
    doc_dicts = [
        {
            "id": d.id,
            "pilot_id": d.pilot_id,
            "doc_type": d.doc_type,
            "description": d.description,
            "hash": d.hash,
            "issued_at": d.issued_at,
            "expires_at": d.expires_at,
            "issuer": d.issuer,
        }
        for d in docs
    ]
    detected = detect_anomalies(doc_dicts)
    return {"total": len(detected), "anomalies": detected}


@app.get("/analytics/risk-scores", tags=["Analytics"])
def analytics_risk_scores(db: Session = Depends(get_db)):
    """
    Risk score 0-100 per pilot, combining expired documents, documents about
    to expire and detected anomalies.
    """
    pilots = db.query(Pilot).all()
    all_docs = db.query(Document).all()

    all_doc_dicts = [
        {
            "id": d.id,
            "pilot_id": d.pilot_id,
            "doc_type": d.doc_type,
            "description": d.description,
            "hash": d.hash,
            "issued_at": d.issued_at,
            "expires_at": d.expires_at,
            "issuer": d.issuer,
        }
        for d in all_docs
    ]
    anomalies = detect_anomalies(all_doc_dicts)
    anomalous_hashes = {a["hash"] for a in anomalies}

    results = []
    for p in pilots:
        pilot_docs = [
            {"hash": d.hash, "expires_at": d.expires_at, "description": d.description} for d in p.documents
        ]
        score_data = compute_pilot_score(pilot_docs, anomalous_hashes)
        results.append(
            {
                "pilot_id": p.id,
                "pilot_name": p.name,
                "pilot_role": p.role,
                **score_data,
            }
        )

    results.sort(key=lambda x: x["score"])
    return {"pilots": results}


def build_db_tools(db: Session) -> dict:
    """Map each chat tool name to a callable bound to this DB session."""
    today = date.today()

    def _status_counts(docs):
        statuses = [status_from_days(doc_days_left(d.expires_at, today)) for d in docs]
        return statuses.count("expired"), statuses.count("expiring")

    def _get_pilots_summary():
        pilots = db.query(Pilot).all()
        result = []
        for p in pilots:
            expired, expiring = _status_counts(p.documents)
            result.append(
                {
                    "id": p.id,
                    "nome": p.name,
                    "cargo": p.role,
                    "total_docs": len(p.documents),
                    "expirados": expired,
                    "a_expirar": expiring,
                    # Same rule as /demo/pilotos and /analytics/summary
                    "compliance_ok": pilot_compliant([d.expires_at for d in p.documents], today),
                }
            )
        return result

    def _get_expiring_documents(days: int = 30, include_expired: bool = False):
        """Documents with 0 <= days_left <= days; expired ones only if include_expired."""
        docs = db.query(Document).all()
        pilots_map = {p.id: p for p in db.query(Pilot).all()}
        result = []
        for d in docs:
            days_left = doc_days_left(d.expires_at, today)
            if days_left > days or (days_left < 0 and not include_expired):
                continue
            pilot = pilots_map.get(d.pilot_id)
            result.append(
                {
                    "piloto": pilot.name if pilot else d.pilot_id,
                    "documento": d.description,
                    "tipo": d.doc_type,
                    "dias_restantes": days_left,
                    "status": api_status(d.expires_at, today),
                }
            )
        return sorted(result, key=lambda x: x["dias_restantes"])

    def _get_pilot_detail(pilot_id: str):
        pilot = db.query(Pilot).filter(Pilot.id == pilot_id).first()
        if not pilot:
            return {"error": f"Piloto {pilot_id} não encontrado"}
        return {
            "nome": pilot.name,
            "cargo": pilot.role,
            "documentos": [
                {
                    "tipo": d.doc_type,
                    "descricao": d.description,
                    "validade": d.expires_at,
                    "dias_restantes": doc_days_left(d.expires_at, today),
                    "status": api_status(d.expires_at, today),
                }
                for d in pilot.documents
            ],
        }

    def _get_risk_scores():
        pilots = db.query(Pilot).all()
        all_docs = [
            {
                "id": d.id,
                "pilot_id": d.pilot_id,
                "doc_type": d.doc_type,
                "description": d.description,
                "hash": d.hash,
                "issued_at": d.issued_at,
                "expires_at": d.expires_at,
                "issuer": d.issuer,
            }
            for p in pilots
            for d in p.documents
        ]
        anomalies = detect_anomalies(all_docs)
        anomalous_hashes = {a["hash"] for a in anomalies}
        return [
            {
                "pilot_id": p.id,
                "piloto": p.name,
                **compute_pilot_score(
                    [
                        {"hash": d.hash, "expires_at": d.expires_at, "description": d.description}
                        for d in p.documents
                    ],
                    anomalous_hashes,
                ),
            }
            for p in pilots
        ]

    def _get_anomalies():
        all_docs = [
            {
                "id": d.id,
                "pilot_id": d.pilot_id,
                "doc_type": d.doc_type,
                "description": d.description,
                "hash": d.hash,
                "issued_at": d.issued_at,
                "expires_at": d.expires_at,
                "issuer": d.issuer,
            }
            for d in db.query(Document).all()
        ]
        anomalies = detect_anomalies(all_docs)
        return {
            "total": len(anomalies),
            "anomalias": [
                {
                    "piloto": a["pilot_id"],
                    "tipo": a["doc_type"],
                    "documento": a["description"],
                    "score": a["anomaly_score"],
                    "razoes": a["reasons"],
                }
                for a in anomalies
            ],
        }

    return {
        "get_pilots_summary": _get_pilots_summary,
        "get_expiring_documents": _get_expiring_documents,
        "get_pilot_detail": _get_pilot_detail,
        "get_risk_scores": _get_risk_scores,
        "get_anomalies": _get_anomalies,
    }


@app.post("/chat", tags=["Chat IA"], dependencies=[Depends(chat_rate_limit)])
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Chat assistant with OpenAI-compatible function calling. Answers in Portuguese
    questions about pilots' document compliance. Without OPENAI_API_KEY it runs
    in demo mode with canned answers. trace_id matches the server's JSON logs.
    """
    history = [m.model_dump() for m in req.history]
    trace_id = uuid.uuid4().hex
    try:
        response_text = chat_module.run_chat(req.message, build_db_tools(db), history, trace_id=trace_id)
    except Exception:
        logger.exception("Chat failed (trace_id=%s)", trace_id)
        raise HTTPException(502, "O assistente está indisponível de momento.") from None
    return {"response": response_text, "model": chat_module.llm_model(), "trace_id": trace_id}
