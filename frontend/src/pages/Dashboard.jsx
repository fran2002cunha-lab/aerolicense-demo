import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';

export default function Dashboard() {
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.pilots()
      .then(d => setPilots(d.pilotos))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  return (
    <div>
      <h2 style={s.heading}>👨‍✈️ Pilotos Registados</h2>
      <div style={s.grid}>
        {pilots.map(p => (
          <div key={p.id} style={s.card} onClick={() => navigate(`/pilots/${p.id}`)}>
            <div style={s.cardTop}>
              <div style={s.name}>{p.nome}</div>
              <div style={s.role}>{p.cargo}</div>
              <div style={s.wallet}>{p.carteira_ethereum}</div>
            </div>
            <div style={s.cardBody}>
              <div style={s.stats}>
                <span style={{ ...s.stat, ...s.valid }}>✅ {p.validos} válidos</span>
                {p.a_expirar_em_breve > 0 &&
                  <span style={{ ...s.stat, ...s.expiring }}>⚠️ {p.a_expirar_em_breve} a expirar</span>}
                {p.expirados > 0 &&
                  <span style={{ ...s.stat, ...s.expired }}>❌ {p.expirados} expirados</span>}
              </div>
              <div style={{ fontSize: 12, marginTop: 10, fontWeight: 'bold',
                color: p.compliance_ok ? '#27AE60' : '#E74C3C' }}>
                {p.compliance_ok ? '✔ Compliance OK' : '✖ Ação necessária'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  heading: { color: '#F0A500', marginBottom: 20, fontSize: 18 },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 },
  card:    { background: '#1A3F7A', borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
    border: '1px solid #2A4F8A', transition: 'transform 0.2s, border-color 0.2s' },
  cardTop:  { background: '#0A1F44', padding: '16px 20px', borderBottom: '3px solid #0087CC' },
  name:     { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  role:     { fontSize: 12, color: '#0087CC', marginTop: 4 },
  wallet:   { fontSize: 10, color: '#667788', marginTop: 6, fontFamily: 'monospace' },
  cardBody: { padding: '14px 20px' },
  stats:    { display: 'flex', gap: 8, flexWrap: 'wrap' },
  stat:     { padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' },
  valid:    { background: '#1a4a2a', color: '#27AE60' },
  expiring: { background: '#4a3a0a', color: '#F0A500' },
  expired:  { background: '#4a0a0a', color: '#E74C3C' },
};
