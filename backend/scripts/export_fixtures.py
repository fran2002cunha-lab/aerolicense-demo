"""
Export the static-demo fixtures (frontend/public/fixtures/*.json) from the real API.

Seeds a temporary SQLite DB, calls the endpoints through FastAPI's TestClient
and writes one JSON file per endpoint. status.json is replaced by a fixed
"static demo" payload carrying exported_at, which the frontend uses to shift
the dates to the viewing day. No blockchain, LLM or network is used.

Usage (from the repo root):
    backend/venv/bin/python backend/scripts/export_fixtures.py [--output DIR]
"""

import argparse
import json
import os
import re
import sys
import tempfile
from datetime import date
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

DEFAULT_OUTPUT = BACKEND_DIR.parent / "frontend" / "public" / "fixtures"
PILOT_IDS = [f"P{i:03d}" for i in range(1, 9)]

ENDPOINTS = {
    "/demo/pilotos": "pilots.json",
    **{f"/demo/pilotos/{pid}": f"pilot_{pid}.json" for pid in PILOT_IDS},
    "/demo/alertas": "alerts.json",
    "/demo/blockchain": "blockchain.json",
    "/analytics/summary": "analytics_summary.json",
    "/analytics/monthly": "analytics_monthly.json",
    "/analytics/distribution": "analytics_distribution.json",
    "/analytics/anomalies": "analytics_anomalies.json",
    "/analytics/risk-scores": "risk_scores.json",
}

# Nothing that looks like an address or host may end up in a public fixture.
_FORBIDDEN_RE = re.compile(r"https?://|localhost|127\.0\.0\.1|0\.0\.0\.0", re.IGNORECASE)


def static_status(exported_at: date) -> dict:
    return {
        "app": "AeroLicense API",
        "status": "demo",
        "blockchain_connected": False,
        "contract_configured": False,
        "modo": "Static demo — fictional data, no live backend",
        "exported_at": exported_at.isoformat(),
    }


def collect(today: date | None = None) -> dict[str, object]:
    """filename -> JSON payload, from a freshly seeded temporary DB."""
    today = today or date.today()
    with tempfile.TemporaryDirectory() as tmp:
        saved = {k: os.environ.get(k) for k in ("DATABASE_URL", "CONTRACT_ADDRESS", "OPENAI_API_KEY")}
        os.environ["DATABASE_URL"] = f"sqlite:///{Path(tmp) / 'fixtures.db'}"
        os.environ.pop("CONTRACT_ADDRESS", None)
        os.environ.pop("OPENAI_API_KEY", None)
        try:
            from fastapi.testclient import TestClient

            import database
            from main import app

            payloads: dict[str, object] = {"status.json": static_status(today)}
            with TestClient(app) as client:
                for path, filename in ENDPOINTS.items():
                    res = client.get(path)
                    res.raise_for_status()
                    payloads[filename] = res.json()
            database._engine.dispose()
        finally:
            for k, v in saved.items():
                if v is None:
                    os.environ.pop(k, None)
                else:
                    os.environ[k] = v
    return payloads


def check_clean(payloads: dict[str, object]) -> None:
    for filename, payload in payloads.items():
        text = json.dumps(payload, ensure_ascii=False)
        if m := _FORBIDDEN_RE.search(text):
            raise ValueError(f"{filename} contains a forbidden value: {m.group(0)!r}")


def write(payloads: dict[str, object], output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    for filename, payload in payloads.items():
        text = json.dumps(payload, ensure_ascii=False, indent=1) + "\n"
        (output / filename).write_text(text, encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args(argv)

    payloads = collect()
    check_clean(payloads)
    write(payloads, args.output)

    s = payloads["analytics_summary.json"]
    anomalies = payloads["analytics_anomalies.json"]["total"]
    print(
        f"Wrote {len(payloads)} fixtures to {args.output}\n"
        f"  documents: {s['total_documents']} = {s['valid']} valid, {s['expiring_soon']} expiring, "
        f"{s['expired']} expired\n"
        f"  compliance: {s['compliance_rate']}% ({s['compliant_pilots']}/{s['total_pilots']} pilots)\n"
        f"  anomalies: {anomalies}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
