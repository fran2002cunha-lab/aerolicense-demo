"""Pydantic request/response models. Field order matches the JSON the endpoints return."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from config import CHAT_HISTORY_MAX_ITEM_CHARS, CHAT_HISTORY_MAX_ITEMS, CHAT_HISTORY_MAX_TOTAL_CHARS


# ── Documents ──────────────────────────────────────────────────────────────
class DocumentResponse(BaseModel):
    hash: str
    filename: str
    doc_type: str
    description: str
    expires_at: datetime
    days_until_expiry: int
    status: str
    tx_hash: str


class VerifyResponse(BaseModel):
    hash: str
    is_authentic: bool
    is_expired: bool
    expires_at: datetime | None
    message: str


# ── Demo ───────────────────────────────────────────────────────────────────
class PilotSummary(BaseModel):
    id: str
    nome: str
    cargo: str
    carteira_ethereum: str
    total_documentos: int
    validos: int
    a_expirar_em_breve: int
    expirados: int
    compliance_ok: bool


class PilotsResponse(BaseModel):
    pilotos: list[PilotSummary]
    total: int


class Alert(BaseModel):
    piloto: str
    cargo: str
    documento: str
    tipo: str
    dias_restantes: int
    status: str
    hash_blockchain: str
    acao_necessaria: str


class AlertsResponse(BaseModel):
    total_alertas: int
    alertas: list[Alert]
    nota: str


# ── Analytics ──────────────────────────────────────────────────────────────
class AnalyticsSummary(BaseModel):
    total_pilots: int
    total_documents: int
    valid: int
    expiring_soon: int
    expired: int
    compliance_rate: float
    compliant_pilots: int


class MonthCount(BaseModel):
    month: str
    count: int


class TypeCount(BaseModel):
    type: str
    count: int


class PilotRiskScore(BaseModel):
    pilot_id: str
    pilot_name: str
    pilot_role: str
    score: int
    level: str
    penalties: list[str]


class RiskScoresResponse(BaseModel):
    pilots: list[PilotRiskScore]


# ── Chat ───────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    # Only user/assistant: a client cannot inject "system" or "tool" messages
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=CHAT_HISTORY_MAX_ITEM_CHARS)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    history: list[ChatMessage] = Field(default_factory=list, max_length=CHAT_HISTORY_MAX_ITEMS)

    @field_validator("history")
    @classmethod
    def _cap_total_history(cls, history: list[ChatMessage]) -> list[ChatMessage]:
        total = sum(len(m.content) for m in history)
        if total > CHAT_HISTORY_MAX_TOTAL_CHARS:
            raise ValueError(f"history too long ({total} > {CHAT_HISTORY_MAX_TOTAL_CHARS} characters)")
        return history
