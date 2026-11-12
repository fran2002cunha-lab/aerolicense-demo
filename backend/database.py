import logging
import os
from datetime import date, timedelta

from sqlalchemy import Column, ForeignKey, Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


class Pilot(Base):
    __tablename__ = "pilots"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    ethereum_address = Column(String, nullable=False)
    documents = relationship("Document", back_populates="pilot", lazy="select")


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, autoincrement=True)
    pilot_id = Column(String, ForeignKey("pilots.id"), nullable=False)
    doc_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    hash = Column(String, unique=True, nullable=False)
    tx_blockchain = Column(String, nullable=False)
    issued_at = Column(String, nullable=False)
    expires_at = Column(String, nullable=False)
    issuer = Column(String, nullable=False)
    pilot = relationship("Pilot", back_populates="documents")


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
# Fictional people and airlines. The issuers (ANAC, EASA, ...) are regulatory
# context only: the project has no connection to these organisations.
#
# Dates are offsets in days from the day the seed runs (d(+180) = 180 days from
# today), so the demo never decays into "everything expired". At any date the
# 31 documents show: 23 valid (~74%), 4 expiring within 30 days, 4 expired
# (3 pilots non-compliant), plus two deliberately suspicious documents for the
# anomaly demo:
#   * P007 ATPL (LBA): 10-year validity, twice the simplified 5-year maximum;
#   * P008 medical (Barcelona): 3-year validity for a 12-month class 1 medical,
#     from an issuer whose name is misspelled and is not in KNOWN_ISSUERS.
# ICAO Level 6 has no expiry in reality; it stores a nominal far date.


class Offset(int):
    """A date expressed as days from the seed date; resolved by resolve_dates()."""


def d(days: int) -> Offset:
    return Offset(days)


