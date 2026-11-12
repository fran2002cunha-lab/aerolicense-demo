"""
Tool-selection eval for the AeroLicense chat assistant.

For each question we know which tool the assistant should call (and, where it
matters, with which arguments). The harness runs every question through the
real run_chat loop against a seeded temporary DB and scores:

  * tool-selection accuracy: the expected tool was called
  * argument accuracy: for cases with constraints, the expected tool was called
    with matching arguments (after defaults are applied, e.g. days=30)

Usage (from the repo root):
    backend/venv/bin/python backend/evals/run_evals.py           # real model, needs OPENAI_API_KEY
    backend/venv/bin/python backend/evals/run_evals.py --mock    # deterministic mock client (CI)
"""

import argparse
import json
import os
import re
import sys
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# "tool" may be a tuple when several tools are a reasonable answer.
CASES = [
    {
        "question": "Que documentos expiram nos próximos 30 dias?",
        "tool": "get_expiring_documents",
        "args": {"days": 30},
    },
    {"question": "Que documentos estão a expirar?", "tool": "get_expiring_documents", "args": {"days": 30}},
    {
        "question": "Lista os documentos que expiram nos próximos 90 dias.",
        "tool": "get_expiring_documents",
        "args": {"days": 90},
    },
    {"question": "Mostra os scores de risco de todos os pilotos.", "tool": "get_risk_scores", "args": {}},
    {"question": "Qual é o piloto com maior risco?", "tool": "get_risk_scores", "args": {}},
    {"question": "Há documentos com anomalias detetadas?", "tool": "get_anomalies", "args": {}},
    {"question": "Existem documentos suspeitos?", "tool": "get_anomalies", "args": {}},
    {
        "question": "Dá-me os detalhes do piloto P003.",
        "tool": "get_pilot_detail",
        "args": {"pilot_id": "P003"},
    },
    {
        "question": "Que documentos tem o piloto P001?",
        "tool": "get_pilot_detail",
        "args": {"pilot_id": "P001"},
    },
    {"question": "Quantos pilotos estão em conformidade?", "tool": "get_pilots_summary", "args": {}},
    {
        "question": "Quem tem documentos já expirados?",
        "tool": ("get_pilots_summary", "get_expiring_documents"),
        "args": {},
    },
]


# ── Mock client (CI) ───────────────────────────────────────────────────────
def _mock_route(question: str) -> tuple[str, dict]:
    """Keyword router standing in for the model. Deterministic, no network."""
    q = question.lower()
    if m := re.search(r"\bp\d{3}\b", q):
        return "get_pilot_detail", {"pilot_id": m.group(0).upper()}
    if "anomal" in q or "suspeit" in q:
        return "get_anomalies", {}
    if "risco" in q or "score" in q:
        return "get_risk_scores", {}
    if "expir" in q:
        if m := re.search(r"(\d+)\s*dias", q):
            return "get_expiring_documents", {"days": int(m.group(1))}
        if "expirados" in q:
            return "get_expiring_documents", {"days": 0, "include_expired": True}
        return "get_expiring_documents", {}
    return "get_pilots_summary", {}


class MockLLMClient:
    """
    Minimal stand-in for openai.OpenAI: first turn asks for one tool, the turn
    after a tool result answers with text. Records every create() call.
    """

    def __init__(self, router=_mock_route):
        self.router = router
        self.requests: list[dict] = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        self.requests.append(kwargs)
        messages = kwargs["messages"]
        if messages[-1]["role"] == "tool":
            msg = SimpleNamespace(
                content=f"(mock) Resposta com base em: {messages[-1]['content'][:80]}", tool_calls=None
            )
        else:
            name, args = self.router(messages[-1]["content"])
            call = SimpleNamespace(
                id=f"call_mock_{len(self.requests)}",
                function=SimpleNamespace(name=name, arguments=json.dumps(args)),
            )
            msg = SimpleNamespace(content=None, tool_calls=[call])
        return SimpleNamespace(choices=[SimpleNamespace(message=msg)])


