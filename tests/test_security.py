# tests/test_security.py
"""Security hardening: auth, signer allowlist, uploads, error leaks, CORS, params, rate limit."""

import io
import os
import subprocess
import sys
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest

import main
from tests.conftest import API_HEADERS

BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..", "backend")
PDF = b"%PDF-1.4 test document"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 32


def _upload(client, content=PDF, headers=API_HEADERS):
    return client.post(
        "/documents/upload",
        params={
            "pilot_address": "0x00000000000000000000000000000000Ae1c0001",
            "doc_type": "ATPL",
            "description": "Test",
            "expires_at": (datetime.now(UTC) + timedelta(days=365)).isoformat(),
        },
        files={"file": ("doc.pdf", io.BytesIO(content), "application/pdf")},
        headers=headers,
    )


# ── a. Auth ────────────────────────────────────────────────────────────────
def test_write_endpoints_disabled_without_server_key(client, monkeypatch):
    monkeypatch.delenv("AEROLICENSE_API_KEY")
    res = _upload(client)
    assert res.status_code == 503
    assert res.json()["detail"] == "write endpoints disabled"
    assert (
        client.post("/documents/hash", files={"file": ("a.pdf", PDF)}, headers=API_HEADERS).status_code == 503
    )


@pytest.mark.parametrize("headers", [{}, {"X-API-Key": "wrong"}, {"X-API-Key": ""}])
def test_write_endpoints_reject_missing_or_wrong_key(client, headers):
    assert _upload(client, headers=headers).status_code == 401
    assert client.post("/documents/hash", files={"file": ("a.pdf", PDF)}, headers=headers).status_code == 401


def test_write_endpoint_accepts_correct_key(client):
    assert _upload(client).status_code == 200


def test_chat_does_not_need_api_key(client, monkeypatch):
    monkeypatch.delenv("AEROLICENSE_API_KEY")
    assert client.post("/chat", json={"message": "Olá"}).status_code == 200


def test_no_unprotected_write_routes():
    """Every POST/PUT/PATCH/DELETE route except /chat depends on require_api_key."""
    for route in main.app.routes:
        methods = getattr(route, "methods", set()) or set()
        if not methods & {"POST", "PUT", "PATCH", "DELETE"} or route.path == "/chat":
            continue
        deps = [d.call for d in route.dependant.dependencies]
        assert main.require_api_key in deps, route.path


# ── b. Blockchain signer ───────────────────────────────────────────────────
@pytest.mark.parametrize(
    "network,allowed",
    [
        ("local", True),
        ("hardhat", True),
        ("sepolia", True),
        ("Holesky", True),
        ("mainnet", False),
        ("", False),
        ("polygon", False),
    ],
)
def test_signing_allowlist(monkeypatch, network, allowed):
    monkeypatch.setenv("BLOCKCHAIN_NETWORK", network)
    monkeypatch.setattr(main, "_chain_id", lambda: 11155111)
    assert main.signing_allowed() is allowed


@pytest.mark.parametrize(
    "chain_id,allowed",
    [
        (31337, True),
        (11155111, True),
        (17000, True),
        (1, False),
        (137, False),
        (None, False),
    ],
)
def test_signing_requires_allowlisted_chain_id(monkeypatch, chain_id, allowed):
    """A testnet label is not enough: the node must report a testnet/local chain id."""
    monkeypatch.setenv("BLOCKCHAIN_NETWORK", "sepolia")
    monkeypatch.setattr(main, "_chain_id", lambda: chain_id)
    assert main.signing_allowed() is allowed


def test_chain_id_unreachable_node_is_none(monkeypatch):
    class Boom:
        @property
        def chain_id(self):
            raise ConnectionError("no node")

    monkeypatch.setattr(main, "w3", SimpleNamespace(eth=Boom()))
    assert main._chain_id() is None


def test_send_transaction_refuses_on_mainnet(monkeypatch):
    monkeypatch.setenv("BLOCKCHAIN_NETWORK", "mainnet")
    with pytest.raises(main.SigningRefused):
        main.send_transaction(object())


