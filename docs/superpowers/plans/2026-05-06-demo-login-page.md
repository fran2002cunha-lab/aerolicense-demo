# Demo Login Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen demo login gate with two role cards (Operador / Inspector ANAC) that must be passed before the dashboard is shown; the selected role appears as a pill badge in the header.

**Architecture:** App-level state gate — `App.jsx` reads `sessionStorage` on mount and conditionally renders either `<LoginPage />` (full screen, no shell) or the existing `Header + Sidebar + Routes` layout. The selected role propagates as a prop to `Header.jsx`, which renders a small badge. No routing changes.

**Tech Stack:** React 18, inline styles, `theme.js` tokens (`c`, `gradientPrimary`, `shadow`), `sessionStorage` for persistence, Jest + `@testing-library/react` for tests.

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `frontend/src/pages/LoginPage.jsx` | Full-screen login with two role cards |
| Create | `frontend/src/pages/LoginPage.test.jsx` | Component tests for LoginPage |
| Create | `frontend/src/App.test.jsx` | Integration tests: gate + rehydration |
| Create | `frontend/src/components/Header.test.jsx` | Unit tests: role badge rendering |
| Modify | `frontend/src/App.jsx` | Add `isLoggedIn` + `activeRole` state; gate render |
| Modify | `frontend/src/components/Header.jsx` | Accept `activeRole` prop; render role badge |

---

## Task 1: Install test dependencies and write LoginPage tests

**Files:**
- Create: `frontend/src/pages/LoginPage.test.jsx`
- Install: `@testing-library/react @testing-library/jest-dom`

> Context: `@testing-library/react` is not yet in `package.json`. `react-scripts` 5 supports it natively once installed. The `setupTests.js` file from CRA auto-imports `@testing-library/jest-dom` matchers when it exists — we create it here.

- [ ] **Step 1: Install testing libraries**

```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

Expected: `package.json` gains `@testing-library/react` and `@testing-library/jest-dom` in `devDependencies`.

- [ ] **Step 2: Create src/setupTests.js** (CRA picks this up automatically)

Create `frontend/src/setupTests.js`:

```js
import '@testing-library/jest-dom';
```

- [ ] **Step 3: Write the failing tests**

Create `frontend/src/pages/LoginPage.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from './LoginPage';

test('renders two role cards', () => {
  render(<LoginPage onLogin={() => {}} />);
  expect(screen.getByTestId('role-card-operador')).toBeInTheDocument();
  expect(screen.getByTestId('role-card-inspector')).toBeInTheDocument();
});

test('enter button is disabled when no role is selected', () => {
  render(<LoginPage onLogin={() => {}} />);
  expect(screen.getByTestId('enter-btn')).toBeDisabled();
});

test('selecting a role enables the enter button', () => {
  render(<LoginPage onLogin={() => {}} />);
  fireEvent.click(screen.getByTestId('role-card-operador'));
  expect(screen.getByTestId('enter-btn')).not.toBeDisabled();
});

test('clicking enter calls onLogin with the selected role id', () => {
  const onLogin = jest.fn();
  render(<LoginPage onLogin={onLogin} />);
  fireEvent.click(screen.getByTestId('role-card-inspector'));
  fireEvent.click(screen.getByTestId('enter-btn'));
  expect(onLogin).toHaveBeenCalledWith('inspector');
});

test('clicking a selected role again deselects it', () => {
  render(<LoginPage onLogin={() => {}} />);
  fireEvent.click(screen.getByTestId('role-card-operador'));
  fireEvent.click(screen.getByTestId('role-card-operador'));
  expect(screen.getByTestId('enter-btn')).toBeDisabled();
});
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
cd frontend
npm test -- --testPathPattern=LoginPage --watchAll=false
```

Expected: FAIL — "Cannot find module './LoginPage'"

---

## Task 2: Implement LoginPage

**Files:**
- Create: `frontend/src/pages/LoginPage.jsx`

> Context: Uses `c`, `gradientPrimary`, `shadow` from `frontend/src/theme.js`. No API calls. `onLogin(roleId)` is the only prop — called with `'operador'` or `'inspector'` when the user clicks "Entrar". Two SVG icons are defined inline (no external deps). The plane icon SVG is copied verbatim from `Header.jsx` to keep the logo identical.

- [ ] **Step 1: Create LoginPage.jsx**

Create `frontend/src/pages/LoginPage.jsx`:

```jsx
import { useState } from 'react';
import { c, gradientPrimary, shadow } from '../theme';

