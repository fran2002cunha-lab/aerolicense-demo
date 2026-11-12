"""Anomaly detection: rules + thresholded IsolationForest, stable on the seed."""

from datetime import date, timedelta

import pytest

import anomaly
from anomaly import MIN_DOCS, detect_anomalies, has_no_expiry, rule_reasons
from database import DEMO_PILOTS_RAW, resolve_dates
from risk import compute_pilot_score


def _seed_docs(today):
    return [{**resolve_dates(d, today), "pilot_id": p["id"]} for p in DEMO_PILOTS_RAW for d in p["documents"]]


@pytest.mark.parametrize("today", [date(2026, 1, 1), date(2026, 11, 12), date(2029, 6, 30)])
def test_seed_anomalies_are_small_stable_and_explained(today):
    found = detect_anomalies(_seed_docs(today))
    keys = {(a["pilot_id"], a["doc_type"]) for a in found}
    assert keys == {("P007", "ATPL"), ("P008", "MEDICAL_CLASS1")}
    for a in found:
        assert a["reasons"] and all(isinstance(r, str) and r for r in a["reasons"])
        assert "rules" in a["sources"]
        assert isinstance(a["anomaly_score"], float)
    p008 = next(a for a in found if a["pilot_id"] == "P008")
    assert any("desconhecida" in r for r in p008["reasons"])
    assert any("máximo regulamentar" in r for r in p008["reasons"])


def test_icao_level6_excluded():
    docs = _seed_docs(date(2026, 11, 12))
    level6 = [d for d in docs if has_no_expiry(d)]
    assert len(level6) == 2
    found = detect_anomalies(docs)
    assert not any(has_no_expiry(a) for a in found)


def test_fewer_than_min_docs_returns_nothing():
    docs = _seed_docs(date(2026, 11, 12))
    non_l6 = [d for d in docs if not has_no_expiry(d)]
    assert detect_anomalies(non_l6[: MIN_DOCS - 1]) == []
    assert detect_anomalies([]) == []


def _doc(issuer="ANAC — Autoridade Nacional de Aviação Civil", doc_type="MEDICAL_CLASS1", days=365):
    issued = date(2026, 1, 1)
    return {
        "doc_type": doc_type,
        "description": "x",
        "issuer": issuer,
        "hash": f"0x{days}",
        "issued_at": issued.isoformat(),
        "expires_at": (issued + timedelta(days=days)).isoformat(),
    }


def test_rule_unknown_issuer():
    assert any("desconhecida" in r for r in rule_reasons(_doc(issuer="Clínica Fantasma")))
    assert rule_reasons(_doc()) == []


def test_rule_validity_above_simplified_maximum():
    assert rule_reasons(_doc(days=anomaly.MAX_VALIDITY_DAYS["MEDICAL_CLASS1"])) == []
    reasons = rule_reasons(_doc(days=anomaly.MAX_VALIDITY_DAYS["MEDICAL_CLASS1"] + 1))
    assert any("máximo regulamentar simplificado" in r for r in reasons)
    assert rule_reasons(_doc(doc_type="OTHER", days=5000)) == []  # no maximum defined


def test_uniform_dataset_has_no_forced_quota():
    """With contamination="auto" + threshold, a regular dataset yields no anomalies."""
    docs = [{**_doc(), "hash": f"0x{i}"} for i in range(30)]
    assert detect_anomalies(docs) == []


def test_contamination_is_auto():
    import inspect

    assert 'contamination="auto"' in inspect.getsource(anomaly)
    assert anomaly.ANOMALY_SCORE_THRESHOLD < -0.5


def test_risk_penalises_only_reasoned_anomalies():
    today = date(2026, 11, 12)
    docs = _seed_docs(today)
    flagged = {a["hash"] for a in detect_anomalies(docs)}
    for p in DEMO_PILOTS_RAW:
        mine = [d for d in docs if d["pilot_id"] == p["id"]]
        result = compute_pilot_score(mine, flagged, today=today)
        has_anomaly_penalty = any("Anomalia" in x for x in result["penalties"])
        assert has_anomaly_penalty == (p["id"] in {"P007", "P008"})