DEMO_PILOTS_RAW = [
    {
        "id": "P001",
        "name": "Miguel Ferreira",
        "role": "First Officer — Atlântica Air",
        "ethereum_address": "0x00000000000000000000000000000000Ae1c0001",
        "documents": [
            {
                "doc_type": "ATPL",
                "description": "Licença ATPL — ANAC Portugal",
                "hash": "0xf5fa1228922f7b4e3e13181d7054cf56785891b7025e0361906b8964ec62eb73",
                "tx_blockchain": "0xa3d2e891b4c7f305162a9c184d7e3b56f0c9e2a1b3d4e5f6a7b8c9d0e1f2a3b4",
                "issued_at": d(-800),
                "expires_at": d(+1026),
                "issuer": "ANAC — Autoridade Nacional de Aviação Civil",
            },
            {
                "doc_type": "MEDICAL_CLASS1",
                "description": "Certificado Médico Classe 1",
                "hash": "0xca26ae93ee7df6764af6689223428eeb13101bf5a4b8b7cc4ab945460b235f99",
                "tx_blockchain": "0xb4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
                "issued_at": d(-165),
                "expires_at": d(+200),
                "issuer": "Clínica de Medicina Aeronáutica Lisboa",
            },
            {
                "doc_type": "ICAO_ENGLISH",
                "description": "Proficiência Linguística ICAO — Nível 5",
                "hash": "0x9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8",
                "tx_blockchain": "0xc5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
                "issued_at": d(-2203),
                "expires_at": d(-12),
                "issuer": "Centro de Testes ICAO — Lisboa",
            },
            {
                "doc_type": "TYPE_RATING",
                "description": "Type Rating Airbus A320",
                "hash": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
                "tx_blockchain": "0xd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
                "issued_at": d(-347),
                "expires_at": d(+18),
                "issuer": "Airbus Training Centre — Toulouse",
            },
        ],
    },
    {
        "id": "P002",
        "name": "Ana Costa",
        "role": "Cabin Crew Senior — Lusoavia",
        "ethereum_address": "0x00000000000000000000000000000000Ae1c0002",
        "documents": [
            {
                "doc_type": "OTHER",
                "description": "Licença de Tripulante de Cabine — EASA CC",
                "hash": "0x3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f5",
                "tx_blockchain": "0xe7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
                "issued_at": d(-395),
                "expires_at": d(+700),
                "issuer": "EASA — European Union Aviation Safety Agency",
            },
            {
                "doc_type": "MEDICAL_CLASS1",
                "description": "Certificado Médico Cabin Crew",
                "hash": "0x5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
                "tx_blockchain": "0xf8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
                "issued_at": d(-356),
                "expires_at": d(+9),
                "issuer": "Clínica de Medicina Aeronáutica Porto",
            },
            {
                "doc_type": "CRM_TRAINING",
                "description": "Crew Resource Management — Cabin Crew",
                "hash": "0x6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c",
                "tx_blockchain": "0xa9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b1",
                "issued_at": d(-330),
                "expires_at": d(+400),
                "issuer": "Lusoavia Training Academy — Porto",
            },
        ],
    },
    {
        "id": "P003",
        "name": "João Matos",
        "role": "Captain — Tejo Airways",
        "ethereum_address": "0x1Db3439a7D398351b8bE11C439e05C5B3259aeD4",
        "documents": [
            {
                "doc_type": "ATPL",
                "description": "Licença ATPL — CAA United Kingdom",
                "hash": "0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
                "tx_blockchain": "0xa9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
                "issued_at": d(-526),
                "expires_at": d(+1300),
                "issuer": "CAA — Civil Aviation Authority UK",
            },
            {
                "doc_type": "TYPE_RATING",
                "description": "Type Rating Boeing 737 MAX",
                "hash": "0x9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
                "tx_blockchain": "0xb0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
                "issued_at": d(-340),
                "expires_at": d(+25),
                "issuer": "Boeing Training — Seattle",
            },
            {
                "doc_type": "CRM_TRAINING",
                "description": "Crew Resource Management — Recurrent",
                "hash": "0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
                "tx_blockchain": "0xc1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
                "issued_at": d(-480),
                "expires_at": d(+250),
                "issuer": "Tejo Airways Training Academy",
            },
        ],
    },
    {
        "id": "P004",
        "name": "Sofia Andrade",
        "role": "Captain — Serra Aviation",
        "ethereum_address": "0x2Fc4550b8E409462c9bF22D5A4061B4260aeE5F7",
        "documents": [
            {
                "doc_type": "ATPL",
                "description": "Licença ATPL — ANAC Portugal",
                "hash": "0xaa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b",
                "tx_blockchain": "0xd2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
                "issued_at": d(-876),
                "expires_at": d(+950),
                "issuer": "ANAC — Autoridade Nacional de Aviação Civil",
            },
            {
                "doc_type": "MEDICAL_CLASS1",
                "description": "Certificado Médico Classe 1",
                "hash": "0xbb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
                "tx_blockchain": "0xe3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4",
                "issued_at": d(-245),
                "expires_at": d(+120),
                "issuer": "Clínica de Medicina Aeronáutica Lisboa",
            },
            {
                "doc_type": "ICAO_ENGLISH",
                "description": "Proficiência Linguística ICAO — Nível 6",
                "hash": "0xcc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
                "tx_blockchain": "0xf4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5",
                "issued_at": d(-1164),
                "expires_at": d(+1028),
                "issuer": "Centro de Testes ICAO — Lisboa",
            },
            {
                "doc_type": "TYPE_RATING",
                "description": "Type Rating Airbus A321neo",
                "hash": "0xdd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
                "tx_blockchain": "0xa5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6",
                "issued_at": d(-75),
                "expires_at": d(+290),
                "issuer": "Airbus Training Centre — Toulouse",
            },
            {
                "doc_type": "CRM_TRAINING",
                "description": "Crew Resource Management — Initial",
                "hash": "0xee5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
                "tx_blockchain": "0xb6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7",
                "issued_at": d(-590),
                "expires_at": d(+505),
                "issuer": "Serra Aviation Training Academy — Covilhã",
            },
        ],
    },
    {
        "id": "P005",
        "name": "Carlos Rodrigues",
        "role": "First Officer — Ilhéu Airlines",
        "ethereum_address": "0x3Ab5661c9F510573d0cA33E6B5172C6371bfF6A8",
        "documents": [
            {
                "doc_type": "ATPL",
                "description": "Licença ATPL — ANAC Portugal",
                "hash": "0xff6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
                "tx_blockchain": "0xc7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8",
                "issued_at": d(-461),
                "expires_at": d(+1365),
                "issuer": "ANAC — Autoridade Nacional de Aviação Civil",
            },
            {
                "doc_type": "MEDICAL_CLASS1",
                "description": "Certificado Médico Classe 1",
                "hash": "0x117b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b",
                "tx_blockchain": "0xd8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9",
                "issued_at": d(-320),
                "expires_at": d(+45),
                "issuer": "Hospital das Forças Armadas — Lisboa",
            },
            {
                "doc_type": "TYPE_RATING",
                "description": "Type Rating ATR 72-600",
                "hash": "0x228c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c",
                "tx_blockchain": "0xe9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
                "issued_at": d(-405),
                "expires_at": d(-40),
                "issuer": "ATR Training Centre — Toulouse",
            },
            {
                "doc_type": "ICAO_ENGLISH",
                "description": "Proficiência Linguística ICAO — Nível 4",
                "hash": "0x339d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d",
                "tx_blockchain": "0xf0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
                "issued_at": d(-1701),
                "expires_at": d(-240),
                "issuer": "Centro de Testes ICAO — Lisboa",
            },
        ],
    },
    {
        "id": "P006",
        "name": "Inês Tavares",
        "role": "Cabin Crew — Atlântica Air",
        "ethereum_address": "0x4Be6772d0C621684e1dB44F7C6283D7482ceC7B9",
        "documents": [
            {
                "doc_type": "OTHER",
                "description": "Licença de Tripulante de Cabine — ANAC",
                "hash": "0x44ae1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0f",
                "tx_blockchain": "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
                "issued_at": d(-300),
                "expires_at": d(+795),
                "issuer": "ANAC — Autoridade Nacional de Aviação Civil",
            },
            {
                "doc_type": "MEDICAL_CLASS1",
                "description": "Certificado Médico Cabin Crew",
                "hash": "0x55bf2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f",
                "tx_blockchain": "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
                "issued_at": d(-75),
                "expires_at": d(+290),
                "issuer": "Clínica de Medicina Aeronáutica Lisboa",
            },
            {
                "doc_type": "CRM_TRAINING",
                "description": "Crew Resource Management — Initial",
                "hash": "0x66c03b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a",
                "tx_blockchain": "0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
                "issued_at": d(-275),
                "expires_at": d(+455),
                "issuer": "Atlântica Air Training Center",
            },
        ],
    },
    {
        "id": "P007",
        "name": "Ricardo Santos",
        "role": "Captain — Brisa Aero",
        "ethereum_address": "0x5Cf7883e1B732795f2eC55D8D7394E8593dbB8C0",
        "documents": [
            {
                "doc_type": "ATPL",
                "description": "Licença ATPL — Luftfahrt-Bundesamt",
                "hash": "0x77d14c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b",
                "tx_blockchain": "0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
                "issued_at": d(-2357),
                "expires_at": d(+1295),
                "issuer": "LBA — Luftfahrt-Bundesamt Alemanha",
            },
            {
                "doc_type": "MEDICAL_CLASS1",
                "description": "Certificado Médico Classe 1",
                "hash": "0x88e25d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c",
                "tx_blockchain": "0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
                "issued_at": d(-370),
                "expires_at": d(-5),
                "issuer": "Flugmedizinisches Zentrum — Frankfurt",
            },
            {
                "doc_type": "TYPE_RATING",
                "description": "Type Rating Airbus A350-900",
                "hash": "0x99f36e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d",
                "tx_blockchain": "0xf6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7",
                "issued_at": d(-215),
                "expires_at": d(+150),
                "issuer": "Airbus Training Centre — Toulouse",
            },
            {
                "doc_type": "ICAO_ENGLISH",
                "description": "Proficiência Linguística ICAO — Nível 6",
                "hash": "0xaa047f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e",
                "tx_blockchain": "0xa7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
                "issued_at": d(-2181),
                "expires_at": d(+1450),
                "issuer": "Centro de Testes ICAO — Frankfurt",
            },
            {
                "doc_type": "CRM_TRAINING",
                "description": "Crew Resource Management — Recurrent",
                "hash": "0xbb158a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f",
                "tx_blockchain": "0xb8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9",
                "issued_at": d(-337),
                "expires_at": d(+393),
                "issuer": "Brisa Aero Training — München",
            },
        ],
    },
    {
        "id": "P008",
        "name": "Mariana Pinto",
        "role": "First Officer — Douro Air",
        "ethereum_address": "0x6Df8994f2C843806f3fD66E9E8405F9604efD9E1",
        "documents": [
            {
                "doc_type": "ATPL",
                "description": "Licença ATPL — AESA Espanha",
                "hash": "0xcc269b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
                "tx_blockchain": "0xc9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
                "issued_at": d(-566),
                "expires_at": d(+1260),
                "issuer": "AESA — Agencia Estatal de Seguridad Aérea",
            },
            {
                "doc_type": "MEDICAL_CLASS1",
                "description": "Certificado Médico Classe 1",
                "hash": "0xdd37ac1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
                "tx_blockchain": "0xd0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
                "issued_at": d(-495),
                "expires_at": d(+600),
                "issuer": "Centro de Reconhecimiento Médico — Barcelona",
            },
            {
                "doc_type": "TYPE_RATING",
                "description": "Type Rating Airbus A320ceo",
                "hash": "0xee48bd2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
                "tx_blockchain": "0xe1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
                "issued_at": d(-337),
                "expires_at": d(+28),
                "issuer": "Airbus Training Centre — Madrid",
            },
            {
                "doc_type": "CRM_TRAINING",
                "description": "Crew Resource Management — Recurrent",
                "hash": "0xff59ce3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d",
                "tx_blockchain": "0xf2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3",
                "issued_at": d(-372),
                "expires_at": d(+478),
                "issuer": "Douro Air Training Academy — Barcelona",
            },
        ],
    },
]

