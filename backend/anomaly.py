"""
AeroLicense — document anomaly detection.

Two layers, merged per document:

1. Rules (deterministic, explainable):
   * issuer not in KNOWN_ISSUERS;
   * validity period longer than the (simplified) regulatory maximum for the
     document type (MAX_VALIDITY_DAYS).

2. Statistics (scikit-learn IsolationForest), with features that do not change
   with the calendar:
   * issuer frequency in the dataset (rare issuers are more suspicious);
   * validity period in days;
   * validity relative to the type's maximum (catches "too long for its type").

   Days-until-expiry is deliberately NOT a feature: it duplicates the expiry
   penalty in risk.py and would make the result change every day. The weekday
   of issue is not used either: with relative demo dates it changes daily.

   contamination="auto" means there is no quota of anomalies: a document is
   flagged only when its score_samples value is below ANOMALY_SCORE_THRESHOLD.

Documents with no expiry (ICAO Level 6) are excluded. With fewer than MIN_DOCS
documents nothing is returned: the statistics are meaningless on tiny samples.
Every anomaly carries the reasons it was flagged.
"""

from datetime import date

try:
    import numpy as np
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler

    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

MIN_DOCS = 20

# score_samples returns the opposite of the IsolationForest anomaly score:
# about -0.4/-0.5 for ordinary points, closer to -1 for points isolated quickly.
# With contamination="auto" sklearn's own cut-off is -0.5, which flags a large
# share of a small, regular dataset. -0.65 keeps only clear outliers: on the demo
# seed the two planted documents score about -0.73 and -0.69 and the next one
# about -0.61. It is a demo calibration and must be re-validated on real data.
ANOMALY_SCORE_THRESHOLD = -0.65

# Simplified, approximate maximum validity per document type, in days. Real
# rules depend on age, licence class and the authority (e.g. EASA Part-MED:
# class 1 medicals are valid 12 months under age 40, 6 months for some older
# pilots; Part-FCL: multi-pilot type ratings are valid 1 year). Demo-grade only.
MAX_VALIDITY_DAYS: dict[str, int] = {
    "ATPL": 5 * 365 + 1,  # simplified: periodic licence re-issue every 5 years
    "MEDICAL_CLASS1": 365,  # simplified: class 1, under 40
    "TYPE_RATING": 365,  # simplified: multi-pilot type rating
    "ICAO_ENGLISH": 6 * 365 + 2,  # simplified: Level 5 = 6 years (Level 4 = 4 years)
    "CRM_TRAINING": 3 * 365 + 1,  # simplified: recurrent training cycle
    # "OTHER" has no defined maximum.
}

# Simplified allowlist of recognised issuers (authorities, aero-medical
# centres, approved training organisations). In production this would come
# from the authorities' registers. "Centro de Reconhecimiento Médico —
# Barcelona" (misspelled) is deliberately absent: it is a demo case.
KNOWN_ISSUERS: frozenset[str] = frozenset(
    {
        "ANAC — Autoridade Nacional de Aviação Civil",
        "EASA — European Union Aviation Safety Agency",
        "CAA — Civil Aviation Authority UK",
        "LBA — Luftfahrt-Bundesamt Alemanha",
        "AESA — Agencia Estatal de Seguridad Aérea",
        "Clínica de Medicina Aeronáutica Lisboa",
        "Clínica de Medicina Aeronáutica Porto",
        "Hospital das Forças Armadas — Lisboa",
        "Flugmedizinisches Zentrum — Frankfurt",
        "Centro de Testes ICAO — Lisboa",
        "Centro de Testes ICAO — Frankfurt",
        "Airbus Training Centre — Toulouse",
        "Airbus Training Centre — Madrid",
        "Boeing Training — Seattle",
        "ATR Training Centre — Toulouse",
        "Lusoavia Training Academy — Porto",
        "Tejo Airways Training Academy",
        "Serra Aviation Training Academy — Covilhã",
        "Atlântica Air Training Center",
        "Brisa Aero Training — München",
        "Douro Air Training Academy — Barcelona",
    }
)


