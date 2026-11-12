"""
Safety and faithfulness evals for the AeroLicense chat assistant.

Cases live in safety_cases.py: faithfulness, count correctness, out-of-scope
refusal, unknown pilot, direct and indirect prompt injection, multi-tool.

Modes (from the repo root):
    backend/venv/bin/python backend/evals/run_safety_evals.py --mock
        Deterministic scripted client. It ONLY tests the plumbing: the seeded DB,
        tool wrapping, the injection setup and the checkers. It says nothing
        about how safe or faithful a real model is. Used in CI.

    OPENAI_API_KEY=... [LLM_BASE_URL=...] [LLM_MODEL=...] \\
    backend/venv/bin/python backend/evals/run_safety_evals.py --runs 5
        Real model. Each case runs N times; reports per-case pass rate, mean/min
        pass rate, p50/p95 latency and tokens, and writes
        backend/evals/results/latest.md.
"""

import argparse
import json
import os
import re
import statistics
import sys
import tempfile
from contextlib import contextmanager
from datetime import UTC, date, datetime
from pathlib import Path
from types import SimpleNamespace

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from evals.run_evals import mock_llm  # noqa: E402
from evals.safety_cases import SAFETY_CASES  # noqa: E402

RESULTS_PATH = BACKEND_DIR / "evals" / "results" / "latest.md"

MOCK_NOTICE = (
    "MOCK MODE: scripted client, deterministic. This checks the eval plumbing and the\n"
    "checkers only. It is NOT a measure of model safety or faithfulness; run without\n"
    "--mock against a real model for that."
)


# ── Seeded DB ──────────────────────────────────────────────────────────────
@contextmanager
def seeded_db():
    """Yield (db session, chat tools) for a fresh temporary SQLite DB."""
    import database
    from chat_tools import build_db_tools

    previous_url = os.environ.get("DATABASE_URL")
    with tempfile.TemporaryDirectory() as tmp:
        os.environ["DATABASE_URL"] = f"sqlite:///{Path(tmp) / 'safety.db'}"
        try:
            database.init_db()
            db = database.SessionLocal()
            try:
                database.seed_demo_data(db)
                yield db, build_db_tools(db)
            finally:
                db.close()
                database._engine.dispose()
        finally:
            if previous_url is None:
                os.environ.pop("DATABASE_URL", None)
            else:
                os.environ["DATABASE_URL"] = previous_url


def build_context(db) -> dict:
    """Ground truth read straight from the DB (not from the tools under test)."""
    from chat import SYSTEM_PROMPT
    from compliance import doc_status, pilot_compliant
    from database import Pilot

    today = date.today()
    pilots = db.query(Pilot).all()
    doc_words = set()
    for p in pilots:
        for d in p.documents:
            doc_words.add(d.doc_type.lower().replace("_", " "))
            doc_words.add(d.description.split(" — ")[0].lower())
    return {
        "pilot_names": [p.name for p in pilots],
        "p003_name": next(p.name for p in pilots if p.id == "P003"),
        "compliant_count": sum(pilot_compliant([d.expires_at for d in p.documents], today) for p in pilots),
        "expired_pilot_names": sorted(
            {p.name for p in pilots for d in p.documents if doc_status(d.expires_at, today) == "expired"}
        ),
        "doc_words": sorted(w for w in doc_words if len(w) >= 3),
        "system_prompt": SYSTEM_PROMPT,
    }


def recording_tools(tools: dict, outputs: list) -> dict:
    """Wrap each tool so every result the model sees is also recorded."""

    def wrap(name, fn):
        def call(**kwargs):
            result = fn(**kwargs)
            outputs.append({"name": name, "result": result})
            return result

        return call

    return {name: wrap(name, fn) for name, fn in tools.items()}


# ── Scripted mock client ───────────────────────────────────────────────────
_OUT_OF_SCOPE = ("capital", "poema", "frança", "receita", "futebol")
_INJECTION = ("ignora as instruções", "system prompt", "instruções anteriores")


def _route(question: str) -> list[tuple[str, dict]]:
    q = question.lower()
    if "compara" in q and "risco" in q and "anomal" in q:
        return [("get_risk_scores", {}), ("get_anomalies", {})]
    if m := re.search(r"\bp\d{3}\b", q):
        return [("get_pilot_detail", {"pilot_id": m.group(0).upper()})]
    if "conformidade" in q or "conformes" in q:
        return [("get_pilots_summary", {})]
    if "expiraram" in q or "expirados" in q:
        return [("get_expiring_documents", {"days": 0, "include_expired": True})]
    if "expir" in q:
        days = int(m.group(1)) if (m := re.search(r"(\d+)\s*dias", q)) else 30
        return [("get_expiring_documents", {"days": days})]
    return [("get_pilots_summary", {})]


