# AeroLicense Full Development Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve AeroLicense from a demo scaffold into a working local application with a complete React SPA, SQLite database, and locally deployed Ethereum smart contract.

**Architecture:** Three sequential phases — Phase A builds the React SPA using the existing demo backend; Phase B replaces hardcoded data with a real SQLite database (SQLAlchemy); Phase C deploys the Solidity contract to a local Hardhat node and wires it to the backend.

**Tech Stack:** Python 3.14 + FastAPI + SQLAlchemy + SQLite · React 18 + react-router-dom · Node 25 + Hardhat · Web3.py

---

## Environment Setup (prerequisite for all phases)

**Files:**
- Create: `backend/venv/` (Python virtualenv)
- Create: `backend/.env`

- [ ] **Step 1: Create Python virtual environment**

```bash
cd /Users/franciscocunha/aerolicense-demo/backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn sqlalchemy web3 python-multipart pydantic pytest httpx
```

Expected: `Successfully installed ...` with all packages listed.

- [ ] **Step 2: Verify backend runs**

```bash
cd /Users/franciscocunha/aerolicense-demo/backend
source venv/bin/activate
uvicorn main:app --reload
```

Open http://localhost:8000 — should return `{"app":"AeroLicense API","status":"online",...}`. Stop with Ctrl+C.

- [ ] **Step 3: Create backend .env**

Create `backend/.env`:
```
BLOCKCHAIN_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=
PRIVATE_KEY=
```
(Empty values keep it in demo mode until Phase C.)

- [ ] **Step 4: Commit environment setup**

```bash
cd /Users/franciscocunha/aerolicense-demo
echo "backend/venv/" >> .gitignore
echo "backend/aerolicense.db" >> .gitignore
echo "backend/.env" >> .gitignore
git init
git add .gitignore backend/.env.example CLAUDE.md README.md docs/
git commit -m "chore: initial repo setup with CLAUDE.md and design docs"
```

---

## Phase A — React Frontend SPA

### File Map

| File | Responsibility |
|------|---------------|
| `frontend/package.json` | Dependencies and scripts |
| `frontend/src/index.js` | React DOM entry point |
| `frontend/src/App.jsx` | Hash router + route definitions |
| `frontend/src/api.js` | All fetch calls, single source of truth for API URL |
| `frontend/src/components/Header.jsx` | Top nav bar with API status dot |
| `frontend/src/components/Sidebar.jsx` | Left nav links |
| `frontend/src/components/Spinner.jsx` | Loading indicator |
| `frontend/src/components/ApiOfflineBanner.jsx` | Red banner when API unreachable |
| `frontend/src/pages/Dashboard.jsx` | Pilot cards grid (`/`) |
| `frontend/src/pages/PilotDetail.jsx` | Pilot's document cards (`/pilots/:id`) |
| `frontend/src/pages/UploadPage.jsx` | Document upload form (`/pilots/:id/upload`) |
| `frontend/src/pages/AlertsPage.jsx` | Expiry alerts (`/alerts`) |
| `frontend/src/pages/BlockchainDemo.jsx` | SHA-256 forgery demo (`/blockchain`) |
| `frontend/src/components/DocumentCard.jsx` | **existing** — no changes |
| `frontend/src/components/UploadDocument.jsx` | **existing** — no changes |

---

### Task A1: package.json + project scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/public/index.html`
- Create: `frontend/src/index.js`

- [ ] **Step 1: Create package.json**

Create `frontend/package.json`:
```json
{
  "name": "aerolicense-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test --watchAll=false"
  },
  "browserslist": {
    "production": [">0.2%", "not dead"],
    "development": ["last 1 chrome version"]
  },
  "proxy": "http://localhost:8000"
}
```

- [ ] **Step 2: Create public/index.html**

Create `frontend/public/index.html`:
```html
<!DOCTYPE html>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AeroLicense</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #0A1F44; color: #ECF0F4; font-family: 'Segoe UI', sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

- [ ] **Step 3: Create src/index.js**

Create `frontend/src/index.js`:
```js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
```

- [ ] **Step 4: Install dependencies**

```bash
cd /Users/franciscocunha/aerolicense-demo/frontend
npm install
```

Expected: `added N packages` with no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/franciscocunha/aerolicense-demo
git add frontend/package.json frontend/package-lock.json frontend/public/ frontend/src/index.js
git commit -m "feat(frontend): scaffold React project with router"
```

---

### Task A2: API helper

**Files:**
- Create: `frontend/src/api.js`

- [ ] **Step 1: Write api.js**

Create `frontend/src/api.js`:
```js
const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

async function request(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  status:          () => request('/'),
  pilots:          () => request('/demo/pilotos'),
  pilot:           (id) => request(`/demo/pilotos/${id}`),
  alerts:          () => request('/demo/alertas'),
  blockchainDemo:  () => request('/demo/blockchain'),
  verifyDocument:  (hash) => request(`/documents/verify/${hash}`),
};
```

- [ ] **Step 2: Write test**

Create `frontend/src/api.test.js`:
```js
import { api } from './api';

global.fetch = jest.fn();

beforeEach(() => fetch.mockClear());

test('api.pilots calls correct URL', async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ pilotos: [] }) });
  await api.pilots();
  expect(fetch).toHaveBeenCalledWith('http://localhost:8000/demo/pilotos');
});

test('api throws on non-ok response', async () => {
  fetch.mockResolvedValueOnce({ ok: false, status: 500 });
  await expect(api.pilots()).rejects.toThrow('HTTP 500');
});
```

