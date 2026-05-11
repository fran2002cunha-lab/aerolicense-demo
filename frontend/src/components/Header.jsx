import { useState, useEffect } from 'react';
import { api } from '../api';
import { c, gradientPrimary } from '../theme';

const ROLE_CONFIG = {
  gestor:    { label: 'Gestor',         Icon: BriefcaseIcon },
  piloto:    { label: 'Piloto',         Icon: PlaneIcon },
  regulador: { label: 'Regulador ANAC', Icon: ShieldBadgeIcon },
  visitante: { label: 'Visitante',      Icon: BriefcaseIcon },
  operador:  { label: 'Operador',       Icon: BriefcaseIcon },
  inspector: { label: 'Inspector ANAC', Icon: ShieldBadgeIcon },
};

function PlaneIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2h0A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z" fill="#fff"/>
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"/>
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  );
}

function ShieldBadgeIcon() {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

function HamburgerIcon({ open }) {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
      {open
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
        : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
      }
    </svg>
  );
}

export default function Header({ activeRole, onMenuToggle, menuOpen }) {
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
      {/* Hamburger (mobile only) */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          style={s.hamburger}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          <HamburgerIcon open={menuOpen} />
        </button>
      )}

      {/* Left: Logo */}
      <div style={s.logo}>
        <div style={s.logoIcon} aria-hidden="true"><PlaneIcon /></div>
        <div>
          <div style={s.logoText}>
            Aero<span style={{ color: c.primaryLt }}>License</span>
          </div>
          <div style={s.tagline} className="header-tagline">Gestão de Licenças de Aviação</div>
        </div>
        <div style={s.demoBadge} aria-label="Versão de demonstração">DEMO</div>
      </div>

      {/* Center: Status */}
      <div style={s.statusPill} role="status" aria-live="polite" className="header-status">
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: online ? c.green : online === false ? c.red : c.amber,
          boxShadow: online ? `0 0 8px ${c.green}` : 'none',
        }} aria-hidden="true" />
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
        <div style={s.techStack} aria-label="Stack técnica" className="header-tech-stack">
          <span style={{ ...s.techBadge, color: c.primaryLt, borderColor: `${c.primary}50` }}>FastAPI</span>
          <span style={{ ...s.techBadge, color: c.purpleLt,  borderColor: `${c.purple}50` }}>Solidity</span>
          <span style={{ ...s.techBadge, color: '#61DAFB',   borderColor: '#61DAFB30' }}>React</span>
        </div>
        <div style={s.divider} aria-hidden="true" />
        <button style={s.bellBtn} aria-label="Notificações">
          <BellIcon />
          <span style={s.bellDot} aria-hidden="true" />
        </button>
        <div
          style={s.avatar}
          role="button"
          tabIndex={0}
          aria-label="Menu do utilizador — Admin"
        >
          <span aria-hidden="true">AD</span>
        </div>
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
  hamburger: {
    background: 'transparent', border: 'none',
    color: c.textMuted, cursor: 'pointer',
    padding: 8, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 44, minHeight: 44,
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
    minWidth: 44, minHeight: 44, justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute', top: 8, right: 8,
    width: 6, height: 6, borderRadius: '50%',
    background: c.red, border: `1px solid ${c.bgHeader}`,
  },
  avatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: gradientPrimary,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(29,78,216,.4)',
    minWidth: 36, minHeight: 36,
  },
};
