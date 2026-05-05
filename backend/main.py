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

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from web3 import Web3

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
# DADOS DE EXEMPLO — para demonstração ao professor
# ══════════════════════════════════════════════════════════════════════════

DEMO_PILOTOS = [
    {
        "id": "P001",
        "nome": "Miguel Ferreira",
        "cargo": "First Officer — TAP Air Portugal",
        "carteira_ethereum": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        "documentos": [
            {
                "tipo": "ATPL",
                "descricao": "Licença ATPL — ANAC Portugal",
                "hash": "0xf5fa1228922f7b4e3e13181d7054cf56785891b7025e0361906b8964ec62eb73",
                "tx_blockchain": "0xa3d2e891b4c7f305162a9c184d7e3b56f0c9e2a1b3d4e5f6a7b8c9d0e1f2a3b4",
                "emitido_em": "2023-03-15",
                "validade": "2026-03-15",
                "dias_restantes": (datetime(2026, 3, 15) - datetime.utcnow()).days,
                "status": "valid",
                "entidade_emissora": "ANAC — Autoridade Nacional de Aviação Civil",
            },
            {
                "tipo": "MEDICAL_CLASS1",
                "descricao": "Certificado Médico Classe 1",
                "hash": "0xca26ae93ee7df6764af6689223428eeb13101bf5a4b8b7cc4ab945460b235f99",
                "tx_blockchain": "0xb4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
                "emitido_em": "2024-11-20",
                "validade": (datetime.utcnow() + timedelta(days=12)).strftime("%Y-%m-%d"),
                "dias_restantes": 12,
                "status": "expiring_soon",
                "entidade_emissora": "Clínica de Medicina Aeronáutica Lisboa",
            },
            {
                "tipo": "ICAO_ENGLISH",
                "descricao": "Proficiência Linguística ICAO — Nível 5",
                "hash": "0x9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8",
                "tx_blockchain": "0xc5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
                "emitido_em": "2022-06-10",
                "validade": "2025-06-10",
                "dias_restantes": -330,
                "status": "expired",
                "entidade_emissora": "Centro de Testes ICAO — Lisboa",
            },
            {
                "tipo": "TYPE_RATING",
                "descricao": "Type Rating Airbus A320",
                "hash": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
                "tx_blockchain": "0xd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
                "emitido_em": "2024-01-08",
                "validade": "2026-01-08",
                "dias_restantes": (datetime(2026, 1, 8) - datetime.utcnow()).days,
                "status": "valid",
                "entidade_emissora": "Airbus Training Centre — Toulouse",
            },
        ],
    },
    {
        "id": "P002",
        "nome": "Ana Costa",
        "cargo": "Cabin Crew Senior — Ryanair",
        "carteira_ethereum": "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
        "documentos": [
            {
                "tipo": "ATPL",
                "descricao": "Licença de Tripulante de Cabine — EASA",
                "hash": "0x3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4",
                "tx_blockchain": "0xe7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
                "emitido_em": "2024-05-01",
                "validade": "2027-05-01",
                "dias_restantes": (datetime(2027, 5, 1) - datetime.utcnow()).days,
                "status": "valid",
                "entidade_emissora": "EASA — European Union Aviation Safety Agency",
            },
            {
                "tipo": "MEDICAL_CLASS1",
                "descricao": "Certificado Médico Cabin Crew",
                "hash": "0x5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
                "tx_blockchain": "0xf8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
                "emitido_em": "2024-12-01",
                "validade": (datetime.utcnow() + timedelta(days=28)).strftime("%Y-%m-%d"),
                "dias_restantes": 28,
                "status": "expiring_soon",
                "entidade_emissora": "Clínica de Medicina Aeronáutica Porto",
            },
        ],
    },
    {
        "id": "P003",
        "nome": "João Matos",
        "cargo": "Captain — easyJet",
        "carteira_ethereum": "0x1Db3439a7D398351b8bE11C439e05C5B3259aeD4",
        "documentos": [
            {
                "tipo": "ATPL",
                "descricao": "Licença ATPL — CAA United Kingdom",
                "hash": "0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
                "tx_blockchain": "0xa9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
                "emitido_em": "2021-09-14",
                "validade": "2027-09-14",
                "dias_restantes": (datetime(2027, 9, 14) - datetime.utcnow()).days,
                "status": "valid",
                "entidade_emissora": "CAA — Civil Aviation Authority UK",
            },
            {
                "tipo": "TYPE_RATING",
                "descricao": "Type Rating Boeing 737 MAX",
                "hash": "0x9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
                "tx_blockchain": "0xb0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
                "emitido_em": "2024-03-22",
                "validade": "2026-03-22",
                "dias_restantes": (datetime(2026, 3, 22) - datetime.utcnow()).days,
                "status": "valid",
                "entidade_emissora": "Boeing Training — Seattle",
            },
            {
                "tipo": "CRM_TRAINING",
                "descricao": "Crew Resource Management — Recurrent",
                "hash": "0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
                "tx_blockchain": "0xc1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
                "emitido_em": "2025-01-10",
                "validade": "2027-01-10",
                "dias_restantes": (datetime(2027, 1, 10) - datetime.utcnow()).days,
                "status": "valid",
                "entidade_emissora": "easyJet Training Academy",
            },
        ],
    },
]


