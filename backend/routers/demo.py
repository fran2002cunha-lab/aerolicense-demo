"""/demo/*: pilots, alerts and the SHA-256 demonstration, backed by the database."""

import hashlib
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from compliance import api_status, pilot_compliant, status_from_days
from compliance import days_left as doc_days_left
from database import Document, Pilot, get_db
from schemas import AlertsResponse, PilotsResponse

router = APIRouter(prefix="/demo", tags=["Demo"])


@router.get("/pilotos", response_model=PilotsResponse)
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


@router.get("/pilotos/{piloto_id}")
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


@router.get("/alertas", response_model=AlertsResponse)
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


@router.get("/blockchain")
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
