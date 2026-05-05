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
