# tests/test_analytics.py

def test_analytics_summary(client):
    res = client.get("/analytics/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_pilots"] == 3
    assert data["total_documents"] == 9
    assert "compliance_rate" in data
    assert isinstance(data["compliance_rate"], float)

def test_analytics_monthly_has_12_months(client):
    res = client.get("/analytics/monthly")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 12
    assert all("month" in m and "count" in m for m in data)

def test_analytics_distribution_covers_doc_types(client):
    res = client.get("/analytics/distribution")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    assert all("type" in d and "count" in d for d in data)
    total = sum(d["count"] for d in data)
    assert total == 9

def test_analytics_anomalies_returns_list(client):
    res = client.get("/analytics/anomalies")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "anomalies" in data
    assert isinstance(data["anomalies"], list)
