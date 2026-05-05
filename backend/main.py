"""
AeroLicense — Backend API (FastAPI + Web3.py)

Fluxo principal:
  1. Piloto faz upload de um ficheiro (PDF/JPG do documento)
  2. Backend calcula o SHA-256 do ficheiro
  3. Hash é enviado para o smart contract na blockchain Ethereum
  4. Metadata é guardada em PostgreSQL (título, datas, tipo)
  5. Sistema de alertas verifica documentos a expirar diariamente
"""

import hashlib
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from web3 import Web3
from database import init_db, get_db, seed_demo_data, Pilot, Document

# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AeroLicense API",
    description="Plataforma de gestão documental para profissionais de aviação",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()
    from database import SessionLocal
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()

# ── Ligação à blockchain (opcional em modo demo) ───────────────────────────
BLOCKCHAIN_URL   = os.getenv("BLOCKCHAIN_URL", "http://127.0.0.1:8545")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "")
PRIVATE_KEY      = os.getenv("PRIVATE_KEY", "")

w3 = Web3(Web3.HTTPProvider(BLOCKCHAIN_URL))

# Só inicializa o contrato se existir endereço válido configurado
contract = None
account  = None
if CONTRACT_ADDRESS and CONTRACT_ADDRESS != "0xYourContractAddressHere":
    CONTRACT_ABI = [
        {
            "inputs": [
                {"name": "_pilot",     "type": "address"},
                {"name": "_hash",      "type": "bytes32"},
                {"name": "_docType",   "type": "uint8"},
                {"name": "_desc",      "type": "string"},
                {"name": "_expiresAt", "type": "uint256"},
            ],
            "name": "registerDocument",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [{"name": "_hash", "type": "bytes32"}],
            "name": "verifyDocument",
            "outputs": [
                {"name": "valid",     "type": "bool"},
                {"name": "expired",   "type": "bool"},
                {"name": "expiresAt", "type": "uint256"},
            ],
            "stateMutability": "view",
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
    ]
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
    account  = w3.eth.account.from_key(PRIVATE_KEY)

# Tipos de documento (espelham o enum Solidity)
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
    expires_at: Optional[datetime]
    message: str

# ── Helper: calcular SHA-256 ───────────────────────────────────────────────
def sha256_file(data: bytes) -> bytes:
    """Calcula o SHA-256 de um ficheiro — 32 bytes para bytes32 Solidity."""
    return hashlib.sha256(data).digest()

# ── Helper: enviar transação ───────────────────────────────────────────────
def send_transaction(fn_call):
    tx = fn_call.build_transaction({
        "from":     account.address,
        "nonce":    w3.eth.get_transaction_count(account.address),
        "gas":      300_000,
        "gasPrice": w3.eth.gas_price,
    })
    signed  = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    return w3.eth.wait_for_transaction_receipt(tx_hash)

# ══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════

@app.get("/", tags=["Geral"])
def root():
    return {
        "app": "AeroLicense API",
        "status": "online",
        "blockchain_connected": w3.is_connected(),
        "blockchain_url": BLOCKCHAIN_URL,
        "contract_configured": contract is not None,
        "modo": "demo (sem blockchain)" if contract is None else "produção",
    }


@app.post("/documents/upload", tags=["Documentos"])
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

    # 1. Calcular hash
    content   = await file.read()
    file_hash = sha256_file(content)
    hash_hex  = "0x" + file_hash.hex()

    # 2. Registar na blockchain (se configurada) ou modo demo
    if contract and account:
        try:
            fn = contract.functions.registerDocument(
                pilot_address,
                file_hash,
                DOC_TYPES[doc_type],
                description,
                int(expires_at.timestamp()),
            )
            receipt  = send_transaction(fn)
            tx_hash  = receipt.transactionHash.hex()
        except Exception as e:
            raise HTTPException(500, f"Erro blockchain: {str(e)}")
    else:
        # Modo demo: simula o tx_hash sem blockchain real
        tx_hash = "0x" + hashlib.sha256(f"demo_{hash_hex}".encode()).hexdigest()

    # 3. Estado do documento
    days_left = (expires_at - datetime.utcnow()).days
    status = "expired" if days_left <= 0 else ("expiring_soon" if days_left <= 30 else "valid")

    return {
        "hash":              hash_hex,
        "filename":          file.filename,
        "doc_type":          doc_type,
        "description":       description,
        "expires_at":        expires_at.isoformat(),
        "days_until_expiry": max(0, days_left),
        "status":            status,
        "tx_hash":           tx_hash,
        "blockchain_mode":   "real" if contract else "demo",
    }


@app.post("/documents/hash", tags=["Documentos"])
async def calcular_hash(file: UploadFile = File(...)):
    """
    Calcula o SHA-256 de um ficheiro sem o registar na blockchain.
    Útil para demonstração do conceito de hashing.
    """
    content   = await file.read()
    file_hash = sha256_file(content)
    return {
        "filename":   file.filename,
        "tamanho_kb": round(len(content) / 1024, 2),
        "sha256":     "0x" + file_hash.hex(),
        "explicacao": "Este hash é a 'impressão digital' do ficheiro. "
                      "Qualquer alteração ao ficheiro produz um hash completamente diferente.",
    }


@app.get("/documents/verify/{doc_hash}", response_model=VerifyResponse, tags=["Documentos"])
def verify_document(doc_hash: str):
    """
    Verifica autenticidade de um documento na blockchain.
    Qualquer entidade (ANAC, companhia aérea) pode usar este endpoint.
    """
    if not contract:
        return VerifyResponse(
            hash         = doc_hash,
            is_authentic = True,
            is_expired   = False,
            expires_at   = None,
            message      = "Modo demo: em produção, este endpoint verifica o hash diretamente na blockchain Ethereum.",
        )
    try:
        hash_bytes                    = bytes.fromhex(doc_hash.replace("0x", ""))
        valid, expired, expires_ts    = contract.functions.verifyDocument(hash_bytes).call()
    except Exception as e:
        raise HTTPException(404, f"Documento não encontrado na blockchain: {str(e)}")

    expires_at = datetime.utcfromtimestamp(expires_ts) if expires_ts else None
    if not valid:
        msg = "Documento REVOGADO — não é válido."
    elif expired:
        msg = "Documento EXPIRADO — precisa de renovação."
    else:
        msg = "Documento VÁLIDO e autêntico na blockchain."

    return VerifyResponse(hash=doc_hash, is_authentic=valid,
                          is_expired=expired, expires_at=expires_at, message=msg)


@app.get("/documents/expiring", tags=["Alertas"])
def get_expiring_documents(days: int = 30):
    """
    Sistema de alertas: documentos que expiram nos próximos N dias.
    Em produção, chamado diariamente por um cron job.
    """
    threshold = datetime.utcnow() + timedelta(days=days)
    return {
        "alert_threshold_days": days,
        "threshold_date":       threshold.isoformat(),
        "message":  f"Documentos a expirar antes de {threshold.date()}",
        "exemplo_documentos": [
            {"piloto": "Miguel Ferreira", "doc": "Médico Classe 1",  "expira_em": 12,  "status": "URGENTE"},
            {"piloto": "Ana Costa",       "doc": "ICAO English L5",  "expira_em": 28,  "status": "ATENÇÃO"},
            {"piloto": "João Matos",      "doc": "Type Rating B737", "expira_em": days, "status": "ATENÇÃO"},
        ],
    }


# ══════════════════════════════════════════════════════════════════════════
# DEMO ENDPOINTS — backed by SQLite via SQLAlchemy
# ══════════════════════════════════════════════════════════════════════════

@app.get("/demo/pilotos", tags=["Demo"])
def demo_pilotos(db: Session = Depends(get_db)):
    from datetime import date
    pilots = db.query(Pilot).all()
    resumo = []
    for p in pilots:
        docs = p.documents
        today = date.today()
        def days_left(d):
            exp = date.fromisoformat(d.expires_at)
            return (exp - today).days
        validos   = sum(1 for d in docs if days_left(d) > 30)
        urgentes  = sum(1 for d in docs if 0 < days_left(d) <= 30)
        expirados = sum(1 for d in docs if days_left(d) <= 0)
        resumo.append({
            "id": p.id, "nome": p.name, "cargo": p.role,
            "carteira_ethereum": p.ethereum_address,
            "total_documentos": len(docs),
            "validos": validos, "a_expirar_em_breve": urgentes, "expirados": expirados,
            "compliance_ok": expirados == 0,
        })
    return {"pilotos": resumo, "total": len(resumo)}


@app.get("/demo/pilotos/{piloto_id}", tags=["Demo"])
def demo_piloto_detalhe(piloto_id: str, db: Session = Depends(get_db)):
    from datetime import date
    pilot = db.query(Pilot).filter(Pilot.id == piloto_id).first()
    if not pilot:
        raise HTTPException(404, f"Piloto '{piloto_id}' não encontrado.")
    today = date.today()
    docs = []
    for d in pilot.documents:
        exp = date.fromisoformat(d.expires_at)
        days = (exp - today).days
        status = "expired" if days <= 0 else ("expiring_soon" if days <= 30 else "valid")
        docs.append({
            "tipo": d.doc_type, "descricao": d.description,
            "hash": d.hash, "tx_blockchain": d.tx_blockchain,
            "emitido_em": d.issued_at, "validade": d.expires_at,
            "dias_restantes": days, "status": status,
            "entidade_emissora": d.issuer,
        })
    return {"id": pilot.id, "nome": pilot.name, "cargo": pilot.role,
            "carteira_ethereum": pilot.ethereum_address, "documentos": docs}


@app.get("/demo/alertas", tags=["Demo"])
def demo_alertas(db: Session = Depends(get_db)):
    from datetime import date
    today = date.today()
    alertas = []
    for d in db.query(Document).all():
        exp  = date.fromisoformat(d.expires_at)
        days = (exp - today).days
        if days > 30:
            continue
        status = "expired" if days <= 0 else "expiring_soon"
        pilot  = db.query(Pilot).filter(Pilot.id == d.pilot_id).first()
        alertas.append({
            "piloto": pilot.name, "cargo": pilot.role,
            "documento": d.description, "tipo": d.doc_type,
            "dias_restantes": days, "status": status,
            "hash_blockchain": d.hash,
            "acao_necessaria": "RENOVAR URGENTE" if status == "expired"
                               else f"Renovar em {days} dias",
        })
    alertas.sort(key=lambda x: x["dias_restantes"])
    return {"total_alertas": len(alertas), "alertas": alertas,
            "nota": "Em produção, este endpoint é chamado diariamente."}


@app.get("/demo/blockchain", tags=["Demo"])
def demo_blockchain():
    """Demonstra como o hash SHA-256 deteta falsificações de documentos."""
    import hashlib

    doc_original  = b"ATPL License - Miguel Ferreira - Valid until 2026-03-15 - ANAC PT"
    doc_falsified = b"ATPL License - Miguel Ferreira - Valid until 2028-03-15 - ANAC PT"

    hash_orig = hashlib.sha256(doc_original).hexdigest()
    hash_fake = hashlib.sha256(doc_falsified).hexdigest()

    return {
        "conceito": "SHA-256 — Impressão Digital de Documentos",
        "documento_original": {
            "conteudo": doc_original.decode(),
            "sha256":   "0x" + hash_orig,
        },
        "documento_falsificado": {
            "conteudo":     doc_falsified.decode(),
            "alteracao":    "Apenas '2026' foi mudado para '2028'",
            "sha256":       "0x" + hash_fake,
        },
        "hashes_iguais":     hash_orig == hash_fake,
        "falsificacao_detetada": hash_orig != hash_fake,
        "conclusao": "A blockchain guarda o hash original. "
                     "Qualquer alteração ao documento — mesmo 1 caracter — "
                     "produz um hash completamente diferente e a falsificação é detetada.",
    }