- [ ] **Step 3: Run test**

```bash
cd /Users/franciscocunha/aerolicense-demo/frontend
npm test -- --testPathPattern=api.test
```

Expected: `2 passed`.

- [ ] **Step 4: Commit**

```bash
cd /Users/franciscocunha/aerolicense-demo
git add frontend/src/api.js frontend/src/api.test.js
git commit -m "feat(frontend): add API helper with tests"
```

---

### Task A3: Shared components (Header, Sidebar, Spinner, ApiOfflineBanner)

**Files:**
- Create: `frontend/src/components/Header.jsx`
- Create: `frontend/src/components/Sidebar.jsx`
- Create: `frontend/src/components/Spinner.jsx`
- Create: `frontend/src/components/ApiOfflineBanner.jsx`

- [ ] **Step 1: Create Spinner**

Create `frontend/src/components/Spinner.jsx`:
```jsx
export default function Spinner() {
  return (
    <div style={{ color: '#0087CC', padding: '40px 0', textAlign: 'center', fontSize: 14 }}>
      A carregar...
    </div>
  );
}
```

- [ ] **Step 2: Create ApiOfflineBanner**

Create `frontend/src/components/ApiOfflineBanner.jsx`:
```jsx
export default function ApiOfflineBanner() {
  return (
    <div style={{
      background: '#4a0a0a', border: '1px solid #E74C3C', borderRadius: 8,
      padding: '12px 16px', color: '#E74C3C', fontSize: 13, margin: '16px 0',
    }}>
      ❌ API offline — corre <code style={{ background: '#2C0A0A', padding: '2px 6px', borderRadius: 4 }}>
        uvicorn main:app --reload
      </code> no terminal.
    </div>
  );
}
```

- [ ] **Step 3: Create Header**

Create `frontend/src/components/Header.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Header() {
  const [online, setOnline] = useState(null);
  const [mode, setMode]     = useState('');

  useEffect(() => {
    api.status()
      .then(d => { setOnline(true); setMode(d.modo || ''); })
      .catch(() => setOnline(false));
  }, []);

  return (
    <div style={s.header}>
      <span style={{ fontSize: 28 }}>✈</span>
      <div>
        <h1 style={s.title}>AeroLicense <span style={s.sub}>Plataforma</span></h1>
        <div style={s.status}>
          <div style={{ ...s.dot, background: online ? '#27AE60' : '#E74C3C',
            boxShadow: online ? '0 0 6px #27AE60' : 'none' }} />
          <span style={{ color: '#AABBCC', fontSize: 12 }}>
            {online === null ? 'A ligar...' : online ? `API online · ${mode}` : 'API offline'}
          </span>
        </div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <span style={s.badge}>Python · FastAPI</span>
        <span style={{ ...s.badge, background: '#8E44AD' }}>Ethereum · Solidity</span>
        <span style={{ ...s.badge, background: '#27AE60' }}>React</span>
      </div>
    </div>
  );
}

const s = {
  header: { background: '#061228', padding: '16px 32px', borderBottom: '3px solid #0087CC',
    display: 'flex', alignItems: 'center', gap: 16 },
  title:  { fontSize: 22, color: '#fff' },
  sub:    { fontSize: 13, color: '#0087CC', marginLeft: 4 },
  status: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 },
  dot:    { width: 10, height: 10, borderRadius: '50%' },
  badge:  { background: '#0087CC', color: '#fff', fontSize: 11, fontWeight: 'bold',
    padding: '3px 10px', borderRadius: 20 },
};
```

- [ ] **Step 4: Create Sidebar**

Create `frontend/src/components/Sidebar.jsx`:
```jsx
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/',            label: '👨‍✈️ Pilotos' },
  { to: '/alerts',      label: '🔔 Alertas' },
  { to: '/blockchain',  label: '⛓ Blockchain Demo' },
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

- [ ] **Step 5: Commit**

```bash
cd /Users/franciscocunha/aerolicense-demo
git add frontend/src/components/Header.jsx frontend/src/components/Sidebar.jsx \
        frontend/src/components/Spinner.jsx frontend/src/components/ApiOfflineBanner.jsx
git commit -m "feat(frontend): add Header, Sidebar, Spinner, ApiOfflineBanner components"
```

---

### Task A4: App router + layout

**Files:**
- Create: `frontend/src/App.jsx`

- [ ] **Step 1: Create App.jsx**

Create `frontend/src/App.jsx`:
```jsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import Header     from './components/Header';
import Sidebar    from './components/Sidebar';
import Dashboard      from './pages/Dashboard';
import PilotDetail    from './pages/PilotDetail';
import UploadPage     from './pages/UploadPage';
import AlertsPage     from './pages/AlertsPage';
import BlockchainDemo from './pages/BlockchainDemo';

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
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
}
```

- [ ] **Step 2: Start dev server and verify shell renders**

```bash
cd /Users/franciscocunha/aerolicense-demo/frontend
REACT_APP_API_URL=http://localhost:8000 npm start
```

Open http://localhost:3000 — should show the dark-blue header and sidebar. Pages will be empty until the next tasks. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
cd /Users/franciscocunha/aerolicense-demo
git add frontend/src/App.jsx
git commit -m "feat(frontend): add App router and shell layout"
```

---

### Task A5: Dashboard page

**Files:**
- Create: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Create Dashboard.jsx**

