"""The chat assistant's tools: plain functions over the database, bound to one session."""

from datetime import date

from sqlalchemy.orm import Session

from anomaly import detect_anomalies
from compliance import api_status, pilot_compliant, status_from_days
from compliance import days_left as doc_days_left
from database import Document, Pilot
from risk import compute_pilot_score


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
