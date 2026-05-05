# AeroLicense — NLP Chatbot & Risk Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two AI-powered features: (1) a Risk Score per pilot combining ML signals into a 0–100 score, and (2) an NLP Chatbot with OpenAI function calling that answers natural-language questions about pilot compliance.

**Architecture:** Risk score is a new backend endpoint `/analytics/risk-scores` that combines document expiry data with IsolationForest anomaly signals, displayed on the Dashboard pilot cards. The chatbot is a `POST /chat` endpoint backed by OpenAI function calling with 5 tools querying the SQLite DB; the frontend is a floating chat panel rendered in `App.jsx` so it appears on every page.

**Tech Stack:** OpenAI Python SDK (already installed), `openai` JS not needed (API called server-side), recharts already installed.

---

## File Structure

**New files:**
- `backend/risk.py` — pure risk scoring logic (no FastAPI dependency)
- `backend/chat.py` — OpenAI function-calling chatbot logic (tools + loop)
- `tests/test_risk.py` — risk score unit + endpoint tests
- `tests/test_chat.py` — chat endpoint tests (mocked OpenAI)
- `frontend/src/components/ChatPanel.jsx` — floating chat UI component

**Modified files:**
- `backend/main.py` — add `GET /analytics/risk-scores` and `POST /chat` endpoints
- `frontend/src/api.js` — add `riskScores()` and `chat(message)` helpers
- `frontend/src/pages/Dashboard.jsx` — show risk score badge on pilot cards
- `frontend/src/pages/AnalyticsPage.jsx` — add risk scores section
- `frontend/src/App.jsx` — mount `<ChatPanel />` at root so it appears everywhere

---

## Task 1: Risk Score backend module + endpoint

**Files:**
- Create: `backend/risk.py`
- Modify: `backend/main.py` (new endpoint)
- Create: `tests/test_risk.py`

### Risk scoring formula
Each pilot starts at 100 points:
- **-25 per expired document** (days_until_expiry ≤ 0)
- **-10 per document expiring within 30 days** (0 < days ≤ 30)
- **-15 if any of the pilot's documents are flagged as anomalies** (flat penalty)
- Minimum score: 0

Risk level labels:
- 80–100 → `"safe"` (green `#27AE60`)
- 50–79  → `"attention"` (amber `#F0A500`)
- 0–49   → `"critical"` (red `#E74C3C`)

- [ ] **Step 1: Create backend/risk.py**

```python
# backend/risk.py
"""
AeroLicense — Cálculo de Risco por Piloto
Score 0-100 que combina: documentos expirados, a expirar, e anomalias ML.
"""

from datetime import date


def compute_pilot_score(pilot_docs: list, anomalous_hashes: set) -> dict:
    """
    pilot_docs: list of dicts with keys: hash, expires_at (ISO string)
    anomalous_hashes: set of hash strings flagged by IsolationForest

    Returns dict: {score, level, penalties}
    """
    today = date.today()
    score = 100
    penalties = []

    for d in pilot_docs:
        days = (date.fromisoformat(d["expires_at"]) - today).days
        if days <= 0:
            score -= 25
            penalties.append(f"Documento expirado: {d.get('description', d['hash'][:10])}")
        elif days <= 30:
            score -= 10
            penalties.append(f"A expirar em {days} dias: {d.get('description', d['hash'][:10])}")

    pilot_hashes = {d["hash"] for d in pilot_docs}
    if pilot_hashes & anomalous_hashes:
        score -= 15
        penalties.append("Anomalia ML detectada nos documentos")

    score = max(0, score)

    if score >= 80:
        level = "safe"
    elif score >= 50:
        level = "attention"
    else:
        level = "critical"

    return {"score": score, "level": level, "penalties": penalties}
```

- [ ] **Step 2: Write tests/test_risk.py**

