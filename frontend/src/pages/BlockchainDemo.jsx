import { useState, useEffect } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';
import { c } from '../theme';

export default function BlockchainDemo() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

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
      <div style={{ fontSize: 20, fontWeight: 700, color: c.text, marginBottom: 4 }}>
        {data.conceito}
      </div>
      <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 24 }}>
        Demonstração de como a blockchain deteta falsificações automaticamente
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Original */}
        <HashCard
          label="DOCUMENTO ORIGINAL"
          labelColor={c.green}
          content={data.documento_original.conteudo}
          hash={data.documento_original.sha256}
          hashColor={c.primaryLt}
        />

        {/* Arrow */}
        <div style={{ textAlign: 'center', color: c.textDim, fontSize: 20 }}>↕</div>

        {/* Falsificado */}
        <HashCard
          label="DOCUMENTO FALSIFICADO"
          labelColor={c.red}
          content={data.documento_falsificado.conteudo}
          note={`Alteração: ${data.documento_falsificado.alteracao}`}
          hash={data.documento_falsificado.sha256}
          hashColor={c.red}
        />

        {/* Result */}
        <div style={{ background: `${c.red}11`, border: `1px solid ${c.red}44`,
          borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.red, marginBottom: 6 }}>
            ✗ Hashes diferentes — Falsificação detetada automaticamente
          </div>
          <div style={{ fontSize: 13, color: c.textMuted }}>{data.conclusao}</div>
        </div>
      </div>
    </div>
  );
}

function HashCard({ label, labelColor, content, note, hash, hashColor }) {
  return (
    <div style={{ background: c.bgSurface, border: `1px solid ${c.border}`, borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: labelColor,
        textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 13, color: c.text, marginBottom: 8 }}>
        "{content}"
      </div>
      {note && (
        <div style={{ fontSize: 11, color: c.amber, marginBottom: 10 }}>⚠ {note}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 11, color: c.textMuted, flexShrink: 0, paddingTop: 2 }}>SHA-256</span>
        <code style={{ fontSize: 11, color: hashColor, background: c.bgElevated,
          padding: '4px 10px', borderRadius: 6, wordBreak: 'break-all', fontFamily: 'monospace' }}>
          {hash}
        </code>
      </div>
    </div>
  );
}
