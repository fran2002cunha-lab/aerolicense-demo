"""
AeroLicense — Sistema de Notificações Multicanal

Canais suportados:
  - Push (Firebase Cloud Messaging)
  - Email (SendGrid)
  - SMS (Twilio)
  - WhatsApp Business API

Em modo demo: simula o envio e guarda log local.
"""

import hashlib
from datetime import datetime
from typing import Literal
from dataclasses import dataclass, field, asdict

NotificationChannel = Literal["push", "email", "sms", "whatsapp"]
NotificationLevel   = Literal["info", "warning", "urgent", "critical"]

@dataclass
class Notification:
    id:        str
    pilot_id:  str
    pilot_name:str
    channel:   NotificationChannel
    level:     NotificationLevel
    title:     str
    message:   str
    sent_at:   str
    delivered: bool = True
    doc_type:  str  = ""
    days_left: int  = 0

# Registo em memória (em produção: PostgreSQL)
_notification_log: list[Notification] = []

def _gen_id(pilot_id: str, channel: str, title: str) -> str:
    raw = f"{pilot_id}{channel}{title}{datetime.utcnow().isoformat()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:12]

# ── Templates de mensagem ─────────────────────────────────────────────────
def _build_message(pilot_name: str, doc_type: str, days_left: int) -> tuple[str, str, NotificationLevel]:
    if days_left <= 0:
        return (
            f"⛔ Documento Expirado — {doc_type}",
            f"{pilot_name}, o seu {doc_type} EXPIROU. Renove imediatamente para manter conformidade regulatória.",
            "critical",
        )
    if days_left <= 7:
        return (
            f"🚨 URGENTE — {doc_type} expira em {days_left} dias",
            f"{pilot_name}, o seu {doc_type} expira em {days_left} dias. Ação imediata necessária.",
            "urgent",
        )
    if days_left <= 30:
        return (
            f"⚠️ {doc_type} expira em {days_left} dias",
            f"{pilot_name}, lembre-se de renovar o seu {doc_type} nos próximos {days_left} dias.",
            "warning",
        )
    return (
        f"📋 Lembrete — {doc_type}",
        f"{pilot_name}, o seu {doc_type} expira em {days_left} dias. Planeie a renovação.",
        "info",
    )

# ── Funções de envio (simuladas) ──────────────────────────────────────────
def send_push(pilot_id: str, pilot_name: str, doc_type: str, days_left: int) -> Notification:
    """Envia push notification via Firebase Cloud Messaging."""
    title, message, level = _build_message(pilot_name, doc_type, days_left)
    # Em produção:
    # import firebase_admin
    # firebase_admin.messaging.send(Message(notification=Notification(title, message), token=fcm_token))
    n = Notification(
        id=_gen_id(pilot_id, "push", title), pilot_id=pilot_id, pilot_name=pilot_name,
        channel="push", level=level, title=title, message=message,
        sent_at=datetime.utcnow().isoformat(), doc_type=doc_type, days_left=days_left,
    )
    _notification_log.append(n)
    return n

def send_email(pilot_id: str, pilot_name: str, pilot_email: str, doc_type: str, days_left: int) -> Notification:
    """Envia email via SendGrid com template HTML."""
    title, message, level = _build_message(pilot_name, doc_type, days_left)
    # Em produção:
    # import sendgrid
    # sg = sendgrid.SendGridAPIClient(api_key=os.getenv("SENDGRID_KEY"))
    # sg.client.mail.send.post(request_body={...})
    n = Notification(
        id=_gen_id(pilot_id, "email", title), pilot_id=pilot_id, pilot_name=pilot_name,
        channel="email", level=level, title=title,
        message=f"Para: {pilot_email} | {message}",
        sent_at=datetime.utcnow().isoformat(), doc_type=doc_type, days_left=days_left,
    )
    _notification_log.append(n)
    return n

def send_sms(pilot_id: str, pilot_name: str, pilot_phone: str, doc_type: str, days_left: int) -> Notification:
    """Envia SMS via Twilio (apenas para urgências < 7 dias)."""
    title, message, level = _build_message(pilot_name, doc_type, days_left)
    # Em produção:
    # from twilio.rest import Client
    # Client(TWILIO_SID, TWILIO_TOKEN).messages.create(body=message, from_='+15..', to=pilot_phone)
    n = Notification(
        id=_gen_id(pilot_id, "sms", title), pilot_id=pilot_id, pilot_name=pilot_name,
        channel="sms", level=level, title=title,
        message=f"SMS para {pilot_phone}: {message}",
        sent_at=datetime.utcnow().isoformat(), doc_type=doc_type, days_left=days_left,
    )
    _notification_log.append(n)
    return n

# ── Cron job diário ───────────────────────────────────────────────────────
def run_daily_alert_check(pilots_data: list) -> list[Notification]:
    """
    Corre todos os dias às 08h00.
    Verifica todos os documentos e envia notificações adequadas.
    Em produção, seria agendado com APScheduler ou um cron do sistema.
    """
    sent = []
    for pilot in pilots_data:
        for doc in pilot.get("documentos", []):
            days = doc.get("dias_restantes", 999)
            name = pilot["nome"]
            pid  = pilot["id"]
            dtype = doc["tipo"]

            if days <= 0 or days in (7, 30, 90):
                sent.append(send_push(pid, name, dtype, days))
                sent.append(send_email(pid, name, f"{pid.lower()}@aerolicense.pt", dtype, days))
                if days <= 7:
                    sent.append(send_sms(pid, name, "+351900000000", dtype, days))
    return sent

def get_notification_log() -> list[dict]:
    return [asdict(n) for n in reversed(_notification_log)]