```python
# tests/test_risk.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from risk import compute_pilot_score

def test_perfect_score_no_issues():
    docs = [{"hash": "0xabc", "expires_at": "2030-01-01", "description": "ATPL"}]
    result = compute_pilot_score(docs, set())
    assert result["score"] == 100
    assert result["level"] == "safe"
    assert result["penalties"] == []

def test_expired_doc_reduces_score():
    docs = [{"hash": "0xabc", "expires_at": "2020-01-01", "description": "ATPL"}]
    result = compute_pilot_score(docs, set())
    assert result["score"] == 75
    assert result["level"] == "attention"

def test_two_expired_docs():
    docs = [
        {"hash": "0xabc", "expires_at": "2020-01-01", "description": "ATPL"},
        {"hash": "0xdef", "expires_at": "2019-01-01", "description": "MED"},
    ]
    result = compute_pilot_score(docs, set())
    assert result["score"] == 50
    assert result["level"] == "attention"

def test_anomaly_penalty():
    docs = [{"hash": "0xabc", "expires_at": "2030-01-01", "description": "ATPL"}]
    result = compute_pilot_score(docs, {"0xabc"})
    assert result["score"] == 85
    assert result["level"] == "safe"

def test_critical_score():
    docs = [
        {"hash": "0xabc", "expires_at": "2020-01-01", "description": "ATPL"},
        {"hash": "0xdef", "expires_at": "2020-01-01", "description": "MED"},
        {"hash": "0xghi", "expires_at": "2020-01-01", "description": "ICAO"},
        {"hash": "0xjkl", "expires_at": "2020-01-01", "description": "TR"},
    ]
    result = compute_pilot_score(docs, set())
    assert result["score"] == 0
    assert result["level"] == "critical"

def test_risk_endpoint(client):
    res = client.get("/analytics/risk-scores")
    assert res.status_code == 200
    data = res.json()
    assert "pilots" in data
    assert len(data["pilots"]) == 3
    for p in data["pilots"]:
        assert "pilot_id" in p
        assert "pilot_name" in p
        assert "score" in p
        assert "level" in p
        assert p["level"] in ("safe", "attention", "critical")
        assert 0 <= p["score"] <= 100
```

- [ ] **Step 3: Run tests to verify unit tests pass, endpoint test fails**

