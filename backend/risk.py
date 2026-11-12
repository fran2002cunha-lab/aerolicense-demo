"""
AeroLicense — per-pilot risk score.
Score 0-100 combining expired documents, documents about to expire and anomalies.
"""

from datetime import date

from compliance import EXPIRY_WARNING_DAYS, days_left, status_from_days

EXPIRED_PENALTY = 25
ANOMALY_PENALTY = 15


def compute_pilot_score(pilot_docs: list, anomalous_hashes: set, today: date | None = None) -> dict:
    """
    pilot_docs: list of dicts with keys: hash, expires_at (ISO string), description
    anomalous_hashes: hashes returned by anomaly.detect_anomalies. That function
        has no anomaly quota (contamination="auto" + a score threshold, plus
        explicit rules), so only documents with concrete reasons cost points.

    Returns dict: {score, level, penalties}
    """
    today = today or date.today()
    score = 100
    penalties = []

    for d in pilot_docs:
        days = days_left(d["expires_at"], today)
        status = status_from_days(days)
        label = d.get("description", d["hash"][:10])
        if status == "expired":
            score -= EXPIRED_PENALTY
            penalties.append(f"Documento expirado: {label} (-{EXPIRED_PENALTY} pts)")
        elif status == "expiring":
            penalty = max(2, round(10 * (1 - days / EXPIRY_WARNING_DAYS)))
            score -= penalty
            penalties.append(f"A expirar em {days} dias: {label} (-{penalty} pts)")

    pilot_hashes = {d["hash"] for d in pilot_docs}
    if pilot_hashes & set(anomalous_hashes):
        score -= ANOMALY_PENALTY
        penalties.append(f"Anomalia detectada nos documentos (-{ANOMALY_PENALTY} pts)")

    score = max(0, score)

    if score >= 80:
        level = "safe"
    elif score >= 50:
        level = "attention"
    else:
        level = "critical"

    return {"score": score, "level": level, "penalties": penalties}
