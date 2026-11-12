"""Request guards: API-key auth, the /documents ASGI guard, upload checks and the /chat rate limit."""

import json
import os
import re
import secrets
import threading
import time
from collections import defaultdict, deque

from fastapi import Header, HTTPException, Request, UploadFile

from config import CHAT_RATE_LIMIT, CHAT_RATE_WINDOW, MAX_DOCUMENTS_REQUEST_BYTES, MAX_UPLOAD_BYTES


# ── Auth for write endpoints ───────────────────────────────────────────────
def api_key_error(x_api_key: str | None) -> tuple[int, str] | None:
    """
    (status, detail) if the request may not use a write endpoint, else None.
    Write endpoints need X-API-Key == AEROLICENSE_API_KEY. If the env var is unset
    or only whitespace, write endpoints are disabled entirely (503).
    """
    expected = os.getenv("AEROLICENSE_API_KEY", "").strip()
    if not expected:
        return 503, "write endpoints disabled"
    if not x_api_key or not secrets.compare_digest(x_api_key.encode(), expected.encode()):
        return 401, "Chave de API inválida ou em falta."
    return None


def require_api_key(x_api_key: str | None = Header(None)):
    if err := api_key_error(x_api_key):
        raise HTTPException(*err)


# ── Upload validation ──────────────────────────────────────────────────────
_UPLOAD_CHUNK = 64 * 1024
# Accepted types, identified by magic bytes (the client's Content-Type is not trusted).
_MAGIC_BYTES = (b"%PDF", b"\x89PNG\r\n\x1a\n", b"\xff\xd8\xff")


async def read_upload(file: UploadFile) -> bytes:
    """Read the upload in chunks, stopping at 5 MB (413), and check magic bytes (415)."""
    buf = bytearray()
    while chunk := await file.read(_UPLOAD_CHUNK):
        buf.extend(chunk)
        if len(buf) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "Ficheiro demasiado grande (máximo 5 MB).")
    if not bytes(buf).startswith(_MAGIC_BYTES):
        raise HTTPException(415, "Tipo de ficheiro não suportado. Use PDF, PNG ou JPEG.")
    return bytes(buf)


_WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class DocumentsGuardMiddleware:
    """
    Pure ASGI guard for /documents/*, applied before multipart parsing:
      * writes: API key check (401/503), and a Content-Length is required (411);
      * any request with Content-Length > MAX_DOCUMENTS_REQUEST_BYTES gets 413.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not scope["path"].startswith("/documents/"):
            return await self.app(scope, receive, send)

        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope["headers"]}
        error = None
        if scope["method"] in _WRITE_METHODS:
            error = api_key_error(headers.get("x-api-key"))
        raw_length = headers.get("content-length")
        if error is None and raw_length is not None:
            try:
                too_big = int(raw_length) > MAX_DOCUMENTS_REQUEST_BYTES
            except ValueError:
                error = (400, "Content-Length inválido.")
            else:
                if too_big:
                    error = (413, "Ficheiro demasiado grande (máximo 5 MB).")
        elif error is None and scope["method"] in _WRITE_METHODS:
            error = (411, "Content-Length em falta.")

        if error is None:
            return await self.app(scope, receive, send)
        status, detail = error
        body = json.dumps({"detail": detail}, ensure_ascii=False).encode()
        await send(
            {
                "type": "http.response.start",
                "status": status,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode()),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})


# Used with fullmatch: "$" alone would accept a trailing newline.
HASH_RE = re.compile(r"0x[0-9a-fA-F]{64}")


def check_hash_format(doc_hash: str):
    if not HASH_RE.fullmatch(doc_hash):
        raise HTTPException(400, "Hash inválido. Formato esperado: 0x seguido de 64 caracteres hexadecimais.")


# ── /chat rate limit ───────────────────────────────────────────────────────
# Simple sliding window per client IP. It is per process and in memory: with
# several workers/instances each one counts separately, and it resets on restart.
# Production would use Redis or the API gateway/WAF instead.
_chat_hits: dict[str, deque] = defaultdict(deque)
_chat_lock = threading.Lock()
_chat_last_sweep = float("-inf")  # first request always sweeps, even right after boot


def _evict_stale_chat_keys(now: float):
    """Drop IPs with no hit inside the window, so the dict cannot grow without bound."""
    for ip in [ip for ip, hits in _chat_hits.items() if not hits or now - hits[-1] > CHAT_RATE_WINDOW]:
        del _chat_hits[ip]


def chat_rate_limit(request: Request):
    global _chat_last_sweep
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with _chat_lock:
        if now - _chat_last_sweep >= CHAT_RATE_WINDOW:
            _evict_stale_chat_keys(now)
            _chat_last_sweep = now
        hits = _chat_hits[ip]
        while hits and now - hits[0] > CHAT_RATE_WINDOW:
            hits.popleft()
        if len(hits) >= CHAT_RATE_LIMIT:
            raise HTTPException(429, "Demasiados pedidos. Tenta novamente daqui a um minuto.")
        hits.append(now)
