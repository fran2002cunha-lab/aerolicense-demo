"""Settings read from the environment once at import, plus shared constants."""

import os


# CORS: explicit allowlist from CORS_ORIGINS (comma-separated), never "*".
def parse_cors_origins(raw: str) -> list[str]:
    return [o.strip() for o in raw.split(",") if o.strip() and o.strip() != "*"]


CORS_ORIGINS = parse_cors_origins(os.getenv("CORS_ORIGINS", "http://localhost:3000"))

# ── Ligação à blockchain (opcional em modo demo) ───────────────────────────
BLOCKCHAIN_URL = os.getenv("BLOCKCHAIN_URL", "http://127.0.0.1:8545")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")

# The signer only sends transactions on these networks (never mainnet).
SIGNING_NETWORKS = {"local", "hardhat", "sepolia", "holesky"}
# ...and only when the node itself reports one of these chain ids
# (31337 = Hardhat/local, 11155111 = Sepolia, 17000 = Holesky).
SIGNING_CHAIN_IDS = {31337, 11155111, 17000}

# Document types (mirror the Solidity enum)
DOC_TYPES = {
    "ATPL": 0,
    "MEDICAL_CLASS1": 1,
    "ICAO_ENGLISH": 2,
    "TYPE_RATING": 3,
    "CRM_TRAINING": 4,
    "OTHER": 5,
}

# ── Uploads ────────────────────────────────────────────────────────────────
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
# Multipart framing adds a little to the file itself; the file limit is still
# enforced exactly by read_upload.
MAX_DOCUMENTS_REQUEST_BYTES = MAX_UPLOAD_BYTES + 64 * 1024

# ── /chat ──────────────────────────────────────────────────────────────────
# History limits (cost and size of the prompt sent to the LLM)
CHAT_HISTORY_MAX_ITEMS = 20
CHAT_HISTORY_MAX_ITEM_CHARS = 1000
CHAT_HISTORY_MAX_TOTAL_CHARS = 8000

CHAT_RATE_LIMIT = 10  # requests
CHAT_RATE_WINDOW = 60  # seconds
