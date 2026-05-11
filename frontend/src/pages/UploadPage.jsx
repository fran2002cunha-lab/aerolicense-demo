import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UploadDocument from '../components/UploadDocument';
import { api } from '../api';
import { c } from '../theme';

const ArrowLeftIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
  </svg>
);

export default function UploadPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [pilotAddress, setPilotAddress] = useState(null);
  const [pilotName,    setPilotName]    = useState('');

  useEffect(() => {
    api.pilot(id)
      .then(data => {
        setPilotAddress(data.carteira_ethereum);
        setPilotName(data.nome);
      })
      .catch(() => setPilotAddress('0x0000000000000000000000000000000000000000'));
  }, [id]);

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Breadcrumb */}
      <div style={s.breadcrumb}>
        <button onClick={() => navigate('/')} style={s.crumbBtn}>Pilotos</button>
        <span style={s.crumbSep}>›</span>
        <button onClick={() => navigate(`/pilots/${id}`)} style={s.crumbBtn}>
          {pilotName || `Piloto ${id}`}
        </button>
        <span style={s.crumbSep}>›</span>
        <span style={s.crumbActive}>Registar Documento</span>
      </div>

      {pilotAddress === null ? (
        <div style={{ color: c.textMuted, fontSize: 13, padding: '20px 0' }}>A carregar informação do piloto…</div>
      ) : (
        <UploadDocument
          pilotAddress={pilotAddress}
          onSuccess={() => setTimeout(() => navigate(`/pilots/${id}`), 1500)}
        />
      )}
    </div>
  );
}

const s = {
  breadcrumb: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 24, fontSize: 13,
  },
  crumbBtn: {
    background: 'none', border: 'none',
    color: c.primaryLt, cursor: 'pointer',
    fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 500, padding: 0,
  },
  crumbSep: { color: c.textDim, fontSize: 15 },
  crumbActive: { color: c.textMuted, fontWeight: 600 },
};
