import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import DEMO_PILOTS_RAW, Base, Document, Pilot, seed_demo_data


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_pilot_model(db):
    p = Pilot(id="P001", name="Test Pilot", role="Captain", ethereum_address="0xABC")
    db.add(p)
    db.commit()
    found = db.query(Pilot).filter_by(id="P001").first()
    assert found.name == "Test Pilot"


def test_seed_creates_pilots(db):
    seed_demo_data(db)
    pilots = db.query(Pilot).all()
    assert len(pilots) == len(DEMO_PILOTS_RAW)
    assert any(p.id == "P001" for p in pilots)


def test_seed_creates_documents(db):
    seed_demo_data(db)
    docs = db.query(Document).all()
    assert len(docs) == sum(len(p["documents"]) for p in DEMO_PILOTS_RAW)


# ── Demo-seed safety gate ──────────────────────────────────────────────────
PG_URL = "postgresql://user:pw@db.example.com/prod"


def test_demo_seed_enabled_defaults(monkeypatch):
    from backend.database import demo_seed_enabled

    monkeypatch.delenv("AEROLICENSE_DEMO_SEED", raising=False)
    assert demo_seed_enabled("sqlite:///./aerolicense.db")
    assert not demo_seed_enabled(PG_URL)
    monkeypatch.setenv("AEROLICENSE_DEMO_SEED", "1")
    assert demo_seed_enabled(PG_URL)
    monkeypatch.setenv("AEROLICENSE_DEMO_SEED", "0")
    assert not demo_seed_enabled("sqlite:///x.db")


def test_sqlite_default_seeds(db, monkeypatch):
    monkeypatch.delenv("AEROLICENSE_DEMO_SEED", raising=False)
    assert seed_demo_data(db) is True
    assert db.query(Pilot).count() == len(DEMO_PILOTS_RAW)
    # Same stamp: second call is a no-op.
    assert seed_demo_data(db) is False


def test_postgres_url_without_env_does_not_seed(db, monkeypatch):
    monkeypatch.delenv("AEROLICENSE_DEMO_SEED", raising=False)
    assert seed_demo_data(db, url=PG_URL) is False
    assert db.query(Pilot).count() == 0


def test_postgres_url_with_env_seeds(db, monkeypatch):
    monkeypatch.setenv("AEROLICENSE_DEMO_SEED", "1")
    assert seed_demo_data(db, url=PG_URL) is True
    assert db.query(Pilot).count() == len(DEMO_PILOTS_RAW)


def test_foreign_rows_are_not_wiped(db, monkeypatch):
    from datetime import date

    monkeypatch.setenv("AEROLICENSE_DEMO_SEED", "1")
    seed_demo_data(db, today=date(2026, 1, 1))
    db.add(Pilot(id="REAL-1", name="Real Person", role="Captain", ethereum_address="0x1"))
    db.commit()
    # A new date would normally trigger a reseed; the foreign pilot blocks it.
    assert seed_demo_data(db, today=date(2026, 1, 2)) is False
    assert db.query(Pilot).filter_by(id="REAL-1").count() == 1
    assert db.query(Pilot).count() == len(DEMO_PILOTS_RAW) + 1


def test_rows_without_stamp_are_not_wiped(db, monkeypatch):
    monkeypatch.setenv("AEROLICENSE_DEMO_SEED", "1")
    # Demo pilot id, but the tables were filled by something other than the seed.
    db.add(Pilot(id="P001", name="Someone Else", role="Captain", ethereum_address="0x2"))
    db.commit()
    assert seed_demo_data(db) is False
    assert db.query(Pilot).count() == 1
    assert db.query(Pilot).filter_by(id="P001").one().name == "Someone Else"
