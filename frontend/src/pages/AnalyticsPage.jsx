import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';
import { c, riskColor, riskLabel, shadow } from '../theme';

const CHART_COLORS = [c.primary, c.green, c.amber, c.red, c.purple, '#06B6D4'];

const TYPE_SHORT = {
  ATPL: 'ATPL', MEDICAL_CLASS1: 'MED', ICAO_ENGLISH: 'ICAO',
  TYPE_RATING: 'TR', CRM_TRAINING: 'CRM*', OTHER: 'OUT',
};
const TYPE_LABELS = {
  ATPL: 'Licença ATPL', MEDICAL_CLASS1: 'Médico Cl.1', ICAO_ENGLISH: 'ICAO English',
  TYPE_RATING: 'Type Rating', CRM_TRAINING: 'CRM (Crew Resource Mgmt)', OTHER: 'Outro',
};

const tooltipStyle = {
  contentStyle: { background: c.bgSurface, border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: c.textMuted },
  itemStyle:    { color: c.primaryLt },
};

/* ── Live KPI card (from real data) ── */
function LiveKpi({ label, value, color }) {
  return (
    <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 12,
      padding: '16px 20px', flex: 1, minWidth: 110, boxShadow: shadow.card }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: c.textMuted,
        textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || c.text, lineHeight: 1 }}>{value ?? '—'}</div>
    </div>
  );
}

