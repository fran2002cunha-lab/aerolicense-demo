import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';
import { c, shadow, gradientPrimary, pilotStatusBadge, riskColor } from '../theme';

const TYPE_LABELS = {
  ATPL: 'ATPL', MEDICAL_CLASS1: 'Médico Cl.1', ICAO_ENGLISH: 'ICAO English',
  TYPE_RATING: 'Type Rating', CRM_TRAINING: 'CRM', OTHER: 'Outro',
};

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
const IconChain = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1"/>
  </svg>
);
const IconArrow = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
  </svg>
);

/* ─── KPI Card ─── */
function KpiCard({ label, value, icon: Icon, color, bg, subtitle, action, onAction }) {
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <div style={{ fontSize: 12, color: c.textMuted, fontWeight: 500 }}>{label}</div>
        {action && (
          <button onClick={onAction} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color, fontWeight: 600, fontFamily: 'Inter, sans-serif',
            display: 'flex', alignItems: 'center', gap: 3, padding: 0,
          }}>
            {action} <IconArrow />
          </button>
        )}
      </div>
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
        {TECH_PILLS.map(({ label, color }) => (
          <span key={label} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: `${color}18`, border: `1px solid ${color}44`,
            borderRadius: 20, padding: '3px 10px',
            fontSize: 11, fontWeight: 700, color,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Próximas Expirações ─── */
function UpcomingExpirations({ alerts, onViewAll }) {
  const top = alerts.slice(0, 6);
  return (
    <div style={{ ...sk.panel, flex: 2, minWidth: 280 }}>
      <div style={sk.panelHeader}>
        <div style={sk.panelTitle}>Próximas Expirações</div>
        <button onClick={onViewAll} style={sk.panelLink}>Ver todas <IconArrow /></button>
      </div>
      {top.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: c.green, fontSize: 13 }}>
          ✓ Nenhum documento a expirar nos próximos 30 dias
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {top.map((a, i) => {
            const urgent = a.dias_restantes <= 0;
            const soon   = a.dias_restantes > 0 && a.dias_restantes <= 14;
            const color  = urgent ? c.red : soon ? c.amber : c.textMuted;
            const dayTxt = urgent
              ? `Expirado há ${Math.abs(a.dias_restantes)}d`
              : `${a.dias_restantes}d restantes`;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                background: urgent ? `${c.red}0A` : soon ? `${c.amber}0A` : c.bgElevated,
                border: `1px solid ${urgent ? c.red : soon ? c.amber : c.border}30`,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: color, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.piloto}
                  </div>
                  <div style={{ fontSize: 10, color: c.textMuted, marginTop: 1 }}>
                    {TYPE_LABELS[a.tipo] || a.tipo}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>
                  {dayTxt}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Blockchain Status Widget ─── */
function BlockchainWidget({ totalDocs }) {
  const verified = totalDocs ?? 0;
  return (
    <div style={{
      background: `${c.primary}0C`, border: `1px solid ${c.primary}30`,
      borderRadius: 12, padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: gradientPrimary,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <IconChain />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.primaryLt }}>Blockchain</div>
          <div style={{ fontSize: 10, color: c.textMuted }}>Ethereum · Modo Simulação</div>
        </div>
        <div style={{
          marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%',
          background: c.green, boxShadow: `0 0 8px ${c.green}`,
        }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, textAlign: 'center', background: c.bgElevated, borderRadius: 8, padding: '10px 6px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: c.primaryLt, lineHeight: 1 }}>{verified}</div>
          <div style={{ fontSize: 9, color: c.textMuted, marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Registados</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', background: c.bgElevated, borderRadius: 8, padding: '10px 6px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: c.green, lineHeight: 1 }}>100%</div>
          <div style={{ fontSize: 9, color: c.textMuted, marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Imutáveis</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', background: c.bgElevated, borderRadius: 8, padding: '10px 6px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: c.amber, lineHeight: 1 }}>0</div>
          <div style={{ fontSize: 9, color: c.textMuted, marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Falsif.</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Compliance por Tipo de Documento ─── */
function ComplianceByType({ distribution, alerts }) {
  const items = useMemo(() => {
    return distribution.map(d => {
      const nAlerts = alerts.filter(a => a.tipo === d.type).length;
      const rate = d.count > 0 ? Math.round(((d.count - nAlerts) / d.count) * 100) : 100;
      const color = rate >= 90 ? c.green : rate >= 70 ? c.amber : c.red;
      return { type: d.type, rate, color };
    }).sort((a, b) => a.rate - b.rate);
  }, [distribution, alerts]);

  if (items.length === 0) return null;

  return (
    <div style={sk.panel}>
      <div style={sk.panelHeader}>
        <div style={sk.panelTitle}>Compliance por Tipo</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {items.map(({ type, rate, color }) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 80, fontSize: 10, fontWeight: 600, color: c.textMuted, flexShrink: 0 }}>
              {TYPE_LABELS[type] || type}
            </div>
            <div style={{ flex: 1, height: 6, background: c.bgElevated, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .6s ease' }} />
            </div>
            <div style={{ width: 32, fontSize: 11, fontWeight: 700, color, textAlign: 'right', flexShrink: 0 }}>
              {rate}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Feed de Actividade ─── */
const ACTIVITY_ICONS = { verified: '🔗', alert: '⚠️', registered: '📄', renewed: '✅' };

function ActivityFeed({ pilots }) {
  const feed = useMemo(() => {
    if (!pilots.length) return [];
    const events = [
      { type: 'verified',   pilot: pilots[1]?.nome ?? 'P002', doc: 'Médico Cl.1',      time: 'há 3h' },
      { type: 'alert',      pilot: pilots[0]?.nome ?? 'P001', doc: 'ATPL',              time: 'há 6h' },
      { type: 'registered', pilot: pilots[2]?.nome ?? 'P003', doc: 'ICAO English',      time: 'há 1 dia' },
      { type: 'verified',   pilot: pilots[0]?.nome ?? 'P001', doc: 'Type Rating B737',  time: 'há 1 dia' },
      { type: 'renewed',    pilot: pilots[1]?.nome ?? 'P002', doc: 'CRM Training',      time: 'há 2 dias' },
      { type: 'alert',      pilot: pilots[2]?.nome ?? 'P003', doc: 'Médico Cl.1',       time: 'há 3 dias' },
    ];
    return events;
  }, [pilots]);

  const colors = { verified: c.primaryLt, alert: c.amber, registered: c.green, renewed: c.green };

  return (
    <div style={{ ...sk.panel, marginBottom: 24 }}>
      <div style={sk.panelHeader}>
        <div style={sk.panelTitle}>Actividade Recente</div>
        <span style={{ fontSize: 10, color: c.textDim, fontStyle: 'italic' }}>Simulado para demo</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {feed.map((e, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '9px 0',
            borderBottom: i < feed.length - 1 ? `1px solid ${c.border}` : 'none',
          }}>
            <div style={{ fontSize: 14, flexShrink: 0, width: 22, textAlign: 'center' }}>{ACTIVITY_ICONS[e.type]}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: colors[e.type] }}>{e.pilot}</span>
              <span style={{ fontSize: 12, color: c.textMuted }}> · {e.doc}</span>
            </div>
            <div style={{ fontSize: 11, color: c.textDim, flexShrink: 0 }}>{e.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function Dashboard() {
  const [pilots,       setPilots]       = useState([]);
  const [riskMap,      setRiskMap]      = useState({});
  const [summary,      setSummary]      = useState(null);
  const [alerts,       setAlerts]       = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [search,       setSearch]       = useState('');
  const navigate = useNavigate();

  const role = sessionStorage.getItem('aero_role');
  const isInspector = role === 'inspector';

  useEffect(() => {
    Promise.allSettled([
      api.pilots(), api.riskScores(), api.analyticsSummary(),
      api.alerts(), api.analyticsDistribution(),
    ]).then(([pRes, rRes, sRes, aRes, dRes]) => {
      if (pRes.status === 'fulfilled') setPilots(pRes.value.pilotos);
      else setError(true);
      if (rRes.status === 'fulfilled') {
        const map = {};
        rRes.value.pilots.forEach(p => { map[p.pilot_id] = p; });
        setRiskMap(map);
      }
      if (sRes.status === 'fulfilled') setSummary(sRes.value);
      if (aRes.status === 'fulfilled') setAlerts(aRes.value.alertas ?? []);
      if (dRes.status === 'fulfilled') setDistribution(dRes.value);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  const filtered = pilots.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.cargo.toLowerCase().includes(search.toLowerCase())
  );

  const criticalCount = alerts.filter(a => a.status === 'expired').length;

  return (
    <div style={sk.page}>

      <HeroBanner />

      {/* ── Role-aware context line ── */}
      {isInspector && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: `${c.purple}0D`, border: `1px solid ${c.purple}30`,
          borderRadius: 8, padding: '8px 14px', marginBottom: 20,
          fontSize: 12, color: c.purpleLt,
        }}>
          <span>🛡️</span>
          <span><strong>Vista Inspector ANAC</strong> — Foco em conformidade regulatória e alertas críticos.
            {criticalCount > 0 && <span style={{ color: c.red, fontWeight: 700 }}> {criticalCount} documento(s) expirado(s) requerem acção imediata.</span>}
          </span>
        </div>
      )}

      {/* ── Page header ── */}
      <div style={sk.pageHeader}>
        <div>
          <h1 style={sk.pageTitle}>Pilotos Registados</h1>
          <p style={sk.pageSubtitle}>
            {pilots.length} profissionais · {summary?.total_documents ?? '—'} documentos geridos
          </p>
        </div>
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

      {/* ── Demo dataset banner ── */}
      <div style={sk.demoBanner}>
        <span style={sk.demoBannerIcon}>⚠️</span>
        <span>
          <strong>Dataset de demonstração</strong> — Este ambiente contém 12 documentos expirados
          intencionalmente para ilustrar o sistema de alertas e detecção de anomalias. Em ambiente
          de produção, organizações com AeroLicense atingem ≥99% de compliance regulamentar.
        </span>
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
            action="Ver alertas"
            onAction={() => navigate('/alerts')}
          />
          <KpiCard
            label="Compliance Geral"
            value={`${summary.compliance_rate}%`}
            icon={IconChart}
            color={c.amber}
            bg={c.amberBg}
            subtitle="Taxa de conformidade"
            action="Analytics"
            onAction={() => navigate('/analytics')}
          />
        </div>
      )}

      {/* ── Intelligence row ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <UpcomingExpirations alerts={alerts} onViewAll={() => navigate('/alerts')} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minWidth: 260 }}>
          <BlockchainWidget totalDocs={summary?.total_documents} />
          <ComplianceByType distribution={distribution} alerts={alerts} />
        </div>
      </div>

      {/* ── Activity feed ── */}
      <ActivityFeed pilots={pilots} />

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
        <div style={sk.grid} className="pilot-grid">
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

/* ─── Helpers ─── */
function extractCompany(cargo) {
  const parts = cargo.split(' — ');
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

function DocBadges({ validos, aExpirar, expirados, total }) {
  const items = [
    { count: validos,   icon: '✓', color: c.green },
    { count: aExpirar,  icon: '⚠', color: c.amber },
    { count: expirados, icon: '✗', color: c.red },
  ].filter(i => i.count > 0);

  if (items.length === 0) return null;
  const compliantPct = total > 0 ? Math.round((validos / total) * 100) : 100;
  const barColor = expirados > 0 ? c.red : aExpirar > 0 ? c.amber : c.green;

  return (
    <div style={{ padding: '0 18px 16px' }}>
      <div style={{ height: 4, background: c.border, borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ width: `${compliantPct}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width .5s ease' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {items.map(({ count, icon, color }) => (
          <span key={icon} style={{
            fontSize: 11, fontWeight: 700,
            color, background: `${color}18`,
            border: `1px solid ${color}35`,
            borderRadius: 6, padding: '3px 8px',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {icon} {count}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Pilot Card ─── */
function PilotCard({ pilot: p, badge, risk, onClick }) {
  const [hovered, setHovered] = useState(false);
  const company = extractCompany(p.cargo);

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
      <div style={sk.cardHeader}>
        <PilotAvatar name={p.nome} color={badge.color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={sk.pilotName}>{p.nome}</div>
          <div style={sk.pilotCargo}>{p.cargo.split(' — ')[0]}</div>
          {company && (
            <div style={{ fontSize: 10, color: c.primaryLt, marginTop: 2, fontWeight: 600 }}>
              {company}
            </div>
          )}
          <div
            style={sk.pilotWallet}
            title="Identificador on-chain do piloto — endereço Ethereum usado para registo imutável de credenciais na blockchain. Verificável publicamente."
          >
            <span style={{ color: c.textDim, marginRight: 4 }}>{p.id}</span>
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

      <div style={sk.divider} />

      <DocBadges
        validos={p.validos}
        aExpirar={p.a_expirar_em_breve}
        expirados={p.expirados}
        total={p.total_documentos}
      />

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

  panel: {
    background: c.bgCard, border: `1px solid ${c.border}`,
    borderRadius: 12, padding: '18px 20px', boxShadow: shadow.card,
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  panelTitle: { fontSize: 13, fontWeight: 700, color: c.textMuted },
  panelLink: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 11, color: c.primaryLt, fontWeight: 600,
    fontFamily: 'Inter, sans-serif',
    display: 'flex', alignItems: 'center', gap: 3, padding: 0,
  },

  demoBanner: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    background: `${c.amber}12`,
    border: `1px solid ${c.amber}40`,
    borderLeft: `3px solid ${c.amber}`,
    borderRadius: 10, padding: '12px 16px',
    fontSize: 12, color: c.textSub, lineHeight: 1.55,
    marginBottom: 20,
  },
  demoBannerIcon: { flexShrink: 0, fontSize: 14 },

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
    gap: 16, marginBottom: 24,
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
