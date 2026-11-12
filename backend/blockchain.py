"""
AeroLicense — Utilitários de Blockchain (Web3.py)

Explica como funciona a ligação Python ↔ Ethereum
e demonstra o conceito de hash + imutabilidade.
"""

import hashlib
import logging

from web3 import Web3

logger = logging.getLogger(__name__)


# ── Conceito 1: Hashing ────────────────────────────────────────────────────
def hash_document(file_bytes: bytes) -> str:
    """
    Qualquer ficheiro → string hexadecimal de 64 caracteres (256 bits).

    Propriedades fundamentais do SHA-256:
      - Determinístico: mesmo ficheiro = mesmo hash, sempre
      - Unidirecional: impossível reconstruir o ficheiro a partir do hash
      - Efeito avalanche: 1 bit diferente → hash completamente diferente
      - Colisões: probabilidade astronomicamente baixa (2^-256)
    """
    return hashlib.sha256(file_bytes).hexdigest()


def demonstrate_hashing():
    """Demonstração do conceito de hashing para a apresentação."""
    doc_original = b"ATPL License - Miguel Ferreira - Valid until 2026-03-15"
    doc_falsified = b"ATPL License - Miguel Ferreira - Valid until 2028-03-15"  # 1 ano a mais

    hash_original = hash_document(doc_original)
    hash_falsified = hash_document(doc_falsified)

    logger.info("=" * 60)
    logger.info("DEMONSTRAÇÃO: Por que blockchain protege documentos")
    logger.info("=" * 60)
    logger.info("Documento ORIGINAL:\n  %s", doc_original.decode())
    logger.info("Hash SHA-256:\n  %s", hash_original)
    logger.info("Documento FALSIFICADO (só 1 ano a mais):\n  %s", doc_falsified.decode())
    logger.info("Hash SHA-256:\n  %s", hash_falsified)
    logger.info("Hashes são iguais? %s", hash_original == hash_falsified)
    logger.info("→ A blockchain guarda o hash original.")
    logger.info("→ Qualquer alteração ao documento produz um hash completamente diferente.")
    logger.info("→ A falsificação é detetada na verificação.")
    logger.info("=" * 60)


# ── Conceito 2: Ligação à blockchain ──────────────────────────────────────
def connect_to_blockchain(url: str = "http://127.0.0.1:8545") -> Web3:
    """Liga ao nó Ethereum (local ou remoto)."""
    w3 = Web3(Web3.HTTPProvider(url))
    if not w3.is_connected():
        raise ConnectionError(f"Não foi possível ligar a {url}")
    logger.info("Ligado à blockchain | Bloco atual: %s", w3.eth.block_number)
    return w3


# ── Conceito 3: Criar carteira Ethereum ───────────────────────────────────
def create_pilot_wallet() -> dict:
    """
    Cada piloto tem uma carteira Ethereum — o seu identificador único na rede.
    A carteira tem:
      - Endereço público (como um IBAN): partilhado com todos
      - Chave privada: só o piloto conhece, usada para assinar transações
    """
    w3 = Web3()
    account = w3.eth.account.create()
    return {
        "address": account.address,
        "private_key": account.key.hex(),
        "note": "Guardar a chave privada em segurança — nunca partilhar!",
    }


# ── Conceito 4: Verificar transação na blockchain ─────────────────────────
def get_transaction_details(w3: Web3, tx_hash: str) -> dict:
    """
    Depois de registar um documento, a transação fica gravada para sempre.
    Qualquer pessoa pode verificar:
      - Quando foi registado (bloco + timestamp)
      - Quem registou (endereço do issuer)
      - O hash do documento
      - Que não foi alterado (hash é imutável)
    """
    receipt = w3.eth.get_transaction_receipt(tx_hash)
    block = w3.eth.get_block(receipt.blockNumber)
    return {
        "tx_hash": tx_hash,
        "block_number": receipt.blockNumber,
        "timestamp": block.timestamp,
        "gas_used": receipt.gasUsed,
        "status": "sucesso" if receipt.status == 1 else "falhou",
    }


# ── Ponto de entrada para demonstração ────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    demonstrate_hashing()

    logger.info("--- Criar carteira de piloto ---")
    wallet = create_pilot_wallet()
    # A chave privada nunca vai para o log, nem truncada.
    logger.info("Endereço: %s", wallet["address"])
