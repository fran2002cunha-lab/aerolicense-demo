import { useState, useEffect } from 'react';
import { api } from '../api';
import { c, gradientPrimary } from '../theme';

const PlaneIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
    <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2h0A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z" fill="#fff"/>
  </svg>
);

export default function Header() {
  const [online, setOnline] = useState(null);
  const [mode, setMode]     = useState('');

  useEffect(() => {
    api.status()
      .then(d => { setOnline(true); setMode(d.modo || ''); })
      .catch(() => setOnline(false));
  }, []);

  return (
    <header style={s.header}>
      <div style={s.logo}>
        <div style={s.logoIcon}><PlaneIcon /></div>
        <div>
          <div style={s.logoText}>Aero<span style={{ color: c.primaryLt }}>License</span></div>
          <div style={s.statusRow}>
            <div style={{ ...s.dot, background: online ? c.green : c.red,
              boxShadow: online ? `0 0 6px ${c.green}` : 'none' }} />
            <span style={s.statusText}>
              {online === null ? 'A ligar...' : online
                ? `API online · ${mode || 'demo'}`
                : 'API offline'}
            </span>
          </div>
        </div>
      </div>

      <div style={s.right}>
        <span style={{ ...s.badge, borderColor: '#1A56DB44', color: c.primaryLt }}>FastAPI</span>
        <span style={{ ...s.badge, borderColor: '#7C3AED44', color: c.purple }}>Solidity</span>
        <span style={{ ...s.badge }}>React</span>
      </div>
    </header>
  );
}

const s = {
  header:    { background: c.bgHeader, borderBottom: `1px solid ${c.border}`,
    padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 },
  logo:      { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon:  { width: 34, height: 34, background: gradientPrimary, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logoText:  { fontSize: 18, fontWeight: 800, color: c.text, letterSpacing: '-0.3px' },
  statusRow: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 },
  dot:       { width: 6, height: 6, borderRadius: '50%', transition: 'background .3s' },
  statusText:{ fontSize: 11, color: c.textMuted, fontWeight: 500 },
  right:     { marginLeft: 'auto', display: 'flex', gap: 6 },
  badge:     { background: `${c.bgSurface}`, border: `1px solid ${c.border}`,
    color: c.textMuted, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6 },
};
