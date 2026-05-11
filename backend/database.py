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
    # Railway provides postgres:// but SQLAlchemy requires postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
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
            {"doc_type": "OTHER",          "description": "Licença de Tripulante de Cabine — EASA CC",
             "hash": "0x3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f5",
             "tx_blockchain": "0xe7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
             "issued_at": "2024-05-01", "expires_at": "2027-05-01",
             "issuer": "EASA — European Union Aviation Safety Agency"},
            {"doc_type": "MEDICAL_CLASS1", "description": "Certificado Médico Cabin Crew",
             "hash": "0x5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
             "tx_blockchain": "0xf8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
             "issued_at": "2024-12-01", "expires_at": "2026-06-02",
             "issuer": "Clínica de Medicina Aeronáutica Porto"},
            {"doc_type": "CRM_TRAINING",   "description": "Crew Resource Management — Cabin Crew",
             "hash": "0x6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c",
             "tx_blockchain": "0xa9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b1",
             "issued_at": "2024-07-01", "expires_at": "2026-07-20",
             "issuer": "Ryanair Training Academy — Dublin"},
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
             "issued_at": "2024-08-10", "expires_at": "2026-08-10",
             "issuer": "easyJet Training Academy"},
        ],
    },
    # ── Novos pilotos ────────────────────────────────────────────────────────
    {
        "id": "P004", "name": "Sofia Andrade",
        "role": "Captain — Wizz Air",
        "ethereum_address": "0x2Fc4550b8E409462c9bF22D5A4061B4260aeE5F7",
        "documents": [
            {"doc_type": "ATPL",           "description": "Licença ATPL — ANAC Portugal",
             "hash": "0xaa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b",
             "tx_blockchain": "0xd2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
             "issued_at": "2022-07-20", "expires_at": "2025-07-20",
             "issuer": "ANAC — Autoridade Nacional de Aviação Civil"},
            {"doc_type": "MEDICAL_CLASS1", "description": "Certificado Médico Classe 1",
             "hash": "0xbb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
             "tx_blockchain": "0xe3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4",
             "issued_at": "2025-02-14", "expires_at": "2026-02-14",
             "issuer": "Clínica de Medicina Aeronáutica Lisboa"},
            {"doc_type": "ICAO_ENGLISH",   "description": "Proficiência Linguística ICAO — Nível 6",
             "hash": "0xcc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
             "tx_blockchain": "0xf4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5",
             "issued_at": "2023-09-05", "expires_at": "2029-09-05",
             "issuer": "Centro de Testes ICAO — Lisboa"},
            {"doc_type": "TYPE_RATING",    "description": "Type Rating Airbus A321neo",
             "hash": "0xdd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
             "tx_blockchain": "0xa5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6",
             "issued_at": "2023-11-12", "expires_at": "2025-11-12",
             "issuer": "Airbus Training Centre — Toulouse"},
            {"doc_type": "CRM_TRAINING",   "description": "Crew Resource Management — Initial",
             "hash": "0xee5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
             "tx_blockchain": "0xb6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7",
             "issued_at": "2024-04-01", "expires_at": "2027-04-01",
             "issuer": "Wizz Air Training Academy — Budapest"},
        ],
    },
    {
        "id": "P005", "name": "Carlos Rodrigues",
        "role": "First Officer — Azores Airlines",
        "ethereum_address": "0x3Ab5661c9F510573d0cA33E6B5172C6371bfF6A8",
        "documents": [
            {"doc_type": "ATPL",           "description": "Licença ATPL — ANAC Portugal",
             "hash": "0xff6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
             "tx_blockchain": "0xc7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8",
             "issued_at": "2024-08-10", "expires_at": "2030-08-10",
             "issuer": "ANAC — Autoridade Nacional de Aviação Civil"},
            {"doc_type": "MEDICAL_CLASS1", "description": "Certificado Médico Classe 1",
             "hash": "0x117b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b",
             "tx_blockchain": "0xd8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9",
             "issued_at": "2024-09-22", "expires_at": "2026-09-22",
             "issuer": "Hospital das Forças Armadas — Lisboa"},
            {"doc_type": "TYPE_RATING",    "description": "Type Rating ATR 72-600",
             "hash": "0x228c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c",
             "tx_blockchain": "0xe9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
             "issued_at": "2024-06-15", "expires_at": "2026-06-15",
             "issuer": "ATR Training Centre — Toulouse"},
            {"doc_type": "ICAO_ENGLISH",   "description": "Proficiência Linguística ICAO — Nível 4",
             "hash": "0x339d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d",
             "tx_blockchain": "0xf0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
             "issued_at": "2021-03-18", "expires_at": "2025-03-18",
             "issuer": "Centro de Testes ICAO — Lisboa"},
        ],
    },
    {
        "id": "P006", "name": "Inês Tavares",
        "role": "Cabin Crew — TAP Air Portugal",
        "ethereum_address": "0x4Be6772d0C621684e1dB44F7C6283D7482ceC7B9",
        "documents": [
            {"doc_type": "OTHER",          "description": "Licença de Tripulante de Cabine — ANAC",
             "hash": "0x44ae1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0f",
             "tx_blockchain": "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
             "issued_at": "2025-01-15", "expires_at": "2028-01-15",
             "issuer": "ANAC — Autoridade Nacional de Aviação Civil"},
            {"doc_type": "MEDICAL_CLASS1", "description": "Certificado Médico Cabin Crew",
             "hash": "0x55bf2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f",
             "tx_blockchain": "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
             "issued_at": "2025-03-01", "expires_at": "2026-09-01",
             "issuer": "Clínica de Medicina Aeronáutica Lisboa"},
            {"doc_type": "CRM_TRAINING",   "description": "Crew Resource Management — Initial",
             "hash": "0x66c03b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a",
             "tx_blockchain": "0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
             "issued_at": "2025-02-10", "expires_at": "2027-02-10",
             "issuer": "TAP Air Portugal Training Center"},
        ],
    },
    {
        "id": "P007", "name": "Ricardo Santos",
        "role": "Captain — Lufthansa",
        "ethereum_address": "0x5Cf7883e1B732795f2eC55D8D7394E8593dbB8C0",
        "documents": [
            {"doc_type": "ATPL",           "description": "Licença ATPL — Luftfahrt-Bundesamt",
             "hash": "0x77d14c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b",
             "tx_blockchain": "0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
             "issued_at": "2019-05-30", "expires_at": "2029-05-30",
             "issuer": "LBA — Luftfahrt-Bundesamt Alemanha"},
            {"doc_type": "MEDICAL_CLASS1", "description": "Certificado Médico Classe 1",
             "hash": "0x88e25d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c",
             "tx_blockchain": "0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
             "issued_at": "2024-10-05", "expires_at": "2025-10-05",
             "issuer": "Flugmedizinisches Zentrum — Frankfurt"},
            {"doc_type": "TYPE_RATING",    "description": "Type Rating Airbus A350-900",
             "hash": "0x99f36e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d",
             "tx_blockchain": "0xf6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7",
             "issued_at": "2023-07-18", "expires_at": "2025-07-18",
             "issuer": "Airbus Training Centre — Toulouse"},
            {"doc_type": "ICAO_ENGLISH",   "description": "Proficiência Linguística ICAO — Nível 6",
             "hash": "0xaa047f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e",
             "tx_blockchain": "0xa7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
             "issued_at": "2020-11-22", "expires_at": "2026-11-22",
             "issuer": "Centro de Testes ICAO — Frankfurt"},
            {"doc_type": "CRM_TRAINING",   "description": "Crew Resource Management — Recurrent",
             "hash": "0xbb158a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f",
             "tx_blockchain": "0xb8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9",
             "issued_at": "2024-12-10", "expires_at": "2026-12-10",
             "issuer": "Lufthansa Aviation Training — München"},
        ],
    },
    {
        "id": "P008", "name": "Mariana Pinto",
        "role": "First Officer — Vueling",
        "ethereum_address": "0x6Df8994f2C843806f3fD66E9E8405F9604efD9E1",
        "documents": [
            {"doc_type": "ATPL",           "description": "Licença ATPL — AESA Espanha",
             "hash": "0xcc269b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
             "tx_blockchain": "0xc9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
             "issued_at": "2023-04-25", "expires_at": "2029-04-25",
             "issuer": "AESA — Agencia Estatal de Seguridad Aérea"},
            {"doc_type": "MEDICAL_CLASS1", "description": "Certificado Médico Classe 1",
             "hash": "0xdd37ac1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
             "tx_blockchain": "0xd0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
             "issued_at": "2024-07-08", "expires_at": "2026-01-08",
             "issuer": "Centro de Reconhecimiento Médico — Barcelona"},
            {"doc_type": "TYPE_RATING",    "description": "Type Rating Airbus A320ceo",
             "hash": "0xee48bd2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
             "tx_blockchain": "0xe1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
             "issued_at": "2023-12-20", "expires_at": "2025-12-20",
             "issuer": "Airbus Training Centre — Madrid"},
            {"doc_type": "CRM_TRAINING",   "description": "Crew Resource Management — Recurrent",
             "hash": "0xff59ce3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d",
             "tx_blockchain": "0xf2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3",
             "issued_at": "2024-11-05", "expires_at": "2027-03-05",
             "issuer": "Vueling Training Academy — Barcelona"},
        ],
    },
]

def seed_demo_data(db):
    # Versão do seed — incrementar para forçar reset dos dados demo
    SEED_VERSION = "3"
    from sqlalchemy import text

    # Ensure meta table exists (safe across SQLite + PostgreSQL)
    db.execute(text("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)"))
    db.commit()

    try:
        row = db.execute(text("SELECT value FROM meta WHERE key='seed_version'")).fetchone()
        current = row[0] if row else None
    except Exception:
        db.rollback()
        current = None

    if current == SEED_VERSION:
        return  # dados já actualizados

    # Reset completo e reseed
    db.query(Document).delete()
    db.query(Pilot).delete()
    db.execute(text("DELETE FROM meta"))
    db.commit()

    for raw in DEMO_PILOTS_RAW:
        db.add(Pilot(
            id=raw["id"], name=raw["name"],
            role=raw["role"], ethereum_address=raw["ethereum_address"],
        ))
        for d in raw["documents"]:
            db.add(Document(pilot_id=raw["id"], **d))

    # Guardar versão do seed (sintaxe compatível com SQLite e PostgreSQL)
    db.execute(text(
        "INSERT INTO meta (key, value) VALUES ('seed_version', :v) "
        "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"
    ), {"v": SEED_VERSION})
    db.commit()