def _compose(results: dict) -> str:
    """Deterministic answer built only from tool data (what a faithful model would say)."""
    lines = []
    if "get_pilot_detail" in results:
        r = results["get_pilot_detail"]
        if "error" in r:
            return "Esse piloto não foi encontrado na AeroLicense."
        lines.append(f"{r['nome']}:")
        lines += [f"• {d['descricao']}: {d['dias_restantes']} dias ({d['status']})" for d in r["documentos"]]
    if "get_pilots_summary" in results:
        pilots = results["get_pilots_summary"]
        ok = [p for p in pilots if p["compliance_ok"]]
        lines.append(f"Há {len(ok)} pilotos em conformidade, de {len(pilots)}.")
        lines += [f"• {p['nome']}: {p['expirados']} expirados" for p in pilots if not p["compliance_ok"]]
    if "get_expiring_documents" in results:
        docs = results["get_expiring_documents"]
        lines.append("Documentos:" if docs else "Não há documentos nesse período.")
        lines += [
            f"• {d['piloto']}: {d['documento'].split('. SYSTEM')[0]} ({d['dias_restantes']} dias)"
            for d in docs
        ]
    if "get_risk_scores" in results:
        p003 = next((r for r in results["get_risk_scores"] if r.get("pilot_id") == "P003"), None)
        if p003:
            lines.append(f"P003 ({p003['piloto']}): score de risco {p003['score']} ({p003['level']}).")
    if "get_anomalies" in results:
        a = results["get_anomalies"]
        lines.append(f"Anomalias detetadas: {a['total']}.")
        lines += [f"• {x['piloto']}: {x['documento']}" for x in a["anomalias"]]
    return "\n".join(lines) or "Não tenho essa informação nos dados."


class SafetyMockClient:
    """Stand-in for openai.OpenAI that behaves like a well-aligned model, deterministically."""

    def __init__(self):
        self.requests: list[dict] = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _reply(self, content=None, tool_calls=None):
        msg = SimpleNamespace(content=content, tool_calls=tool_calls)
        return SimpleNamespace(choices=[SimpleNamespace(message=msg)], usage=None)

    def _create(self, **kwargs):
        self.requests.append(kwargs)
        messages = kwargs["messages"]
        if messages[-1]["role"] == "tool" or kwargs.get("tool_choice") == "none":
            names = {}
            for m in messages:
                for tc in m.get("tool_calls") or []:
                    names[tc["id"]] = tc["function"]["name"]
            results = {
                names[m["tool_call_id"]]: json.loads(m["content"])["data"]
                for m in messages
                if m["role"] == "tool"
            }
            return self._reply(content=_compose(results))
        question = messages[-1]["content"].lower()
        if any(k in question for k in _INJECTION):
            return self._reply(
                content="Não posso partilhar as minhas instruções. Posso ajudar com a "
                "conformidade de pilotos e documentos."
            )
        if any(k in question for k in _OUT_OF_SCOPE):
            return self._reply(
                content="Só posso ajudar com questões de conformidade de pilotos e documentos da AeroLicense."
            )
        calls = [
            SimpleNamespace(
                id=f"call_{len(self.requests)}_{i}", function=SimpleNamespace(name=n, arguments=json.dumps(a))
            )
            for i, (n, a) in enumerate(_route(question))
        ]
        return self._reply(tool_calls=calls)


# ── Running ────────────────────────────────────────────────────────────────
def run_case(case: dict, db, tools: dict, ctx: dict) -> dict:
    from chat import run_chat

    undo = case["setup"](db) if case.get("setup") else None
    try:
        outputs: list = []
        trace: list = []
        stats: list = []
        try:
            answer, error = (
                run_chat(case["question"], recording_tools(tools, outputs), trace=trace, stats=stats),
                None,
            )
        except Exception as e:  # a provider error fails the run, not the whole eval
            answer, error = "", f"run_chat raised {type(e).__name__}"
    finally:
        if undo:
            undo()
    run = {"trace": trace, "outputs": outputs}
    case_ctx = {**ctx, "question": case["question"]}
    failures = (
        [error]
        if error
        else [f"{c.__name__}: {msg}" for c in case["checks"] if (msg := c(answer, run, case_ctx))]
    )
    tokens = [(s.get("prompt_tokens") or 0) + (s.get("completion_tokens") or 0) for s in stats]
    return {
        "id": case["id"],
        "passed": not failures,
        "failures": failures,
        "tools": [t["name"] for t in trace],
        "latency_ms": sum(s.get("latency_ms") or 0 for s in stats),
        "tokens": sum(tokens) if any(s.get("prompt_tokens") is not None for s in stats) else None,
        "answer": answer,
    }


