import { useState, useEffect } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';

export default function BlockchainDemo() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    api.blockchainDemo()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  return (
    <div>
      <h2 style={{ color: '#F0A500', marginBottom: 8, fontSize: 18 }}>⛓ {data.conceito}</h2>
      <div style={s.box}>
        <div style={s.label}>DOCUMENTO ORIGINAL</div>
        <div style={s.doc}>📄 "{data.documento_original.conteudo}"</div>
        <div style={s.row}>
          <span style={s.key}>SHA-256:</span>
          <code style={{ ...s.hash, color: '#0087CC' }}>{data.documento_original.sha256}</code>
        </div>

        <div style={{ ...s.label, color: '#E74C3C', marginTop: 20 }}>DOCUMENTO FALSIFICADO</div>
        <div style={{ ...s.doc, color: '#FF8888' }}>📄 "{data.documento_falsificado.conteudo}"</div>
        <div style={{ fontSize: 11, color: '#F0A500', marginBottom: 8 }}>
          ⚠ Alteração: {data.documento_falsificado.alteracao}
        </div>
        <div style={s.row}>
          <span style={s.key}>SHA-256:</span>
          <code style={{ ...s.hash, color: '#E74C3C' }}>{data.documento_falsificado.sha256}</code>
        </div>

        <div style={s.result}>
          <p style={{ color: '#E74C3C', fontWeight: 'bold', margin: 0 }}>
            ❌ Hashes diferentes — Falsificação detetada automaticamente!
          </p>
          <p style={{ color: '#AABBCC', fontSize: 12, marginTop: 8 }}>{data.conclusao}</p>
        </div>
      </div>
    </div>
  );
}

const s = {
  box:    { background: '#061228', borderRadius: 10, padding: 20, fontFamily: 'monospace', fontSize: 13 },
  label:  { color: '#F0A500', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  doc:    { color: '#AABBCC', fontSize: 12, marginBottom: 8 },
  row:    { display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  key:    { color: '#667788', minWidth: 80, fontSize: 12 },
  hash:   { wordBreak: 'break-all', fontSize: 12 },
  result: { background: '#E74C3C22', border: '1px solid #E74C3C', borderRadius: 8,
    padding: '12px 16px', marginTop: 20 },
};