/* ── Target metric card (projections, not measured data) ── */
function TargetKpi({ value, label, desc, color, bg }) {
  return (
    <div style={{ background: c.bgCard, border: `1px solid ${c.border}`,
      borderLeft: `4px solid ${color}`, borderRadius: 12,
      padding: '18px 20px', flex: 1, minWidth: 160, boxShadow: shadow.card }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: c.textMuted, textTransform: 'uppercase',
        letterSpacing: '.5px', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1,
        letterSpacing: '-1px', marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 11, color: c.textMuted, lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [summary,      setSummary]      = useState({});
  const [monthly,      setMonthly]      = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [anomalies,    setAnomalies]    = useState({ total: 0, anomalies: [] });
  const [riskScores,   setRiskScores]   = useState({ pilots: [] });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [riskSearch,   setRiskSearch]   = useState('');

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

  const filteredRisk = useMemo(() => {
    if (!riskSearch) return riskScores.pilots;
    return riskScores.pilots.filter(p =>
      p.pilot_name.toLowerCase().includes(riskSearch.toLowerCase())
    );
  }, [riskScores, riskSearch]);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: c.text, margin: '0 0 4px', letterSpacing: '-0.4px' }}>
          Analytics & Inteligência Artificial
        </h1>
        <p style={{ fontSize: 13, color: c.textMuted, margin: 0 }}>
          Dados em tempo real · IsolationForest ML · Risk scoring automático
        </p>
      </div>

      {/* ── Live KPIs (real data) ── */}
      <SectionLabel label="Dados Reais — Sistema Demo" live />
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <LiveKpi label="Pilotos"    value={summary.total_pilots} />
        <LiveKpi label="Documentos" value={summary.total_documents} />
        <LiveKpi label="Válidos"    value={summary.valid}          color={c.green} />
        <LiveKpi label="A Expirar"  value={summary.expiring_soon}  color={c.amber} />
        <LiveKpi label="Expirados"  value={summary.expired}        color={c.red} />
        <LiveKpi label="Compliance" value={`${summary.compliance_rate}%`} color={c.green} />
      </div>

      {/* ── Charts ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`,
          borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 280, boxShadow: shadow.card }}>
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

        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`,
          borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 280, boxShadow: shadow.card }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.textMuted, marginBottom: 16 }}>
            Distribuição por Tipo de Documento
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={distribution} dataKey="count" nameKey="type" cx="50%" cy="50%"
                outerRadius={75}
                label={({ type, percent }) => `${TYPE_SHORT[type] || type} ${(percent*100).toFixed(0)}%`}
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

      {/* ── Risk Scores ── */}
      <div style={{ background: c.bgCard, border: `1px solid ${c.border}`,
        borderRadius: 12, padding: '20px 24px', marginBottom: 16, boxShadow: shadow.card }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: c.textMuted, marginBottom: 4 }}>
          Risk Score por Piloto
        </div>
        <div style={{ fontSize: 12, color: c.textDim, marginBottom: 12 }}>
          Score 0–100: expirado −25 pts · a expirar −proporcional · anomalia ML −15 pts
        </div>
        <input
          type="text"
          placeholder="Pesquisar por nome de piloto…"
          value={riskSearch}
          onChange={e => setRiskSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 300, padding: '7px 11px',
            fontSize: 12, borderRadius: 7, fontFamily: 'Inter, sans-serif',
            background: c.bgElevated, border: `1px solid ${c.border}`,
            color: c.text, outline: 'none', marginBottom: 14, display: 'block',
          }}
          aria-label="Pesquisar pilotos por nome"
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredRisk.map(p => (
            <div key={p.pilot_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 140, color: c.text, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                {p.pilot_name}
              </div>
              <div style={{ flex: 1, background: c.bgElevated, borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${p.score}%`, height: '100%',
                  background: riskColor[p.level], borderRadius: 6, transition: 'width .6s ease' }} />
              </div>
              <div style={{ width: 36, color: riskColor[p.level], fontWeight: 800,
                fontSize: 15, textAlign: 'right', flexShrink: 0 }}>
                {p.score}
              </div>
              <div style={{ width: 70, fontSize: 10, fontWeight: 700, flexShrink: 0,
                color: riskColor[p.level] }}>
                {riskLabel[p.level]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Anomaly Detection ── */}
      <div style={{ background: c.bgCard, border: `1px solid ${c.border}`,
        borderRadius: 12, padding: '20px 24px', marginBottom: 28, boxShadow: shadow.card }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: c.textMuted, marginBottom: 4 }}>
          Detecção de Anomalias — ML (IsolationForest)
        </div>
        <div style={{ fontSize: 12, color: c.textDim, marginBottom: 12 }}>
          Analisa 4 features: dias até expiração · dia de emissão · frequência do emissor · período de validade
        </div>

        {/* ML score legend box */}
        <div style={s.mlLegendBox}>
          <strong>Como interpretar:</strong> Scores negativos indicam comportamento anómalo.
          Quanto mais negativo o score, mais o documento se desvia do padrão esperado.
          Threshold de alerta: &lt; −0.5. Estes alertas servem como sinalização para revisão
          manual, não bloqueiam operação.
        </div>

        {anomalies.total === 0 ? (
          <div style={{ background: c.greenBg, border: `1px solid ${c.green}33`,
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

      {/* ML dataset disclaimer */}
      <div style={s.mlDatasetNote}>
        <span style={{ fontSize: 13, flexShrink: 0 }}>ℹ</span>
        <span>
          <strong>Nota técnica:</strong> Modelo treinado com dataset reduzido (n=30) para fins
          demonstrativos. A robustez do IsolationForest aumenta significativamente com volumes
          maiores (n &gt; 1000 documentos), típicos de uma autoridade reguladora ou companhia
          aérea em produção.
        </span>
      </div>

      {/* ── Target Metrics (Phase Beta) ── */}
      <SectionLabel label="Resultados Esperados — Fase Beta" target />

      <div style={s.targetDisclaimer}>
        <strong>Nota metodológica:</strong> Os indicadores abaixo são métricas target estimadas com base em
        literatura sobre digitalização de processos administrativos em aviação (Bhardwaj & Purdy 2019,
        Burns et al. 2019). Não são dados medidos — serão validados numa fase piloto com escola de aviação parceira.
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <TargetKpi
          value="70%"
          label="Redução Tempo Admin."
          desc="Estimativa baseada em ordens de grandeza de digitalização de processos similares"
          color={c.primaryLt}
        />
        <TargetKpi
          value="≥99%"
          label="Conformidade Regulamentar"
          desc="Com alertas automáticos 90/60/30/7 dias antes da expiração"
          color={c.green}
        />
        <TargetKpi
          value="Zero"
          label="Documentos Perdidos"
          desc="Cópia cifrada em cloud com redundância — eliminação de perda por extravio físico"
          color={c.amber}
        />
        <TargetKpi
          value="3×"
          label="Velocidade de Verificação"
          desc="QR criptográfico vs. verificação manual em ramp checks (segundos vs. minutos)"
          color={c.purple}
        />
      </div>

      <div style={s.sustainabilityRow}>
        {[
          { label: 'Sustentabilidade Operacional', desc: 'Redução de carga administrativa liberta tempo para operações. Menos erros humanos por fadiga de gestão documental.', color: c.primaryLt },
          { label: 'Sustentabilidade Humana',       desc: 'Melhoria da experiência dos pilotos contribui para retenção num setor em escassez (previsão IATA: 80k pilotos em falta até 2032).', color: c.green },
          { label: 'Sustentabilidade Ambiental',    desc: 'Digitalização elimina documentação em papel. Impacto direto limitado mas mensurável em operações de grande escala.', color: c.amber },
        ].map(({ label, desc, color }) => (
          <div key={label} style={{ ...s.sustainCard, borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 11, color: c.textMuted, lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ label, live, target }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: c.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {label}
      </span>
      {live && (
        <span style={{ fontSize: 9, fontWeight: 700, color: c.green,
          background: c.greenBg, border: `1px solid ${c.green}40`,
          padding: '2px 8px', borderRadius: 20, letterSpacing: '0.4px' }}>
          AO VIVO
        </span>
      )}
      {target && (
        <span style={{ fontSize: 9, fontWeight: 700, color: c.amber,
          background: c.amberBg, border: `1px solid ${c.amber}40`,
          padding: '2px 8px', borderRadius: 20, letterSpacing: '0.4px' }}>
          ESTIMATIVA · NÃO MEDIDO
        </span>
      )}
    </div>
  );
}

const s = {
  mlLegendBox: {
    background: c.bgElevated, border: `1px solid ${c.border}`,
    borderRadius: 8, padding: '10px 14px',
    fontSize: 11, color: c.textSub, lineHeight: 1.6,
    marginBottom: 16,
  },
  mlDatasetNote: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    fontSize: 11, color: c.textMuted, lineHeight: 1.55,
    marginBottom: 28, marginTop: -12,
  },
  targetDisclaimer: {
    background: c.amberBg, border: `1px solid ${c.amber}35`,
    borderRadius: 10, padding: '12px 16px',
    fontSize: 12, color: c.textSub, lineHeight: 1.55,
    marginBottom: 16,
  },
  sustainabilityRow: {
    display: 'flex', gap: 14, flexWrap: 'wrap',
  },
  sustainCard: {
    background: c.bgCard, border: `1px solid ${c.border}`,
    borderRadius: 12, padding: '18px 20px', flex: 1, minWidth: 200,
    boxShadow: shadow.card,
  },
};
