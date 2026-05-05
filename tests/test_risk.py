# tests/test_risk.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from risk import compute_pilot_score

def test_perfect_score_no_issues():
    docs = [{"hash": "0xabc", "expires_at": "2030-01-01", "description": "ATPL"}]
    result = compute_pilot_score(docs, set())
    assert result["score"] == 100
    assert result["level"] == "safe"
    assert result["penalties"] == []

def test_expired_doc_reduces_score():
    docs = [{"hash": "0xabc", "expires_at": "2020-01-01", "description": "ATPL"}]
    result = compute_pilot_score(docs, set())
    assert result["score"] == 75
    assert result["level"] == "attention"

def test_two_expired_docs():
    docs = [
        {"hash": "0xabc", "expires_at": "2020-01-01", "description": "ATPL"},
        {"hash": "0xdef", "expires_at": "2019-01-01", "description": "MED"},
    ]
    result = compute_pilot_score(docs, set())
    assert result["score"] == 50
    assert result["level"] == "attention"

def test_anomaly_penalty():
    docs = [{"hash": "0xabc", "expires_at": "2030-01-01", "description": "ATPL"}]
    result = compute_pilot_score(docs, {"0xabc"})
    assert result["score"] == 85
    assert result["level"] == "safe"

def test_critical_score():
    docs = [
        {"hash": "0xabc", "expires_at": "2020-01-01", "description": "ATPL"},
        {"hash": "0xdef", "expires_at": "2020-01-01", "description": "MED"},
        {"hash": "0xghi", "expires_at": "2020-01-01", "description": "ICAO"},
        {"hash": "0xjkl", "expires_at": "2020-01-01", "description": "TR"},
    ]
    result = compute_pilot_score(docs, set())
    assert result["score"] == 0
    assert result["level"] == "critical"

def test_risk_endpoint(client):
    res = client.get("/analytics/risk-scores")
    assert res.status_code == 200
    data = res.json()
    assert "pilots" in data
    assert len(data["pilots"]) == 3
    for p in data["pilots"]:
        assert "pilot_id" in p
        assert "pilot_name" in p
        assert "score" in p
        assert "level" in p
        assert p["level"] in ("safe", "attention", "critical")
        assert 0 <= p["score"] <= 100