@app.get("/demo/pilotos", tags=["Demo"])
def demo_pilotos():
    """Lista todos os pilotos de exemplo com os seus documentos."""
    resumo = []
    for p in DEMO_PILOTOS:
        total     = len(p["documentos"])
        validos   = sum(1 for d in p["documentos"] if d["status"] == "valid")
        urgentes  = sum(1 for d in p["documentos"] if d["status"] == "expiring_soon")
        expirados = sum(1 for d in p["documentos"] if d["status"] == "expired")
        resumo.append({
            "id":                  p["id"],
            "nome":                p["nome"],
            "cargo":               p["cargo"],
            "carteira_ethereum":   p["carteira_ethereum"],
            "total_documentos":    total,
            "validos":             validos,
            "a_expirar_em_breve":  urgentes,
            "expirados":           expirados,
            "compliance_ok":       expirados == 0,
        })
    return {"pilotos": resumo, "total": len(resumo)}


@app.get("/demo/pilotos/{piloto_id}", tags=["Demo"])
def demo_piloto_detalhe(piloto_id: str):
    """Detalhe completo de um piloto com todos os seus documentos na blockchain."""
    piloto = next((p for p in DEMO_PILOTOS if p["id"] == piloto_id), None)
    if not piloto:
        raise HTTPException(404, f"Piloto '{piloto_id}' não encontrado. IDs disponíveis: P001, P002, P003")
    return piloto


@app.get("/demo/alertas", tags=["Demo"])
def demo_alertas():
    """Documentos urgentes de todos os pilotos — como apareceriam no dashboard diário."""
    alertas = []
    for p in DEMO_PILOTOS:
        for d in p["documentos"]:
            if d["status"] in ("expiring_soon", "expired"):
                alertas.append({
                    "piloto":           p["nome"],
                    "cargo":            p["cargo"],
                    "documento":        d["descricao"],
                    "tipo":             d["tipo"],
                    "dias_restantes":   d["dias_restantes"],
                    "status":           d["status"],
                    "hash_blockchain":  d["hash"],
                    "acao_necessaria":  "RENOVAR URGENTE" if d["status"] == "expired"
                                        else f"Renovar em {d['dias_restantes']} dias",
                })
    alertas.sort(key=lambda x: x["dias_restantes"])
    return {
        "total_alertas": len(alertas),
        "alertas": alertas,
        "nota": "Em produção, este endpoint é chamado diariamente e envia notificações push + email.",
    }


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
