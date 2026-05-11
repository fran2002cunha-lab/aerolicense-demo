import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import DocumentCard from '../components/DocumentCard';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';
import { c, gradientPrimary, shadow, pilotStatusBadge } from '../theme';

const ArrowLeftIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
  </svg>
);
const WalletIcon = () => (
  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z"/>
  </svg>
);

export default function PilotDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [pilot,   setPilot]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    api.pilot(id)
      .then(setPilot)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  const docs = pilot.documentos.map(d => ({
    hash:              d.hash,
    doc_type:          d.tipo,
    description:       d.descricao,
    expires_at:        d.validade,
    days_until_expiry: Math.max(0, d.dias_restantes),
    status:            d.status,
  }));

  const initials    = pilot.nome.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase();
  const badge       = pilotStatusBadge(pilot.compliance_ok, pilot.expirados);
  const validCount  = docs.filter(d => d.status === 'valid').length;
  const expCount    = docs.filter(d => d.status === 'expired').length;
  const soonCount   = docs.filter(d => d.status === 'expiring_soon').length;

  return (
    <div style={{ maxWidth: 960 }}>

      {/* ── Profile card ── */}
      <div style={s.profileCard}>
        <div style={s.profileLeft}>
          <div style={{ ...s.avatar, background: `${badge.color}20`, color: badge.color,
            border: `2px solid ${badge.color}40` }}>
            {initials}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={s.name}>{pilot.nome}</span>
              <span style={{ ...s.badge, color: badge.color, background: badge.bg,
                border: `1px solid ${badge.color}35` }}>
                {badge.label}
              </span>
            </div>
            <div style={s.cargo}>{pilot.cargo}</div>
            <div style={s.wallet}>
              <WalletIcon />
              <span>{pilot.carteira_ethereum}</span>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={s.statsStrip}>
          <StatPill value={validCount}  label="Válidos"    color={c.green} />
          <StatPill value={soonCount}   label="A expirar"  color={c.amber} />
          <StatPill value={expCount}    label="Expirados"  color={c.red} />
          <StatPill value={docs.length} label="Total docs" color={c.primaryLt} />
        </div>
      </div>

      {/* ── Action bar ── */}
      <div style={s.actionBar}>
        <div style={s.docsLabel}>
          Documentos do Piloto
          <span style={s.docsCount}>{docs.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/')} style={s.btnBack}>
            <ArrowLeftIcon /> Voltar
          </button>
          <button onClick={() => navigate(`/pilots/${id}/upload`)} style={s.btnPrimary}>
            <PlusIcon /> Novo Documento
          </button>
        </div>
      </div>

      {/* ── Document grid ── */}
      {docs.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>📄</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Sem documentos registados</div>
          <div style={{ fontSize: 13, color: c.textMuted, marginTop: 4 }}>
            Clique em "Novo Documento" para registar o primeiro documento na blockchain.
          </div>
        </div>
      ) : (
        <div style={s.grid}>
          {docs.map(doc => <DocumentCard key={doc.hash} document={doc} />)}
        </div>
      )}
    </div>
  );
}

function StatPill({ value, label, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 16px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: c.textMuted, marginTop: 3, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}
      </div>
    </div>
  );
}

const s = {
  profileCard: {
    background: c.bgCard, border: `1px solid ${c.border}`,
    borderRadius: 16, padding: '22px 24px', marginBottom: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 20, flexWrap: 'wrap',
    boxShadow: shadow.card,
  },
  profileLeft: { display: 'flex', alignItems: 'center', gap: 16, flex: 1 },
  avatar: {
    width: 56, height: 56, borderRadius: 14, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 800, letterSpacing: '0.5px',
  },
  name: { fontSize: 18, fontWeight: 800, color: c.text, letterSpacing: '-0.3px' },
  badge: {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.8px',
    padding: '3px 9px', borderRadius: 6,
  },
  cargo: { fontSize: 12, color: c.textMuted, marginTop: 3, fontWeight: 500 },
  wallet: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 10, color: c.textDim, fontFamily: 'monospace',
    marginTop: 7, letterSpacing: '0.3px',
  },
  statsStrip: {
    display: 'flex', alignItems: 'center',
    background: c.bgElevated, borderRadius: 12,
    padding: '12px 0', gap: 4,
    border: `1px solid ${c.border}`,
  },

  actionBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16, flexWrap: 'wrap', gap: 12,
  },
  docsLabel: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 13, fontWeight: 700, color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.8px',
  },
  docsCount: {
    fontSize: 11, fontWeight: 700, color: c.primaryLt,
    background: `${c.primary}18`, border: `1px solid ${c.primary}35`,
    padding: '1px 8px', borderRadius: 20,
  },
  btnBack: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', background: 'transparent',
    border: `1px solid ${c.border}`, borderRadius: 9,
    color: c.textMuted, fontWeight: 600, cursor: 'pointer',
    fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif',
  },
  btnPrimary: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)',
    border: 'none', borderRadius: 9,
    color: '#fff', fontWeight: 600, cursor: 'pointer',
    fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif',
    boxShadow: '0 3px 10px rgba(29,78,216,.3)',
  },

  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: 14,
  },
  emptyState: {
    textAlign: 'center', padding: '56px 24px',
    background: c.bgCard, border: `1px solid ${c.border}`,
    borderRadius: 14,
  },
};
