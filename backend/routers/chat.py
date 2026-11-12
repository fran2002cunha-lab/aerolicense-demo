"""POST /chat: the AI assistant, with the DB tools bound to the request's session."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import chat as chat_module
from chat_tools import build_db_tools
from database import get_db
from deps import chat_rate_limit
from schemas import ChatRequest

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Chat IA"])


@router.post("/chat", dependencies=[Depends(chat_rate_limit)])
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Chat assistant with OpenAI-compatible function calling. Answers in Portuguese
    questions about pilots' document compliance. Without OPENAI_API_KEY it runs
    in demo mode with canned answers. trace_id matches the server's JSON logs.
    """
    history = [m.model_dump() for m in req.history]
    trace_id = uuid.uuid4().hex
    try:
        response_text = chat_module.run_chat(req.message, build_db_tools(db), history, trace_id=trace_id)
    except Exception:
        logger.exception("Chat failed (trace_id=%s)", trace_id)
        raise HTTPException(502, "O assistente está indisponível de momento.") from None
    return {"response": response_text, "model": chat_module.llm_model(), "trace_id": trace_id}
