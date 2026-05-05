import { useState, useEffect } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';

export default function AlertsPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    api.alerts()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  return (
    <div>
      <h2 style={{ color: '#F0A500', marginBottom: 6, fontSize: 18 }}>🔔 Alertas de Validade</h2>
      <p style={{ color: '#AABBCC', fontSize: 13, marginBottom: 20 }}>
        {data.total_alertas} documento(s) a requerer atenção.
      </p>
      {data.alertas.map((a, i) => (
        <div key={i} style={{
          ...s.card, borderLeftColor: a.status === 'expired' ? '#E74C3C' : '#F0A500',
        }}>
          <div>
            <div style={s.pilot}>👨‍✈️ {a.piloto} · <span style={{ color: '#0087CC', fontSize: 12 }}>{a.cargo}</span></div>
            <div style={s.doc}>📄 {a.documento}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 'bold',
              color: a.status === 'expired' ? '#E74C3C' : '#F0A500' }}>
              {a.status === 'expired' ? 'EXPIRADO' : `${a.dias_restantes} dias`}
            </div>
            <div style={{
              ...s.action,
              background: a.status === 'expired' ? '#E74C3C' : '#F0A500',
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