```bash
cd /Users/franciscocunha/aerolicense-demo && source backend/venv/bin/activate && python -m pytest tests/test_risk.py -v 2>&1 | tail -15
```
Expected: 5 unit tests pass, `test_risk_endpoint` fails (endpoint doesn't exist yet).

- [ ] **Step 4: Add GET /analytics/risk-scores endpoint to main.py**

Add this import at the top of main.py (after existing imports):
```python
from risk import compute_pilot_score
```

Add this endpoint after the existing `/analytics/anomalies` endpoint:

```python
@app.get("/analytics/risk-scores", tags=["Analytics"])
def analytics_risk_scores(db: Session = Depends(get_db)):
    """
    Score de risco 0-100 por piloto, combinando documentos expirados,
    a expirar e anomalias ML do IsolationForest.
    """
    import sys as _sys, os as _os
    _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
    from anomaly import detect_anomalies

    pilots = db.query(Pilot).all()
    all_docs = db.query(Document).all()

    all_doc_dicts = [
        {
            "id": d.id, "pilot_id": d.pilot_id, "doc_type": d.doc_type,
            "description": d.description, "hash": d.hash,
            "issued_at": d.issued_at, "expires_at": d.expires_at, "issuer": d.issuer,
        }
        for d in all_docs
    ]
    anomalies    = detect_anomalies(all_doc_dicts)
    anomalous_hashes = {a["hash"] for a in anomalies}

    results = []
    for p in pilots:
        pilot_docs = [
            {"hash": d.hash, "expires_at": d.expires_at, "description": d.description}
            for d in p.documents
        ]
        score_data = compute_pilot_score(pilot_docs, anomalous_hashes)
        results.append({
            "pilot_id":   p.id,
            "pilot_name": p.name,
            "pilot_role": p.role,
            **score_data,
        })

    results.sort(key=lambda x: x["score"])
    return {"pilots": results}
```

- [ ] **Step 5: Run all tests**

```bash
cd /Users/franciscocunha/aerolicense-demo && source backend/venv/bin/activate && python -m pytest tests/ -v 2>&1 | tail -20
```
Expected: 20 passed (14 previous + 6 new risk tests).

- [ ] **Step 6: Commit**

No git repo — skip.

---

## Task 2: Risk Score frontend display

**Files:**
- Modify: `frontend/src/api.js`
- Modify: `frontend/src/pages/Dashboard.jsx`
- Modify: `frontend/src/pages/AnalyticsPage.jsx`

- [ ] **Step 1: Add riskScores to api.js**

Add to the `api` object in `frontend/src/api.js`:
```js
  riskScores: () => request('/analytics/risk-scores'),
```

- [ ] **Step 2: Update Dashboard.jsx to show risk score badge**

Read the current Dashboard.jsx, then make these changes:

Add `riskScores` fetch alongside the pilots fetch. Replace the `useEffect` with:

```jsx
  const [pilots,     setPilots]     = useState([]);
  const [riskMap,    setRiskMap]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);

  useEffect(() => {
    Promise.allSettled([api.pilots(), api.riskScores()])
      .then(([pilotsRes, riskRes]) => {
        if (pilotsRes.status === 'fulfilled') setPilots(pilotsRes.value.pilotos);
        else setError(true);
        if (riskRes.status === 'fulfilled') {
          const map = {};
          riskRes.value.pilots.forEach(p => { map[p.pilot_id] = p; });
          setRiskMap(map);
        }
      })
      .finally(() => setLoading(false));
  }, []);
```

Add a risk score badge inside each pilot card, after the compliance div (around line 44). Add this JSX after the `{p.compliance_ok ? ...}` div:

```jsx
              {riskMap[p.id] && (
                <div style={{
                  marginTop: 8, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{
                    background: RISK_COLORS[riskMap[p.id].level],
                    color: '#fff', fontWeight: 'bold', fontSize: 13,
                    padding: '3px 10px', borderRadius: 20,
                  }}>
                    Risk Score: {riskMap[p.id].score}
                  </div>
                </div>
              )}
```

Add the RISK_COLORS constant at module scope (before the component function):
```jsx
const RISK_COLORS = { safe: '#27AE60', attention: '#F0A500', critical: '#E74C3C' };
```

- [ ] **Step 3: Add Risk Score section to AnalyticsPage.jsx**

Read the current AnalyticsPage.jsx, then add a new risk scores section. First add state and fetch:

Add to the state declarations at the top:
```jsx
  const [riskScores, setRiskScores] = useState({ pilots: [] });
```

Add `api.riskScores()` to the `Promise.allSettled` call (5th item):
```jsx
    Promise.allSettled([
      api.analyticsSummary(),
      api.analyticsMonthly(),
      api.analyticsDistribution(),
      api.analyticsAnomalies(),
      api.riskScores(),
    ]).then(([sRes, mRes, dRes, aRes, rRes]) => {
      if (sRes.status === 'fulfilled') setSummary(sRes.value);
      else setError(true);
      if (mRes.status === 'fulfilled') setMonthly(mRes.value);
      if (dRes.status === 'fulfilled') setDistribution(dRes.value);
      if (aRes.status === 'fulfilled') setAnomalies(aRes.value);
      if (rRes.status === 'fulfilled') setRiskScores(rRes.value);
    }).finally(() => setLoading(false));
```

Add this JSX section BEFORE the anomaly card (before the `<div style={s.card}>` with "Detecção de Anomalias"):

```jsx
      {/* Risk Scores */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>🎯 Risk Score por Piloto</h3>
        <p style={s.cardSubtitle}>
          Score 0-100 calculado por ML: documentos expirados (-25), a expirar (-10), anomalias ML (-15).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {riskScores.pilots.map(p => (
            <div key={p.pilot_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 120, color: '#fff', fontSize: 13, fontWeight: 'bold', flexShrink: 0 }}>
                {p.pilot_name}
              </div>
              <div style={{ flex: 1, background: '#061228', borderRadius: 8, height: 20, overflow: 'hidden' }}>
                <div style={{
                  width: `${p.score}%`, height: '100%',
                  background: RISK_COLORS_A[p.level],
                  transition: 'width 0.5s ease', borderRadius: 8,
                }} />
              </div>
              <div style={{
                width: 40, color: RISK_COLORS_A[p.level],
                fontWeight: 'bold', fontSize: 14, textAlign: 'right', flexShrink: 0,
              }}>
                {p.score}
              </div>
            </div>
          ))}
        </div>
      </div>
```

Add the RISK_COLORS_A constant at module scope in AnalyticsPage.jsx (after the COLORS array):
```jsx
const RISK_COLORS_A = { safe: '#27AE60', attention: '#F0A500', critical: '#E74C3C' };
```

- [ ] **Step 4: Verify frontend compiles**

```bash
sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
Expected: 200.

---

## Task 3: NLP Chatbot backend

**Files:**
- Create: `backend/chat.py`
- Modify: `backend/main.py` (new POST /chat endpoint)
- Create: `tests/test_chat.py`

The chatbot uses OpenAI function calling. The LLM decides which tool(s) to call based on the user's question, the tools query SQLite, and the results are fed back to the LLM for a final natural-language response in Portuguese.

**Tools available to the LLM:**
1. `get_pilots_summary` — list all pilots with doc counts and compliance
2. `get_expiring_documents` — docs expiring within N days
3. `get_pilot_detail` — all docs for a specific pilot
4. `get_risk_scores` — risk scores for all pilots
5. `get_anomalies` — ML-detected anomalies

- [ ] **Step 1: Create backend/chat.py**

```python
# backend/chat.py
"""
AeroLicense — Chatbot NLP com OpenAI Function Calling
Responde em português a perguntas sobre conformidade de pilotos aeronáuticos.
"""

import json
import os
from datetime import date

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_pilots_summary",
            "description": "Lista todos os pilotos com contagem de documentos e estado de conformidade.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_expiring_documents",
            "description": "Lista documentos que expiram dentro de N dias.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Número de dias (padrão 30)",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_pilot_detail",
            "description": "Devolve todos os documentos de um piloto específico.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pilot_id": {
                        "type": "string",
                        "description": "ID do piloto (ex: P001, P002, P003)",
                    }
                },
                "required": ["pilot_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_risk_scores",
            "description": "Devolve o score de risco (0-100) de todos os pilotos.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_anomalies",
            "description": "Devolve documentos com padrões anómalos detectados por ML (IsolationForest).",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]

