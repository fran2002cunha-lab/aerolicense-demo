"""
Record real chat answers for the static (no-backend) frontend demo.

Seeds a temporary SQLite DB, runs a fixed list of questions through the REAL
run_chat tool loop and writes frontend/public/fixtures/chat_recordings.json:

    {"model": str, "recorded_at": ISO 8601 timestamp (UTC),
     "recordings": [{"question": str,
                     "tool_calls": [{"name": str, "arguments": obj}],
                     "answer": str}]}

Only questions, tool names/arguments and answers are written: never the system
prompt, tool-call IDs, URLs or keys.

Usage (from the repo root):
    OPENAI_API_KEY=... backend/venv/bin/python backend/scripts/record_demo_chat.py
Optional: LLM_BASE_URL / LLM_MODEL for an OpenAI-compatible provider.
"""

import argparse
import json
import os
import re
import sys
import tempfile
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

DEFAULT_OUTPUT = BACKEND_DIR.parent / "frontend" / "public" / "fixtures" / "chat_recordings.json"

QUESTIONS = [
    "Que documentos expiram nos próximos 30 dias?",
    "Mostra os scores de risco de todos os pilotos.",
    "Há documentos com anomalias detetadas?",
    "Dá-me os detalhes do piloto P003.",
    "Quantos pilotos estão em conformidade?",
    "Quem tem documentos já expirados?",
]

_URL_RE = re.compile(r"https?://\S+")


@contextmanager
def seeded_db_tools():
    """Yield the chat tools bound to a freshly seeded, temporary SQLite DB."""
    import database
    from main import build_db_tools

    previous_url = os.environ.get("DATABASE_URL")
    with tempfile.TemporaryDirectory() as tmp:
        os.environ["DATABASE_URL"] = f"sqlite:///{Path(tmp) / 'demo.db'}"
        try:
            database.init_db()
            db = database.SessionLocal()
            try:
                database.seed_demo_data(db)
                yield build_db_tools(db)
            finally:
                db.close()
                database._engine.dispose()
        finally:
            if previous_url is None:
                os.environ.pop("DATABASE_URL", None)
            else:
                os.environ["DATABASE_URL"] = previous_url


def record_question(question: str, tools: dict) -> dict:
    """Run one question through run_chat and capture the tool calls it made."""
    from chat import run_chat

    trace: list = []
    answer = run_chat(question, tools, trace=trace)
    return {
        "question": question,
        "tool_calls": [{"name": t["name"], "arguments": t["arguments"]} for t in trace],
        "answer": _URL_RE.sub("[link removido]", answer),
    }


def build_payload(model: str, recordings: list[dict], recorded_at: str | None = None) -> dict:
    """Build the fixture in its exact schema (whitelisting fields)."""
    return {
        "model": model,
        "recorded_at": recorded_at or datetime.now(UTC).isoformat(timespec="seconds"),
        "recordings": [
            {
                "question": r["question"],
                "tool_calls": [{"name": t["name"], "arguments": t["arguments"]} for t in r["tool_calls"]],
                "answer": r["answer"],
            }
            for r in recordings
        ],
    }


def serialise(payload: dict, forbidden: list[str] | None = None) -> str:
    """JSON text of the payload; refuses if any secret (key, base URL) leaked into it."""
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    for secret in forbidden or []:
        if secret and secret in text:
            raise ValueError("Refusing to write recordings: a secret value appears in the output")
    return text


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args(argv)

    if not os.getenv("OPENAI_API_KEY"):
        print(
            "OPENAI_API_KEY is not set, so there is no real model to record.\n"
            "Set it (and optionally LLM_BASE_URL / LLM_MODEL for an OpenAI-compatible\n"
            "provider such as Groq or Gemini) and run again, e.g.:\n"
            "  OPENAI_API_KEY=sk-... backend/venv/bin/python backend/scripts/record_demo_chat.py",
            file=sys.stderr,
        )
        return 2

    from chat import SYSTEM_PROMPT, llm_model

    with seeded_db_tools() as tools:
        recordings = []
        for q in QUESTIONS:
            print(f"> {q}", file=sys.stderr)
            recordings.append(record_question(q, tools))

    payload = build_payload(llm_model(), recordings)
    text = serialise(
        payload, forbidden=[os.getenv("OPENAI_API_KEY"), os.getenv("LLM_BASE_URL"), SYSTEM_PROMPT]
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(text, encoding="utf-8")
    print(f"Wrote {len(recordings)} recordings to {args.output}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
