# AeroLicense Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 production-quality features to impress an AI/ML professor: QR Code verification, OpenAI Vision OCR, analytics backend endpoints, an analytics dashboard with recharts charts, and ML-based anomaly detection with scikit-learn IsolationForest.

**Architecture:** All backend features are added to `backend/main.py` (new endpoints) and new focused modules (`backend/anomaly.py`). The existing `backend/ocr.py` is enhanced in-place to call OpenAI Vision when `OPENAI_API_KEY` is set. The frontend gains a new `AnalyticsPage.jsx` wired into the existing HashRouter, plus a QR modal in `DocumentCard.jsx`. All tests follow the existing pattern in `tests/` using pytest + FastAPI TestClient + in-memory SQLite with StaticPool.

**Tech Stack:** `qrcode[pil]`, `openai`, `scikit-learn`, `numpy`, `recharts` (React)

---

## File Structure

**New files:**
- `backend/anomaly.py` — IsolationForest anomaly detection (no FastAPI dependency, pure ML)
- `tests/conftest.py` — shared pytest fixture (TestClient + in-memory SQLite) used by all test files
- `tests/test_qr.py` — QR endpoint tests
- `tests/test_analytics.py` — analytics + anomaly endpoint tests
- `frontend/src/pages/AnalyticsPage.jsx` — analytics dashboard page (recharts charts + anomaly panel)

**Modified files:**
- `backend/ocr.py` — add `_ai_ocr` function using OpenAI Vision; call it from `extract_from_image` when `OPENAI_API_KEY` is set
- `backend/main.py` — add 5 new endpoints: `/documents/qr/{hash}`, `/analytics/summary`, `/analytics/monthly`, `/analytics/distribution`, `/analytics/anomalies`; also update the `/documents/upload` endpoint to call `extract_from_image` via ocr module
- `frontend/src/api.js` — add `analyticsS ummary`, `analyticsMonthly`, `analyticsDistribution`, `analyticsAnomalies`, `documentQr`
- `frontend/src/App.jsx` — add `/analytics` route
- `frontend/src/components/Sidebar.jsx` — add Analytics nav link
- `frontend/src/components/DocumentCard.jsx` — add QR button + modal overlay

---

## Task 1: Shared test fixture (conftest.py)

**Files:**
- Create: `tests/conftest.py`

- [ ] **Step 1: Create conftest.py**

```python
# tests/conftest.py
import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database import Base, get_db, seed_demo_data
from main import app

@pytest.fixture
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)

    def override_get_db():
        db = TestSession()
        seed_demo_data(db)
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 2: Verify existing tests still pass with conftest**

Run:
```bash
cd /Users/franciscocunha/aerolicense-demo && source backend/venv/bin/activate && python -m pytest tests/ -v 2>&1 | tail -20
```
Expected: 7 passed. (The existing test files define their own `client` fixture which takes priority over conftest — this is fine for now. New test files will use conftest's fixture automatically.)

- [ ] **Step 3: Commit**

```bash
git add tests/conftest.py
git commit -m "test: add shared conftest.py fixture for all test files"
```

---

## Task 2: QR Code backend endpoint

**Files:**
- Modify: `backend/main.py` (add import + new endpoint)
- Create: `tests/test_qr.py`

Install dependency first:
```bash
cd /Users/franciscocunha/aerolicense-demo/backend && source venv/bin/activate && pip install "qrcode[pil]"
```

- [ ] **Step 1: Write the failing test**

```python
# tests/test_qr.py
def test_qr_returns_png(client):
    hash_val = "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1"
    res = client.get(f"/documents/qr/{hash_val}")
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"
    assert len(res.content) > 100  # non-empty PNG

