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