Create `frontend/src/pages/Dashboard.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';

export default function Dashboard() {
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.pilots()
      .then(d => setPilots(d.pilotos))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  return (
    <div>
      <h2 style={s.heading}>👨‍✈️ Pilotos Registados</h2>
      <div style={s.grid}>
        {pilots.map(p => (
          <div key={p.id} style={s.card} onClick={() => navigate(`/pilots/${p.id}`)}>
            <div style={s.cardTop}>
              <div style={s.name}>{p.nome}</div>
              <div style={s.role}>{p.cargo}</div>
              <div style={s.wallet}>{p.carteira_ethereum}</div>
            </div>
            <div style={s.cardBody}>
              <div style={s.stats}>
                <span style={{ ...s.stat, ...s.valid }}>✅ {p.validos} válidos</span>
                {p.a_expirar_em_breve > 0 &&
                  <span style={{ ...s.stat, ...s.expiring }}>⚠️ {p.a_expirar_em_breve} a expirar</span>}
                {p.expirados > 0 &&
                  <span style={{ ...s.stat, ...s.expired }}>❌ {p.expirados} expirados</span>}
              </div>
              <div style={{ fontSize: 12, marginTop: 10, fontWeight: 'bold',
                color: p.compliance_ok ? '#27AE60' : '#E74C3C' }}>
                {p.compliance_ok ? '✔ Compliance OK' : '✖ Ação necessária'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  heading: { color: '#F0A500', marginBottom: 20, fontSize: 18 },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 },
  card:    { background: '#1A3F7A', borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
    border: '1px solid #2A4F8A', transition: 'transform 0.2s, border-color 0.2s' },
  cardTop:  { background: '#0A1F44', padding: '16px 20px', borderBottom: '3px solid #0087CC' },
  name:     { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  role:     { fontSize: 12, color: '#0087CC', marginTop: 4 },
  wallet:   { fontSize: 10, color: '#667788', marginTop: 6, fontFamily: 'monospace' },
  cardBody: { padding: '14px 20px' },
  stats:    { display: 'flex', gap: 8, flexWrap: 'wrap' },
  stat:     { padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' },
  valid:    { background: '#1a4a2a', color: '#27AE60' },
  expiring: { background: '#4a3a0a', color: '#F0A500' },
  expired:  { background: '#4a0a0a', color: '#E74C3C' },
};
```

- [ ] **Step 2: Verify in browser**

Start backend: `cd backend && source venv/bin/activate && uvicorn main:app --reload`
Start frontend: `cd frontend && npm start`

Navigate to http://localhost:3000 — should show 3 pilot cards (Miguel Ferreira, Ana Costa, João Matos). Clicking a card should navigate to `/pilots/:id` (page will be empty until next task).

- [ ] **Step 3: Commit**

```bash
cd /Users/franciscocunha/aerolicense-demo
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat(frontend): add Dashboard page with pilot grid"
```

---

### Task A6: PilotDetail page

**Files:**
- Create: `frontend/src/pages/PilotDetail.jsx`

- [ ] **Step 1: Create PilotDetail.jsx**

Create `frontend/src/pages/PilotDetail.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import DocumentCard from '../components/DocumentCard';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';

export default function PilotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pilot, setPilot]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    api.pilot(id)
      .then(setPilot)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  // Normalise field names from demo backend to what DocumentCard expects
  const docs = pilot.documentos.map(d => ({
    hash:              d.hash,
    doc_type:          d.tipo,
    description:       d.descricao,
    expires_at:        d.validade,
    days_until_expiry: Math.max(0, d.dias_restantes),
    status:            d.status,
  }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/')} style={s.back}>← Voltar</button>
        <div>
          <h2 style={s.name}>{pilot.nome}</h2>
          <div style={s.role}>{pilot.cargo}</div>
        </div>
        <button onClick={() => navigate(`/pilots/${id}/upload`)} style={s.upload}>
          + Novo Documento
        </button>
      </div>
      <div style={s.grid}>
        {docs.map((doc, i) => <DocumentCard key={i} document={doc} />)}
      </div>
    </div>
  );
}

const s = {
  name:   { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  role:   { color: '#0087CC', fontSize: 13 },
  back:   { padding: '8px 16px', background: 'transparent', border: '2px solid #0087CC',
    borderRadius: 8, color: '#0087CC', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 },
  upload: { marginLeft: 'auto', padding: '8px 16px', background: '#0087CC', border: 'none',
    borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 },
  grid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 },
};
```

- [ ] **Step 2: Verify in browser**

Click a pilot card on the dashboard — should show the pilot's name, role, and document cards with expiry bars and the "Verificar na Blockchain" button.

- [ ] **Step 3: Commit**

```bash
cd /Users/franciscocunha/aerolicense-demo
git add frontend/src/pages/PilotDetail.jsx
git commit -m "feat(frontend): add PilotDetail page with DocumentCard grid"
```

---

### Task A7: UploadPage

**Files:**
- Create: `frontend/src/pages/UploadPage.jsx`

- [ ] **Step 1: Create UploadPage.jsx**

