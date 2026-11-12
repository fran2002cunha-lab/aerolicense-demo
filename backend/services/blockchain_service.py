"""
Web3 connection, contract setup and the guarded transaction signer.

The contract is only set up when CONTRACT_ADDRESS is a valid, non-zero address;
otherwise the API runs in demo mode (contract is None).
"""

import hashlib
import json
import logging
import os
from pathlib import Path

from web3 import Web3

from config import BLOCKCHAIN_URL, CONTRACT_ADDRESS, PRIVATE_KEY, SIGNING_CHAIN_IDS, SIGNING_NETWORKS

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parents[1]
# Hardhat build output (full ABI), when the contract has been compiled locally.
ARTIFACT_ABI_PATH = (
    BACKEND_DIR.parent
    / "smart_contract"
    / "artifacts"
    / "contracts"
    / "AeroLicenseRegistry.sol"
    / "AeroLicenseRegistry.json"
)
# Subset of the ABI that the backend uses, shipped with the backend.
FALLBACK_ABI_PATH = BACKEND_DIR / "contract_abi.json"


def load_contract_abi() -> list:
    """ABI from the Hardhat artifact if present, else from backend/contract_abi.json."""
    if ARTIFACT_ABI_PATH.is_file():
        return json.loads(ARTIFACT_ABI_PATH.read_text(encoding="utf-8"))["abi"]
    return json.loads(FALLBACK_ABI_PATH.read_text(encoding="utf-8"))


def _chain_id() -> int | None:
    """Chain id reported by the connected node, or None if it cannot be read."""
    try:
        return int(w3.eth.chain_id)
    except Exception:
        return None


def signing_allowed() -> bool:
    """
    True only when BLOCKCHAIN_NETWORK is an allowlisted testnet/local network AND
    the node's chain id is an allowlisted one (a mislabelled mainnet RPC is refused).
    """
    if os.getenv("BLOCKCHAIN_NETWORK", "").strip().lower() not in SIGNING_NETWORKS:
        return False
    return _chain_id() in SIGNING_CHAIN_IDS


def load_signer(private_key: str):
    """Return a signing account, or None if the key is empty or invalid (no startup crash)."""
    if not private_key:
        return None
    try:
        return w3.eth.account.from_key(private_key)
    except Exception:
        logger.error("PRIVATE_KEY is invalid; blockchain writes disabled")
        return None


w3 = Web3(Web3.HTTPProvider(BLOCKCHAIN_URL))

# Only set up the contract when a valid address is configured
contract = None
account = None
_zero = "0x" + "0" * 40
if (
    CONTRACT_ADDRESS
    and CONTRACT_ADDRESS.startswith("0x")
    and len(CONTRACT_ADDRESS) == 42
    and CONTRACT_ADDRESS != _zero
):
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=load_contract_abi())
    account = load_signer(PRIVATE_KEY)
    if account is None:
        logger.warning("CONTRACT_ADDRESS set but no valid PRIVATE_KEY: read-only blockchain mode")


# ── Helper: calcular SHA-256 ───────────────────────────────────────────────
def sha256_file(data: bytes) -> bytes:
    """Calcula o SHA-256 de um ficheiro — 32 bytes para bytes32 Solidity."""
    return hashlib.sha256(data).digest()


# ── Helper: enviar transação ───────────────────────────────────────────────
class SigningRefused(RuntimeError):
    """Raised when signing is requested on a non-allowlisted network."""


def send_transaction(fn_call):
    if not signing_allowed():
        raise SigningRefused("BLOCKCHAIN_NETWORK is not an allowlisted testnet/local network")
    tx = fn_call.build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": 300_000,
            "gasPrice": w3.eth.gas_price,
        }
    )
    signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    return w3.eth.wait_for_transaction_receipt(tx_hash)
