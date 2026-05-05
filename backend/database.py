import os

from sqlalchemy import Column, String, Integer, ForeignKey, create_engine
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker

class Base(DeclarativeBase):
    pass

class Pilot(Base):
    __tablename__ = "pilots"
    id               = Column(String, primary_key=True)
    name             = Column(String, nullable=False)
    role             = Column(String, nullable=False)
    ethereum_address = Column(String, nullable=False)
    documents        = relationship("Document", back_populates="pilot", lazy="select")

class Document(Base):
    __tablename__ = "documents"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    pilot_id      = Column(String, ForeignKey("pilots.id"), nullable=False)
    doc_type      = Column(String, nullable=False)
    description   = Column(String, nullable=False)
    hash          = Column(String, unique=True, nullable=False)
    tx_blockchain = Column(String, nullable=False)
    issued_at     = Column(String, nullable=False)
    expires_at    = Column(String, nullable=False)
    issuer        = Column(String, nullable=False)
    pilot         = relationship("Pilot", back_populates="documents")

# ── Engine / Session ───────────────────────────────────────────────────────
_engine = None
SessionLocal = None

def init_db(url: str | None = None):
    global _engine, SessionLocal
    if url is None:
        url = os.getenv("DATABASE_URL", "sqlite:///./aerolicense.db")
    kwargs = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {}
    _engine = create_engine(url, **kwargs)
    Base.metadata.create_all(_engine)
    SessionLocal = sessionmaker(bind=_engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ── Seed data ──────────────────────────────────────────────────────────────
DEMO_PILOTS_RAW = [
    {
        "id": "P001", "name": "Miguel Ferreira",
        "role": "First Officer — TAP Air Portugal",
        "ethereum_address": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        "documents": [
            {"doc_type": "ATPL",           "description": "Licença ATPL — ANAC Portugal",
             "hash": "0xf5fa1228922f7b4e3e13181d7054cf56785891b7025e0361906b8964ec62eb73",
             "tx_blockchain": "0xa3d2e891b4c7f305162a9c184d7e3b56f0c9e2a1b3d4e5f6a7b8c9d0e1f2a3b4",
             "issued_at": "2023-03-15", "expires_at": "2026-03-15",
             "issuer": "ANAC — Autoridade Nacional de Aviação Civil"},
            {"doc_type": "MEDICAL_CLASS1", "description": "Certificado Médico Classe 1",
             "hash": "0xca26ae93ee7df6764af6689223428eeb13101bf5a4b8b7cc4ab945460b235f99",
             "tx_blockchain": "0xb4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
             "issued_at": "2024-11-20", "expires_at": "2026-05-17",
             "issuer": "Clínica de Medicina Aeronáutica Lisboa"},
            {"doc_type": "ICAO_ENGLISH",   "description": "Proficiência Linguística ICAO — Nível 5",
             "hash": "0x9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8",
             "tx_blockchain": "0xc5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
             "issued_at": "2022-06-10", "expires_at": "2025-06-10",
             "issuer": "Centro de Testes ICAO — Lisboa"},
            {"doc_type": "TYPE_RATING",    "description": "Type Rating Airbus A320",
             "hash": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
             "tx_blockchain": "0xd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
             "issued_at": "2024-01-08", "expires_at": "2026-01-08",
             "issuer": "Airbus Training Centre — Toulouse"},
        ],
    },
    {
        "id": "P002", "name": "Ana Costa",
        "role": "Cabin Crew Senior — Ryanair",
        "ethereum_address": "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
        "documents": [
            {"doc_type": "ATPL",           "description": "Licença de Tripulante de Cabine — EASA",
             "hash": "0x3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4",
             "tx_blockchain": "0xe7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
             "issued_at": "2024-05-01", "expires_at": "2027-05-01",
             "issuer": "EASA — European Union Aviation Safety Agency"},
            {"doc_type": "MEDICAL_CLASS1", "description": "Certificado Médico Cabin Crew",
             "hash": "0x5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
             "tx_blockchain": "0xf8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
             "issued_at": "2024-12-01", "expires_at": "2026-06-02",
             "issuer": "Clínica de Medicina Aeronáutica Porto"},
        ],
    },
    {
        "id": "P003", "name": "João Matos",
        "role": "Captain — easyJet",
        "ethereum_address": "0x1Db3439a7D398351b8bE11C439e05C5B3259aeD4",
        "documents": [
            {"doc_type": "ATPL",        "description": "Licença ATPL — CAA United Kingdom",
             "hash": "0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
             "tx_blockchain": "0xa9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
             "issued_at": "2021-09-14", "expires_at": "2027-09-14",
             "issuer": "CAA — Civil Aviation Authority UK"},
            {"doc_type": "TYPE_RATING", "description": "Type Rating Boeing 737 MAX",
             "hash": "0x9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
             "tx_blockchain": "0xb0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
             "issued_at": "2024-03-22", "expires_at": "2026-03-22",
             "issuer": "Boeing Training — Seattle"},
            {"doc_type": "CRM_TRAINING","description": "Crew Resource Management — Recurrent",
             "hash": "0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
             "tx_blockchain": "0xc1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
             "issued_at": "2025-01-10", "expires_at": "2027-01-10",
             "issuer": "easyJet Training Academy"},
        ],
    },
]

def seed_demo_data(db):
    if db.query(Pilot).count() > 0:
        return
    for raw in DEMO_PILOTS_RAW:
        pilot = Pilot(
            id=raw["id"], name=raw["name"],
            role=raw["role"], ethereum_address=raw["ethereum_address"],
        )
        db.add(pilot)
        for d in raw["documents"]:
            db.add(Document(pilot_id=raw["id"], **d))
    db.commit()
