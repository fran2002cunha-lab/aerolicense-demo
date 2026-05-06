import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';

const RISK_COLORS = { safe: '#27AE60', attention: '#F0A500', critical: '#E74C3C' };

export default function Dashboard() {
  const [pilots,  setPilots]  = useState([]);
  const [riskMap, setRiskMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [search,  setSearch]  = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.allSettled([api.pilots(), api.riskScores()])
      .then(([pilotsRes, riskRes]) => {
        if (pilotsRes.status === 'fulfilled') setPilots(pilotsRes.value.pilotos);
        else setError(true);
        if (riskRes.status === 'fulfilled') {
          const map = {};
          riskRes.value.pilots.forEach(p => { map[p.pilot_id] = p; });
          setRiskMap(map);
        }
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
      <h2 style={s.heading}>👨‍✈️ Pilotos Registados</h2>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Pesquisar piloto ou função..."
        style={{ width: '100%', padding: '10px 14px', marginBottom: 20,
          background: '#1A3F7A', border: '1px solid #2A4F8A',
          borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
      />
      <div style={s.grid}>
        {filtered.map(p => (
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
              {riskMap[p.id] && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    background: RISK_COLORS[riskMap[p.id].level],
                    color: '#fff', fontWeight: 'bold', fontSize: 12,
                    padding: '3px 10px', borderRadius: 20,
                  }}>
                    Risk Score: {riskMap[p.id].score}
                  </div>
                </div>
              )}
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
