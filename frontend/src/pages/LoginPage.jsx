import { useState } from 'react';
import { c, gradientPrimary, shadow } from '../theme';

const ROLES = [
  { id: 'gestor',    label: 'Gestor de Frota', sub: 'Operador / Companhia Aérea', icon: '✈' },
  { id: 'piloto',    label: 'Piloto',           sub: 'Tripulante certificado EASA', icon: '👨‍✈️' },
  { id: 'regulador', label: 'Regulador',        sub: 'ANAC / Autoridade Civil',    icon: '🏛' },
];

const BADGES = [
  { icon: '🔐', label: 'Blockchain SHA-256',   color: c.primaryLt },
  { icon: '🤖', label: 'ML Anomaly Detection', color: c.green },
  { icon: '📋', label: 'QR Verification',      color: c.amber },
  { icon: '⚡', label: 'Alertas Automáticos',  color: c.purple },
];

function TapLogo() {
  return (
    <svg width="82" height="38" viewBox="0 0 82 38" aria-label="TAP Air Portugal">
      <text x="20" y="35" fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900" fontSize="38" fill="#5B8C1A">A</text>
      <text x="0"  y="35" fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900" fontSize="38" fill="#8DB82A">T</text>
      <text x="46" y="35" fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900" fontSize="38" fill="#C0281E">P</text>
    </svg>
  );
}

function AnacLogo() {
  const blue = '#3A8DC5';
  return (
    <svg width="120" height="52" viewBox="0 0 120 52" aria-label="ANAC - Autoridade Nacional da Aviação Civil">
      <path d="M58 18 C50 10, 28 8, 4 18 C4 22, 26 16, 52 24 Z" fill={blue}/>
      <path d="M62 18 C70 10, 92 8, 116 18 C116 22, 94 16, 68 24 Z" fill={blue}/>
      <circle cx="60" cy="16" r="14" fill="white" stroke={blue} strokeWidth="1.5"/>
      <rect x="57.5" y="5"    width="5"  height="22" rx="0.5" fill={blue}/>
      <rect x="51"   y="9"    width="18" height="5"  rx="0.5" fill={blue}/>
      <rect x="53.5" y="15.5" width="13" height="4"  rx="0.5" fill={blue}/>
      <text x="60" y="42" textAnchor="middle" fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900" fontSize="13" fill={blue} letterSpacing="2">ANAC</text>
      <text x="60" y="50" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="400" fontSize="4.8" fill={blue} letterSpacing="0.3">AUTORIDADE NACIONAL DA AVIAÇÃO CIVIL</text>
    </svg>
  );
}

