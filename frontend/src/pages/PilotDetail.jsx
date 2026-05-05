import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import DocumentCard from '../components/DocumentCard';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';

export default function PilotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pilot, setPilot]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    api.pilot(id)
      .then(setPilot)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  // Normalise field names from demo backend to what DocumentCard expects
  const docs = pilot.documentos.map(d => ({
    hash:              d.hash,
    doc_type:          d.tipo,
    description:       d.descricao,
    expires_at:        d.validade,
    days_until_expiry: Math.max(0, d.dias_restantes),
    status:            d.status,
  }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/')} style={s.back}>← Voltar</button>
        <div>
          <h2 style={s.name}>{pilot.nome}</h2>
          <div style={s.role}>{pilot.cargo}</div>
        </div>
        <button onClick={() => navigate(`/pilots/${id}/upload`)} style={s.upload}>
          + Novo Documento
        </button>
      </div>
      <div style={s.grid}>
        {docs.map((doc) => <DocumentCard key={doc.hash} document={doc} />)}
      </div>
    </div>
  );
}

const s = {
  name:   { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  role:   { color: '#0087CC', fontSize: 13 },
  back:   { padding: '8px 16px', background: 'transparent', border: '2px solid #0087CC',
    borderRadius: 8, color: '#0087CC', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 },
  upload: { marginLeft: 'auto', padding: '8px 16px', background: '#0087CC', border: 'none',
    borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 },
  grid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 },
};