const ROLES = [
  {
    id: 'operador',
    label: 'Operador de Companhia',
    sub: 'TAP Air Portugal',
    Icon: BriefcaseIcon,
  },
  {
    id: 'inspector',
    label: 'Inspector ANAC',
    sub: 'Autoridade Nacional de Aviação Civil',
    Icon: ShieldIcon,
  },
];

function PlaneIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2h0A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z" fill="#fff"/>
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

export default function LoginPage({ onLogin }) {
  const [selected, setSelected] = useState(null);

  function handleSelect(id) {
    setSelected(prev => (prev === id ? null : id));
  }

  function handleEnter() {
    if (selected) onLogin(selected);
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <div style={s.logoIcon}><PlaneIcon /></div>
          <div>
            <div style={s.logoText}>
              Aero<span style={{ color: c.primaryLt }}>License</span>
            </div>
            <div style={s.tagline}>Gestão de Licenças de Aviação</div>
          </div>
        </div>

        <p style={s.subtitle}>Selecione o perfil para aceder à demonstração</p>

        <div style={s.rolesRow}>
          {ROLES.map(({ id, label, sub, Icon }) => {
            const active = selected === id;
            return (
              <div
                key={id}
                data-testid={`role-card-${id}`}
                onClick={() => handleSelect(id)}
                style={{
                  ...s.roleCard,
                  borderColor: active ? c.primary : c.border,
                  background:  active ? c.primaryGlow : c.bgElevated,
                  boxShadow:   active ? shadow.glow : 'none',
                }}
              >
                <span style={{ color: active ? c.primaryLt : c.textMuted }}>
                  <Icon />
                </span>
                <div style={s.roleLabel}>{label}</div>
                <div style={s.roleSub}>{sub}</div>
              </div>
            );
          })}
        </div>

        <button
          data-testid="enter-btn"
          onClick={handleEnter}
          disabled={!selected}
          style={{
            ...s.enterBtn,
            opacity: selected ? 1 : 0.45,
            cursor:  selected ? 'pointer' : 'not-allowed',
          }}
        >
          Entrar
        </button>

        <p style={s.footer}>Demo académico · ISEC Lisboa · Dados simulados</p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: c.bgDeep,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: c.bgCard,
    border: `1px solid ${c.border}`,
    borderRadius: 16,
    padding: '36px 40px',
    maxWidth: 480, width: '100%',
    boxShadow: shadow.card,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  logoRow: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
  },
  logoIcon: {
    width: 40, height: 40,
    background: gradientPrimary,
    borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 12px rgba(29,78,216,.45)',
  },
  logoText: { fontSize: 20, fontWeight: 800, color: c.text, letterSpacing: '-0.4px', lineHeight: 1.1 },
  tagline:  { fontSize: 11, color: c.textMuted, fontWeight: 500, marginTop: 3 },
  subtitle: { fontSize: 13, color: c.textSub, margin: '20px 0 24px', textAlign: 'center' },
  rolesRow: { display: 'flex', gap: 16, width: '100%', marginBottom: 24 },
  roleCard: {
    flex: 1,
    border: '1.5px solid',
    borderRadius: 12,
    padding: '20px 16px',
    cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    transition: 'border-color .15s, background .15s, box-shadow .15s',
  },
  roleLabel: { fontSize: 13, fontWeight: 700, color: c.text, textAlign: 'center' },
  roleSub:   { fontSize: 11, color: c.textMuted, textAlign: 'center', lineHeight: 1.4 },
  enterBtn: {
    width: '100%',
    padding: '13px',
    background: gradientPrimary,
    border: 'none', borderRadius: 10,
    color: '#fff', fontWeight: 700, fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif',
    boxShadow: '0 4px 14px rgba(29,78,216,.35)',
    marginBottom: 20,
  },
  footer: { fontSize: 11, color: c.textDim, textAlign: 'center', margin: 0 },
};
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd frontend
npm test -- --testPathPattern=LoginPage --watchAll=false
```

Expected: 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/pages/LoginPage.jsx src/pages/LoginPage.test.jsx src/setupTests.js package.json package-lock.json
git commit -m "feat: add LoginPage component with role selection"
```

