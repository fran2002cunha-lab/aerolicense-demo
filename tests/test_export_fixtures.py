"""Static-demo fixture exporter."""

import json
from datetime import date

import pytest

from scripts import export_fixtures as ef


def test_export_writes_all_fixtures(tmp_path):
    assert ef.main(["--output", str(tmp_path)]) == 0
    names = {p.name for p in tmp_path.iterdir()}
    assert names == {"status.json", *ef.ENDPOINTS.values()}
    status = json.loads((tmp_path / "status.json").read_text(encoding="utf-8"))
    assert status == ef.static_status(date.fromisoformat(status["exported_at"]))
    assert status["status"] == "demo" and status["blockchain_connected"] is False
    summary = json.loads((tmp_path / "analytics_summary.json").read_text(encoding="utf-8"))
    assert (summary["valid"], summary["expiring_soon"], summary["expired"]) == (23, 4, 4)
    assert json.loads((tmp_path / "analytics_anomalies.json").read_text(encoding="utf-8"))["total"] == 2
    for p in tmp_path.iterdir():
        text = p.read_text(encoding="utf-8")
        assert "http" not in text and "localhost" not in text


def test_check_clean_rejects_urls():
    with pytest.raises(ValueError):
        ef.check_clean({"x.json": {"url": "http://localhost:8000/documents"}})
    ef.check_clean({"x.json": {"ok": True}})