SYSTEM_PROMPT = """És o assistente de IA da plataforma AeroLicense — um sistema de gestão documental para profissionais de aviação com verificação blockchain.

Respondes SEMPRE em português europeu. És conciso, preciso e profissional.
Quando apresentares listas, usa bullet points (•).
Quando mencionares scores ou percentagens, destaca-os.
Se não souberes algo, diz-o claramente em vez de inventar.
"""


def run_chat(user_message: str, db_tools_fn: dict) -> str:
    """
    user_message: string from the user
    db_tools_fn: dict mapping tool_name -> callable(args) -> dict

    Returns: assistant's response string in Portuguese
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _demo_response(user_message)

    from openai import OpenAI
    client = OpenAI(api_key=api_key)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_message},
    ]

    # Agentic loop: LLM calls tools until it has enough info to answer
    for _ in range(5):  # max 5 tool calls to prevent infinite loops
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )
        msg = response.choices[0].message

        if not msg.tool_calls:
            return msg.content or "Não foi possível gerar uma resposta."

        messages.append({"role": "assistant", "content": msg.content, "tool_calls": [
            {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
            for tc in msg.tool_calls
        ]})

        for tc in msg.tool_calls:
            fn_name = tc.function.name
            fn_args = json.loads(tc.function.arguments or "{}")
            fn      = db_tools_fn.get(fn_name)
            result  = fn(**fn_args) if fn else {"error": f"Tool {fn_name} not found"}
            messages.append({
                "role":         "tool",
                "tool_call_id": tc.id,
                "content":      json.dumps(result, ensure_ascii=False, default=str),
            })

    return "Limite de iterações atingido. Tenta reformular a pergunta."


def _demo_response(user_message: str) -> str:
    """Resposta demo quando OPENAI_API_KEY não está definida."""
    msg = user_message.lower()
    if any(w in msg for w in ["expirar", "expirado", "validade", "alerta"]):
        return "💡 Demo: Para ver documentos a expirar, vai a 🔔 Alertas na barra lateral. (Define OPENAI_API_KEY para respostas com IA real.)"
    if any(w in msg for w in ["piloto", "pilotos"]):
        return "💡 Demo: Há 3 pilotos registados: Miguel Ferreira, Ana Santos e Carlos Mendes. (Define OPENAI_API_KEY para respostas com IA real.)"
    if any(w in msg for w in ["risco", "score", "risk"]):
        return "💡 Demo: O score de risco combina documentos expirados, a expirar e anomalias ML. Vê 📊 Analytics para os detalhes. (Define OPENAI_API_KEY para respostas com IA real.)"
    return "💡 Demo: Sou o assistente AeroLicense. Define OPENAI_API_KEY no backend/.env para ativar respostas com IA real (GPT-4o-mini)."
```

- [ ] **Step 2: Create tests/test_chat.py**

```python
# tests/test_chat.py

def test_chat_endpoint_exists(client):
    res = client.post("/chat", json={"message": "Olá"})
    assert res.status_code == 200
    data = res.json()
    assert "response" in data
    assert isinstance(data["response"], str)
    assert len(data["response"]) > 0

def test_chat_demo_mode_pilots_question(client):
    res = client.post("/chat", json={"message": "Quantos pilotos temos?"})
    assert res.status_code == 200
    # In demo mode (no OPENAI_API_KEY), returns a demo response
    data = res.json()
    assert "response" in data

def test_chat_empty_message_rejected(client):
    res = client.post("/chat", json={"message": ""})
    assert res.status_code == 422  # FastAPI validation error
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/franciscocunha/aerolicense-demo && source backend/venv/bin/activate && python -m pytest tests/test_chat.py -v
```
Expected: FAIL (endpoint doesn't exist).

- [ ] **Step 4: Add POST /chat endpoint to main.py**

Add this Pydantic schema after the existing schemas (after `VerifyResponse`):
```python
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
```

Add `Field` to the Pydantic import:
```python
from pydantic import BaseModel, Field
```

Add this endpoint after the `/analytics/risk-scores` endpoint:

```python
@app.post("/chat", tags=["Chat IA"])
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Chatbot NLP com OpenAI function calling.
    Responde em português a perguntas sobre conformidade documental de pilotos.
    """
    import sys as _sys, os as _os
    _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
    from chat import run_chat
    from anomaly import detect_anomalies
    from risk import compute_pilot_score

    today = date.today()

    def _get_pilots_summary():
        pilots = db.query(Pilot).all()
        return [
            {
                "id": p.id, "nome": p.name, "cargo": p.role,
                "total_docs": len(p.documents),
                "expirados":  sum(1 for d in p.documents if (date.fromisoformat(d.expires_at) - today).days <= 0),
                "a_expirar":  sum(1 for d in p.documents if 0 < (date.fromisoformat(d.expires_at) - today).days <= 30),
                "compliance_ok": all((date.fromisoformat(d.expires_at) - today).days > 0 for d in p.documents) if p.documents else False,
            }
            for p in pilots
        ]

    def _get_expiring_documents(days: int = 30):
        docs = db.query(Document).all()
        pilots_map = {p.id: p for p in db.query(Pilot).all()}
        result = []
        for d in docs:
            days_left = (date.fromisoformat(d.expires_at) - today).days
            if days_left <= days:
                pilot = pilots_map.get(d.pilot_id)
                result.append({
                    "piloto": pilot.name if pilot else d.pilot_id,
                    "documento": d.description,
                    "tipo": d.doc_type,
                    "dias_restantes": days_left,
                    "status": "expired" if days_left <= 0 else "expiring_soon",
                })
        return sorted(result, key=lambda x: x["dias_restantes"])

    def _get_pilot_detail(pilot_id: str):
        pilot = db.query(Pilot).filter(Pilot.id == pilot_id).first()
        if not pilot:
            return {"error": f"Piloto {pilot_id} não encontrado"}
        return {
            "nome": pilot.name, "cargo": pilot.role,
            "documentos": [
                {
                    "tipo": d.doc_type, "descricao": d.description,
                    "validade": d.expires_at,
                    "dias_restantes": (date.fromisoformat(d.expires_at) - today).days,
                    "status": "expired" if (date.fromisoformat(d.expires_at) - today).days <= 0
                              else ("expiring_soon" if (date.fromisoformat(d.expires_at) - today).days <= 30 else "valid"),
                }
                for d in pilot.documents
            ],
        }

    def _get_risk_scores():
        pilots = db.query(Pilot).all()
        all_docs = [
            {"id": d.id, "pilot_id": d.pilot_id, "doc_type": d.doc_type,
             "description": d.description, "hash": d.hash,
             "issued_at": d.issued_at, "expires_at": d.expires_at, "issuer": d.issuer}
            for p in pilots for d in p.documents
        ]
        anomalies = detect_anomalies(all_docs)
        anomalous_hashes = {a["hash"] for a in anomalies}
        return [
            {"piloto": p.name, **compute_pilot_score(
                [{"hash": d.hash, "expires_at": d.expires_at, "description": d.description} for d in p.documents],
                anomalous_hashes
            )}
            for p in pilots
        ]

    def _get_anomalies():
        all_docs = [
            {"id": d.id, "pilot_id": d.pilot_id, "doc_type": d.doc_type,
             "description": d.description, "hash": d.hash,
             "issued_at": d.issued_at, "expires_at": d.expires_at, "issuer": d.issuer}
            for d in db.query(Document).all()
        ]
        anomalies = detect_anomalies(all_docs)
        return {"total": len(anomalies), "anomalias": [
            {"piloto": a["pilot_id"], "documento": a["description"],
             "score": a["anomaly_score"], "razoes": a["reasons"]}
            for a in anomalies
        ]}

    db_tools = {
        "get_pilots_summary":     _get_pilots_summary,
        "get_expiring_documents": _get_expiring_documents,
        "get_pilot_detail":       _get_pilot_detail,
        "get_risk_scores":        _get_risk_scores,
        "get_anomalies":          _get_anomalies,
    }

    response_text = run_chat(req.message, db_tools)
    return {"response": response_text}
