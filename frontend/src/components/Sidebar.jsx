import { NavLink } from 'react-router-dom';
import { c } from '../theme';

const PilotsIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0"/>
  </svg>
);
const AlertsIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"/>
  </svg>
);
const AnalyticsIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/>
  </svg>
);
const BlockchainIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1"/>
  </svg>
);
const AboutIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
  </svg>
);

const links = [
  { to: '/',           Icon: PilotsIcon,     label: 'Pilotos',    alert: false },
  { to: '/alerts',     Icon: AlertsIcon,     label: 'Alertas',    alert: true  },
  { to: '/analytics',  Icon: AnalyticsIcon,  label: 'Analytics',  alert: false },
  { to: '/blockchain', Icon: BlockchainIcon, label: 'Blockchain', alert: false },
  { to: '/sobre',      Icon: AboutIcon,      label: 'Sobre',      alert: false },
];

export default function Sidebar({ onNavigate }) {
  return (
    <nav style={s.nav} aria-label="Navegação principal">
      <div style={s.section}>
        <div style={s.sectionLabel} aria-hidden="true">Navegação</div>
        {links.map(({ to, Icon, label, alert }) => (
          <NavLink key={to} to={to} end onClick={onNavigate} style={({ isActive }) => ({
            ...s.link,
            background:   isActive ? `${c.primary}20` : 'transparent',
            color:        isActive ? c.primaryLt : c.textMuted,
            borderLeft:   isActive ? `2px solid ${c.primary}` : '2px solid transparent',
          })}>
            {({ isActive }) => (
              <>
                <span style={{ color: isActive ? c.primaryLt : c.textMuted, display: 'flex' }} aria-hidden="true">
                  <Icon />
                </span>
                <span style={{ flex: 1 }}>{label}</span>
                {alert && (
                  <span style={s.alertDot} aria-label="Tem alertas" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div style={s.footer}>
        <div style={s.footerLabel}>Organização</div>
        <div style={s.avatarBox}>
          <div style={s.avatarCircle}>AD</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.avatarName}>Admin</div>
            <div style={s.avatarRole}>ANAC Portugal</div>
          </div>
          <div style={s.onlineDot} />
        </div>
      </div>
    </nav>
  );
}

const s = {
  nav: {
    width: 224,
    background: c.bgHeader,
    borderRight: `1px solid ${c.border}`,
    padding: '20px 0 16px',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  section: { padding: '0 10px', flex: 1 },
  sectionLabel: {
    fontSize: 9, fontWeight: 700, color: c.textDim,
    textTransform: 'uppercase', letterSpacing: '1.2px',
    padding: '0 10px 10px',
  },
  link: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: 13, fontWeight: 500,
    transition: 'all .15s ease',
    marginBottom: 2,
    paddingLeft: 10,
  },
  alertDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: c.red,
    boxShadow: `0 0 6px ${c.red}`,
  },
  footer: { padding: '0 10px' },
  footerLabel: {
    fontSize: 9, fontWeight: 700, color: c.textDim,
    textTransform: 'uppercase', letterSpacing: '1.2px',
    padding: '12px 10px 8px',
    borderTop: `1px solid ${c.border}`,
    marginTop: 8,
  },
  avatarBox: {
    background: `${c.bgSurface}`,
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    padding: '10px 12px',
    display: 'flex', alignItems: 'center', gap: 10,
  },
  avatarCircle: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
    boxShadow: '0 2px 8px rgba(29,78,216,.4)',
  },
  avatarName: { fontSize: 12, fontWeight: 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  avatarRole: { fontSize: 10, color: c.textMuted, marginTop: 1 },
  onlineDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: c.green, flexShrink: 0,
    boxShadow: `0 0 6px ${c.green}`,
  },
};
