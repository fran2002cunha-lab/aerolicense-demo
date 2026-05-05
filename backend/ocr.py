"""
AeroLicense — OCR de Documentos Aeronáuticos

Extrai automaticamente dados de licenças e certificados:
  - Nome do titular
  - Número de licença
  - Data de validade
  - Tipo de documento
  - Entidade emissora

Usa pytesseract (Tesseract OCR) + regex para parsing.
"""

import re
import hashlib
from datetime import datetime
from typing import Optional

try:
    import pytesseract
    from PIL import Image
    import io
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

# ── Padrões regex para documentos aeronáuticos ────────────────────────────
PATTERNS = {
    "license_number": [
        r"[A-Z]{2}\.FCL\.[A-Z]\.\d{6}",      # ex: PT.FCL.A.123456 (EASA)
        r"[A-Z]{2}-FCL-\d{6}",                 # ex: PT-FCL-123456
        r"License No[.:]?\s*([A-Z0-9\-\.]+)",  # genérico
    ],
    "expiry_date": [
        r"Valid[ity]?\s*[Uu]ntil[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"Expir[ey][s]?\s*[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"Validade[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})",  # data genérica DD/MM/YYYY
    ],
    "pilot_name": [
        r"Name[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)",
        r"Holder[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)",
        r"([A-Z][A-Z]+,\s*[A-Z][a-z]+)",        # APELIDO, Nome
    ],
    "doc_type": {
        "ATPL":           ["ATPL", "Airline Transport Pilot", "Licença de Piloto de Linha Aérea"],
        "MEDICAL_CLASS1": ["Class 1", "Classe 1", "Medical Certificate", "Certificado Médico"],
        "ICAO_ENGLISH":   ["Language Proficiency", "English Level", "ICAO", "Proficiência Linguística"],
        "TYPE_RATING":    ["Type Rating", "Habilitação de Tipo", "A320", "B737", "B787"],
        "CRM_TRAINING":   ["CRM", "Crew Resource Management"],
    },
}

def _parse_date(date_str: str) -> Optional[str]:
    """Converte vários formatos de data para ISO 8601."""
    formats = ["%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%m/%d/%Y", "%Y-%m-%d"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

def _detect_doc_type(text: str) -> str:
    """Deteta o tipo de documento a partir do texto extraído."""
    text_upper = text.upper()
    for doc_type, keywords in PATTERNS["doc_type"].items():
        if any(kw.upper() in text_upper for kw in keywords):
            return doc_type
    return "OTHER"

def _extract_with_regex(text: str) -> dict:
    """Aplica os padrões regex ao texto OCR."""
    result = {"license_number": None, "expiry_date": None, "pilot_name": None}

    for pattern in PATTERNS["license_number"]:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result["license_number"] = match.group(0) if match.lastindex is None else match.group(1)
            break

    for pattern in PATTERNS["expiry_date"]:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1) if match.lastindex else match.group(0)
            parsed = _parse_date(date_str)
            if parsed:
                result["expiry_date"] = parsed
                break

    for pattern in PATTERNS["pilot_name"]:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result["pilot_name"] = match.group(1).strip()
            break

    return result

def extract_from_image(image_bytes: bytes, filename: str = "") -> dict:
    """
    Extrai dados de um documento a partir de uma imagem (JPG/PNG/PDF).

    Retorna:
      - pilot_name: nome extraído (ou None)
      - license_number: número da licença (ou None)
      - expiry_date: data de validade em ISO 8601 (ou None)
      - doc_type: tipo detetado
      - raw_text: texto bruto extraído (para debug)
      - sha256: hash do ficheiro original
      - confidence: "high" | "medium" | "low"
      - ocr_available: se o OCR estava disponível
    """
    file_hash = "0x" + hashlib.sha256(image_bytes).hexdigest()

    if not OCR_AVAILABLE:
        # Fallback demo quando Tesseract não está instalado
        return _demo_fallback(filename, file_hash)

    try:
        image    = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        raw_text = pytesseract.image_to_string(image, lang="eng")
        extracted = _extract_with_regex(raw_text)
        doc_type  = _detect_doc_type(raw_text)

        # Nível de confiança baseado em quantos campos foram encontrados
        found = sum(1 for v in extracted.values() if v)
        confidence = "high" if found == 3 else ("medium" if found >= 1 else "low")

        return {
            "pilot_name":     extracted["pilot_name"],
            "license_number": extracted["license_number"],
            "expiry_date":    extracted["expiry_date"],
            "doc_type":       doc_type,
            "raw_text":       raw_text[:500] + "..." if len(raw_text) > 500 else raw_text,
            "sha256":         file_hash,
            "confidence":     confidence,
            "ocr_available":  True,
            "fields_found":   found,
        }
    except Exception as e:
        return {**_demo_fallback(filename, file_hash), "error": str(e)}

def _demo_fallback(filename: str, file_hash: str) -> dict:
    """Resultado simulado para demonstração sem Tesseract."""
    return {
        "pilot_name":     "Miguel Ferreira",
        "license_number": "PT.FCL.A.123456",
        "expiry_date":    "2026-03-15",
        "doc_type":       "ATPL",
        "raw_text":       "[Simulado] ATPL License — Miguel Ferreira — Valid until 15/03/2026 — ANAC Portugal",
        "sha256":         file_hash,
        "confidence":     "demo",
        "ocr_available":  False,
        "fields_found":   3,
        "nota":           "Modo demo: Tesseract não instalado. Em produção, OCR real extrai dados automaticamente.",
    }