```

- [ ] **Step 5: Run all tests**

```bash
cd /Users/franciscocunha/aerolicense-demo && source backend/venv/bin/activate && python -m pytest tests/ -v 2>&1 | tail -20
```
Expected: 23 passed (20 previous + 3 chat tests).

---

## Task 4: NLP Chatbot frontend panel

**Files:**
- Create: `frontend/src/components/ChatPanel.jsx`
- Modify: `frontend/src/api.js`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add chat API helper to api.js**

Add to the `api` object in `frontend/src/api.js`:
```js
  chat: (message) => {
    return fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }).then(r => r.json());
  },
```

- [ ] **Step 2: Create frontend/src/components/ChatPanel.jsx**

```jsx
// frontend/src/components/ChatPanel.jsx
import { useState, useRef, useEffect } from 'react';
import { api } from '../api';

const SUGGESTIONS = [
  'Que pilotos têm documentos a expirar?',
  'Qual é o pilot com maior risco?',
  'Há anomalias detectadas?',
  'Mostra-me os documentos do P001',
];

export default function ChatPanel() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Olá! Sou o assistente AeroLicense. Posso responder perguntas sobre conformidade documental, scores de risco e anomalias. Como posso ajudar?' },
  ]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const data = await api.chat(msg);
      setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '❌ Erro ao contactar o assistente. Verifica se o backend está a correr.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(o => !o)} style={s.fab} title="Assistente IA">
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={s.panel}>
          <div style={s.header}>
            <span style={{ fontWeight: 'bold', fontSize: 14 }}>🤖 Assistente AeroLicense</span>
            <span style={{ fontSize: 11, color: '#AABBCC' }}>GPT-4o-mini · Português</span>
          </div>

          <div style={s.messages}>
            {messages.map((m, i) => (
              <div key={i} style={m.role === 'user' ? s.userMsg : s.botMsg}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={s.botMsg}>
                <span style={s.typing}>● ● ●</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested questions — only show when no user messages yet */}
          {messages.length === 1 && (
            <div style={s.suggestions}>
              {SUGGESTIONS.map((q, i) => (
                <button key={i} style={s.suggestion} onClick={() => send(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <div style={s.inputRow}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escreve uma pergunta..."
              style={s.input}
              disabled={loading}
            />
            <button onClick={() => send()} disabled={loading || !input.trim()} style={s.sendBtn}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const s = {
  fab: {
    position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
    width: 56, height: 56, borderRadius: '50%',
    background: '#0087CC', border: 'none', color: '#fff',
    fontSize: 24, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,135,204,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'transform 0.2s', outline: 'none',
  },
  panel: {
    position: 'fixed', bottom: 96, right: 28, zIndex: 1999,
    width: 360, height: 480, background: '#0A1F44',
    borderRadius: 16, border: '1px solid #1A3F7A',
    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    background: '#061228', padding: '12px 16px',
    borderBottom: '1px solid #1A3F7A',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  messages: {
    flex: 1, overflowY: 'auto', padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  botMsg: {
    background: '#1A3F7A', color: '#ECF0F4', fontSize: 13,
    borderRadius: '12px 12px 12px 4px', padding: '10px 12px',
    maxWidth: '85%', alignSelf: 'flex-start', lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
  userMsg: {
    background: '#0087CC', color: '#fff', fontSize: 13,
    borderRadius: '12px 12px 4px 12px', padding: '10px 12px',
    maxWidth: '85%', alignSelf: 'flex-end', lineHeight: 1.5,
  },
  typing: { color: '#AABBCC', letterSpacing: 4, fontSize: 16 },
  suggestions: {
    padding: '0 12px 8px',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  suggestion: {
    background: '#061228', border: '1px solid #1A3F7A',
    color: '#0087CC', fontSize: 12, padding: '6px 10px',
    borderRadius: 8, cursor: 'pointer', textAlign: 'left',
  },
  inputRow: {
    display: 'flex', gap: 6, padding: '10px 12px',
    borderTop: '1px solid #1A3F7A', background: '#061228',
  },
  input: {
    flex: 1, background: '#0A1F44', border: '1px solid #1A3F7A',
    borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13,
    outline: 'none',
  },
  sendBtn: {
    background: '#0087CC', border: 'none', borderRadius: 8,
    color: '#fff', padding: '8px 14px', cursor: 'pointer', fontSize: 16,
  },
};
```

- [ ] **Step 3: Mount ChatPanel in App.jsx**

Read the current App.jsx, then:

Add import after other imports:
```jsx
import ChatPanel from './components/ChatPanel';
```

Add `<ChatPanel />` just before the closing `</HashRouter>` tag:
```jsx
        <ChatPanel />
      </HashRouter>
```

- [ ] **Step 4: Verify frontend compiles**

```bash
sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
Expected: 200.

- [ ] **Step 5: Visual test**

Open http://localhost:3000. A blue circular 🤖 button should appear at bottom-right. Click it to open the chat panel. Verify:
- Welcome message visible
- 4 suggested questions visible as buttons
- Clicking a suggestion sends it
- Input field + send button work
- Panel closes with ✕

---

## Self-Review

**Spec coverage:**
- Risk score module (backend/risk.py): Task 1 ✅
- Risk score endpoint: Task 1 ✅
- Risk score tests (unit + endpoint): Task 1 ✅
- Risk score on Dashboard cards: Task 2 ✅
- Risk score on Analytics page: Task 2 ✅
- Chatbot backend (chat.py + function calling): Task 3 ✅
- POST /chat endpoint: Task 3 ✅
- Chat tests: Task 3 ✅
- ChatPanel frontend: Task 4 ✅
- Floating button, messages, suggestions: Task 4 ✅

**Placeholder scan:** No TBD/TODO. All code complete.

**Type consistency:**
- `compute_pilot_score` returns `{score, level, penalties}` — used consistently in endpoint and tests
- `run_chat(user_message, db_tools_fn)` → str — endpoint wraps in `{"response": ...}`
- ChatPanel calls `api.chat(msg)` → `{response: string}` — matches backend schema
