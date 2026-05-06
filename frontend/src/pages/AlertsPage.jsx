import { useState, useEffect } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';
import { c, statusColor } from '../theme';

export default function AlertsPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [sort,    setSort]    = useState('urgency');

  useEffect(() => {
    api.alerts()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  const sorted = [...(data?.alertas || [])].sort((a, b) =>
    sort === 'name' ? a.piloto.localeCompare(b.piloto) : a.dias_restantes - b.dias_restantes
  );

  function exportCSV() {
    const header = 'Piloto,Cargo,Documento,Dias Restantes,Estado,Ação\n';
    const rows = sorted.map(a =>
      `"${a.piloto}","${a.cargo}","${a.documento}",${a.dias_restantes},${a.status},"${a.acao_necessaria}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'aerolicense-alertas.csv'; link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: c.text }}>Alertas de Validade</div>
        <div style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>
          {data.total_alertas} documento(s) a requerer atenção
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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

      {/* Alert items */}
      {sorted.map((a, i) => {
        const color = statusColor[a.status] || c.textMuted;
        return (
          <div key={i} style={{ background: c.bgSurface, border: `1px solid ${c.border}`,
            borderLeft: `3px solid ${color}`, borderRadius: 10,
            padding: '14px 18px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{a.piloto}</div>
              <div style={{ fontSize: 11, color: c.textMuted, marginTop: 3 }}>{a.documento}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                background: `${color}18`, color, border: `1px solid ${color}44` }}>
                {a.status === 'expired' ? 'EXPIRADO' : `${a.dias_restantes} dias`}
              </div>
              <div style={{ fontSize: 10, color: c.textMuted, marginTop: 4 }}>{a.acao_necessaria}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