export default function LoginPage({ onLogin }) {
  const [selected, setSelected] = useState(null);

  function handleSelect(id) {
    setSelected(prev => (prev === id ? null : id));
  }

  return (
    <div style={s.page}>
      <div style={s.split}>

        {/* ── Coluna esquerda: proposta de valor ── */}
        <div style={s.left}>
          <div style={s.brand}>
            <span style={{ color: c.text, fontWeight: 900 }}>AERO</span>
            <span style={{ color: c.primaryLt, fontWeight: 900 }}>LICENSE</span>
          </div>
          <h1 style={s.headline}>O futuro da conformidade aeronáutica</h1>
          <p style={s.sub}>Blockchain · IA · Conformidade EASA</p>

          <div style={s.badges}>
            {BADGES.map(({ icon, label, color }) => (
              <span key={label} style={{ ...s.badge, color, background: `${color}18`, border: `1px solid ${color}35` }}>
                {icon} {label}
              </span>
            ))}
          </div>

          <div style={s.logoRow}>
            <span style={s.logoLabel}>Parceiros de referência</span>
            <div style={s.logos}>
              <TapLogo />
              <AnacLogo />
            </div>
          </div>
        </div>

        {/* ── Coluna direita: acesso ── */}
        <div style={s.right}>
          <div style={s.panel}>
            <div style={s.panelTitle}>Acesso à plataforma</div>
            <div style={s.panelSub}>Escolhe o teu perfil de acesso</div>

            <div style={s.roleList} role="radiogroup" aria-label="Perfil de acesso">
              {ROLES.map(({ id, label, sub, icon }) => {
                const active = selected === id;
                return (
                  <div
                    key={id}
                    data-testid={`role-card-${id}`}
                    role="radio"
                    tabIndex={0}
                    aria-checked={active}
                    onClick={() => handleSelect(id)}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleSelect(id)}
                    style={{
                      ...s.roleCard,
                      borderColor: active ? c.primary    : c.border,
                      background:  active ? `${c.primary}12` : c.bgElevated,
                      boxShadow:   active ? shadow.glow  : 'none',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{label}</div>
                      <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{sub}</div>
                    </div>
                    {active && (
                      <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: c.primaryLt, flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>

            <button
              data-testid="enter-btn"
              onClick={() => selected && onLogin(selected)}
              disabled={!selected}
              style={{
                ...s.enterBtn,
                opacity: selected ? 1 : 0.4,
                cursor:  selected ? 'pointer' : 'not-allowed',
              }}
            >
              Entrar na Demo →
            </button>

            <button
              data-testid="guest-link"
              onClick={() => onLogin('visitante')}
              style={s.guestLink}
            >
              Explorar sem selecionar perfil
            </button>

            <p style={s.footer}>Demo académico · ISEC Lisboa · Dados simulados</p>
          </div>
        </div>

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
  split: {
    display: 'flex',
    gap: 0,
    maxWidth: 900,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    border: `1px solid ${c.border}`,
    boxShadow: shadow.card,
    flexWrap: 'wrap',
  },
  left: {
    flex: '1 1 340px',
    background: 'linear-gradient(160deg, #0C1E34 0%, #060F1E 100%)',
    padding: '48px 40px',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    borderRight: `1px solid ${c.border}`,
  },
  right: {
    flex: '1 1 300px',
    background: c.bgCard,
    padding: '40px 36px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  panel: { width: '100%', maxWidth: 320 },

  brand: {
    fontSize: 26, letterSpacing: 3, marginBottom: 20,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  headline: {
    fontSize: 24, fontWeight: 900, color: c.text,
    lineHeight: 1.25, margin: '0 0 10px',
    letterSpacing: '-0.5px',
  },
  sub: {
    fontSize: 13, color: c.textMuted, margin: '0 0 28px', fontWeight: 500,
  },
  badges: {
    display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 36,
  },
  badge: {
    fontSize: 11, fontWeight: 600,
    padding: '5px 11px', borderRadius: 20,
    display: 'flex', alignItems: 'center', gap: 5,
  },
  logoRow: { marginTop: 'auto' },
  logoLabel: {
    display: 'block',
    fontSize: 10, color: c.textDim,
    textTransform: 'uppercase', letterSpacing: '1px',
    marginBottom: 10,
  },
  logos: { display: 'flex', alignItems: 'center', gap: 24 },

  panelTitle: { fontSize: 18, fontWeight: 800, color: c.text, marginBottom: 4 },
  panelSub:   { fontSize: 12, color: c.textMuted, marginBottom: 24 },

  roleList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 },
  roleCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', borderRadius: 10,
    border: '1.5px solid', cursor: 'pointer',
    transition: 'border-color .15s, background .15s, box-shadow .15s',
  },

  enterBtn: {
    width: '100%', padding: '13px',
    background: gradientPrimary,
    border: 'none', borderRadius: 10,
    color: '#fff', fontWeight: 700, fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif',
    boxShadow: '0 4px 14px rgba(29,78,216,.35)',
    marginBottom: 12,
    transition: 'opacity .15s',
  },
  guestLink: {
    width: '100%', padding: '9px',
    background: 'none', border: 'none',
    color: c.textMuted, fontSize: 12,
    fontFamily: 'Inter, system-ui, sans-serif',
    cursor: 'pointer', marginBottom: 16,
    textDecoration: 'underline',
  },
  footer: { fontSize: 10, color: c.textDim, textAlign: 'center', margin: 0 },
};