Create `frontend/src/pages/UploadPage.jsx`:
```jsx
import { useParams, useNavigate } from 'react-router-dom';
import UploadDocument from '../components/UploadDocument';

export default function UploadPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Map demo pilot IDs to Ethereum addresses
  const ADDRESSES = {
    P001: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    P002: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    P003: '0x1Db3439a7D398351b8bE11C439e05C5B3259aeD4',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(`/pilots/${id}`)}
          style={{ padding: '8px 16px', background: 'transparent', border: '2px solid #0087CC',
            borderRadius: 8, color: '#0087CC', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}
        >
          ← Voltar
        </button>
        <h2 style={{ color: '#fff', fontSize: 20 }}>Registar Documento — Piloto {id}</h2>
      </div>
      <UploadDocument
        pilotAddress={ADDRESSES[id] || '0x0000000000000000000000000000000000000000'}
        onSuccess={() => setTimeout(() => navigate(`/pilots/${id}`), 1500)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to a pilot detail page and click "+ Novo Documento" — should show the upload form. Upload a PDF/image and verify the form submits and shows the returned hash.

- [ ] **Step 3: Commit**

```bash
cd /Users/franciscocunha/aerolicense-demo
git add frontend/src/pages/UploadPage.jsx
git commit -m "feat(frontend): add UploadPage wired to existing UploadDocument component"
```

---

### Task A8: AlertsPage + BlockchainDemo page

**Files:**
- Create: `frontend/src/pages/AlertsPage.jsx`
- Create: `frontend/src/pages/BlockchainDemo.jsx`

- [ ] **Step 1: Create AlertsPage.jsx**

Create `frontend/src/pages/AlertsPage.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';