# Bump to force a reset of the demo data.
SEED_VERSION = "5"


def resolve_dates(raw: dict, today: date) -> dict:
    """Copy of a document dict with Offset values turned into ISO dates."""
    return {
        k: (today + timedelta(days=int(v))).isoformat() if isinstance(v, Offset) else v
        for k, v in raw.items()
    }


_TRUTHY = {"1", "true", "yes", "on"}
_FALSY = {"0", "false", "no", "off", ""}


def demo_seed_enabled(url: str) -> bool:
    """
    Whether demo seeding may run against the database at `url`.

    AEROLICENSE_DEMO_SEED=1/0 decides explicitly. When it is unset, seeding is
    on only for SQLite; any other database (e.g. a real Postgres) defaults to
    off, so a production database is never touched by accident.
    """
    raw = os.getenv("AEROLICENSE_DEMO_SEED")
    if raw is not None:
        value = raw.strip().lower()
        if value in _TRUTHY:
            return True
        if value in _FALSY:
            return False
        logger.warning("AEROLICENSE_DEMO_SEED=%r not understood; treating as off", raw)
        return False
    return str(url).startswith("sqlite")


def _read_stamp(db):
    from sqlalchemy import text

    row = db.execute(text("SELECT value FROM meta WHERE key='seed_version'")).fetchone()
    return row[0] if row else None


