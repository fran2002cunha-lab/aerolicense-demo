# backend/chat.py
"""
AeroLicense — Chatbot NLP com OpenAI Function Calling
Responde em português a perguntas sobre conformidade de pilotos aeronáuticos.
"""

import json
import logging
import os

from pydantic import BaseModel, ConfigDict, Field, ValidationError

logger = logging.getLogger(__name__)


# ── Validação dos argumentos das tools ─────────────────────────────────────
# Os argumentos vêm do LLM (input não confiável). Cada tool tem um modelo
# Pydantic; extra="forbid" rejeita argumentos desconhecidos.
class _NoArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")


class _ExpiringArgs(_NoArgs):
    days: int = Field(30, ge=0, le=3650)


class _PilotDetailArgs(_NoArgs):
    pilot_id: str = Field(pattern=r"^P\d{3}$")


TOOL_ARG_MODELS: dict[str, type[BaseModel]] = {
    "get_pilots_summary":     _NoArgs,
    "get_expiring_documents": _ExpiringArgs,
    "get_pilot_detail":       _PilotDetailArgs,
    "get_risk_scores":        _NoArgs,
    "get_anomalies":          _NoArgs,
}


def _execute_tool(name: str, raw_args: str | None, tools: dict):
    """
    Valida e executa uma tool pedida pelo modelo.
    Nunca lança exceção: em caso de erro devolve {"error": ...}, que é enviado
    ao modelo como resultado da tool para que se possa corrigir.
    """
    fn = tools.get(name)
    model = TOOL_ARG_MODELS.get(name)
    if fn is None or model is None:
        return {"error": f"Tool '{name}' não existe"}

    try:
        args = json.loads(raw_args or "{}")
    except json.JSONDecodeError as e:
        return {"error": f"JSON inválido nos argumentos: {e.msg}"}
    if not isinstance(args, dict):
        return {"error": "Os argumentos têm de ser um objeto JSON"}

    try:
        validated = model.model_validate(args)
    except ValidationError as e:
        return {
            "error": "Argumentos inválidos",
            "details": [
                {"campo": ".".join(str(p) for p in err["loc"]), "erro": err["msg"]}
                for err in e.errors()
            ],
        }

    try:
        return fn(**validated.model_dump())
    except Exception:
        logger.exception("Erro ao executar a tool %s", name)
        return {"error": f"Erro interno ao executar '{name}'"}


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_pilots_summary",
            "description": "Lista todos os pilotos com contagem de documentos e estado de conformidade.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_expiring_documents",
            "description": "Lista documentos que expiram dentro de N dias.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Número de dias (padrão 30)"}
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_pilot_detail",
            "description": "Devolve todos os documentos de um piloto específico.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pilot_id": {"type": "string", "description": "ID do piloto (ex: P001, P002, P003)"}
                },
                "required": ["pilot_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_risk_scores",
            "description": "Devolve o score de risco (0-100) de todos os pilotos.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_anomalies",
            "description": "Devolve documentos com padrões anómalos detectados por ML (IsolationForest).",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]

SYSTEM_PROMPT = """És o assistente de IA da plataforma AeroLicense — um sistema de gestão documental para profissionais de aviação com verificação blockchain.

Respondes SEMPRE em português europeu. És conciso, preciso e profissional.
Quando apresentares listas, usa bullet points (•).
Quando mencionares scores ou percentagens, destaca-os.
Se não souberes algo, diz-o claramente em vez de inventar.
"""


ALLOWED_HISTORY_ROLES = {"user", "assistant"}


