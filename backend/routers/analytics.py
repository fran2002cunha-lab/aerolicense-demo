"""/analytics/*: KPIs, expiry timeline, type distribution, anomalies and risk scores."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from anomaly import detect_anomalies
from compliance import days_left as doc_days_left
from compliance import pilot_compliant, status_from_days
from database import Document, Pilot, get_db
from risk import compute_pilot_score
from schemas import AnalyticsSummary, MonthCount, RiskScoresResponse, TypeCount

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
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


@router.get("/monthly", response_model=list[MonthCount])
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


@router.get("/distribution", response_model=list[TypeCount])
def analytics_distribution(db: Session = Depends(get_db)):
    """Contagem de documentos por tipo."""
    docs = db.query(Document).all()
    counts: dict = {}
    for d in docs:
        counts[d.doc_type] = counts.get(d.doc_type, 0) + 1
    return [{"type": k, "count": v} for k, v in counts.items()]


@router.get("/anomalies")
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


@router.get("/risk-scores", response_model=RiskScoresResponse)
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