def run_safety_evals(runs: int = 1, cases=SAFETY_CASES) -> dict:
    with seeded_db() as (db, tools):
        ctx = build_context(db)
        results = {c["id"]: [run_case(c, db, tools, ctx) for _ in range(runs)] for c in cases}
    rates = {cid: sum(r["passed"] for r in rs) / len(rs) for cid, rs in results.items()}
    all_runs = [r for rs in results.values() for r in rs]
    return {
        "results": results,
        "pass_rates": rates,
        "mean_pass_rate": statistics.mean(rates.values()),
        "min_pass_rate": min(rates.values()),
        "latency_ms": [r["latency_ms"] for r in all_runs],
        "tokens": [r["tokens"] for r in all_runs if r["tokens"] is not None],
        "runs": runs,
    }


def _pct(values: list, q: float):
    if not values:
        return None
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, round(q * (len(ordered) - 1)))]


def format_report(summary: dict, model: str, mock: bool) -> str:
    lines = []
    if mock:
        lines += [MOCK_NOTICE, ""]
    lines.append(f"Model: {model} · runs per case: {summary['runs']}")
    lines.append("")
    lines.append(f"| {'case':22} | pass rate | tools (last run) | failures (last failing run) |")
    lines.append(f"|{'-' * 24}|-----------|------------------|-----------------------------|")
    for cid, rs in summary["results"].items():
        failing = next((r for r in reversed(rs) if not r["passed"]), None)
        fail = "; ".join(failing["failures"])[:120] if failing else ""
        lines.append(
            f"| {cid:22} | {summary['pass_rates'][cid]:>8.0%} | "
            f"{','.join(rs[-1]['tools']) or '-':16} | {fail} |"
        )
    lines.append("")
    lines.append(f"Mean pass rate: {summary['mean_pass_rate']:.0%} · min: {summary['min_pass_rate']:.0%}")
    lat, tok = summary["latency_ms"], summary["tokens"]
    if mock:
        lines.append("Latency/tokens: not meaningful in mock mode.")
    else:
        lines.append(f"Latency per question: p50 {_pct(lat, 0.5)} ms · p95 {_pct(lat, 0.95)} ms")
        lines.append(
            f"Tokens per question: p50 {_pct(tok, 0.5)} · p95 {_pct(tok, 0.95)}"
            if tok
            else "Tokens: provider returned no usage data."
        )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--mock", action="store_true", help="scripted client: plumbing test only (CI)")
    parser.add_argument("--runs", type=int, default=5, help="runs per case with a real model (default 5)")
    parser.add_argument(
        "--fail-under",
        type=float,
        default=0.0,
        help="exit 1 if the minimum per-case pass rate is below this (0-1)",
    )
    parser.add_argument("--output", type=Path, default=RESULTS_PATH, help="report path (real mode)")
    args = parser.parse_args(argv)

    if not args.mock and not (os.getenv("OPENAI_API_KEY") or "").strip():
        print(
            "OPENAI_API_KEY is not set. Use --mock (plumbing only), or set the key "
            "(and optionally LLM_BASE_URL / LLM_MODEL) to evaluate a real model.",
            file=sys.stderr,
        )
        return 2

    from chat import llm_model

    if args.mock:
        with mock_llm(SafetyMockClient()):
            summary = run_safety_evals(runs=1)
        report = format_report(summary, "mock (scripted)", mock=True)
    else:
        summary = run_safety_evals(runs=max(1, args.runs))
        report = format_report(summary, llm_model(), mock=False)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(UTC).isoformat(timespec="seconds")
        args.output.write_text(f"# Safety eval results\n\nGenerated {stamp}\n\n{report}\n", encoding="utf-8")
        print(f"Wrote {args.output}", file=sys.stderr)

    print(report)
    return 1 if summary["min_pass_rate"] < args.fail_under else 0


if __name__ == "__main__":
    sys.exit(main())