---

## Task 3: Wire App.jsx gate and write App tests

**Files:**
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/App.test.jsx`

> Context: `App.jsx` currently returns a single JSX tree with `HashRouter` at the root. We add `isLoggedIn` and `activeRole` state (lazy-initialised from `sessionStorage`). When `isLoggedIn` is false, return `<LoginPage onLogin={handleLogin} />` before the `HashRouter`. `handleLogin` writes to `sessionStorage` and updates state. The `activeRole` value is passed as a prop to `Header`.
>
> Current `App.jsx` full content:
> ```jsx
> import { HashRouter, Routes, Route } from 'react-router-dom';
> import Header       from './components/Header';
> import ErrorBoundary from './components/ErrorBoundary';
> import Sidebar    from './components/Sidebar';
> import ChatPanel  from './components/ChatPanel';
> import Dashboard      from './pages/Dashboard';
> import PilotDetail    from './pages/PilotDetail';
> import UploadPage     from './pages/UploadPage';
> import AlertsPage     from './pages/AlertsPage';
> import BlockchainDemo from './pages/BlockchainDemo';
> import AnalyticsPage from './pages/AnalyticsPage';
>
> export default function App() {
>   return (
>     <HashRouter>
>       <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#020B16' }}>
>         <Header />
>         <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
>           <Sidebar />
>           <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
>             <ErrorBoundary>
>             <Routes>
>               <Route path="/"                      element={<Dashboard />} />
>               <Route path="/pilots/:id"            element={<PilotDetail />} />
>               <Route path="/pilots/:id/upload"     element={<UploadPage />} />
>               <Route path="/alerts"                element={<AlertsPage />} />
>               <Route path="/blockchain"            element={<BlockchainDemo />} />
>               <Route path="/analytics"             element={<AnalyticsPage />} />
>             </Routes>
>             </ErrorBoundary>
>           </main>
>         </div>
>       </div>
>       <ChatPanel />
>     </HashRouter>
>   );
> }
> ```

- [ ] **Step 1: Write the failing App tests**

Create `frontend/src/App.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

beforeEach(() => sessionStorage.clear());

test('shows login page when sessionStorage is empty', () => {
  render(<App />);
  expect(screen.getByTestId('role-card-operador')).toBeInTheDocument();
});

test('shows role badge after logging in', () => {
  render(<App />);
  fireEvent.click(screen.getByTestId('role-card-operador'));
  fireEvent.click(screen.getByTestId('enter-btn'));
  expect(screen.getByTestId('role-badge')).toBeInTheDocument();
});

