import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';
import { c, riskColor, pilotStatusBadge } from '../theme';

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: c.bgSurface, border: `1px solid ${c.border}`,
      borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: c.textMuted,
        textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || c.text, lineHeight: 1 }}>{value ?? '—'}</div>
    </div>
  );
}

export default function Dashboard() {
  const [pilots,   setPilots]   = useState([]);
  const [riskMap,  setRiskMap]  = useState({});
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [search,   setSearch]   = useState('');
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
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: c.text }}>Pilotos Registados</div>
          <div style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>
            {pilots.length} profissionais · {summary?.total_documents ?? '—'} documentos geridos
          </div>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar piloto ou função..."
          style={{ background: c.bgSurface, border: `1px solid ${c.border}`, borderRadius: 8,
            padding: '8px 14px', color: c.text, fontSize: 13, width: 240,
            outline: 'none', fontFamily: 'Inter, sans-serif' }}
        />
      </div>

      {/* KPI row */}
      {summary && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard label="Total Pilotos"  value={summary.total_pilots} />
          <StatCard label="Docs Válidos"   value={summary.valid}           color={c.green} />
          <StatCard label="Expirados"      value={summary.expired}         color={c.red} />
          <StatCard label="Compliance"     value={`${summary.compliance_rate}%`} color={c.amber} />
        </div>
      )}

      {/* Pilot grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
        {filtered.map(p => {
          const risk = riskMap[p.id];
          const badge = pilotStatusBadge(p.compliance_ok, p.expirados);
          return (
            <div key={p.id} onClick={() => navigate(`/pilots/${p.id}`)}
              style={{ background: c.bgSurface, border: `1px solid ${c.border}`, borderRadius: 14,
                overflow: 'hidden', cursor: 'pointer', transition: 'border-color .2s, transform .2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = c.primary; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.transform = 'none'; }}
            >
              {/* Card top */}
              <div style={{ padding: '18px 20px', borderBottom: `1px solid ${c.border}`,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: c.textMuted, marginTop: 3, fontWeight: 500 }}>{p.cargo}</div>
                  <div style={{ fontSize: 9, color: c.textDim, marginTop: 8, fontFamily: 'monospace' }}>
                    {p.carteira_ethereum.slice(0,6)}...{p.carteira_ethereum.slice(-4)}
                  </div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                  whiteSpace: 'nowrap', background: `${badge.color}18`,
                  color: badge.color, border: `1px solid ${badge.color}44` }}>
                  {badge.label}
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: '16px 20px' }}>
                {/* Mini stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                  {[
                    { num: p.expirados,         color: c.red,   lbl: 'Expirados' },
                    { num: p.a_expirar_em_breve, color: c.amber, lbl: 'A expirar' },
                    { num: p.validos,            color: c.green, lbl: 'Válidos' },
                  ].map(({ num, color, lbl }) => (
                    <div key={lbl} style={{ background: c.bgElevated, borderRadius: 8, padding: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, color }}>{num}</div>
                      <div style={{ fontSize: 9, color: c.textMuted, marginTop: 3, fontWeight: 500 }}>{lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Risk score */}
                {risk && (
                  <div style={{ background: c.bgElevated, borderRadius: 8, padding: '8px 12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: c.textMuted, fontWeight: 500 }}>Risk Score</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 4, background: c.border, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${risk.score}%`, height: '100%',
                          background: riskColor[risk.level], borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: riskColor[risk.level] }}>
                        {risk.score}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
