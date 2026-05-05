import pytest
import sys
import os
# Add backend/ to sys.path so main.py's `from database import ...` resolves correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database import Base, get_db, seed_demo_data, Pilot, Document
from main import app

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

def test_demo_pilotos_returns_three(client):
    res = client.get("/demo/pilotos")
    assert res.status_code == 200
    assert res.json()["total"] == 3

def test_demo_piloto_detalhe(client):
    res = client.get("/demo/pilotos/P001")
    assert res.status_code == 200
    data = res.json()
    assert data["nome"] == "Miguel Ferreira"
    assert len(data["documentos"]) == 4

def test_demo_piloto_not_found(client):
    res = client.get("/demo/pilotos/P999")
    assert res.status_code == 404

def test_demo_alertas_contains_expiring(client):
    res = client.get("/demo/alertas")
    assert res.status_code == 200
    statuses = [a["status"] for a in res.json()["alertas"]]
    assert "expiring_soon" in statuses or "expired" in statuses
