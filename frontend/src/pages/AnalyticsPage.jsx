import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';
import { c, riskColor, riskLabel } from '../theme';

const CHART_COLORS = [c.primary, c.green, c.amber, c.red, c.purple, '#06B6D4'];

const TYPE_SHORT = {
  ATPL: 'ATPL', MEDICAL_CLASS1: 'MED', ICAO_ENGLISH: 'ICAO',
  TYPE_RATING: 'TR', CRM_TRAINING: 'CRM', OTHER: 'OUT',
};
const TYPE_LABELS = {
  ATPL: 'Licença ATPL', MEDICAL_CLASS1: 'Médico Cl.1', ICAO_ENGLISH: 'ICAO English',
  TYPE_RATING: 'Type Rating', CRM_TRAINING: 'CRM', OTHER: 'Outro',
};

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: c.bgSurface, border: `1px solid ${c.border}`, borderRadius: 12,
      padding: '16px 20px', flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: c.textMuted,
        textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || c.text, lineHeight: 1 }}>{value ?? '—'}</div>
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { background: c.bgSurface, border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: c.textMuted },
  itemStyle:    { color: c.primaryLt },
};

export default function AnalyticsPage() {
  const [summary,      setSummary]      = useState({});
  const [monthly,      setMonthly]      = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [anomalies,    setAnomalies]    = useState({ total: 0, anomalies: [] });
  const [riskScores,   setRiskScores]   = useState({ pilots: [] });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.analyticsSummary(), api.analyticsMonthly(),
      api.analyticsDistribution(), api.analyticsAnomalies(), api.riskScores(),
    ]).then(([sRes, mRes, dRes, aRes, rRes]) => {
      if (sRes.status === 'fulfilled') setSummary(sRes.value); else setError(true);
      if (mRes.status === 'fulfilled') setMonthly(mRes.value);
      if (dRes.status === 'fulfilled') setDistribution(dRes.value);
      if (aRes.status === 'fulfilled') setAnomalies(aRes.value);
      if (rRes.status === 'fulfilled') setRiskScores(rRes.value);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, color: c.text, marginBottom: 24 }}>
        Analytics & Inteligência Artificial
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Pilotos"      value={summary.total_pilots} />
        <StatCard label="Documentos"   value={summary.total_documents} />
        <StatCard label="Válidos"      value={summary.valid}           color={c.green} />
        <StatCard label="A Expirar"    value={summary.expiring_soon}   color={c.amber} />
        <StatCard label="Expirados"    value={summary.expired}         color={c.red} />
        <StatCard label="Compliance"   value={`${summary.compliance_rate}%`} color={c.green} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
        <div style={{ background: c.bgSurface, border: `1px solid ${c.border}`, borderRadius: 12,
          padding: '20px 24px', flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.textMuted, marginBottom: 16 }}>
            Expirações por Mês (próximos 12 meses)
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" stroke={c.border} fontSize={10} tickFormatter={v => v.slice(5)} />
              <YAxis stroke={c.border} fontSize={10} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" fill={c.primary} radius={[4,4,0,0]} name="Documentos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: c.bgSurface, border: `1px solid ${c.border}`, borderRadius: 12,
          padding: '20px 24px', flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.textMuted, marginBottom: 16 }}>
            Distribuição por Tipo de Documento
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={distribution} dataKey="count" nameKey="type" cx="50%" cy="50%"
                outerRadius={75} label={({ type, percent }) => `${TYPE_SHORT[type] || type} ${(percent*100).toFixed(0)}%`}
                labelLine={false} fontSize={10}>
                {distribution.map((entry, i) => (
                  <Cell key={entry.type} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle.contentStyle}
                formatter={(v, name) => [v, TYPE_LABELS[name] || name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk Scores */}
      <div style={{ background: c.bgSurface, border: `1px solid ${c.border}`,
        borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: c.textMuted, marginBottom: 4 }}>
          Risk Score por Piloto
        </div>
        <div style={{ fontSize: 12, color: c.textDim, marginBottom: 16 }}>
          Score 0–100: expirado −25 pts, a expirar −proporcional, anomalia ML −15 pts
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {riskScores.pilots.map(p => (
            <div key={p.pilot_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 140, color: c.text, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                {p.pilot_name}
              </div>
              <div style={{ flex: 1, background: c.bgElevated, borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${p.score}%`, height: '100%',
                  background: riskColor[p.level], borderRadius: 6, transition: 'width .6s ease' }} />
              </div>
              <div style={{ width: 36, color: riskColor[p.level], fontWeight: 800,
                fontSize: 15, textAlign: 'right', flexShrink: 0 }}>{p.score}</div>
              <div style={{ width: 70, fontSize: 10, fontWeight: 700, flexShrink: 0,
                color: riskColor[p.level] }}>{riskLabel[p.level]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Anomalies */}
      <div style={{ background: c.bgSurface, border: `1px solid ${c.border}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: c.textMuted, marginBottom: 4 }}>
          Detecção de Anomalias — ML (IsolationForest)
        </div>
        <div style={{ fontSize: 12, color: c.textDim, marginBottom: 16 }}>
          Analisa 4 features: dias até expiração, dia de emissão, frequência do emissor, período de validade
        </div>
        {anomalies.total === 0 ? (
          <div style={{ background: `${c.green}11`, border: `1px solid ${c.green}33`,
            borderRadius: 8, padding: '12px 16px', color: c.green, fontSize: 13 }}>
            ✓ Nenhuma anomalia detectada nos {summary.total_documents} documentos analisados.
          </div>
        ) : (
          anomalies.anomalies.map((a, i) => (
            <div key={i} style={{ background: c.bgElevated, borderLeft: `3px solid ${c.amber}`,
              borderRadius: 8, padding: '12px 16px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: c.text, fontWeight: 600, fontSize: 14 }}>{a.description}</div>
                  <div style={{ color: c.primaryLt, fontSize: 12, marginTop: 2 }}>
                    Piloto: {a.pilot_id} · Tipo: {a.doc_type}
                  </div>
                  <div style={{ color: c.amber, fontSize: 12, marginTop: 4 }}>{a.reasons.join(' · ')}</div>
                </div>
                <div style={{ background: c.bgSurface, borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                  <div style={{ color: c.textMuted, fontSize: 10 }}>Score ML</div>
                  <div style={{ color: c.text, fontSize: 16, fontWeight: 800 }}>{a.anomaly_score}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
