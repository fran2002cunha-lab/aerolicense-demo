# Chat tool-selection evals

`run_evals.py` checks whether the chat assistant picks the right tool for a
question. It has 11 Portuguese questions, each with the tool it should call and,
where it matters, argument constraints (for example `days == 30`, `pilot_id == "P003"`).

Each question runs through the real `run_chat` loop against a freshly seeded
temporary SQLite DB, with a trace of the tool calls the model made.

## What it measures

- **Tool-selection accuracy**: the share of questions where the expected tool was
  called (some questions accept more than one tool).
- **Argument accuracy**: for questions with constraints, the share where the
  expected tool was called with matching arguments. Arguments are validated and
  defaults applied first, so `{}` counts as `days == 30`.

It does not grade the wording of the final answer.

## Running it

From the repo root:

```bash
# Real model (OpenAI, or any OpenAI-compatible provider via LLM_BASE_URL / LLM_MODEL)
OPENAI_API_KEY=sk-... backend/venv/bin/python backend/evals/run_evals.py

# Mock client: deterministic keyword router, no key or network (used in CI)
backend/venv/bin/python backend/evals/run_evals.py --mock

# Fail (exit 1) below a tool-selection accuracy threshold
backend/venv/bin/python backend/evals/run_evals.py --mock --fail-under 1.0
```

The mock mode tests the harness and the tool plumbing, not model quality. Use it
to catch regressions in the tools, argument validation and scoring. To compare
models or prompt changes, run it with a real key.
