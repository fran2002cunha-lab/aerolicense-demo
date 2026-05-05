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
import os
import base64
import json

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

def _ai_ocr(image_bytes: bytes, filename: str, file_hash: str) -> dict | None:
    """
    Extrai dados de documentos aeronáuticos usando OpenAI Vision (GPT-4o-mini).
    Requer OPENAI_API_KEY no ambiente. Devolve None se a chave não estiver definida.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        ext  = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpeg"
        mime = "image/png" if ext == "png" else "image/jpeg"
        b64  = base64.b64encode(image_bytes).decode()

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "You are an aviation document analyser. "
                            "Extract from this document: pilot name, license number "
                            "(format PT.FCL.X.XXXXXX or similar), expiry date (ISO YYYY-MM-DD), "
                            "and document type (one of: ATPL, MEDICAL_CLASS1, ICAO_ENGLISH, "
                            "TYPE_RATING, CRM_TRAINING, OTHER). "
                            "Reply ONLY with valid JSON, no markdown: "
                            '{\"pilot_name\": \"...\", \"license_number\": \"...\", '
                            '\"expiry_date\": \"...\", \"doc_type\": \"...\"}'
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64}"},
                    },
                ],
            }],
            max_tokens=200,
        )

        raw  = response.choices[0].message.content.strip()
        data = json.loads(raw)

        return {
            "pilot_name":     data.get("pilot_name"),
            "license_number": data.get("license_number"),
            "expiry_date":    data.get("expiry_date"),
            "doc_type":       data.get("doc_type", "OTHER"),
            "raw_text":       raw,
            "sha256":         file_hash,
            "confidence":     "high",
            "ocr_available":  True,
            "fields_found":   sum(1 for v in data.values() if v),
            "ai_model":       "gpt-4o-mini",
        }
    except Exception as e:
        return {"_ai_error": str(e)}

def extract_from_image(image_bytes: bytes, filename: str = "") -> dict:
    """
    Extrai dados de um documento aeronáutico.
    Ordem de preferência: OpenAI Vision → Tesseract OCR → demo fallback.
    """
    file_hash = "0x" + hashlib.sha256(image_bytes).hexdigest()

    # 1. Tentar OpenAI Vision (requer OPENAI_API_KEY)
    ai_result = _ai_ocr(image_bytes, filename, file_hash)
    if ai_result and "_ai_error" not in ai_result:
        return ai_result

    # 2. Tentar Tesseract local
    if OCR_AVAILABLE:
        try:
            image    = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            raw_text = pytesseract.image_to_string(image, lang="eng")
            extracted = _extract_with_regex(raw_text)
            doc_type  = _detect_doc_type(raw_text)
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

    # 3. Demo fallback
    result = _demo_fallback(filename, file_hash)
    if ai_result and "_ai_error" in ai_result:
        result["ai_error"] = ai_result["_ai_error"]
    return result

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
