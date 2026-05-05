import { useParams, useNavigate } from 'react-router-dom';
import UploadDocument from '../components/UploadDocument';

export default function UploadPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Map demo pilot IDs to Ethereum addresses
  const ADDRESSES = {
    P001: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    P002: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    P003: '0x1Db3439a7D398351b8bE11C439e05C5B3259aeD4',
  };

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
      <UploadDocument
        pilotAddress={ADDRESSES[id] || '0x0000000000000000000000000000000000000000'}
        onSuccess={() => setTimeout(() => navigate(`/pilots/${id}`), 1500)}
      />
    </div>
  );
}
