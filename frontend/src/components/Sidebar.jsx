import { NavLink } from 'react-router-dom';
import { c } from '../theme';

const icons = {
  pilots: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0"/>
    </svg>
  ),
  alerts: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"/>
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/>
    </svg>
  ),
  blockchain: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1"/>
    </svg>
  ),
};

const links = [
  { to: '/',           icon: icons.pilots,     label: 'Pilotos',    alertBadge: false },
  { to: '/alerts',     icon: icons.alerts,     label: 'Alertas',    alertBadge: true },
  { to: '/analytics',  icon: icons.analytics,  label: 'Analytics',  alertBadge: false },
  { to: '/blockchain', icon: icons.blockchain, label: 'Blockchain', alertBadge: false },
];

export default function Sidebar() {
  return (
    <nav style={s.nav}>
      <div style={s.section}>
        <div style={s.sectionLabel}>Menu</div>
        {links.map(({ to, icon, label, alertBadge }) => (
          <NavLink key={to} to={to} end style={({ isActive }) => ({
            ...s.link,
            background: isActive ? `${c.primary}18` : 'transparent',
            color: isActive ? c.primaryLt : c.textMuted,
          })}>
            <span style={{ color: 'inherit', display: 'flex', alignItems: 'center' }}>{icon}</span>
            <span>{label}</span>
            {alertBadge && (
              <span style={s.badge}>!</span>
            )}
          </NavLink>
        ))}
      </div>

      <div style={s.avatarBox}>
        <div style={s.avatarCircle}>AD</div>
        <div>
          <div style={s.avatarName}>Admin</div>
          <div style={s.avatarRole}>ANAC Portugal</div>
        </div>
      </div>
    </nav>
  );
}

const s = {
  nav:         { width: 220, background: c.bgHeader, borderRight: `1px solid ${c.border}`,
    padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 },
  section:     { padding: '0 12px', flex: 1 },
  sectionLabel:{ fontSize: 10, fontWeight: 600, color: c.textDim, textTransform: 'uppercase',
    letterSpacing: '1px', padding: '8px 10px 4px' },
  link:        { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
    borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'all .15s' },
  badge:       { marginLeft: 'auto', background: c.red, color: '#fff',
    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10 },
  avatarBox:   { margin: '0 12px 8px', background: c.bgSurface, border: `1px solid ${c.border}`,
    borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 },
  avatarCircle:{ width: 30, height: 30, borderRadius: '50%',
    background: 'linear-gradient(135deg, #1A56DB, #0EA5E9)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 },
  avatarName:  { fontSize: 12, fontWeight: 600, color: c.text },
  avatarRole:  { fontSize: 10, color: c.textMuted },
};
