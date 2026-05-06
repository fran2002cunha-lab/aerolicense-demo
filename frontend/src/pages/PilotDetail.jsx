import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import DocumentCard from '../components/DocumentCard';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';
import { c, gradientPrimary } from '../theme';

export default function PilotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pilot,   setPilot]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    api.pilot(id)
      .then(setPilot)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  const docs = pilot.documentos.map(d => ({
    hash:              d.hash,
    doc_type:          d.tipo,
    description:       d.descricao,
    expires_at:        d.validade,
    days_until_expiry: Math.max(0, d.dias_restantes),
    status:            d.status,
  }));

  const initials = pilot.nome.split(' ').slice(0,2).map(n => n[0]).join('');

  return (
    <div>
      {/* Header */}
      <div style={{ background: c.bgSurface, border: `1px solid ${c.border}`,
        borderRadius: 14, padding: '20px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: gradientPrimary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: c.text }}>{pilot.nome}</div>
          <div style={{ fontSize: 12, color: c.textMuted, marginTop: 3 }}>{pilot.cargo}</div>
          <div style={{ fontSize: 9, color: c.textDim, marginTop: 6, fontFamily: 'monospace' }}>
            {pilot.carteira_ethereum}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/')}
            style={{ padding: '8px 16px', background: 'transparent',
              border: `1px solid ${c.border}`, borderRadius: 8,
              color: c.textMuted, fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
            ← Voltar
          </button>
          <button onClick={() => navigate(`/pilots/${id}/upload`)}
            style={{ padding: '8px 16px', background: c.primary, border: 'none',
              borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
            + Novo Documento
          </button>
        </div>
      </div>

      {/* Document grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: 14 }}>
        {docs.map(doc => <DocumentCard key={doc.hash} document={doc} />)}
      </div>
    </div>
  );
}
