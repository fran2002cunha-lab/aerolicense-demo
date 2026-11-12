import os
import sys
from datetime import UTC, datetime, timedelta

import pytest

# Add backend/ to sys.path so main.py's `from database import ...` resolves correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import DEMO_PILOTS_RAW, Base, get_db, seed_demo_data
from main import app
from tests.conftest import API_HEADERS


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)

    def override_get_db():
        db = TestSession()
        seed_demo_data(db)
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_demo_pilotos_returns_all_seeded(client):
    res = client.get("/demo/pilotos")
    assert res.status_code == 200
    assert res.json()["total"] == len(DEMO_PILOTS_RAW)


def test_demo_piloto_detalhe(client):
    res = client.get("/demo/pilotos/P001")
    assert res.status_code == 200
    data = res.json()
    assert data["nome"] == "Miguel Ferreira"
    p001 = next(p for p in DEMO_PILOTS_RAW if p["id"] == "P001")
    assert len(data["documentos"]) == len(p001["documents"])


def test_demo_piloto_not_found(client):
    res = client.get("/demo/pilotos/P999")
    assert res.status_code == 404


def test_demo_alertas_contains_expiring(client):
    res = client.get("/demo/alertas")
    assert res.status_code == 200
    statuses = [a["status"] for a in res.json()["alertas"]]
    assert "expiring_soon" in statuses or "expired" in statuses


def test_hash_endpoint(client):
    content = b"%PDF-1.4 Test aviation document content"
    response = client.post(
        "/documents/hash",
        headers=API_HEADERS,
        files={"file": ("test.pdf", content, "application/pdf")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "sha256" in data
    assert data["sha256"].startswith("0x")
    assert len(data["sha256"]) == 66
    assert data["filename"] == "test.pdf"


def test_verify_document_demo_mode(client):
    fake_hash = "0x" + "a" * 64
    response = client.get(f"/documents/verify/{fake_hash}")
    assert response.status_code == 200
    data = response.json()
    assert data["is_authentic"] is False
    assert "demo" in data["message"].lower() or "inativa" in data["message"].lower()


def test_blockchain_demo(client):
    response = client.get("/demo/blockchain")
    assert response.status_code == 200
    data = response.json()
    assert data["falsificacao_detetada"] is True
    assert data["hashes_iguais"] is False


def test_qr_code_valid_hash(client):
    import hashlib

    valid_hash = "0x" + hashlib.sha256(b"test").hexdigest()
    response = client.get(f"/documents/qr/{valid_hash}")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert len(response.content) > 100


def test_qr_code_invalid_hash(client):
    response = client.get("/documents/qr/not-a-valid-hash")
    assert response.status_code == 400


def test_upload_document_demo_mode(client):
    import io

    future_date = (datetime.now(UTC) + timedelta(days=365)).isoformat()
    content = b"%PDF-1.4 ATPL License content for hashing"
    response = client.post(
        "/documents/upload",
        headers=API_HEADERS,
        params={
            "pilot_address": "0x00000000000000000000000000000000Ae1c0001",
            "doc_type": "ATPL",
            "description": "Test ATPL License",
            "expires_at": future_date,
        },
        files={"file": ("license.pdf", io.BytesIO(content), "application/pdf")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "hash" in data
    assert data["hash"].startswith("0x")
    assert data["blockchain_mode"] == "demo"
    assert data["status"] == "valid"


def test_upload_invalid_doc_type(client):
    import io

    future_date = (datetime.now(UTC) + timedelta(days=365)).isoformat()
    response = client.post(
        "/documents/upload",
        params={
            "pilot_address": "0x00000000000000000000000000000000Ae1c0001",
            "doc_type": "INVALID_TYPE",
            "description": "Test",
            "expires_at": future_date,
        },
        headers=API_HEADERS,
        files={"file": ("test.pdf", io.BytesIO(b"content"), "application/pdf")},
    )
    assert response.status_code == 400
