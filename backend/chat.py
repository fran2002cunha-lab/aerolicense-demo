# backend/chat.py
"""
AeroLicense — Chatbot NLP com OpenAI Function Calling
Responde em português a perguntas sobre conformidade de pilotos aeronáuticos.
"""

import json
import os

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


def run_chat(user_message: str, db_tools_fn: dict) -> str:
    """
    user_message: string from the user
    db_tools_fn: dict mapping tool_name -> callable(args) -> data

    Returns: assistant's response string in Portuguese
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _demo_response(user_message)

    from openai import OpenAI
    client = OpenAI(api_key=api_key)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_message},
    ]

    for _ in range(5):  # max 5 tool-call rounds to prevent infinite loops
        response = client.chat.completions.create(
            model="gpt-4o-mini",
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
            fn_name = tc.function.name
            fn_args = json.loads(tc.function.arguments or "{}")
            fn      = db_tools_fn.get(fn_name)
            result  = fn(**fn_args) if fn else {"error": f"Tool {fn_name} not found"}
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
        return "Demo: Há 3 pilotos registados: Miguel Ferreira, Ana Santos e Carlos Mendes. (Define OPENAI_API_KEY em backend/.env para respostas com IA real.)"
    if any(w in msg for w in ["risco", "score", "risk"]):
        return "Demo: O score de risco combina documentos expirados (-25 pts), a expirar (-10 pts) e anomalias ML (-15 pts). Vê Analytics para os detalhes. (Define OPENAI_API_KEY em backend/.env para IA real.)"
    if any(w in msg for w in ["anomalia", "anomal", "suspeito"]):
        return "Demo: O modelo IsolationForest analisa 4 features por documento para detetar padrões suspeitos. Vê Analytics secção de anomalias. (Define OPENAI_API_KEY em backend/.env para IA real.)"
    return "Demo: Sou o assistente AeroLicense. Define OPENAI_API_KEY no ficheiro backend/.env para ativar respostas com IA real (GPT-4o-mini)."
