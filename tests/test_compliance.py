"""Single source of truth for document status, and the relative demo seed."""

from datetime import date, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import database
from compliance import EXPIRY_WARNING_DAYS, api_status, doc_status, pilot_compliant
from database import DEMO_PILOTS_RAW, Base, Document, resolve_dates, seed_demo_data

TODAY = date(2026, 6, 15)


@pytest.mark.parametrize(
    "offset,expected",
    [(-1, "expired"), (0, "expiring"), (30, "expiring"), (31, "valid")],
)
def test_doc_status_boundaries(offset, expected):
    assert EXPIRY_WARNING_DAYS == 30
    assert doc_status(TODAY + timedelta(days=offset), TODAY) == expected
    assert doc_status((TODAY + timedelta(days=offset)).isoformat(), TODAY) == expected


def test_api_status_keeps_contract_strings():
    assert api_status(TODAY + timedelta(days=5), TODAY) == "expiring_soon"
    assert api_status(TODAY - timedelta(days=1), TODAY) == "expired"
    assert api_status(TODAY + timedelta(days=31), TODAY) == "valid"


def test_pilot_compliant_rules():
    assert pilot_compliant([], TODAY) is False
    assert pilot_compliant([TODAY], TODAY) is True  # expires today: still valid
    assert pilot_compliant([TODAY, TODAY - timedelta(days=1)], TODAY) is False


def _seed_statuses(today):
    docs = [resolve_dates(d, today) for p in DEMO_PILOTS_RAW for d in p["documents"]]
    return [doc_status(d["expires_at"], today) for d in docs]


@pytest.mark.parametrize("today", [date(2026, 1, 1), date(2027, 7, 19), date(2031, 2, 28)])
def test_seed_distribution_is_stable_at_any_date(today):
    statuses = _seed_statuses(today)
    valid_share = statuses.count("valid") / len(statuses)
    assert 0.65 <= valid_share <= 0.8
    assert 3 <= statuses.count("expiring") <= 4
    assert 3 <= statuses.count("expired") <= 4


def test_seed_has_no_literal_dates():
    for p in DEMO_PILOTS_RAW:
        for d in p["documents"]:
            assert isinstance(d["issued_at"], database.Offset)
            assert isinstance(d["expires_at"], database.Offset)
            assert d["issued_at"] < d["expires_at"]


def test_seed_reseeds_when_the_date_changes():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    seed_demo_data(db, today=date(2026, 1, 1))
    first = sorted(d.expires_at for d in db.query(Document).all())
    seed_demo_data(db, today=date(2026, 1, 2))
    second = sorted(d.expires_at for d in db.query(Document).all())
    assert first != second
    assert (date.fromisoformat(second[0]) - date.fromisoformat(first[0])).days == 1
    db.close()


# ── Endpoints agree with each other ────────────────────────────────────────
def test_compliance_consistent_between_pilots_and_analytics(client):
    pilots = client.get("/demo/pilotos").json()["pilotos"]
    summary = client.get("/analytics/summary").json()
    assert sum(p["compliance_ok"] for p in pilots) == summary["compliant_pilots"]
    assert sum(p["expirados"] for p in pilots) == summary["expired"]
    assert sum(p["a_expirar_em_breve"] for p in pilots) == summary["expiring_soon"]
    assert sum(p["validos"] for p in pilots) == summary["valid"]
    for p in pilots:
        assert p["compliance_ok"] == (p["expirados"] == 0 and p["total_documentos"] > 0)


def test_demo_dashboard_numbers_are_realistic(client):
    s = client.get("/analytics/summary").json()
    assert s["valid"] / s["total_documents"] >= 0.65
    assert 3 <= s["expiring_soon"] <= 4
    assert 3 <= s["expired"] <= 4
    assert 50 <= s["compliance_rate"] <= 80


def test_alerts_match_summary(client):
    alerts = client.get("/demo/alertas").json()["alertas"]
    s = client.get("/analytics/summary").json()
    assert len(alerts) == s["expired"] + s["expiring_soon"]
    assert {a["status"] for a in alerts} == {"expired", "expiring_soon"}


def test_pilot_detail_status_matches_days(client):
    for p in client.get("/demo/pilotos").json()["pilotos"]:
        for d in client.get(f"/demo/pilotos/{p['id']}").json()["documentos"]:
            days = d["dias_restantes"]
            expected = "expired" if days < 0 else "expiring_soon" if days <= 30 else "valid"
            assert d["status"] == expected


# ── get_expiring_documents does what its name says ─────────────────────────
@pytest.fixture
def tools():
    from scripts.record_demo_chat import seeded_db_tools

    with seeded_db_tools() as t:
        yield t


def test_expiring_tool_excludes_expired_by_default(tools):
    docs = tools["get_expiring_documents"](days=30)
    assert docs, "seed should have documents expiring within 30 days"
    assert all(0 <= d["dias_restantes"] <= 30 for d in docs)
    assert all(d["status"] == "expiring_soon" for d in docs)


def test_expiring_tool_include_expired(tools):
    docs = tools["get_expiring_documents"](days=30, include_expired=True)
    assert any(d["dias_restantes"] < 0 for d in docs)
    assert all(d["dias_restantes"] <= 30 for d in docs)


def test_expiring_tool_days_zero(tools):
    assert all(d["dias_restantes"] == 0 for d in tools["get_expiring_documents"](days=0))


def test_pilots_summary_tool_matches_endpoint(client, tools):
    endpoint = {p["id"]: p["compliance_ok"] for p in client.get("/demo/pilotos").json()["pilotos"]}
    tool = {p["id"]: p["compliance_ok"] for p in tools["get_pilots_summary"]()}
    assert endpoint == tool
    assert all(isinstance(v, bool) for v in tool.values())
