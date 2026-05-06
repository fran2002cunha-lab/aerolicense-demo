import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';
import { c, shadow, gradientPrimary, pilotStatusBadge, riskColor } from '../theme';

/* ─── KPI icons ─── */
const IconPilots = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0"/>
  </svg>
);
const IconShield = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
  </svg>
);
const IconWarning = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
  </svg>
);
const IconChart = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/>
  </svg>
);
const IconSearch = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"/>
  </svg>
);

/* ─── KPI Card ─── */
function KpiCard({ label, value, icon: Icon, color, bg, subtitle }) {
  return (
    <div style={{ ...sk.kpiCard, borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ ...sk.kpiIconWrap, background: bg, color }}>
          <Icon />
        </div>
        <div style={{ fontSize: 11, color: c.textMuted, fontWeight: 500, textAlign: 'right', lineHeight: 1.3 }}>
          {subtitle}
        </div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: c.text, lineHeight: 1, letterSpacing: '-1px' }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 12, color: c.textMuted, marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

/* ─── Pilot initials avatar ─── */
function PilotAvatar({ name, color }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 12,
      background: `${color}20`, border: `1px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 700, color, flexShrink: 0,
      letterSpacing: '0.5px',
    }}>
      {initials}
    </div>
  );
}

/* ─── Mini stat cell ─── */
function MiniStat({ value, label, color }) {
  return (
    <div style={{ background: c.bgElevated, borderRadius: 8, padding: '8px 6px', textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color }}>{value}</div>
      <div style={{ fontSize: 9, color: c.textMuted, marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}
      </div>
    </div>
  );
}

const TECH_PILLS = [
  { label: 'Ethereum',  color: c.purple    },
  { label: 'SHA-256',   color: c.primaryLt },
  { label: 'FastAPI',   color: c.green     },
  { label: 'ANAC',      color: c.amber     },
  { label: 'Web3.py',   color: c.primaryLt },
];

function HeroBanner() {
  return (
    <div style={{
      background: c.bgCard,
      border: `1px solid ${c.border}`,
      borderLeft: `3px solid ${c.primary}`,
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    }}>
      {/* Left: identity */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: gradientPrimary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>AeroLicense</span>
          <span style={{ fontSize: 13, color: c.textDim }}>·</span>
          <span style={{ fontSize: 13, color: c.textMuted }}>
            Verificação Blockchain de Licenças de Aviação
          </span>
        </div>
        <div style={{ fontSize: 10, color: c.textDim, paddingLeft: 38 }}>
          Projeto académico · ISEC Lisboa · 2025
        </div>
      </div>

      {/* Right: tech pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
        {TECH_PILLS.map(({ label, color }) => (
          <span key={label} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: `${color}18`,
            border: `1px solid ${color}44`,
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 11, fontWeight: 700, color,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: color, display: 'inline-block', flexShrink: 0,
            }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function Dashboard() {
  const [pilots,  setPilots]  = useState([]);
  const [riskMap, setRiskMap] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [search,  setSearch]  = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.allSettled([api.pilots(), api.riskScores(), api.analyticsSummary()])
      .then(([pRes, rRes, sRes]) => {
        if (pRes.status === 'fulfilled') setPilots(pRes.value.pilotos);
        else setError(true);
        if (rRes.status === 'fulfilled') {
          const map = {};
          rRes.value.pilots.forEach(p => { map[p.pilot_id] = p; });
          setRiskMap(map);
        }
        if (sRes.status === 'fulfilled') setSummary(sRes.value);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  const filtered = pilots.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.cargo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={sk.page}>

      <HeroBanner />

      {/* ── Page header ── */}
      <div style={sk.pageHeader}>
        <div>
          <h1 style={sk.pageTitle}>Pilotos Registados</h1>
          <p style={sk.pageSubtitle}>
            {pilots.length} profissionais · {summary?.total_documents ?? '—'} documentos geridos
          </p>
        </div>

        {/* Search */}
        <div style={sk.searchWrap}>
          <span style={sk.searchIcon}><IconSearch /></span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar piloto ou função..."
            style={sk.searchInput}
          />
          {search && (
            <button onClick={() => setSearch('')} style={sk.clearBtn}>✕</button>
          )}
        </div>
      </div>

      {/* ── KPI row ── */}
      {summary && (
        <div style={sk.kpiRow}>
          <KpiCard
            label="Total Pilotos"
            value={summary.total_pilots}
            icon={IconPilots}
            color={c.primaryLt}
            bg={`${c.primary}18`}
            subtitle="Registados no sistema"
          />
          <KpiCard
            label="Documentos Válidos"
            value={summary.valid}
            icon={IconShield}
            color={c.green}
            bg={c.greenBg}
            subtitle="Em conformidade EASA"
          />
          <KpiCard
            label="Expirados"
            value={summary.expired}
            icon={IconWarning}
            color={c.red}
            bg={c.redBg}
            subtitle="Requerem ação imediata"
          />
          <KpiCard
            label="Compliance Geral"
            value={`${summary.compliance_rate}%`}
            icon={IconChart}
            color={c.amber}
            bg={c.amberBg}
            subtitle="Taxa de conformidade"
          />
        </div>
      )}

      {/* ── Section label ── */}
      <div style={sk.sectionHeader}>
        <span style={sk.sectionTitle}>Todos os Pilotos</span>
        {search && (
          <span style={sk.filterTag}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para "{search}"
          </span>
        )}
      </div>

      {/* ── Pilot grid ── */}
      {filtered.length === 0 ? (
        <div style={sk.emptyState}>
          <div style={sk.emptyIcon}>✈</div>
          <div style={sk.emptyText}>Nenhum piloto encontrado</div>
          <div style={sk.emptySubtext}>Tenta um termo de pesquisa diferente</div>
        </div>
      ) : (
        <div style={sk.grid}>
          {filtered.map(p => {
            const risk  = riskMap[p.id];
            const badge = pilotStatusBadge(p.compliance_ok, p.expirados);
            return (
              <PilotCard
                key={p.id}
                pilot={p}
                badge={badge}
                risk={risk}
                onClick={() => navigate(`/pilots/${p.id}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Pilot Card ─── */
function PilotCard({ pilot: p, badge, risk, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...sk.card,
        borderColor: hovered ? c.borderHover : c.border,
        transform:   hovered ? 'translateY(-3px)' : 'none',
        boxShadow:   hovered ? shadow.hover : shadow.card,
      }}
    >
      {/* Card header */}
      <div style={sk.cardHeader}>
        <PilotAvatar name={p.nome} color={badge.color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={sk.pilotName}>{p.nome}</div>
          <div style={sk.pilotCargo}>{p.cargo}</div>
          <div style={sk.pilotWallet}>
            {p.carteira_ethereum.slice(0, 6)}…{p.carteira_ethereum.slice(-4)}
          </div>
        </div>
        <div style={{
          ...sk.badge,
          color: badge.color,
          background: badge.bg,
          border: `1px solid ${badge.color}35`,
        }}>
          {badge.label}
        </div>
      </div>

      {/* Divider */}
      <div style={sk.divider} />

      {/* Mini stats */}
      <div style={sk.miniStatsRow}>
        <MiniStat value={p.expirados}          color={c.red}   label="Expirados" />
        <MiniStat value={p.a_expirar_em_breve} color={c.amber} label="A expirar" />
        <MiniStat value={p.validos}            color={c.green} label="Válidos" />
      </div>

      {/* Risk score */}
      {risk && (
        <div style={sk.riskRow}>
          <span style={sk.riskLabel}>Risk Score</span>
          <div style={sk.riskBarWrap}>
            <div style={{ ...sk.riskBarFill, width: `${risk.score}%`, background: riskColor[risk.level] }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: riskColor[risk.level], minWidth: 24, textAlign: 'right' }}>
            {risk.score}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Styles ─── */
const sk = {
  page: { maxWidth: 1200 },

  pageHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 16, marginBottom: 28,
  },
  pageTitle: {
    fontSize: 22, fontWeight: 800, color: c.text,
    letterSpacing: '-0.5px', margin: 0,
  },
  pageSubtitle: {
    fontSize: 13, color: c.textMuted, margin: '4px 0 0', fontWeight: 500,
  },

  searchWrap: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute', left: 12, color: c.textMuted,
    display: 'flex', pointerEvents: 'none',
  },
  searchInput: {
    background: c.bgCard,
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    padding: '9px 36px 9px 36px',
    color: c.text,
    fontSize: 13,
    width: 256,
    outline: 'none',
    fontFamily: 'Inter, system-ui, sans-serif',
    transition: 'border-color .15s',
  },
  clearBtn: {
    position: 'absolute', right: 10,
    background: 'none', border: 'none',
    color: c.textMuted, cursor: 'pointer', fontSize: 12, padding: 2,
  },

  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))',
    gap: 16, marginBottom: 32,
  },
  kpiCard: {
    background: c.bgCard,
    border: `1px solid ${c.border}`,
    borderRadius: 14,
    padding: '20px 22px',
    boxShadow: shadow.card,
  },
  kpiIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.8px',
  },
  filterTag: {
    fontSize: 11, color: c.primaryLt,
    background: `${c.primary}18`,
    border: `1px solid ${c.primary}35`,
    padding: '2px 9px', borderRadius: 20,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(310px,1fr))',
    gap: 16,
  },

  card: {
    background: c.bgCard,
    border: `1px solid ${c.border}`,
    borderRadius: 14,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'border-color .2s ease, transform .2s ease, box-shadow .2s ease',
  },
  cardHeader: {
    padding: '18px 18px 16px',
    display: 'flex', alignItems: 'flex-start', gap: 12,
  },
  pilotName: {
    fontSize: 14, fontWeight: 700, color: c.text, lineHeight: 1.2,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  pilotCargo: {
    fontSize: 11, color: c.textMuted, marginTop: 2, fontWeight: 500,
  },
  pilotWallet: {
    fontSize: 9, color: c.textDim, marginTop: 5,
    fontFamily: 'monospace', letterSpacing: '0.5px',
  },
  badge: {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.8px',
    padding: '4px 9px', borderRadius: 6,
    whiteSpace: 'nowrap', alignSelf: 'flex-start',
  },
  divider: { height: 1, background: c.border, margin: '0 18px' },
  miniStatsRow: {
    display: 'flex', gap: 6, padding: '14px 18px',
  },

  riskRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    margin: '0 18px 16px',
    background: c.bgElevated,
    borderRadius: 8, padding: '8px 12px',
  },
  riskLabel: { fontSize: 11, color: c.textMuted, fontWeight: 500, minWidth: 70 },
  riskBarWrap: {
    flex: 1, height: 4, background: c.border, borderRadius: 2, overflow: 'hidden',
  },
  riskBarFill: {
    height: '100%', borderRadius: 2, transition: 'width .4s ease',
  },

  emptyState: {
    textAlign: 'center', padding: '64px 24px',
    background: c.bgCard, border: `1px solid ${c.border}`,
    borderRadius: 14,
  },
  emptyIcon: { fontSize: 40, marginBottom: 16, opacity: 0.3 },
  emptyText: { fontSize: 16, fontWeight: 700, color: c.text },
  emptySubtext: { fontSize: 13, color: c.textMuted, marginTop: 4 },
};