def test_upload_refuses_to_sign_on_non_testnet(client, monkeypatch):
    sent = []
    monkeypatch.setattr(
        main, "contract", SimpleNamespace(functions=SimpleNamespace(registerDocument=lambda *a: a))
    )
    monkeypatch.setattr(main, "account", SimpleNamespace(address="0x0"))
    monkeypatch.setattr(main, "send_transaction", lambda fn: sent.append(fn))
    monkeypatch.setenv("BLOCKCHAIN_NETWORK", "mainnet")
    res = _upload(client)
    assert res.status_code == 503
    assert sent == []


def test_load_signer_handles_empty_and_invalid_key():
    assert main.load_signer("") is None
    assert main.load_signer("not-a-key") is None


def test_startup_with_contract_but_no_key_does_not_crash():
    env = {**os.environ, "CONTRACT_ADDRESS": "0x" + "1" * 40, "PRIVATE_KEY": ""}
    proc = subprocess.run(
        [sys.executable, "-c", "import main; assert main.contract is not None and main.account is None"],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert proc.returncode == 0, proc.stderr


# ── c. Uploads ─────────────────────────────────────────────────────────────
def test_upload_too_large_rejected(client):
    big = PDF + b"\x00" * (main.MAX_UPLOAD_BYTES + 1)
    assert _upload(client, content=big).status_code == 413


@pytest.mark.parametrize("content", [b"plain text", b"MZ\x90\x00 exe", b"<html>", b""])
def test_upload_bad_magic_bytes_rejected(client, content):
    assert _upload(client, content=content).status_code == 415


@pytest.mark.parametrize("content", [PDF, PNG, JPEG])
def test_hash_accepts_pdf_png_jpeg(client, content):
    res = client.post("/documents/hash", files={"file": ("f", content)}, headers=API_HEADERS)
    assert res.status_code == 200


# ── d. Error messages ──────────────────────────────────────────────────────
def test_root_does_not_expose_blockchain_url(client):
    data = client.get("/").json()
    assert "blockchain_url" not in data
    assert main.BLOCKCHAIN_URL not in str(data)


def test_blockchain_error_is_generic(client, monkeypatch):
    def boom(fn):
        raise RuntimeError("secret-rpc http://10.0.0.1:8545 key=abc")

    monkeypatch.setattr(
        main, "contract", SimpleNamespace(functions=SimpleNamespace(registerDocument=lambda *a: a))
    )
    monkeypatch.setattr(main, "account", SimpleNamespace(address="0x0"))
    monkeypatch.setattr(main, "send_transaction", boom)
    monkeypatch.setenv("BLOCKCHAIN_NETWORK", "sepolia")
    monkeypatch.setattr(main, "_chain_id", lambda: 11155111)
    res = _upload(client)
    assert res.status_code == 502
    assert "secret-rpc" not in res.text and "10.0.0.1" not in res.text


def test_verify_error_is_generic(client, monkeypatch):
    def boom(_):
        raise RuntimeError("secret-internal")

    monkeypatch.setattr(main, "contract", SimpleNamespace(functions=SimpleNamespace(verifyDocument=boom)))
    res = client.get("/documents/verify/0x" + "a" * 64)
    assert res.status_code == 404
    assert "secret-internal" not in res.text


def test_chat_internal_error_is_generic(client, monkeypatch):
    import chat

    def boom(*a, **k):
        raise RuntimeError("secret-llm-error")

    monkeypatch.setattr(chat, "run_chat", boom)
    res = client.post("/chat", json={"message": "Olá"})
    assert res.status_code == 502
    assert "secret-llm-error" not in res.text


# ── e. CORS ────────────────────────────────────────────────────────────────
def test_cors_allows_default_origin(client):
    res = client.get("/", headers={"Origin": "http://localhost:3000"})
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_cors_blocks_unknown_origin(client):
    res = client.get("/", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in res.headers


def test_parse_cors_origins_drops_wildcard():
    assert main.parse_cors_origins(" https://a.app , *, ,http://b ") == ["https://a.app", "http://b"]


# ── f. Query params / hash format ──────────────────────────────────────────
@pytest.mark.parametrize("days,status", [(30, 200), (0, 200), (3650, 200), (-1, 422), (3651, 422)])
def test_expiring_days_bounds(client, days, status):
    assert client.get("/documents/expiring", params={"days": days}).status_code == status


@pytest.mark.parametrize("bad", ["abc", "0x123", "0x" + "g" * 64, "0x" + "a" * 65])
def test_verify_rejects_bad_hash(client, bad):
    assert client.get(f"/documents/verify/{bad}").status_code == 400


# ── g. /chat rate limit and length ─────────────────────────────────────────
def test_chat_rate_limited(client):
    for _ in range(main.CHAT_RATE_LIMIT):
        assert client.post("/chat", json={"message": "Olá"}).status_code == 200
    assert client.post("/chat", json={"message": "Olá"}).status_code == 429


def test_chat_message_too_long_rejected(client):
    assert client.post("/chat", json={"message": "x" * 501}).status_code == 422


# ── h. Second pass ─────────────────────────────────────────────────────────
@pytest.mark.parametrize("value", ["   ", "\t\n", ""])
def test_whitespace_server_key_counts_as_unset(client, monkeypatch, value):
    monkeypatch.setenv("AEROLICENSE_API_KEY", value)
    assert _upload(client, headers={"X-API-Key": value}).status_code == 503


@pytest.mark.parametrize("path", ["verify", "qr"])
def test_hash_with_trailing_newline_rejected(client, path):
    assert client.get(f"/documents/{path}/0x" + "a" * 64 + "%0A").status_code == 400
    assert client.get(f"/documents/{path}/0x" + "a" * 64).status_code == 200


def test_check_hash_format_uses_fullmatch():
    with pytest.raises(main.HTTPException):
        main.check_hash_format("0x" + "a" * 64 + "\n")


def test_documents_content_length_rejected_before_parsing(client, monkeypatch):
    """The guard answers 413 from the header alone: the route is never reached."""

    async def never(*a, **k):
        raise AssertionError("upload handler must not run")

    monkeypatch.setattr(main, "read_upload", never)
    big = main.MAX_DOCUMENTS_REQUEST_BYTES + 1
    res = client.post(
        "/documents/hash",
        content=b"x",
        headers={
            **API_HEADERS,
            "Content-Length": str(big),
            "Content-Type": "multipart/form-data; boundary=x",
        },
    )
    assert res.status_code == 413


def test_documents_guard_checks_api_key_before_parsing(client, monkeypatch):
    async def never(*a, **k):
        raise AssertionError("upload handler must not run")

    monkeypatch.setattr(main, "read_upload", never)
    res = client.post("/documents/hash", files={"file": ("a.pdf", PDF)}, headers={"X-API-Key": "wrong"})
    assert res.status_code == 401
    monkeypatch.setenv("AEROLICENSE_API_KEY", " ")
    res = client.post("/documents/hash", files={"file": ("a.pdf", PDF)}, headers=API_HEADERS)
    assert res.status_code == 503


def test_documents_guard_keeps_cors_headers(client):
    res = client.post(
        "/documents/hash",
        files={"file": ("a.pdf", PDF)},
        headers={"X-API-Key": "wrong", "Origin": "http://localhost:3000"},
    )
    assert res.status_code == 401
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_documents_guard_ignores_get_and_other_paths(client):
    assert client.get("/documents/expiring").status_code == 200
    assert client.post("/chat", json={"message": "Olá"}).status_code == 200


def test_chat_rate_limiter_evicts_stale_keys(client, monkeypatch):
    import time
    from collections import deque

    old = time.monotonic() - 10 * main.CHAT_RATE_WINDOW
    for i in range(50):
        main._chat_hits[f"10.0.0.{i}"] = deque([old])
    main._chat_hits["10.0.1.1"] = deque()
    monkeypatch.setattr(main, "_chat_last_sweep", 0.0)
    assert client.post("/chat", json={"message": "Olá"}).status_code == 200
    assert all(not k.startswith("10.0.") for k in main._chat_hits)
    assert len(main._chat_hits) == 1  # only the test client's own IP
