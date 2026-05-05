import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import Base, Pilot, Document, seed_demo_data

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
    assert len(pilots) == 3
    assert any(p.id == "P001" for p in pilots)

def test_seed_creates_documents(db):
    seed_demo_data(db)
    docs = db.query(Document).all()
    assert len(docs) == 9  # 4 + 2 + 3 from DEMO_PILOTS_RAW
