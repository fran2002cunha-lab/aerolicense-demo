import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UploadDocument from '../components/UploadDocument';
import { api } from '../api';

export default function UploadPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pilotAddress, setPilotAddress] = useState(null);

  useEffect(() => {
    api.pilot(id)
      .then(data => setPilotAddress(data.carteira_ethereum))
      .catch(() => setPilotAddress('0x0000000000000000000000000000000000000000'));
  }, [id]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(`/pilots/${id}`)}
          style={{ padding: '8px 16px', background: 'transparent', border: '2px solid #0087CC',
            borderRadius: 8, color: '#0087CC', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}
        >
          ← Voltar
        </button>
        <h2 style={{ color: '#fff', fontSize: 20 }}>Registar Documento — Piloto {id}</h2>
      </div>
      {pilotAddress === null
        ? <p style={{ color: '#AABBCC' }}>A carregar...</p>
        : <UploadDocument
            pilotAddress={pilotAddress}
            onSuccess={() => setTimeout(() => navigate(`/pilots/${id}`), 1500)}
          />
      }
    </div>
  );
}
