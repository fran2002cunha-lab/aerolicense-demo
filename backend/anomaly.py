"""
AeroLicense — Detecção de Anomalias com ML
Usa scikit-learn IsolationForest para identificar documentos com padrões suspeitos.

Features analisadas por documento:
  - dias_até_expiração (negativo = já expirado)
  - emitido_fim_semana (0/1) — documentos reais raramente são emitidos ao fim de semana
  - frequência_do_emissor — emissores raros são mais suspeitos
  - período_de_validade_dias — validade inusualmente curta ou longa é suspeita
"""

from datetime import date

try:
    import numpy as np
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False


def detect_anomalies(documents: list) -> list:
    """
    Recebe lista de dicts com chaves: issued_at, expires_at, issuer, description, pilot_id.
    Devolve lista dos documentos considerados anómalos pelo IsolationForest.
    Devolve lista vazia se ML não estiver disponível ou se houver menos de 3 documentos.
    """
    if not ML_AVAILABLE or len(documents) < 3:
        return []

    today = date.today()

    issuer_counts: dict = {}
    for d in documents:
        issuer_counts[d["issuer"]] = issuer_counts.get(d["issuer"], 0) + 1

    features = []
    for d in documents:
        issued  = date.fromisoformat(d["issued_at"])
        expires = date.fromisoformat(d["expires_at"])
        features.append([
            (expires - today).days,              # dias até expirar (negativo = expirado)
            1 if issued.weekday() >= 5 else 0,   # fim de semana?
            issuer_counts[d["issuer"]],           # frequência do emissor
            (expires - issued).days,              # período de validade em dias
        ])

    X = np.array(features, dtype=float)
    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    clf = IsolationForest(contamination=0.15, random_state=42, n_estimators=100)
    predictions = clf.fit_predict(X_scaled)
    scores      = clf.score_samples(X_scaled)

    anomalies = []
    for i, (pred, score) in enumerate(zip(predictions, scores)):
        if pred == -1:
            anomalies.append({
                **documents[i],
                "anomaly_score": round(float(score), 4),
                "reasons":       _explain(features[i], X),
            })

    return anomalies


def _explain(feat: list, X_all) -> list:
    """Gera explicações legíveis para cada dimensão anómala."""
    means = X_all.mean(axis=0)
    stds  = X_all.std(axis=0) + 1e-9  # avoid division by zero

    reasons = []
    for i, (val, mean, std) in enumerate(zip(feat, means, stds)):
        z = abs(val - mean) / std
        if z < 1.5:
            continue
        if i == 0:
            reasons.append(
                "Documento expirado há muito tempo" if val < 0
                else "Prazo de validade muito distante"
            )
        elif i == 1 and val == 1:
            reasons.append("Emitido ao fim de semana (incomum)")
        elif i == 2 and val < mean:
            reasons.append("Entidade emissora pouco frequente")
        elif i == 3:
            reasons.append(
                "Período de validade inusualmente longo" if val > mean
                else "Período de validade inusualmente curto"
            )

    return reasons if reasons else ["Padrão estatisticamente anómalo"]
