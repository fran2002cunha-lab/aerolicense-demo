# AeroLicense developer shortcuts (run from the repo root).
PY ?= backend/venv/bin/python
RUFF ?= backend/venv/bin/ruff

.PHONY: test lint format evals dev-backend dev-frontend fixtures

test:
	$(PY) -m pytest -q

lint:
	$(RUFF) check backend tests
	$(RUFF) format --check backend tests

format:
	$(RUFF) check --fix backend tests
	$(RUFF) format backend tests

# Mock evals: plumbing tests only. Run the scripts without --mock (with
# OPENAI_API_KEY set) to evaluate a real model.
evals:
	$(PY) backend/evals/run_evals.py --mock --fail-under 1.0
	$(PY) backend/evals/run_safety_evals.py --mock --fail-under 1.0

dev-backend:
	cd backend && venv/bin/uvicorn main:app --reload --port 8000 $(if $(wildcard backend/.env),--env-file .env,)

dev-frontend:
	cd frontend && npm start

fixtures:
	$(PY) backend/scripts/export_fixtures.py
