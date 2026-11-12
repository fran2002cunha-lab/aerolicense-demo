# tests/test_llm_recording_evals.py
"""LLM provider config, run_chat trace, demo-chat recorder and eval harness (all mocked, no network)."""
import json

import chat
from evals.run_evals import CASES, MockLLMClient, main as evals_main, mock_llm, run_evals, score_case
from scripts.record_demo_chat import (
    QUESTIONS, build_payload, main as record_main, record_question, seeded_db_tools, serialise,
)


# ── LLM provider config ────────────────────────────────────────────────────
def test_llm_model_default_and_override(monkeypatch):
    assert chat.llm_model() == "gpt-4o-mini"
    monkeypatch.setenv("LLM_MODEL", "llama-3.1-8b-instant")
    assert chat.llm_model() == "llama-3.1-8b-instant"


def test_make_client_uses_base_url(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
    client = chat._make_client("dummy")  # constructing the client makes no request
    assert str(client.base_url).startswith("https://api.groq.com/openai/v1")


def test_run_chat_without_key_uses_demo_fallback():
    trace = []
    assert chat.run_chat("Quantos pilotos?", {}, trace=trace).startswith("Demo:")
    assert trace == []


def test_run_chat_trace_and_model(monkeypatch):
    monkeypatch.setenv("LLM_MODEL", "test-model")
    seen = []
    tools = {"get_pilot_detail": lambda pilot_id: seen.append(pilot_id) or {"nome": "X"}}
    trace = []
    with mock_llm() as client:
        answer = chat.run_chat("Detalhes do piloto P003", tools, trace=trace)
    assert answer.startswith("(mock)")
    assert trace == [{"name": "get_pilot_detail", "arguments": {"pilot_id": "P003"}}]
    assert seen == ["P003"]
    assert all(r["model"] == "test-model" for r in client.requests)


def test_run_chat_without_trace_unchanged():
    with mock_llm():
        assert chat.run_chat("Há anomalias?", {"get_anomalies": lambda: {"total": 0}}).startswith("(mock)")


# ── Recorder ───────────────────────────────────────────────────────────────
def test_recorder_refuses_without_key(capsys):
    assert record_main([]) == 2
    assert "OPENAI_API_KEY" in capsys.readouterr().err


def test_recorder_end_to_end_with_mock(tmp_path):
    out = tmp_path / "chat_recordings.json"
    with mock_llm():
        assert record_main(["--output", str(out)]) == 0
    data = json.loads(out.read_text(encoding="utf-8"))
    assert set(data) == {"model", "recorded_at", "recordings"}
    assert [r["question"] for r in data["recordings"]] == QUESTIONS
    for r in data["recordings"]:
        assert set(r) == {"question", "tool_calls", "answer"}
        for t in r["tool_calls"]:
            assert set(t) == {"name", "arguments"}
            assert isinstance(t["arguments"], dict)
    text = out.read_text(encoding="utf-8")
    assert chat.SYSTEM_PROMPT not in text
    assert "call_mock" not in text and "mock-key" not in text


def test_record_question_strips_urls():
    router = lambda q: ("get_pilots_summary", {})
    client = MockLLMClient(router)
    original = client._create

    def with_url(**kw):
        resp = original(**kw)
        msg = resp.choices[0].message
        if msg.tool_calls is None:
            msg.content = "Vê https://internal.example/x para detalhes."
        return resp
    client.chat.completions.create = with_url
    with mock_llm(client):
        rec = record_question("Quantos pilotos?", {"get_pilots_summary": lambda: []})
    assert "https://" not in rec["answer"]


def test_serialise_refuses_secret_leak():
    payload = build_payload("m", [{"question": "q", "tool_calls": [], "answer": "sk-SECRET"}], "2026-01-01")
    try:
        serialise(payload, forbidden=["sk-SECRET"])
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_build_payload_whitelists_fields():
    rec = {"question": "q", "answer": "a", "extra": 1,
           "tool_calls": [{"name": "t", "arguments": {}, "id": "call_1"}]}
    payload = build_payload("m", [rec], "2026-01-01")
    assert payload == {"model": "m", "recorded_at": "2026-01-01",
                       "recordings": [{"question": "q", "tool_calls": [{"name": "t", "arguments": {}}], "answer": "a"}]}


# ── Evals ──────────────────────────────────────────────────────────────────
def test_evals_mock_mode_scores_perfectly():
    with seeded_db_tools() as tools, mock_llm():
        summary = run_evals(CASES, tools)
    assert len(CASES) >= 10
    assert summary["tool_accuracy"] == 1.0
    assert summary["arg_accuracy"] == 1.0


def test_evals_cli_mock(capsys):
    assert evals_main(["--mock", "--fail-under", "1.0"]) == 0
    out = capsys.readouterr().out
    assert "Tool-selection accuracy: 100%" in out


def test_score_case_detects_wrong_tool_and_args():
    case = {"question": "q", "tool": "get_expiring_documents", "args": {"days": 30}}
    assert score_case(case, [{"name": "get_risk_scores", "arguments": {}}])["tool_ok"] is False
    wrong = score_case(case, [{"name": "get_expiring_documents", "arguments": {"days": 7}}])
    assert wrong["tool_ok"] is True and wrong["args_ok"] is False
    default = score_case(case, [{"name": "get_expiring_documents", "arguments": {}}])
    assert default["args_ok"] is True  # default days=30 applies
