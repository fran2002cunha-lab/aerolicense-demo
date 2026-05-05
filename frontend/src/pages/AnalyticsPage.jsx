import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';

const COLORS = ['#0087CC', '#27AE60', '#F0A500', '#E74C3C', '#9B59B6', '#1ABC9C'];

const RISK_COLORS_A = { safe: '#27AE60', attention: '#F0A500', critical: '#E74C3C' };

const TYPE_SHORT = {
  ATPL: 'ATPL', MEDICAL_CLASS1: 'MED', ICAO_ENGLISH: 'ICAO',
  TYPE_RATING: 'TR', CRM_TRAINING: 'CRM', OTHER: 'OUT',
};

const TYPE_LABELS = {
  ATPL: 'Licença ATPL', MEDICAL_CLASS1: 'Médico Cl.1', ICAO_ENGLISH: 'ICAO English',
  TYPE_RATING: 'Type Rating', CRM_TRAINING: 'CRM', OTHER: 'Outro',
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
      api.analyticsSummary(),
      api.analyticsMonthly(),
      api.analyticsDistribution(),
      api.analyticsAnomalies(),
      api.riskScores(),
    ]).then(([sRes, mRes, dRes, aRes, rRes]) => {
      if (sRes.status === 'fulfilled') setSummary(sRes.value);
      else setError(true);
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
      <h2 style={s.title}>Analytics & Inteligência Artificial</h2>

      <div style={s.kpiRow}>
        <KpiCard label="Pilotos"      value={summary.total_pilots}    color="#0087CC" />
        <KpiCard label="Documentos"   value={summary.total_documents} color="#1A3F7A" />
        <KpiCard label="Conformidade" value={`${summary.compliance_rate}%`} color="#27AE60" />
        <KpiCard label="Válidos"      value={summary.valid}           color="#27AE60" />
        <KpiCard label="A Expirar"    value={summary.expiring_soon}   color="#F0A500" />
        <KpiCard label="Expirados"    value={summary.expired}         color="#E74C3C" />
      </div>

      <div style={s.chartsRow}>
        <div style={{...s.card, flex: 1, minWidth: 300}}>
          <h3 style={s.cardTitle}>Expirações por Mês (próximos 12 meses)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="month"
                stroke="#445566"
                fontSize={10}
                tickFormatter={v => v.slice(5)}
              />
              <YAxis stroke="#445566" fontSize={10} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#0A2A4A', border: 'none', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#AABBCC' }}
                itemStyle={{ color: '#0087CC' }}
              />
              <Bar dataKey="count" fill="#0087CC" radius={[4, 4, 0, 0]} name="Documentos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{...s.card, flex: 1, minWidth: 300}}>
          <h3 style={s.cardTitle}>Distribuição por Tipo de Documento</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={distribution}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={75}
                label={({ type, percent }) =>
                  `${TYPE_SHORT[type] || type} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
                fontSize={10}
              >
                {distribution.map((entry, i) => (
                  <Cell key={entry.type} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0A2A4A', border: 'none', borderRadius: 8, fontSize: 12 }}
                formatter={(v, name) => [v, TYPE_LABELS[name] || name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk Scores */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>🎯 Risk Score por Piloto</h3>
        <p style={s.cardSubtitle}>
          Score 0-100 calculado por ML: documentos expirados (-25 pts), a expirar em 30 dias (-10 pts), anomalia ML detectada (-15 pts).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {riskScores.pilots.map(p => (
            <div key={p.pilot_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 130, color: '#fff', fontSize: 13, fontWeight: 'bold', flexShrink: 0 }}>
                {p.pilot_name}
              </div>
              <div style={{ flex: 1, background: '#061228', borderRadius: 8, height: 20, overflow: 'hidden' }}>
                <div style={{
                  width: `${p.score}%`, height: '100%',
                  background: RISK_COLORS_A[p.level],
                  transition: 'width 0.6s ease', borderRadius: 8,
                }} />
              </div>
              <div style={{
                width: 44, color: RISK_COLORS_A[p.level],
                fontWeight: 'bold', fontSize: 15, textAlign: 'right', flexShrink: 0,
              }}>
                {p.score}
              </div>
              <div style={{
                width: 70, fontSize: 11, fontWeight: 'bold', flexShrink: 0,
                color: RISK_COLORS_A[p.level], textTransform: 'uppercase',
              }}>
                {p.level === 'safe' ? 'Seguro' : p.level === 'attention' ? 'Atenção' : 'Crítico'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.card}>
        <h3 style={s.cardTitle}>
          🤖 Detecção de Anomalias — ML (scikit-learn IsolationForest)
        </h3>
        <p style={s.cardSubtitle}>
          O modelo analisa 4 features por documento: dias até expiração, dia da semana de emissão,
          frequência do emissor e período de validade. Documentos estatisticamente anómalos são sinalizados.
        </p>
        {anomalies.total === 0 ? (
          <div style={s.noAnomalies}>
            ✅ Nenhuma anomalia detectada nos {summary.total_documents} documentos analisados.
          </div>
        ) : (
          <div>
            <p style={{ color: '#F0A500', margin: '0 0 12px' }}>
              ⚠️ {anomalies.total} anomalia(s) detectada(s):
            </p>
            {anomalies.anomalies.map((a, i) => (
              <div key={`${a.pilot_id}-${a.doc_type}-${i}`} style={s.anomalyCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{a.description}</div>
                    <div style={{ color: '#0087CC', fontSize: 12, marginTop: 2 }}>
                      Piloto: {a.pilot_id} · Tipo: {a.doc_type}
                    </div>
                    <div style={{ color: '#F0A500', fontSize: 12, marginTop: 4 }}>
                      {a.reasons.join(' · ')}
                    </div>
                  </div>
                  <div style={s.scoreBox}>
                    <div style={{ color: '#F0A500', fontSize: 11 }}>Score ML</div>
                    <div style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{a.anomaly_score}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div style={{ ...s.kpi, borderTop: `3px solid ${color}` }}>
      <div style={{ color, fontSize: 26, fontWeight: 'bold' }}>{value}</div>
      <div style={{ color: '#AABBCC', fontSize: 11, marginTop: 2 }}>{label}</div>
    </div>
  );
}

const s = {
  title:       { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 24, marginTop: 0 },
  kpiRow:      { display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  kpi:         { background: '#0A2A4A', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 100, textAlign: 'center' },
  chartsRow:   { display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 20 },
  card:        { background: '#0A2A4A', borderRadius: 10, padding: '20px 24px', marginBottom: 20 },
  cardTitle:   { color: '#AABBCC', fontSize: 14, fontWeight: '600', marginTop: 0, marginBottom: 8 },
  cardSubtitle: { color: '#667788', fontSize: 12, marginTop: 0, marginBottom: 16 },
  noAnomalies: { color: '#27AE60', background: '#061A0D', borderRadius: 8, padding: '12px 16px' },
  anomalyCard: { background: '#061228', borderRadius: 8, padding: '12px 16px', marginBottom: 8, borderLeft: '3px solid #F0A500' },
  scoreBox:    { background: '#0A1F44', borderRadius: 8, padding: '6px 12px', textAlign: 'center', minWidth: 72 },
};