export default function AlertsPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    api.alerts()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  return (
    <div>
      <h2 style={{ color: '#F0A500', marginBottom: 6, fontSize: 18 }}>🔔 Alertas de Validade</h2>
      <p style={{ color: '#AABBCC', fontSize: 13, marginBottom: 20 }}>
        {data.total_alertas} documento(s) a requerer atenção.
      </p>
      {data.alertas.map((a, i) => (
        <div key={i} style={{
          ...s.card, borderLeftColor: a.status === 'expired' ? '#E74C3C' : '#F0A500',
        }}>
          <div>
            <div style={s.pilot}>👨‍✈️ {a.piloto} · <span style={{ color: '#0087CC', fontSize: 12 }}>{a.cargo}</span></div>
            <div style={s.doc}>📄 {a.documento}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 'bold',
              color: a.status === 'expired' ? '#E74C3C' : '#F0A500' }}>
              {a.status === 'expired' ? 'EXPIRADO' : `${a.dias_restantes} dias`}
            </div>
            <div style={{
              ...s.action,
              background: a.status === 'expired' ? '#E74C3C' : '#F0A500',
              color: a.status === 'expired' ? '#fff' : '#000',
            }}>{a.acao_necessaria}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const s = {
  card:   { background: '#1A3F7A', borderRadius: 10, padding: '14px 18px',
    borderLeft: '4px solid', marginBottom: 10, display: 'flex',
    alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  pilot:  { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  doc:    { fontSize: 12, color: '#AABBCC', marginTop: 4 },
  action: { fontSize: 12, fontWeight: 'bold', padding: '4px 10px', borderRadius: 6, marginTop: 6 },
};
```

- [ ] **Step 2: Create BlockchainDemo.jsx**

Create `frontend/src/pages/BlockchainDemo.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';

export default function BlockchainDemo() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    api.blockchainDemo()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  return (
    <div>
      <h2 style={{ color: '#F0A500', marginBottom: 8, fontSize: 18 }}>⛓ {data.conceito}</h2>
      <div style={s.box}>
        <div style={s.label}>DOCUMENTO ORIGINAL</div>
        <div style={s.doc}>📄 "{data.documento_original.conteudo}"</div>
        <div style={s.row}>
          <span style={s.key}>SHA-256:</span>
          <code style={{ ...s.hash, color: '#0087CC' }}>{data.documento_original.sha256}</code>
        </div>

        <div style={{ ...s.label, color: '#E74C3C', marginTop: 20 }}>DOCUMENTO FALSIFICADO</div>
        <div style={{ ...s.doc, color: '#FF8888' }}>📄 "{data.documento_falsificado.conteudo}"</div>
        <div style={{ fontSize: 11, color: '#F0A500', marginBottom: 8 }}>
          ⚠ Alteração: {data.documento_falsificado.alteracao}
        </div>
        <div style={s.row}>
          <span style={s.key}>SHA-256:</span>
          <code style={{ ...s.hash, color: '#E74C3C' }}>{data.documento_falsificado.sha256}</code>
        </div>

        <div style={s.result}>
          <p style={{ color: '#E74C3C', fontWeight: 'bold', margin: 0 }}>
            ❌ Hashes diferentes — Falsificação detetada automaticamente!
          </p>
          <p style={{ color: '#AABBCC', fontSize: 12, marginTop: 8 }}>{data.conclusao}</p>
        </div>
      </div>
    </div>
  );
}

const s = {
  box:    { background: '#061228', borderRadius: 10, padding: 20, fontFamily: 'monospace', fontSize: 13 },
  label:  { color: '#F0A500', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  doc:    { color: '#AABBCC', fontSize: 12, marginBottom: 8 },
  row:    { display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  key:    { color: '#667788', minWidth: 80, fontSize: 12 },
  hash:   { wordBreak: 'break-all', fontSize: 12 },
  result: { background: '#E74C3C22', border: '1px solid #E74C3C', borderRadius: 8,
    padding: '12px 16px', marginTop: 20 },
};
```

- [ ] **Step 3: Verify all pages in browser**

- `/` — pilot grid
- `/alerts` — alert list with colours
- `/blockchain` — hash comparison demo

- [ ] **Step 4: Commit**

```bash
cd /Users/franciscocunha/aerolicense-demo
git add frontend/src/pages/AlertsPage.jsx frontend/src/pages/BlockchainDemo.jsx
git commit -m "feat(frontend): add AlertsPage and BlockchainDemo pages — Phase A complete"
```

---

## Phase B — SQLite Database

### File Map

| File | Responsibility |
|------|---------------|
| `backend/database.py` | SQLAlchemy engine, session, `Pilot` and `Document` models, seed function |
| `backend/main.py` | Replace `DEMO_PILOTOS` with DB queries; add `GET /db/pilotos`, `POST /pilots`, `POST /documents` |
| `tests/test_database.py` | Unit tests for models and seed |
| `tests/test_api_db.py` | Integration tests for DB-backed endpoints |

---

### Task B1: SQLAlchemy models

**Files:**
- Create: `backend/database.py`
- Create: `tests/__init__.py`
- Create: `tests/test_database.py`

- [ ] **Step 1: Write failing test**

Create `tests/__init__.py` (empty).

Create `tests/test_database.py`:
```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import Base, Pilot, Document, seed_demo_data

@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_pilot_model(db):
    p = Pilot(id="P001", name="Test Pilot", role="Captain", ethereum_address="0xABC")
    db.add(p)
    db.commit()
    found = db.query(Pilot).filter_by(id="P001").first()
    assert found.name == "Test Pilot"

def test_seed_creates_pilots(db):
    seed_demo_data(db)
    pilots = db.query(Pilot).all()
    assert len(pilots) == 3
    assert any(p.id == "P001" for p in pilots)

def test_seed_creates_documents(db):
    seed_demo_data(db)
    docs = db.query(Document).all()
    assert len(docs) == 9  # 4 + 2 + 3 from DEMO_PILOTOS
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd /Users/franciscocunha/aerolicense-demo
source backend/venv/bin/activate
python -m pytest tests/test_database.py -v
```

Expected: `ModuleNotFoundError: No module named 'backend.database'`

- [ ] **Step 3: Create database.py**

Create `backend/database.py`:
```python
from datetime import datetime
from sqlalchemy import Column, String, Integer, Date, ForeignKey, create_engine
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker

class Base(DeclarativeBase):
    pass

class Pilot(Base):
    __tablename__ = "pilots"
    id               = Column(String, primary_key=True)
    name             = Column(String, nullable=False)
    role             = Column(String, nullable=False)
    ethereum_address = Column(String, nullable=False)
    documents        = relationship("Document", back_populates="pilot", lazy="select")

class Document(Base):
    __tablename__ = "documents"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    pilot_id    = Column(String, ForeignKey("pilots.id"), nullable=False)
    doc_type    = Column(String, nullable=False)
    description = Column(String, nullable=False)
    hash        = Column(String, unique=True, nullable=False)
    tx_blockchain = Column(String, nullable=False)
    issued_at   = Column(String, nullable=False)
    expires_at  = Column(String, nullable=False)
    issuer      = Column(String, nullable=False)
    pilot       = relationship("Pilot", back_populates="documents")

# ── Engine / Session ───────────────────────────────────────────────────────
_engine = None
SessionLocal = None

def init_db(url: str = "sqlite:///./aerolicense.db"):
    global _engine, SessionLocal
    _engine = create_engine(url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(_engine)
    SessionLocal = sessionmaker(bind=_engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ── Seed data ──────────────────────────────────────────────────────────────
DEMO_PILOTS_RAW = [
    {
        "id": "P001", "name": "Miguel Ferreira",
        "role": "First Officer — TAP Air Portugal",
        "ethereum_address": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        "documents": [
            {"doc_type": "ATPL",           "description": "Licença ATPL — ANAC Portugal",
             "hash": "0xf5fa1228922f7b4e3e13181d7054cf56785891b7025e0361906b8964ec62eb73",
             "tx_blockchain": "0xa3d2e891b4c7f305162a9c184d7e3b56f0c9e2a1b3d4e5f6a7b8c9d0e1f2a3b4",
             "issued_at": "2023-03-15", "expires_at": "2026-03-15",
             "issuer": "ANAC — Autoridade Nacional de Aviação Civil"},
            {"doc_type": "MEDICAL_CLASS1", "description": "Certificado Médico Classe 1",
             "hash": "0xca26ae93ee7df6764af6689223428eeb13101bf5a4b8b7cc4ab945460b235f99",
             "tx_blockchain": "0xb4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
             "issued_at": "2024-11-20", "expires_at": "2026-05-17",
             "issuer": "Clínica de Medicina Aeronáutica Lisboa"},
            {"doc_type": "ICAO_ENGLISH",   "description": "Proficiência Linguística ICAO — Nível 5",
             "hash": "0x9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8",
             "tx_blockchain": "0xc5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
             "issued_at": "2022-06-10", "expires_at": "2025-06-10",
             "issuer": "Centro de Testes ICAO — Lisboa"},
            {"doc_type": "TYPE_RATING",    "description": "Type Rating Airbus A320",
             "hash": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
             "tx_blockchain": "0xd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
             "issued_at": "2024-01-08", "expires_at": "2026-01-08",
             "issuer": "Airbus Training Centre — Toulouse"},
        ],
    },
    {
        "id": "P002", "name": "Ana Costa",
        "role": "Cabin Crew Senior — Ryanair",
        "ethereum_address": "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
        "documents": [
            {"doc_type": "ATPL",           "description": "Licença de Tripulante de Cabine — EASA",
             "hash": "0x3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4",
             "tx_blockchain": "0xe7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
             "issued_at": "2024-05-01", "expires_at": "2027-05-01",
             "issuer": "EASA — European Union Aviation Safety Agency"},
            {"doc_type": "MEDICAL_CLASS1", "description": "Certificado Médico Cabin Crew",
             "hash": "0x5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
             "tx_blockchain": "0xf8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
             "issued_at": "2024-12-01", "expires_at": "2026-06-02",
             "issuer": "Clínica de Medicina Aeronáutica Porto"},
        ],
    },
    {
        "id": "P003", "name": "João Matos",
        "role": "Captain — easyJet",
        "ethereum_address": "0x1Db3439a7D398351b8bE11C439e05C5B3259aeD4",
        "documents": [
            {"doc_type": "ATPL",        "description": "Licença ATPL — CAA United Kingdom",
             "hash": "0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
             "tx_blockchain": "0xa9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
             "issued_at": "2021-09-14", "expires_at": "2027-09-14",
             "issuer": "CAA — Civil Aviation Authority UK"},
            {"doc_type": "TYPE_RATING", "description": "Type Rating Boeing 737 MAX",
             "hash": "0x9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
             "tx_blockchain": "0xb0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
             "issued_at": "2024-03-22", "expires_at": "2026-03-22",
             "issuer": "Boeing Training — Seattle"},
            {"doc_type": "CRM_TRAINING","description": "Crew Resource Management — Recurrent",
             "hash": "0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
             "tx_blockchain": "0xc1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
             "issued_at": "2025-01-10", "expires_at": "2027-01-10",
             "issuer": "easyJet Training Academy"},
        ],
    },
]

def seed_demo_data(db):
    if db.query(Pilot).count() > 0:
        return
    for raw in DEMO_PILOTS_RAW:
        pilot = Pilot(
            id=raw["id"], name=raw["name"],
            role=raw["role"], ethereum_address=raw["ethereum_address"],
        )
        db.add(pilot)
        for d in raw["documents"]:
            db.add(Document(pilot_id=raw["id"], **d))
    db.commit()
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/franciscocunha/aerolicense-demo
source backend/venv/bin/activate
python -m pytest tests/test_database.py -v
```

Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
cd /Users/franciscocunha/aerolicense-demo
git add backend/database.py tests/__init__.py tests/test_database.py
git commit -m "feat(backend): add SQLAlchemy models for Pilot and Document with seed data"
```

---

### Task B2: Wire database into FastAPI endpoints

**Files:**
- Modify: `backend/main.py`
- Create: `tests/test_api_db.py`

- [ ] **Step 1: Write failing integration test**

Create `tests/test_api_db.py`:
```python
import pytest, sys, os
# Add backend/ to sys.path so main.py's `from database import ...` resolves correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db, seed_demo_data, Pilot, Document
from main import app

@pytest.fixture
def client():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)

    def override_get_db():
        db = TestSession()
        seed_demo_data(db)
        try:
            yield db
        finally:
            db.close()

    from main import app as _app  # noqa — re-import after sys.path is set
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_demo_pilotos_returns_three(client):
    res = client.get("/demo/pilotos")
    assert res.status_code == 200
    assert res.json()["total"] == 3

def test_demo_piloto_detalhe(client):
    res = client.get("/demo/pilotos/P001")
    assert res.status_code == 200
    data = res.json()
    assert data["nome"] == "Miguel Ferreira"
    assert len(data["documentos"]) == 4

def test_demo_piloto_not_found(client):
    res = client.get("/demo/pilotos/P999")
    assert res.status_code == 404

def test_demo_alertas_contains_expiring(client):
    res = client.get("/demo/alertas")
    assert res.status_code == 200
    statuses = [a["status"] for a in res.json()["alertas"]]
    assert "expiring_soon" in statuses or "expired" in statuses
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd /Users/franciscocunha/aerolicense-demo
source backend/venv/bin/activate
pip install httpx
python -m pytest tests/test_api_db.py -v
```

Expected: failures because endpoints still use `DEMO_PILOTOS`.

- [ ] **Step 3: Update main.py — startup + demo endpoints**

In `backend/main.py`, add these imports at the top (after existing imports):
```python
from database import init_db, get_db, seed_demo_data, Pilot, Document
from fastapi import Depends
from sqlalchemy.orm import Session
```

Add startup event after `app.add_middleware(...)`:
```python
@app.on_event("startup")
def startup():
    init_db()
    from database import SessionLocal
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()
```

Replace the `demo_pilotos` endpoint:
```python
@app.get("/demo/pilotos", tags=["Demo"])
def demo_pilotos(db: Session = Depends(get_db)):
    pilots = db.query(Pilot).all()
    resumo = []
    for p in pilots:
        docs = p.documents
        today = datetime.utcnow().date()
        def days_left(d):
            from datetime import date
            exp = date.fromisoformat(d.expires_at)
            return (exp - today).days
        validos   = sum(1 for d in docs if days_left(d) > 30)
        urgentes  = sum(1 for d in docs if 0 < days_left(d) <= 30)
        expirados = sum(1 for d in docs if days_left(d) <= 0)
        resumo.append({
            "id": p.id, "nome": p.name, "cargo": p.role,
            "carteira_ethereum": p.ethereum_address,
            "total_documentos": len(docs),
            "validos": validos, "a_expirar_em_breve": urgentes, "expirados": expirados,
            "compliance_ok": expirados == 0,
        })
    return {"pilotos": resumo, "total": len(resumo)}
```

Replace the `demo_piloto_detalhe` endpoint:
```python
@app.get("/demo/pilotos/{piloto_id}", tags=["Demo"])
def demo_piloto_detalhe(piloto_id: str, db: Session = Depends(get_db)):
    pilot = db.query(Pilot).filter(Pilot.id == piloto_id).first()
    if not pilot:
        raise HTTPException(404, f"Piloto '{piloto_id}' não encontrado.")
    today = datetime.utcnow().date()
    docs = []
    for d in pilot.documents:
        from datetime import date
        exp = date.fromisoformat(d.expires_at)
        days = (exp - today).days
        status = "expired" if days <= 0 else ("expiring_soon" if days <= 30 else "valid")
        docs.append({
            "tipo": d.doc_type, "descricao": d.description,
            "hash": d.hash, "tx_blockchain": d.tx_blockchain,
            "emitido_em": d.issued_at, "validade": d.expires_at,
            "dias_restantes": days, "status": status,
            "entidade_emissora": d.issuer,
        })
    return {"id": pilot.id, "nome": pilot.name, "cargo": pilot.role,
            "carteira_ethereum": pilot.ethereum_address, "documentos": docs}
```

Replace the `demo_alertas` endpoint:
```python
@app.get("/demo/alertas", tags=["Demo"])
def demo_alertas(db: Session = Depends(get_db)):
    from datetime import date
    today = datetime.utcnow().date()
    alertas = []
    for d in db.query(Document).all():
        exp  = date.fromisoformat(d.expires_at)
        days = (exp - today).days
        if days > 30:
            continue
        status = "expired" if days <= 0 else "expiring_soon"
        pilot  = db.query(Pilot).filter(Pilot.id == d.pilot_id).first()
        alertas.append({
            "piloto": pilot.name, "cargo": pilot.role,
            "documento": d.description, "tipo": d.doc_type,
            "dias_restantes": days, "status": status,
            "hash_blockchain": d.hash,
            "acao_necessaria": "RENOVAR URGENTE" if status == "expired"
                               else f"Renovar em {days} dias",
        })
    alertas.sort(key=lambda x: x["dias_restantes"])
    return {"total_alertas": len(alertas), "alertas": alertas,
            "nota": "Em produção, este endpoint é chamado diariamente."}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/franciscocunha/aerolicense-demo
source backend/venv/bin/activate
python -m pytest tests/test_api_db.py -v
```

Expected: `4 passed`.

- [ ] **Step 5: Verify backend runs and frontend still works**

```bash
cd backend && source venv/bin/activate && uvicorn main:app --reload
```

Check http://localhost:8000/demo/pilotos and http://localhost:3000 — pilot cards should still load.

- [ ] **Step 6: Commit**

```bash
cd /Users/franciscocunha/aerolicense-demo
git add backend/main.py backend/database.py tests/test_api_db.py
git commit -m "feat(backend): replace hardcoded demo data with SQLite via SQLAlchemy — Phase B complete"
```

---

## Phase C — Hardhat Local Blockchain

### File Map

| File | Responsibility |
|------|---------------|
| `smart_contract/package.json` | Hardhat + ethers dependencies |
| `smart_contract/hardhat.config.js` | Hardhat configuration |
| `smart_contract/contracts/AeroLicenseRegistry.sol` | **existing** — no changes |
| `smart_contract/scripts/deploy.js` | Deploy script, prints contract address |
| `smart_contract/setup.sh` | One-shot: start node, deploy, write backend/.env |
| `backend/main.py` | Update ABI (add v2 functions) |

---

### Task C1: Hardhat project setup

**Files:**
- Create: `smart_contract/package.json`
- Create: `smart_contract/hardhat.config.js`

- [ ] **Step 1: Create smart_contract/package.json**

Create `smart_contract/package.json`:
```json
{
  "name": "aerolicense-contracts",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "compile":      "hardhat compile",
    "start:node":   "hardhat node",
    "deploy:local": "hardhat run scripts/deploy.js --network localhost",
    "test":         "hardhat test"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "hardhat": "^2.22.0"
  }
}
```

- [ ] **Step 2: Create hardhat.config.js**

Create `smart_contract/hardhat.config.js`:
```js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
};
```

- [ ] **Step 3: Install Hardhat**

```bash
cd /Users/franciscocunha/aerolicense-demo/smart_contract
npm install
```

Expected: `added N packages` with no errors.

- [ ] **Step 4: Compile the contract**

```bash
cd /Users/franciscocunha/aerolicense-demo/smart_contract
npx hardhat compile
```

Expected:
```
Compiled 1 Solidity file successfully (evm target: paris).
```

- [ ] **Step 5: Commit**

```bash
cd /Users/franciscocunha/aerolicense-demo
echo "smart_contract/node_modules/" >> .gitignore
echo "smart_contract/artifacts/"   >> .gitignore
echo "smart_contract/cache/"       >> .gitignore
git add smart_contract/package.json smart_contract/package-lock.json smart_contract/hardhat.config.js .gitignore
git commit -m "feat(contract): add Hardhat project and compile AeroLicenseRegistry"
```

---

### Task C2: Deploy script + setup.sh

**Files:**
- Create: `smart_contract/scripts/deploy.js`
- Create: `smart_contract/setup.sh`

- [ ] **Step 1: Create deploy.js**

Create `smart_contract/scripts/deploy.js`:
```js
const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Registry = await hre.ethers.getContractFactory("AeroLicenseRegistry");
  const registry  = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("AeroLicenseRegistry deployed to:", address);

  // Write backend/.env
  const envPath = path.join(__dirname, "../../backend/.env");
  const envContent = [
    `BLOCKCHAIN_URL=http://127.0.0.1:8545`,
    `CONTRACT_ADDRESS=${address}`,
    `PRIVATE_KEY=${deployer.privateKey}`,
  ].join("\n") + "\n";

  fs.writeFileSync(envPath, envContent);
  console.log("Written to backend/.env");
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Create setup.sh**

Create `smart_contract/setup.sh`:
```bash
#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== AeroLicense Blockchain Setup ==="

# Start Hardhat node in background
echo "[1/3] Starting Hardhat node on port 8545..."
npx hardhat node > /tmp/hardhat.log 2>&1 &
HARDHAT_PID=$!
echo "      Hardhat PID: $HARDHAT_PID"

# Wait for node to be ready
echo "      Waiting for node..."
for i in $(seq 1 20); do
  if curl -s -X POST http://127.0.0.1:8545 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    > /dev/null 2>&1; then
    echo "      Node ready."
    break
  fi
  sleep 0.5
done

# Deploy contract
echo "[2/3] Deploying AeroLicenseRegistry..."
npx hardhat run scripts/deploy.js --network localhost

echo "[3/3] Done."
echo ""
echo "Now restart the backend:"
echo "  cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo ""
echo "Hardhat node is running (PID $HARDHAT_PID). To stop: kill $HARDHAT_PID"
```

```bash
chmod +x /Users/franciscocunha/aerolicense-demo/smart_contract/setup.sh
```

- [ ] **Step 3: Commit**

```bash
cd /Users/franciscocunha/aerolicense-demo
git add smart_contract/scripts/deploy.js smart_contract/setup.sh
git commit -m "feat(contract): add deploy script and setup.sh for local Hardhat node"
```

---

### Task C3: Update ABI in backend for v2 contract functions

**Files:**
- Modify: `backend/main.py` (CONTRACT_ABI section, lines ~47-86)

- [ ] **Step 1: Replace CONTRACT_ABI in main.py**

In `backend/main.py`, replace the `CONTRACT_ABI` list inside the `if CONTRACT_ADDRESS` block with:
```python
CONTRACT_ABI = [
    {
        "inputs": [
            {"name": "_pilot",     "type": "address"},
            {"name": "_hash",      "type": "bytes32"},
            {"name": "_docType",   "type": "uint8"},
            {"name": "_desc",      "type": "string"},
            {"name": "_expiresAt", "type": "uint256"},
        ],
        "name": "registerDocument",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "_oldHash",   "type": "bytes32"},
            {"name": "_newHash",   "type": "bytes32"},
            {"name": "_desc",      "type": "string"},
            {"name": "_newExpiry", "type": "uint256"},
        ],
        "name": "renewDocument",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "_hash", "type": "bytes32"}],
        "name": "verifyDocument",
        "outputs": [
            {"name": "valid",     "type": "bool"},
            {"name": "expired",   "type": "bool"},
            {"name": "expiresAt", "type": "uint256"},
            {"name": "issuedBy",  "type": "address"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "_hash", "type": "bytes32"}],
        "name": "revokeDocument",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "_hash", "type": "bytes32"}],
        "name": "daysUntilExpiry",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "_pilot", "type": "address"}],
        "name": "getDocumentsByPilot",
        "outputs": [{"name": "", "type": "bytes32[]"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "_pilot",         "type": "address"},
            {"name": "_licenseNumber", "type": "string"},
            {"name": "_licenseType",   "type": "uint8"},
            {"name": "_expiresAt",     "type": "uint256"},
        ],
        "name": "issueLicense",
        "outputs": [{"name": "tokenId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "_pilot", "type": "address"},
            {"name": "_did",   "type": "string"},
        ],
        "name": "registerDID",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "_pilot", "type": "address"}],
        "name": "resolveDID",
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function",
    },
]
```

Also update `verify_document` endpoint to handle 4-tuple return (add `issuedBy`):
```python
valid, expired, expires_ts, issued_by = contract.functions.verifyDocument(hash_bytes).call()
```

- [ ] **Step 2: Test full stack with real blockchain**

In one terminal:
```bash
cd /Users/franciscocunha/aerolicense-demo/smart_contract
bash setup.sh
```

Expected output:
```
=== AeroLicense Blockchain Setup ===
[1/3] Starting Hardhat node on port 8545...
      Node ready.
[2/3] Deploying AeroLicenseRegistry...
Deploying with account: 0xf39Fd6e51aad...
AeroLicenseRegistry deployed to: 0x5FbDB231...
Written to backend/.env
[3/3] Done.
```

In second terminal:
```bash
cd /Users/franciscocunha/aerolicense-demo/backend
source venv/bin/activate && uvicorn main:app --reload
```

Check http://localhost:8000 — `"contract_configured": true, "modo": "produção"`.

- [ ] **Step 3: Commit**

```bash
cd /Users/franciscocunha/aerolicense-demo
git add backend/main.py
git commit -m "feat(contract): update ABI for v2 contract and fix verifyDocument tuple — Phase C complete"
```

---

## Running Everything Together

```bash
# Terminal 1 — Blockchain
cd smart_contract && bash setup.sh

# Terminal 2 — Backend
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Terminal 3 — Frontend
cd frontend && npm start
```

Open http://localhost:3000 — full application in production mode.
