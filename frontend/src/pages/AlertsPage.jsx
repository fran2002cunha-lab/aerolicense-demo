import { useState, useEffect } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';

export default function AlertsPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [sort, setSort]       = useState('urgency');

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
      <h2 style={{ color: '#F0A500', marginBottom: 6, fontSize: 18 }}>🔔 Alertas de Validade</h2>
      <p style={{ color: '#AABBCC', fontSize: 13, marginBottom: 12 }}>
        {data.total_alertas} documento(s) a requerer atenção.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['urgency', 'name'].map(s => (
          <button key={s} onClick={() => setSort(s)} style={{
            padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
            background: sort === s ? '#0087CC' : '#1A3F7A',
            border: '1px solid #2A4F8A', color: '#fff',
          }}>
            {s === 'urgency' ? 'Por Urgência' : 'Por Nome'}
          </button>
        ))}
        <button onClick={exportCSV} style={{
          padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
          background: '#1A3F7A', border: '1px solid #2A4F8A', color: '#AABBCC', marginLeft: 'auto',
        }}>
          📥 Exportar CSV
        </button>
      </div>
      {sorted.map((a, i) => (
        <div key={i} style={{
          ...s.card, borderLeftColor: a.status === 'expired' ? '#E74C3C' : a.status === 'expiring_soon' ? '#F0A500' : '#667788',
        }}>
          <div>
            <div style={s.pilot}>👨‍✈️ {a.piloto} · <span style={{ color: '#0087CC', fontSize: 12 }}>{a.cargo}</span></div>
            <div style={s.doc}>📄 {a.documento}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 'bold',
              color: a.status === 'expired' ? '#E74C3C' : a.status === 'expiring_soon' ? '#F0A500' : '#667788' }}>
              {a.status === 'expired' ? 'EXPIRADO' : `${a.dias_restantes} dias`}
            </div>
            <div style={{
              ...s.action,
              background: a.status === 'expired' ? '#E74C3C' : a.status === 'expiring_soon' ? '#F0A500' : '#667788',
              color: a.status === 'expired' ? '#fff' : '#000',
            }}>{a.acao_necessaria}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const s = {
  card:   { background: '#1A3F7A', borderRadius: 10, padding: '14px 18px',
    borderLeft: '4px solid', marginBottom: 10, display: 'flex',
    alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  pilot:  { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  doc:    { fontSize: 12, color: '#AABBCC', marginTop: 4 },
  action: { fontSize: 12, fontWeight: 'bold', padding: '4px 10px', borderRadius: 6, marginTop: 6 },
};