@contextmanager
def mock_llm(client: MockLLMClient | None = None):
    """Route run_chat to a MockLLMClient (sets a dummy key so the demo fallback is skipped)."""
    import chat

    client = client or MockLLMClient()
    saved_factory, saved_key = chat._make_client, os.environ.get("OPENAI_API_KEY")
    chat._make_client = lambda api_key: client
    os.environ["OPENAI_API_KEY"] = "mock-key"
    try:
        yield client
    finally:
        chat._make_client = saved_factory
        if saved_key is None:
            os.environ.pop("OPENAI_API_KEY", None)
        else:
            os.environ["OPENAI_API_KEY"] = saved_key


# ── Scoring ────────────────────────────────────────────────────────────────
def _effective_args(name: str, arguments) -> dict | None:
    """Arguments after validation/defaults, or None if they would be rejected."""
    from chat import TOOL_ARG_MODELS

    model = TOOL_ARG_MODELS.get(name)
    if model is None or not isinstance(arguments, dict):
        return None
    try:
        return model.model_validate(arguments).model_dump()
    except Exception:
        return None


def score_case(case: dict, tool_calls: list[dict]) -> dict:
    expected = case["tool"] if isinstance(case["tool"], tuple) else (case["tool"],)
    matching = [t for t in tool_calls if t["name"] in expected]
    tool_ok = bool(matching)
    if not case["args"]:
        args_ok = None  # no constraint: not counted in argument accuracy
    else:
        args_ok = any(
            (eff := _effective_args(t["name"], t["arguments"])) is not None
            and all(eff.get(k) == v for k, v in case["args"].items())
            for t in matching
        )
    return {
        "question": case["question"],
        "expected": "|".join(expected),
        "called": [t["name"] for t in tool_calls],
        "tool_ok": tool_ok,
        "args_ok": args_ok,
    }


def run_evals(cases: list[dict], tools: dict) -> dict:
    from chat import run_chat

    results = []
    for case in cases:
        trace: list = []
        run_chat(case["question"], tools, trace=trace)
        results.append(score_case(case, trace))

    arg_cases = [r for r in results if r["args_ok"] is not None]
    return {
        "results": results,
        "tool_accuracy": sum(r["tool_ok"] for r in results) / len(results),
        "arg_accuracy": (sum(r["args_ok"] for r in arg_cases) / len(arg_cases)) if arg_cases else 1.0,
        "n_cases": len(results),
        "n_arg_cases": len(arg_cases),
    }


def format_table(summary: dict) -> str:
    def mark(v):
        return "-" if v is None else ("ok" if v else "FAIL")

    lines = [f"{'#':>2}  {'tool':4}  {'args':4}  {'expected':45}  {'called':30}  question", "-" * 120]
    for i, r in enumerate(summary["results"], 1):
        lines.append(
            f"{i:>2}  {mark(r['tool_ok']):4}  {mark(r['args_ok']):4}  "
            f"{r['expected'][:45]:45}  {','.join(r['called'])[:30]:30}  {r['question']}"
        )
    lines.append("-" * 120)
    lines.append(f"Tool-selection accuracy: {summary['tool_accuracy']:.0%} ({summary['n_cases']} cases)")
    lines.append(
        f"Argument accuracy:       {summary['arg_accuracy']:.0%} ({summary['n_arg_cases']} cases with constraints)"
    )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--mock", action="store_true", help="use the deterministic mock client (no API key)")
    parser.add_argument(
        "--fail-under", type=float, default=0.0, help="exit 1 if tool-selection accuracy is below this (0-1)"
    )
    args = parser.parse_args(argv)

    if not args.mock and not os.getenv("OPENAI_API_KEY"):
        print(
            "OPENAI_API_KEY is not set. Use --mock, or set the key (and optionally "
            "LLM_BASE_URL / LLM_MODEL) to evaluate a real model.",
            file=sys.stderr,
        )
        return 2

    from chat import llm_model
    from scripts.record_demo_chat import seeded_db_tools

    with seeded_db_tools() as tools:
        if args.mock:
            with mock_llm():
                summary = run_evals(CASES, tools)
        else:
            summary = run_evals(CASES, tools)

    print(f"Model: {'mock' if args.mock else llm_model()}")
    print(format_table(summary))
    return 1 if summary["tool_accuracy"] < args.fail_under else 0


if __name__ == "__main__":
    sys.exit(main())