def has_no_expiry(doc: dict) -> bool:
    """ICAO Level 6 proficiency does not expire; its stored date is nominal."""
    return doc.get("doc_type") == "ICAO_ENGLISH" and "nível 6" in doc.get("description", "").lower()


def _validity_days(doc: dict) -> int:
    return (date.fromisoformat(doc["expires_at"][:10]) - date.fromisoformat(doc["issued_at"][:10])).days


def rule_reasons(doc: dict) -> list[str]:
    """Reasons from the rule layer (empty list if no rule fires)."""
    reasons = []
    if doc.get("issuer") not in KNOWN_ISSUERS:
        reasons.append("Entidade emissora desconhecida (fora da lista de emissores reconhecidos)")
    max_days = MAX_VALIDITY_DAYS.get(doc.get("doc_type", ""))
    validity = _validity_days(doc)
    if max_days is not None and validity > max_days:
        reasons.append(
            f"Validade de {validity} dias acima do máximo regulamentar simplificado "
            f"para {doc['doc_type']} ({max_days} dias)"
        )
    return reasons


def _ml_scores(docs: list[dict]) -> list[tuple[float, list[str]]] | None:
    """Per document: (score_samples value, reasons). None if scikit-learn is missing."""
    if not ML_AVAILABLE:
        return None

    issuer_counts: dict[str, int] = {}
    for doc in docs:
        issuer_counts[doc["issuer"]] = issuer_counts.get(doc["issuer"], 0) + 1

    features = []
    for doc in docs:
        validity = _validity_days(doc)
        max_days = MAX_VALIDITY_DAYS.get(doc["doc_type"])
        features.append(
            [
                issuer_counts[doc["issuer"]],
                validity,
                validity / max_days if max_days else 1.0,
            ]
        )

    X = np.array(features, dtype=float)
    X_scaled = StandardScaler().fit_transform(X)
    clf = IsolationForest(contamination="auto", random_state=42, n_estimators=200)
    clf.fit(X_scaled)
    scores = clf.score_samples(X_scaled)

    return [(float(score), _explain(features[i], X)) for i, score in enumerate(scores)]


def _explain(feat: list, X_all) -> list[str]:
    """Readable reasons for the dimensions that are far from the mean (|z| >= 1.5)."""
    means = X_all.mean(axis=0)
    stds = X_all.std(axis=0) + 1e-9  # avoid division by zero

    reasons = []
    for i, (val, mean, std) in enumerate(zip(feat, means, stds, strict=True)):
        if abs(val - mean) / std < 1.5:
            continue
        if i == 0 and val < mean:
            reasons.append("Entidade emissora pouco frequente")
        elif i in (1, 2) and val > mean:
            reasons.append("Período de validade inusualmente longo para o tipo de documento")
        elif i in (1, 2):
            reasons.append("Período de validade inusualmente curto")

    return list(dict.fromkeys(reasons)) or ["Padrão estatisticamente anómalo"]


def detect_anomalies(documents: list) -> list:
    """
    documents: dicts with issued_at, expires_at, issuer, doc_type, description, hash, ...
    Returns the anomalous documents, each with "anomaly_score" (IsolationForest
    score_samples, lower = more anomalous; None without scikit-learn), "reasons" and "sources"
    ("rules" and/or "ml"). Empty if there are fewer than MIN_DOCS documents.
    """
    docs = [doc for doc in documents if not has_no_expiry(doc)]
    if len(docs) < MIN_DOCS:
        return []

    ml = _ml_scores(docs)
    anomalies = []
    for i, doc in enumerate(docs):
        reasons = rule_reasons(doc)
        sources = ["rules"] if reasons else []
        score = ml[i][0] if ml else None
        if score is not None and score < ANOMALY_SCORE_THRESHOLD:
            reasons += [r for r in ml[i][1] if r not in reasons]
            sources.append("ml")
        if reasons:
            anomalies.append(
                {
                    **doc,
                    "anomaly_score": round(score, 4) if score is not None else None,
                    "reasons": reasons,
                    "sources": sources,
                }
            )
    return anomalies
