"""/documents/*: upload, hash, verify, QR code and the expiring-documents alert."""

import hashlib
import io
import logging
import os
from datetime import UTC, datetime, timedelta

import qrcode
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response

import deps
from compliance import api_status
from compliance import days_left as doc_days_left
from config import DOC_TYPES, PUBLIC_BASE_URL
from deps import check_hash_format, require_api_key
from schemas import VerifyResponse
from services import blockchain_service as chain
from services.blockchain_service import sha256_file

logger = logging.getLogger(__name__)

# Blockchain state and read_upload are looked up on their modules at call time,
# so tests can monkeypatch them there.
router = APIRouter()


@router.post("/documents/upload", tags=["Documentos"], dependencies=[Depends(require_api_key)])
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
    content = await deps.read_upload(file)
    file_hash = sha256_file(content)
    hash_hex = "0x" + file_hash.hex()

    # 2. Register on the blockchain (if configured), else demo mode
    if chain.contract and chain.account:
        if not chain.signing_allowed():
            logger.error(
                "Refusing to sign: BLOCKCHAIN_NETWORK=%r is not allowlisted", os.getenv("BLOCKCHAIN_NETWORK")
            )
            raise HTTPException(503, "Registo na blockchain indisponível.")
        try:
            fn = chain.contract.functions.registerDocument(
                pilot_address,
                file_hash,
                DOC_TYPES[doc_type],
                description,
                int(expires_at.timestamp()),
            )
            receipt = chain.send_transaction(fn)
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
        "blockchain_mode": "real" if chain.contract else "demo",
    }


@router.post("/documents/hash", tags=["Documentos"], dependencies=[Depends(require_api_key)])
async def calcular_hash(file: UploadFile = File(...)):
    """
    Calcula o SHA-256 de um ficheiro sem o registar na blockchain.
    Útil para demonstração do conceito de hashing.
    """
    content = await deps.read_upload(file)
    file_hash = sha256_file(content)
    return {
        "filename": file.filename,
        "tamanho_kb": round(len(content) / 1024, 2),
        "sha256": "0x" + file_hash.hex(),
        "explicacao": "Este hash é a 'impressão digital' do ficheiro. "
        "Qualquer alteração ao ficheiro produz um hash completamente diferente.",
    }


@router.get("/documents/verify/{doc_hash}", response_model=VerifyResponse, tags=["Documentos"])
def verify_document(doc_hash: str):
    """
    Verifica autenticidade de um documento na blockchain.
    Qualquer entidade (ANAC, companhia aérea) pode usar este endpoint.
    """
    check_hash_format(doc_hash)
    if not chain.contract:
        return VerifyResponse(
            hash=doc_hash,
            is_authentic=False,
            is_expired=False,
            expires_at=None,
            message="Modo demo: verificação blockchain inativa. Em produção, este endpoint verifica o hash diretamente na blockchain Ethereum.",
        )
    try:
        hash_bytes = bytes.fromhex(doc_hash.replace("0x", ""))
        valid, expired, expires_ts, issued_by = chain.contract.functions.verifyDocument(hash_bytes).call()
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


@router.get("/documents/expiring", tags=["Alertas"])
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


@router.get("/documents/qr/{doc_hash}", tags=["Documentos"])
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