def seed_demo_data(db, today: date | None = None, url: str | None = None) -> bool:
    """
    Seed the demo data. Called once at startup (main.lifespan); it reseeds when
    the seed version or the seed date in the stamp changed. Date drift on
    long-running instances is handled by this date-relative seeding at boot,
    not by a background job.

    Safety:
      * runs only if demo_seed_enabled(url) (AEROLICENSE_DEMO_SEED; defaults
        to on for SQLite only). `url` defaults to the session's engine URL;
      * refuses to wipe (logs a warning, changes nothing) if any pilot id is
        not a demo pilot, or if the tables have rows but no seed stamp;
      * the check and the reseed run in one transaction that first takes a
        write lock on the meta row (upsert), then re-reads the stamp, so two
        workers booting together seed at most once.

    Returns True if it (re)seeded.
    """
    from sqlalchemy import text

    if url is None:
        url = str(db.get_bind().url)
    if not demo_seed_enabled(url):
        logger.info("Demo seed disabled for this database (set AEROLICENSE_DEMO_SEED=1 to enable)")
        return False

    today = today or date.today()
    stamp = f"{SEED_VERSION}:{today.isoformat()}"

    # Ensure meta table exists (safe across SQLite + PostgreSQL)
    db.execute(text("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)"))
    db.commit()

    # Fast path without taking a write lock.
    if _read_stamp(db) == stamp:
        db.rollback()
        return False

    try:
        # Take the lock: an upsert on the same key blocks a concurrent worker
        # (row lock on Postgres, database write lock on SQLite) until commit.
        db.execute(
            text(
                "INSERT INTO meta (key, value) VALUES ('seed_lock', :v) "
                "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"
            ),
            {"v": stamp},
        )
        current = _read_stamp(db)
        if current == stamp:
            db.rollback()
            return False  # another worker seeded while we waited

        demo_ids = {raw["id"] for raw in DEMO_PILOTS_RAW}
        existing_ids = {row[0] for row in db.query(Pilot.id).all()}
        foreign = existing_ids - demo_ids
        if foreign:
            logger.warning(
                "Demo seed refused: %d pilot(s) are not demo pilots (%s); nothing changed",
                len(foreign),
                ", ".join(sorted(foreign)[:5]),
            )
            db.rollback()
            return False
        has_rows = bool(existing_ids) or db.query(Document.id).first() is not None
        if has_rows and current is None:
            logger.warning("Demo seed refused: tables have rows but no seed stamp; nothing changed")
            db.rollback()
            return False

        db.query(Document).delete()
        db.query(Pilot).delete()
        for raw in DEMO_PILOTS_RAW:
            db.add(
                Pilot(
                    id=raw["id"],
                    name=raw["name"],
                    role=raw["role"],
                    ethereum_address=raw["ethereum_address"],
                )
            )
            for doc in raw["documents"]:
                db.add(Document(pilot_id=raw["id"], **resolve_dates(doc, today)))

        # Store the seed stamp (syntax valid on SQLite and PostgreSQL)
        db.execute(
            text(
                "INSERT INTO meta (key, value) VALUES ('seed_version', :v) "
                "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"
            ),
            {"v": stamp},
        )
        db.commit()
        return True
    except Exception:
        db.rollback()
        raise