test('rehydrates from sessionStorage without showing login', () => {
  sessionStorage.setItem('aero_role', 'inspector');
  render(<App />);
  expect(screen.queryByTestId('role-card-operador')).not.toBeInTheDocument();
  expect(screen.getByTestId('role-badge')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend
npm test -- --testPathPattern=App.test --watchAll=false
```

Expected: FAIL — `role-card-operador` not found (login gate not yet added).

- [ ] **Step 3: Update App.jsx**

Replace the full content of `frontend/src/App.jsx` with:

```jsx
import { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Header        from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar       from './components/Sidebar';
import ChatPanel     from './components/ChatPanel';
import Dashboard     from './pages/Dashboard';
import PilotDetail   from './pages/PilotDetail';
import UploadPage    from './pages/UploadPage';
import AlertsPage    from './pages/AlertsPage';
import BlockchainDemo from './pages/BlockchainDemo';
import AnalyticsPage from './pages/AnalyticsPage';
import LoginPage     from './pages/LoginPage';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!sessionStorage.getItem('aero_role')
  );
  const [activeRole, setActiveRole] = useState(
    () => sessionStorage.getItem('aero_role') || null
  );

  function handleLogin(role) {
    sessionStorage.setItem('aero_role', role);
    setActiveRole(role);
    setIsLoggedIn(true);
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#020B16' }}>
        <Header activeRole={activeRole} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />
          <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
            <ErrorBoundary>
              <Routes>
                <Route path="/"                  element={<Dashboard />} />
                <Route path="/pilots/:id"        element={<PilotDetail />} />
                <Route path="/pilots/:id/upload" element={<UploadPage />} />
                <Route path="/alerts"            element={<AlertsPage />} />
                <Route path="/blockchain"        element={<BlockchainDemo />} />
                <Route path="/analytics"         element={<AnalyticsPage />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <ChatPanel />
    </HashRouter>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend
npm test -- --testPathPattern=App.test --watchAll=false
```

Expected: 3 tests PASS. (The test for `role-badge` will fail until Task 4 is done — that's fine, leave it for now and re-run after Task 4.)

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/App.jsx src/App.test.jsx
git commit -m "feat: add login gate to App with sessionStorage rehydration"
```

---

## Task 4: Add role badge to Header and write Header tests

**Files:**
- Modify: `frontend/src/components/Header.jsx`
- Create: `frontend/src/components/Header.test.jsx`

> Context: `Header.jsx` currently accepts no props. We add an `activeRole` prop (`'operador'` | `'inspector'` | `null`). When truthy, a small pill badge is rendered in the `right` section (the `div` that contains `techStack`, `divider`, `bellBtn`, `avatar`), inserted before the `divider`. Two small SVG icons are added inline.
>
> The role badge style: `bgElevated` background, `primaryLt` text, `border` outline, `borderRadius: 20`, `padding: '4px 10px'`, `fontSize: 11`, flex row with gap 5.

- [ ] **Step 1: Write the failing Header tests**

Create `frontend/src/components/Header.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import Header from './Header';

test('renders role badge for operador', () => {
  render(<Header activeRole="operador" />);
  expect(screen.getByTestId('role-badge')).toBeInTheDocument();
  expect(screen.getByTestId('role-badge')).toHaveTextContent('Operador');
});

test('renders role badge for inspector', () => {
  render(<Header activeRole="inspector" />);
  expect(screen.getByTestId('role-badge')).toBeInTheDocument();
  expect(screen.getByTestId('role-badge')).toHaveTextContent('Inspector ANAC');
});

test('does not render role badge when activeRole is null', () => {
  render(<Header activeRole={null} />);
  expect(screen.queryByTestId('role-badge')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend
npm test -- --testPathPattern=Header.test --watchAll=false
```

Expected: FAIL — `role-badge` not found.

- [ ] **Step 3: Update Header.jsx**

Replace the full content of `frontend/src/components/Header.jsx` with:

```jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { c, gradientPrimary } from '../theme';

const ROLE_CONFIG = {
  operador:  { label: 'Operador',      Icon: BriefcaseIcon },
  inspector: { label: 'Inspector ANAC', Icon: ShieldBadgeIcon },
};

function PlaneIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2h0A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z" fill="#fff"/>
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"/>
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  );
}

function ShieldBadgeIcon() {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

export default function Header({ activeRole }) {
  const [online, setOnline] = useState(null);
  const [mode,   setMode]   = useState('');

  useEffect(() => {
    api.status()
      .then(d => { setOnline(true); setMode(d.modo || ''); })
      .catch(() => setOnline(false));
  }, []);

  const roleEntry = activeRole ? ROLE_CONFIG[activeRole] : null;

  return (
    <header style={s.header}>
      {/* Left: Logo */}
      <div style={s.logo}>
        <div style={s.logoIcon}><PlaneIcon /></div>
        <div>
          <div style={s.logoText}>
            Aero<span style={{ color: c.primaryLt }}>License</span>
          </div>
          <div style={s.tagline}>Gestão de Licenças de Aviação</div>
        </div>
        <div style={s.demoBadge}>DEMO</div>
      </div>

      {/* Center: Status */}
      <div style={s.statusPill}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: online ? c.green : online === false ? c.red : c.amber,
          boxShadow: online ? `0 0 8px ${c.green}` : 'none',
        }} />
        <span style={s.statusText}>
          {online === null ? 'A ligar...' : online
            ? `API online · ${mode || 'demo'}`
            : 'API offline'}
        </span>
      </div>

      {/* Right: Role badge + tech badges + bell + avatar */}
      <div style={s.right}>
        {roleEntry && (
          <div style={s.roleBadge} data-testid="role-badge">
            <roleEntry.Icon />
            <span>{roleEntry.label}</span>
          </div>
        )}
        <div style={s.techStack}>
          <span style={{ ...s.techBadge, color: c.primaryLt, borderColor: `${c.primary}50` }}>FastAPI</span>
          <span style={{ ...s.techBadge, color: c.purpleLt,  borderColor: `${c.purple}50` }}>Solidity</span>
          <span style={{ ...s.techBadge, color: '#61DAFB',   borderColor: '#61DAFB30' }}>React</span>
        </div>
        <div style={s.divider} />
        <button style={s.bellBtn} title="Notificações">
          <BellIcon />
          <span style={s.bellDot} />
        </button>
        <div style={s.avatar}><span>AD</span></div>
      </div>
    </header>
  );
}

const s = {
  header: {
    background: c.bgHeader,
    borderBottom: `1px solid ${c.border}`,
    padding: '0 24px',
    height: 64,
    display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
    position: 'sticky', top: 0, zIndex: 100,
    backdropFilter: 'blur(12px)',
  },
  logo:    { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: {
    width: 36, height: 36,
    background: gradientPrimary, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, boxShadow: '0 2px 12px rgba(29,78,216,.45)',
  },
  logoText: { fontSize: 17, fontWeight: 800, color: c.text, letterSpacing: '-0.4px', lineHeight: 1.1 },
  tagline:  { fontSize: 10, color: c.textMuted, fontWeight: 500, marginTop: 2, letterSpacing: '0.2px' },
  demoBadge: {
    fontSize: 9, fontWeight: 700, letterSpacing: '1px',
    color: c.amber, background: c.amberBg,
    border: `1px solid ${c.amber}40`,
    padding: '2px 7px', borderRadius: 4,
    alignSelf: 'flex-start', marginTop: 2,
  },
  statusPill: {
    marginLeft: 'auto',
    display: 'flex', alignItems: 'center', gap: 7,
    background: `${c.bgSurface}CC`, border: `1px solid ${c.border}`,
    padding: '5px 12px', borderRadius: 20,
  },
  statusText: { fontSize: 11, color: c.textSub, fontWeight: 500 },
  right:     { display: 'flex', alignItems: 'center', gap: 12 },
  roleBadge: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: c.bgElevated, border: `1px solid ${c.border}`,
    borderRadius: 20, padding: '4px 10px',
    fontSize: 11, fontWeight: 600, color: c.primaryLt,
  },
  techStack: { display: 'flex', gap: 6 },
  techBadge: {
    fontSize: 10, fontWeight: 600,
    padding: '3px 9px', borderRadius: 5, border: '1px solid',
    background: 'transparent', letterSpacing: '0.2px',
  },
  divider: { width: 1, height: 20, background: c.border },
  bellBtn: {
    position: 'relative',
    background: 'transparent', border: 'none',
    color: c.textMuted, cursor: 'pointer',
    padding: 6, borderRadius: 8,
    display: 'flex', alignItems: 'center',
  },
  bellDot: {
    position: 'absolute', top: 5, right: 5,
    width: 6, height: 6, borderRadius: '50%',
    background: c.red, border: `1px solid ${c.bgHeader}`,
  },
  avatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: gradientPrimary,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(29,78,216,.4)',
  },
};
```

- [ ] **Step 4: Run Header tests**

```bash
cd frontend
npm test -- --testPathPattern=Header.test --watchAll=false
```

Expected: 3 tests PASS.

- [ ] **Step 5: Run App tests (now all 3 should pass)**

```bash
cd frontend
npm test -- --testPathPattern=App.test --watchAll=false
```

Expected: 3 tests PASS (the `role-badge` test now passes because Header is updated).

- [ ] **Step 6: Run all tests**

```bash
cd frontend
npm test -- --watchAll=false
```

Expected: All tests PASS (LoginPage: 5, Header: 3, App: 3, api: 2 = 13 total).

- [ ] **Step 7: Commit**

```bash
cd frontend
git add src/components/Header.jsx src/components/Header.test.jsx
git commit -m "feat: add role badge to Header; wire full login gate"
```
