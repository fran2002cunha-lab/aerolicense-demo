"""
AeroLicense — Cálculo de Risco por Piloto
Score 0-100 que combina: documentos expirados, a expirar, e anomalias ML.
"""

from datetime import date


def compute_pilot_score(pilot_docs: list, anomalous_hashes: set) -> dict:
    """
    pilot_docs: list of dicts with keys: hash, expires_at (ISO string), description
    anomalous_hashes: set of hash strings flagged by IsolationForest

    Returns dict: {score, level, penalties}
    """
    today = date.today()
    score = 100
    penalties = []

    for d in pilot_docs:
        days = (date.fromisoformat(d["expires_at"]) - today).days
        if days <= 0:
            score -= 25
            penalties.append(f"Documento expirado: {d.get('description', d['hash'][:10])} (-25 pts)")
        elif days <= 30:
            penalty = max(2, round(10 * (1 - days / 30)))
            score -= penalty
            penalties.append(f"A expirar em {days} dias: {d.get('description', d['hash'][:10])} (-{penalty} pts)")

    pilot_hashes = {d["hash"] for d in pilot_docs}
    if pilot_hashes & anomalous_hashes:
        score -= 15
        penalties.append("Anomalia ML detectada nos documentos (-15 pts)")

    score = max(0, score)

    if score >= 80:
        level = "safe"
    elif score >= 50:
        level = "attention"
    else:
        level = "critical"

    return {"score": score, "level": level, "penalties": penalties}