def test_qr_any_hash_works(client):
    res = client.get("/documents/qr/0x0000000000000000000000000000000000000000000000000000000000000000")
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/franciscocunha/aerolicense-demo && source backend/venv/bin/activate && python -m pytest tests/test_qr.py -v
```
Expected: FAIL with 404 or ImportError.

- [ ] **Step 3: Add the endpoint to main.py**

Add these imports at the top of `backend/main.py` (after existing imports):
```python
import io
import qrcode
from fastapi.responses import Response
```

Add this endpoint after the `/documents/expiring` endpoint:
```python
@app.get("/documents/qr/{doc_hash}", tags=["Documentos"])
def get_document_qr(doc_hash: str):
    """
    Gera um QR Code que qualquer entidade pode escanear para verificar
    a autenticidade do documento diretamente na blockchain.
    """
    verify_url = f"http://localhost:8000/documents/verify/{doc_hash}"
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(verify_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0A1F44", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="image/png")
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/franciscocunha/aerolicense-demo && source backend/venv/bin/activate && python -m pytest tests/test_qr.py -v
```
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/main.py tests/test_qr.py
git commit -m "feat: add QR code generation endpoint for document verification"
```

---

## Task 3: QR Code frontend display in DocumentCard

**Files:**
- Modify: `frontend/src/components/DocumentCard.jsx`

- [ ] **Step 1: Add QR state and fetch function to DocumentCard**

In `DocumentCard.jsx`, add after the existing `useState` declarations (around line 25):
```jsx
const [showQr, setShowQr] = useState(false);
const [qrUrl, setQrUrl]   = useState(null);

async function loadQr() {
  if (qrUrl) { setShowQr(true); return; }
  const url = `${API_URL}/documents/qr/${document.hash}`;
  const res = await fetch(url);
  const blob = await res.blob();
  setQrUrl(URL.createObjectURL(blob));
  setShowQr(true);
}
```

- [ ] **Step 2: Add QR button and modal to the JSX**

Replace the entire `return (...)` block in DocumentCard.jsx with this (it adds a QR button row and a modal overlay):

```jsx
  return (
    <div style={styles.card}>

      {/* QR modal overlay */}
      {showQr && (
        <div style={styles.qrOverlay} onClick={() => setShowQr(false)}>
          <div style={styles.qrBox} onClick={e => e.stopPropagation()}>
            <p style={{ color: '#AABBCC', fontSize: 12, marginTop: 0, marginBottom: 8 }}>
              Scaneie para verificar na blockchain
            </p>
            {qrUrl && <img src={qrUrl} alt="QR Code" style={{ width: 180, height: 180 }} />}
            <button onClick={() => setShowQr(false)} style={styles.qrClose}>Fechar</button>
          </div>
        </div>
      )}

      {/* Barra colorida de estado */}
      <div style={{ ...styles.statusBar, backgroundColor: color }} />

      {/* Cabeçalho */}
      <div style={styles.header}>
        <div>
          <span style={styles.icon}>{icon}</span>
          <span style={{ ...styles.statusBadge, backgroundColor: color }}>{label}</span>
        </div>
        <span style={styles.docType}>{DOC_TYPE_LABELS[document.doc_type]}</span>
      </div>

      {/* Nome do documento */}
      <p style={styles.description}>{document.description}</p>

      {/* Datas */}
      <div style={styles.dateRow}>
        <span style={styles.dateLabel}>Validade:</span>
        <span style={{ color, fontWeight: 'bold' }}>{expiryDate}</span>
      </div>

      {/* Barra de progresso dos dias restantes */}
      {document.status !== 'expired' && (
        <div style={styles.progressContainer}>
          <div
            style={{
              ...styles.progressBar,
              width: `${Math.min(100, (daysLeft / 365) * 100)}%`,
              backgroundColor: color,
            }}
          />
          <span style={styles.progressLabel}>{daysLeft} dias restantes</span>
        </div>
      )}

      {/* Hash do documento (identificador na blockchain) */}
      <div style={styles.hashRow}>
        <span style={styles.hashLabel}>Hash blockchain:</span>
        <code style={styles.hash}>
          {document.hash.slice(0, 10)}...{document.hash.slice(-6)}
        </code>
      </div>

      {/* Botões de acção */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={verifyOnBlockchain}
          disabled={verifying}
          style={{ ...styles.button, flex: 1, opacity: verifying ? 0.6 : 1 }}
        >
          {verifying ? 'A verificar...' : '🔗 Verificar Blockchain'}
        </button>
        <button onClick={loadQr} style={{ ...styles.button, width: 48, flex: 'none' }} title="Gerar QR Code">
          📱
        </button>
      </div>

      {/* Resultado da verificação */}
      {verification && (
        <div style={{
          ...styles.verificationResult,
          borderColor: verification.is_authentic && !verification.is_expired ? '#27AE60' : '#C0392B',
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: verification.is_authentic ? '#27AE60' : '#C0392B' }}>
            {verification.message}
          </p>
          <p style={styles.txNote}>
            Verificado diretamente na Ethereum — não pode ser falsificado.
          </p>
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          <p style={{ margin: 0, color: '#C0392B' }}>Erro: {error}</p>
        </div>
      )}
    </div>
  );
```

- [ ] **Step 3: Add QR styles to the styles object**

In the `styles` object at the bottom of DocumentCard.jsx, add these entries after `errorBox`:
```jsx
  qrOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  qrBox: {
    background: '#fff', borderRadius: 12, padding: '24px 28px',
    textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  qrClose: {
    marginTop: 12, padding: '8px 24px', background: '#0A1F44',
    border: 'none', borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: 'pointer',
  },
```

- [ ] **Step 4: Test in browser**

Open http://localhost:3000, navigate to any pilot, click the 📱 button on a document card. A modal should appear with a QR code. Click outside the modal or "Fechar" to dismiss it.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/DocumentCard.jsx
git commit -m "feat: add QR code modal to DocumentCard for instant verification"
```

---

## Task 4: OpenAI Vision OCR upgrade

**Files:**
- Modify: `backend/ocr.py`

Install dependency:
```bash
cd /Users/franciscocunha/aerolicense-demo/backend && source venv/bin/activate && pip install openai
```

- [ ] **Step 1: Add `_ai_ocr` function to ocr.py**

Add this import at the top of `backend/ocr.py` (after existing imports):
```python
import os
import base64
import json
```

Add this function before `extract_from_image`:
```python
def _ai_ocr(image_bytes: bytes, filename: str, file_hash: str) -> dict:
    """
    Extrai dados de documentos aeronáuticos usando OpenAI Vision (GPT-4o-mini).
    Requer OPENAI_API_KEY no ambiente. Fallback automático se a chave não estiver definida.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None  # caller falls back to _demo_fallback

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

        raw = response.choices[0].message.content.strip()
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
```

- [ ] **Step 2: Update `extract_from_image` to try AI OCR first**

Replace the `extract_from_image` function body (starting from `file_hash = ...`) with:
```python
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
```

- [ ] **Step 3: Run existing tests to confirm nothing broke**

```bash
cd /Users/franciscocunha/aerolicense-demo && source backend/venv/bin/activate && python -m pytest tests/ -v 2>&1 | tail -15
```
Expected: all previously passing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add backend/ocr.py
git commit -m "feat: upgrade OCR to use OpenAI Vision (GPT-4o-mini) with graceful fallback"
```

---

## Task 5: Analytics backend endpoints

**Files:**
- Modify: `backend/main.py` (4 new endpoints)
- Create: `tests/test_analytics.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_analytics.py

def test_analytics_summary(client):
    res = client.get("/analytics/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_pilots"] == 3
    assert data["total_documents"] == 9
    assert "compliance_rate" in data
    assert isinstance(data["compliance_rate"], float)

def test_analytics_monthly_has_12_months(client):
    res = client.get("/analytics/monthly")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 12
    assert all("month" in m and "count" in m for m in data)

def test_analytics_distribution_covers_doc_types(client):
    res = client.get("/analytics/distribution")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    assert all("type" in d and "count" in d for d in data)
    total = sum(d["count"] for d in data)
    assert total == 9

def test_analytics_anomalies_returns_list(client):
    res = client.get("/analytics/anomalies")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "anomalies" in data
    assert isinstance(data["anomalies"], list)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/franciscocunha/aerolicense-demo && source backend/venv/bin/activate && python -m pytest tests/test_analytics.py -v
```
Expected: 4 FAIL with 404.

- [ ] **Step 3: Add analytics endpoints to main.py**

Add these imports to `backend/main.py` (after existing imports, `date` is already imported):
```python
# (no new imports needed beyond what's already there)
```

Add these 4 endpoints after the `/demo/blockchain` endpoint at the bottom of `backend/main.py`:

```python
# ══════════════════════════════════════════════════════════════════════════
# ANALYTICS ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════

@app.get("/analytics/summary", tags=["Analytics"])
def analytics_summary(db: Session = Depends(get_db)):
    """KPIs globais: total de pilotos, documentos, taxa de conformidade."""
    today  = date.today()
    pilots = db.query(Pilot).all()
    docs   = db.query(Document).all()

    expired      = sum(1 for d in docs if date.fromisoformat(d.expires_at) <= today)
    expiring_30  = sum(1 for d in docs if 0 < (date.fromisoformat(d.expires_at) - today).days <= 30)
    valid        = len(docs) - expired - expiring_30

    compliant = sum(
        1 for p in pilots
        if all((date.fromisoformat(d.expires_at) - today).days > 0 for d in p.documents)
    )

    return {
        "total_pilots":     len(pilots),
        "total_documents":  len(docs),
        "valid":            valid,
        "expiring_soon":    expiring_30,
        "expired":          expired,
        "compliance_rate":  round(compliant / len(pilots) * 100, 1) if pilots else 0.0,
        "compliant_pilots": compliant,
    }


@app.get("/analytics/monthly", tags=["Analytics"])
def analytics_monthly(db: Session = Depends(get_db)):
    """Número de documentos a expirar por mês nos próximos 12 meses."""
    today = date.today()
    docs  = db.query(Document).all()

    # Build ordered dict for next 12 calendar months
    months = {}
    for i in range(12):
        total_months = today.month - 1 + i
        year  = today.year + total_months // 12
        month = total_months % 12 + 1
        key   = f"{year}-{month:02d}"
        months[key] = 0

    for d in docs:
        key = d.expires_at[:7]  # "YYYY-MM"
        if key in months:
            months[key] += 1

    return [{"month": k, "count": v} for k, v in months.items()]


@app.get("/analytics/distribution", tags=["Analytics"])
def analytics_distribution(db: Session = Depends(get_db)):
    """Contagem de documentos por tipo."""
    docs   = db.query(Document).all()
    counts: dict = {}
    for d in docs:
        counts[d.doc_type] = counts.get(d.doc_type, 0) + 1
    return [{"type": k, "count": v} for k, v in counts.items()]


@app.get("/analytics/anomalies", tags=["Analytics"])
def analytics_anomalies(db: Session = Depends(get_db)):
    """
    Detecção de anomalias com ML (scikit-learn IsolationForest).
    Analisa padrões de emissão, validade e emissor para identificar documentos suspeitos.
    """
    import anomaly as anomaly_module
    docs = db.query(Document).all()
    doc_dicts = [
        {
            "id":          d.id,
            "pilot_id":    d.pilot_id,
            "doc_type":    d.doc_type,
            "description": d.description,
            "hash":        d.hash,
            "issued_at":   d.issued_at,
            "expires_at":  d.expires_at,
            "issuer":      d.issuer,
        }
        for d in docs
    ]
    detected = anomaly_module.detect_anomalies(doc_dicts)
    return {"total": len(detected), "anomalies": detected}
```

- [ ] **Step 4: Run tests to verify they fail (anomalies endpoint will fail because anomaly.py doesn't exist yet)**

```bash
cd /Users/franciscocunha/aerolicense-demo && source backend/venv/bin/activate && python -m pytest tests/test_analytics.py::test_analytics_summary tests/test_analytics.py::test_analytics_monthly_has_12_months tests/test_analytics.py::test_analytics_distribution_covers_doc_types -v
```
Expected: 3 passed. The anomalies test will be done in the next task.

- [ ] **Step 5: Commit**

```bash
git add backend/main.py tests/test_analytics.py
git commit -m "feat: add analytics endpoints (summary, monthly, distribution, anomalies)"
```

---

## Task 6: Anomaly detection module (scikit-learn)

**Files:**
- Create: `backend/anomaly.py`

Install dependency:
```bash
cd /Users/franciscocunha/aerolicense-demo/backend && source venv/bin/activate && pip install scikit-learn numpy
```

- [ ] **Step 1: Create backend/anomaly.py**

```python
# backend/anomaly.py
"""
AeroLicense — Detecção de Anomalias com ML
Usa scikit-learn IsolationForest para identificar documentos com padrões suspeitos.

Features analisadas por documento:
  - días_até_expiração (negativo = já expirado)
  - emitido_fim_semana (0/1) — documentos reais raramente são emitidos ao fim de semana
  - frequência_do_emissor — emissores raros são mais suspeitos
  - período_de_validade_dias — validade inusualmente curta ou longa é suspeita
"""

from datetime import date

try:
    import numpy as np
    from sklearn.ensemble import IsolationForest
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False


def detect_anomalies(documents: list) -> list:
    """
    Recebe lista de dicts com chaves: issued_at, expires_at, issuer, description, pilot_id.
    Devolve lista dos documentos considerados anómalos pelo IsolationForest.
    """
    if not ML_AVAILABLE or len(documents) < 3:
        return []

    today = date.today()

    issuer_counts: dict = {}
    for d in documents:
        issuer_counts[d["issuer"]] = issuer_counts.get(d["issuer"], 0) + 1

    features = []
    for d in documents:
        issued  = date.fromisoformat(d["issued_at"])
        expires = date.fromisoformat(d["expires_at"])
        features.append([
            (expires - today).days,          # dias até expirar (negativo = expirado)
            1 if issued.weekday() >= 5 else 0,  # fim de semana?
            issuer_counts[d["issuer"]],      # frequência do emissor
            (expires - issued).days,         # período de validade em dias
        ])

    X = np.array(features, dtype=float)

    clf = IsolationForest(contamination=0.15, random_state=42, n_estimators=100)
    predictions = clf.fit_predict(X)
    scores      = clf.score_samples(X)

    anomalies = []
    for i, (pred, score) in enumerate(zip(predictions, scores)):
        if pred == -1:
            anomalies.append({
                **documents[i],
                "anomaly_score": round(float(score), 4),
                "reasons":       _explain(features[i], X),
            })

    return anomalies


def _explain(feat: list, X_all) -> list:
    """Gera explicações legíveis para cada dimensão anómala."""
    import numpy as np
    means = X_all.mean(axis=0)
    stds  = X_all.std(axis=0) + 1e-9  # avoid division by zero

    reasons = []
    for i, (val, mean, std) in enumerate(zip(feat, means, stds)):
        z = abs(val - mean) / std
        if z < 1.5:
            continue
        if i == 0:
            reasons.append("Documento expirado há muito tempo" if val < 0 else "Prazo de validade muito distante")
        elif i == 1 and val == 1:
            reasons.append("Emitido ao fim de semana (incomum)")
        elif i == 2 and val < mean:
            reasons.append("Entidade emissora pouco frequente")
        elif i == 3:
            reasons.append(
                "Período de validade inusualmente longo" if val > mean
                else "Período de validade inusualmente curto"
            )

    return reasons if reasons else ["Padrão estatisticamente anómalo"]
```

- [ ] **Step 2: Run the anomaly test**

```bash
cd /Users/franciscocunha/aerolicense-demo && source backend/venv/bin/activate && python -m pytest tests/test_analytics.py::test_analytics_anomalies_returns_list -v
```
Expected: PASS.

- [ ] **Step 3: Run all tests**

```bash
cd /Users/franciscocunha/aerolicense-demo && source backend/venv/bin/activate && python -m pytest tests/ -v 2>&1 | tail -20
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/anomaly.py
git commit -m "feat: add ML anomaly detection module (IsolationForest via scikit-learn)"
```

---

## Task 7: Analytics frontend page

**Files:**
- Create: `frontend/src/pages/AnalyticsPage.jsx`
- Modify: `frontend/src/api.js`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`

Install recharts:
```bash
cd /Users/franciscocunha/aerolicense-demo/frontend && npm install recharts
```

- [ ] **Step 1: Add analytics API helpers to api.js**

Replace the entire content of `frontend/src/api.js` with:
```js
const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

async function request(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  status:               () => request('/'),
  pilots:               () => request('/demo/pilotos'),
  pilot:                (id) => request(`/demo/pilotos/${id}`),
  alerts:               () => request('/demo/alertas'),
  blockchainDemo:       () => request('/demo/blockchain'),
  verifyDocument:       (hash) => request(`/documents/verify/${hash}`),
  analyticsSummary:     () => request('/analytics/summary'),
  analyticsMonthly:     () => request('/analytics/monthly'),
  analyticsDistribution: () => request('/analytics/distribution'),
  analyticsAnomalies:   () => request('/analytics/anomalies'),
};
```

- [ ] **Step 2: Create AnalyticsPage.jsx**

```jsx
// frontend/src/pages/AnalyticsPage.jsx
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';

const COLORS = ['#0087CC', '#27AE60', '#F0A500', '#E74C3C', '#9B59B6', '#1ABC9C'];

export default function AnalyticsPage() {
  const [summary,      setSummary]      = useState(null);
  const [monthly,      setMonthly]      = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [anomalies,    setAnomalies]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);

  useEffect(() => {
    Promise.all([
      api.analyticsSummary(),
      api.analyticsMonthly(),
      api.analyticsDistribution(),
      api.analyticsAnomalies(),
    ])
      .then(([s, m, d, a]) => {
        setSummary(s);
        setMonthly(m);
        setDistribution(d);
        setAnomalies(a);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  return (
    <div>
      <h2 style={s.title}>Analytics & Inteligência Artificial</h2>

      {/* KPI Cards */}
      <div style={s.kpiRow}>
        <KpiCard label="Pilotos"      value={summary.total_pilots}    color="#0087CC" />
        <KpiCard label="Documentos"   value={summary.total_documents} color="#1A3F7A" />
        <KpiCard label="Conformidade" value={`${summary.compliance_rate}%`} color="#27AE60" />
        <KpiCard label="Válidos"      value={summary.valid}           color="#27AE60" />
        <KpiCard label="A Expirar"    value={summary.expiring_soon}   color="#F0A500" />
        <KpiCard label="Expirados"    value={summary.expired}         color="#E74C3C" />
      </div>

      {/* Charts row */}
      <div style={s.chartsRow}>

        {/* Monthly expiry bar chart */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>Expirações por Mês (próximos 12 meses)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="month"
                stroke="#445566"
                fontSize={10}
                tickFormatter={v => v.slice(5)}
              />
              <YAxis stroke="#445566" fontSize={10} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#0A2A4A', border: 'none', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#AABBCC' }}
                itemStyle={{ color: '#0087CC' }}
              />
              <Bar dataKey="count" fill="#0087CC" radius={[4, 4, 0, 0]} name="Documentos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Document type pie chart */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>Distribuição por Tipo de Documento</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={distribution}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={75}
                label={({ type, percent }) =>
                  `${TYPE_SHORT[type] || type} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
                fontSize={10}
              >
                {distribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0A2A4A', border: 'none', borderRadius: 8, fontSize: 12 }}
                formatter={(v, name) => [v, TYPE_LABELS[name] || name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Anomaly detection panel */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>
          🤖 Detecção de Anomalias — ML (scikit-learn IsolationForest)
        </h3>
        <p style={s.cardSubtitle}>
          O modelo analisa 4 features por documento: dias até expiração, dia da semana de emissão,
          frequência do emissor e período de validade. Documentos estatisticamente anómalos são sinalizados.
        </p>
        {anomalies.total === 0 ? (
          <div style={s.noAnomalies}>
            ✅ Nenhuma anomalia detectada nos {summary.total_documents} documentos analisados.
          </div>
        ) : (
          <div>
            <p style={{ color: '#F0A500', margin: '0 0 12px' }}>
              ⚠️ {anomalies.total} anomalia(s) detectada(s):
            </p>
            {anomalies.anomalies.map((a, i) => (
              <div key={i} style={s.anomalyCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{a.description}</div>
                    <div style={{ color: '#0087CC', fontSize: 12, marginTop: 2 }}>
                      Piloto: {a.pilot_id} · Tipo: {a.doc_type}
                    </div>
                    <div style={{ color: '#F0A500', fontSize: 12, marginTop: 4 }}>
                      {a.reasons.join(' · ')}
                    </div>
                  </div>
                  <div style={s.scoreBox}>
                    <div style={{ color: '#F0A500', fontSize: 11 }}>Score ML</div>
                    <div style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{a.anomaly_score}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div style={{ ...s.kpi, borderTop: `3px solid ${color}` }}>
      <div style={{ color, fontSize: 26, fontWeight: 'bold' }}>{value}</div>
      <div style={{ color: '#AABBCC', fontSize: 11, marginTop: 2 }}>{label}</div>
    </div>
  );
}

const TYPE_SHORT  = { ATPL: 'ATPL', MEDICAL_CLASS1: 'MED', ICAO_ENGLISH: 'ICAO', TYPE_RATING: 'TR', CRM_TRAINING: 'CRM', OTHER: 'OUT' };
const TYPE_LABELS = { ATPL: 'Licença ATPL', MEDICAL_CLASS1: 'Médico Cl.1', ICAO_ENGLISH: 'ICAO English', TYPE_RATING: 'Type Rating', CRM_TRAINING: 'CRM', OTHER: 'Outro' };

const s = {
  title:       { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 24, marginTop: 0 },
  kpiRow:      { display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  kpi:         { background: '#0A2A4A', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 100, textAlign: 'center' },
  chartsRow:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 },
  card:        { background: '#0A2A4A', borderRadius: 10, padding: '20px 24px', marginBottom: 20 },
  cardTitle:   { color: '#AABBCC', fontSize: 14, fontWeight: '600', marginTop: 0, marginBottom: 8 },
  cardSubtitle: { color: '#667788', fontSize: 12, marginTop: 0, marginBottom: 16 },
  noAnomalies: { color: '#27AE60', background: '#061A0D', borderRadius: 8, padding: '12px 16px' },
  anomalyCard: { background: '#061228', borderRadius: 8, padding: '12px 16px', marginBottom: 8, borderLeft: '3px solid #F0A500' },
  scoreBox:    { background: '#0A1F44', borderRadius: 8, padding: '6px 12px', textAlign: 'center', minWidth: 72 },
};
```

- [ ] **Step 3: Add route in App.jsx**

Replace the content of `frontend/src/App.jsx` with:
```jsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import Header        from './components/Header';
import Sidebar       from './components/Sidebar';
import Dashboard     from './pages/Dashboard';
import PilotDetail   from './pages/PilotDetail';
import UploadPage    from './pages/UploadPage';
import AlertsPage    from './pages/AlertsPage';
import BlockchainDemo from './pages/BlockchainDemo';
import AnalyticsPage from './pages/AnalyticsPage';

export default function App() {
  return (
    <HashRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar />
          <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1100 }}>
            <Routes>
              <Route path="/"                      element={<Dashboard />} />
              <Route path="/pilots/:id"            element={<PilotDetail />} />
              <Route path="/pilots/:id/upload"     element={<UploadPage />} />
              <Route path="/alerts"                element={<AlertsPage />} />
              <Route path="/blockchain"            element={<BlockchainDemo />} />
              <Route path="/analytics"             element={<AnalyticsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
}
```

- [ ] **Step 4: Add Analytics link to Sidebar.jsx**

Replace the content of `frontend/src/components/Sidebar.jsx` with:
```jsx
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/',           label: '👨‍✈️ Pilotos' },
  { to: '/alerts',     label: '🔔 Alertas' },
  { to: '/analytics',  label: '📊 Analytics' },
  { to: '/blockchain', label: '⛓ Blockchain' },
];

export default function Sidebar() {
  return (
    <nav style={s.nav}>
      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end
          style={({ isActive }) => ({
            ...s.link,
            background: isActive ? '#0087CC' : 'transparent',
            color: isActive ? '#fff' : '#AABBCC',
          })}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

const s = {
  nav:  { width: 200, background: '#061228', borderRight: '1px solid #0A2A4A',
    padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 },
  link: { padding: '10px 20px', textDecoration: 'none', fontSize: 14, fontWeight: '600',
    borderRadius: '0 8px 8px 0', transition: 'all 0.15s' },
};
```

- [ ] **Step 5: Test in browser**

Navigate to http://localhost:3000. Click "📊 Analytics" in the sidebar. Verify:
- 6 KPI cards appear (Pilotos=3, Documentos=9, Conformidade=%)
- Bar chart shows monthly expirations
- Pie chart shows document type distribution
- Anomaly panel shows results

- [ ] **Step 6: Run all tests**

```bash
cd /Users/franciscocunha/aerolicense-demo && source backend/venv/bin/activate && python -m pytest tests/ -v 2>&1 | tail -20
```
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api.js frontend/src/App.jsx frontend/src/components/Sidebar.jsx frontend/src/pages/AnalyticsPage.jsx
git commit -m "feat: add analytics dashboard with recharts (bar, pie) and ML anomaly panel"
```

---

## Self-Review

**Spec coverage check:**
- QR Code backend: Task 2 ✅
- QR Code frontend modal: Task 3 ✅
- OpenAI Vision OCR: Task 4 ✅
- Analytics backend (summary, monthly, distribution, anomalies): Task 5 ✅
- Anomaly detection module: Task 6 ✅
- Analytics frontend page: Task 7 ✅
- Sidebar + routing: Task 7 ✅
- Shared test fixture: Task 1 ✅

**Placeholder scan:** No TBD or TODO found.

**Type consistency:** `anomaly_score` (float) in backend matches `{a.anomaly_score}` in JSX. `reasons` (list[str]) in backend matches `{a.reasons.join(' · ')}` in JSX. `client` fixture from conftest used by all new test files.
