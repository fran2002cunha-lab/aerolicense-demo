import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';
import { c, statusColor } from '../theme';

const DOC_TYPE_LABELS = {
  ATPL: 'ATPL', MEDICAL_CLASS1: 'Médico', ICAO_ENGLISH: 'ICAO',
  TYPE_RATING: 'Type Rating', CRM_TRAINING: 'CRM', OTHER: 'Outro',
};

function daysLabel(dias) {
  if (dias < 0) {
    return { text: `Expirado há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? 's' : ''}`, color: c.red };
  }
  if (dias < 30) return { text: `Expira em ${dias} dia${dias !== 1 ? 's' : ''}`, color: c.red };
  if (dias < 90) return { text: `Expira em ${dias} dias`, color: c.amber };
  return { text: `Expira em ${dias} dias`, color: c.textMuted };
}

export default function AlertsPage() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [sort,       setSort]       = useState('urgency');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType,   setFilterType]   = useState('all');

  useEffect(() => {
    api.alerts()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const allTypes = useMemo(() => {
    if (!data) return [];
    const types = [...new Set(data.alertas.map(a => a.tipo).filter(Boolean))];
    return types;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return [...data.alertas]
      .filter(a => filterStatus === 'all' || a.status === filterStatus)
      .filter(a => filterType === 'all' || a.tipo === filterType)
      .sort((a, b) =>
        sort === 'name' ? a.piloto.localeCompare(b.piloto) : a.dias_restantes - b.dias_restantes
      );
  }, [data, filterStatus, filterType, sort]);

  function exportCSV() {
    const header = 'Piloto,Cargo,Documento,Dias Restantes,Estado,Ação\n';
    const rows = filtered.map(a =>
      `"${a.piloto}","${a.cargo}","${a.documento}",${a.dias_restantes},${a.status},"${a.acao_necessaria}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'aerolicense-alertas.csv'; link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: c.text }}>Alertas de Validade</div>
        <div style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>
          {data.total_alertas} documento(s) a requerer atenção
        </div>
      </div>

      {/* ── Sort + export ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[['urgency', 'Por Urgência'], ['name', 'Por Nome']].map(([val, lbl]) => (
          <button key={val} onClick={() => setSort(val)} style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
            background: sort === val ? c.primary : c.bgSurface,
            border: `1px solid ${sort === val ? c.primary : c.border}`,
            color: sort === val ? '#fff' : c.textMuted, fontFamily: 'Inter, sans-serif',
          }}>{lbl}</button>
        ))}
        <button onClick={exportCSV} style={{
          marginLeft: 'auto', padding: '6px 14px', fontSize: 12, fontWeight: 600,
          borderRadius: 6, cursor: 'pointer', background: c.bgSurface,
          border: `1px solid ${c.border}`, color: c.textMuted, fontFamily: 'Inter, sans-serif',
        }}>📥 Exportar CSV</button>
      </div>

      {/* ── Status filter chips ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {[['all', 'Todos'], ['expired', 'Expirados'], ['expiring_soon', 'A expirar']].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilterStatus(val)} style={{
            padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 20, cursor: 'pointer',
            background: filterStatus === val ? `${c.primary}25` : 'transparent',
            border: `1px solid ${filterStatus === val ? c.primary : c.border}`,
            color: filterStatus === val ? c.primaryLt : c.textMuted,
            fontFamily: 'Inter, sans-serif',
          }}>{lbl}</button>
        ))}
      </div>

      {/* ── Doc type filter chips ── */}
      {allTypes.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterType('all')} style={{
            padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 20, cursor: 'pointer',
            background: filterType === 'all' ? `${c.primary}25` : 'transparent',
            border: `1px solid ${filterType === 'all' ? c.primary : c.border}`,
            color: filterType === 'all' ? c.primaryLt : c.textMuted,
            fontFamily: 'Inter, sans-serif',
          }}>Todos os tipos</button>
          {allTypes.map(type => (
            <button key={type} onClick={() => setFilterType(type)} style={{
              padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 20, cursor: 'pointer',
              background: filterType === type ? `${c.primary}25` : 'transparent',
              border: `1px solid ${filterType === type ? c.primary : c.border}`,
              color: filterType === type ? c.primaryLt : c.textMuted,
              fontFamily: 'Inter, sans-serif',
            }}>{DOC_TYPE_LABELS[type] || type}</button>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {filtered.length === 0 && data.total_alertas === 0 && (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>✓</div>
          <div style={s.emptyTitle}>Sem alertas</div>
          <div style={s.emptySubtitle}>Todos os documentos estão válidos.</div>
        </div>
      )}

      {filtered.length === 0 && data.total_alertas > 0 && (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>🔍</div>
          <div style={s.emptyTitle}>Sem resultados</div>
          <div style={s.emptySubtitle}>Nenhum alerta corresponde aos filtros seleccionados.</div>
        </div>
      )}

      {/* ── Alert items ── */}
      {filtered.map((a, i) => {
        const color   = statusColor[a.status] || c.textMuted;
        const dayInfo = daysLabel(a.dias_restantes);
        return (
          <div key={i} style={{ background: c.bgSurface, border: `1px solid ${c.border}`,
            borderLeft: `3px solid ${color}`, borderRadius: 10,
            padding: '14px 18px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{a.piloto}</div>
              <div style={{ fontSize: 11, color: c.textMuted, marginTop: 3 }}>{a.documento}</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: dayInfo.color, flexShrink: 0 }}>
              {dayInfo.text}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                background: `${color}18`, color, border: `1px solid ${color}44` }}>
                {a.status === 'expired' ? 'EXPIRADO' : 'A EXPIRAR'}
              </div>
              <div style={{ fontSize: 10, color: c.textMuted, marginTop: 4 }}>{a.acao_necessaria}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const s = {
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '48px 24px', gap: 8,
  },
  emptyIcon:     { fontSize: 32, color: c.green },
  emptyTitle:    { fontSize: 16, fontWeight: 700, color: c.text },
  emptySubtitle: { fontSize: 13, color: c.textMuted },
};