def _build_messages(user_message: str, history: list | None) -> list[dict]:
    """
    Monta as mensagens para a OpenAI. O único "system" é o nosso SYSTEM_PROMPT:
    entradas do histórico com outro role (system, tool, ...) são descartadas.
    Defesa em profundidade — a API já rejeita com 422, mas esta função não
    confia em quem a chama.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in (history or []):
        if not isinstance(h, dict) or h.get("role") not in ALLOWED_HISTORY_ROLES:
            continue
        messages.append({"role": h["role"], "content": str(h.get("content", ""))})
    messages.append({"role": "user", "content": user_message})
    return messages


DEFAULT_LLM_MODEL = "gpt-4o-mini"


def llm_model() -> str:
    """Model name from LLM_MODEL (any OpenAI-compatible model id)."""
    return os.getenv("LLM_MODEL") or DEFAULT_LLM_MODEL


def _make_client(api_key: str):
    """
    OpenAI client. LLM_BASE_URL (optional) points it at any OpenAI-compatible
    provider, e.g. Groq or Gemini's OpenAI endpoint. Tests replace this function.
    """
    from openai import OpenAI
    base_url = os.getenv("LLM_BASE_URL") or None
    return OpenAI(api_key=api_key, base_url=base_url)


def _trace_args(raw_args: str | None):
    """Arguments as the model sent them: parsed JSON if possible, else the raw string."""
    try:
        return json.loads(raw_args or "{}")
    except json.JSONDecodeError:
        return raw_args


def run_chat(user_message: str, db_tools_fn: dict, history: list | None = None,
             trace: list | None = None) -> str:
    """
    user_message: string from the user
    db_tools_fn: dict mapping tool_name -> callable(args) -> data
    trace: optional list; if given, each tool call the model makes is appended
           as {"name": str, "arguments": obj} (used by the recorder and evals)

    Returns: assistant's response string in Portuguese
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _demo_response(user_message)

    client = _make_client(api_key)

    messages = _build_messages(user_message, history)

    for _ in range(5):  # max 5 tool-call rounds to prevent infinite loops
        response = client.chat.completions.create(
            model=llm_model(),
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )
        msg = response.choices[0].message

        if not msg.tool_calls:
            return msg.content or "Não foi possível gerar uma resposta."

        messages.append({
            "role": "assistant",
            "content": msg.content,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in msg.tool_calls
            ],
        })

        for tc in msg.tool_calls:
            if trace is not None:
                trace.append({"name": tc.function.name,
                              "arguments": _trace_args(tc.function.arguments)})
            result = _execute_tool(tc.function.name, tc.function.arguments, db_tools_fn)
            messages.append({
                "role":         "tool",
                "tool_call_id": tc.id,
                "content":      json.dumps(result, ensure_ascii=False, default=str),
            })

    return "Limite de iterações atingido. Tenta reformular a pergunta."


def _demo_response(user_message: str) -> str:
    """Resposta demo quando OPENAI_API_KEY não está definida."""
    msg = user_message.lower()
    if any(w in msg for w in ["expirar", "expirado", "validade", "alerta"]):
        return "Demo: Para ver documentos a expirar, vai a Alertas na barra lateral. (Define OPENAI_API_KEY em backend/.env para respostas com IA real.)"
    if any(w in msg for w in ["piloto", "pilotos", "quantos"]):
        return "Demo: Há 8 pilotos registados: Miguel Ferreira, Ana Costa, João Matos, Sofia Andrade, Carlos Rodrigues, Inês Tavares, Ricardo Santos e Mariana Pinto. (Define OPENAI_API_KEY em backend/.env para respostas com IA real.)"
    if any(w in msg for w in ["risco", "score", "risk"]):
        return "Demo: O score de risco combina documentos expirados (-25 pts), a expirar (-10 pts) e anomalias ML (-15 pts). Vê Analytics para os detalhes. (Define OPENAI_API_KEY em backend/.env para IA real.)"
    if any(w in msg for w in ["anomalia", "anomal", "suspeito"]):
        return "Demo: O modelo IsolationForest analisa 4 features por documento para detetar padrões suspeitos. Vê Analytics secção de anomalias. (Define OPENAI_API_KEY em backend/.env para IA real.)"
    return "Demo: Sou o assistente AeroLicense. Define OPENAI_API_KEY no ficheiro backend/.env para ativar respostas com IA real (GPT-4o-mini)."
