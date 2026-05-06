import { useState, useEffect } from 'react';
import { c, statusColor, statusLabel } from '../theme';

const isDev = process.env.NODE_ENV === 'development';
const DEV_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const apiUrl = (path) => isDev ? `${DEV_URL}${path}` : `/api/proxy?p=${encodeURIComponent(path)}`;

const DOC_TYPE_LABELS = {
  ATPL: 'Licença ATPL', MEDICAL_CLASS1: 'Médico Classe 1', ICAO_ENGLISH: 'Proficiência ICAO',
  TYPE_RATING: 'Type Rating', CRM_TRAINING: 'Formação CRM', OTHER: 'Outro',
};

export default function DocumentCard({ document }) {
  const [verifying,    setVerifying]    = useState(false);
  const [verification, setVerification] = useState(null);
  const [verifyError,  setVerifyError]  = useState(null);
  const [showQr,   setShowQr]   = useState(false);
  const [qrUrl,    setQrUrl]    = useState(null);
  const [qrLoading,setQrLoading]= useState(false);

  const color     = statusColor[document.status] || c.textMuted;
  const label     = statusLabel[document.status] || document.status;
  const daysLeft  = document.days_until_expiry;
  const expiryDate= new Date(document.expires_at).toLocaleDateString('pt-PT');

  useEffect(() => () => { if (qrUrl) URL.revokeObjectURL(qrUrl); }, [qrUrl]);

  async function verifyOnBlockchain() {
    setVerifying(true); setVerification(null); setVerifyError(null);
    try {
      const res  = await fetch(apiUrl(`/documents/verify/${document.hash}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setVerification(data);
    } catch (err) { setVerifyError(err.message); }
    finally { setVerifying(false); }
  }

  async function loadQr() {
    if (qrUrl) { setShowQr(true); return; }
    setQrLoading(true);
    try {
      const res  = await fetch(apiUrl(`/documents/qr/${document.hash}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setQrUrl(URL.createObjectURL(await res.blob()));
      setShowQr(true);
    } catch { setVerifyError('Não foi possível gerar o QR Code.'); }
    finally { setQrLoading(false); }
  }

  return (
    <>
      {/* QR Modal */}
      {showQr && (
        <div onClick={() => setShowQr(false)} style={{ position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14,
            padding: '24px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#667', marginBottom: 12 }}>
              Digitalize para verificar na blockchain
            </div>
            {qrUrl && <img src={qrUrl} alt="QR" style={{ width: 180, height: 180 }} />}
            <button onClick={() => setShowQr(false)} style={{ display: 'block', margin: '12px auto 0',
              padding: '8px 24px', background: c.bgHeader, border: 'none',
              borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      <div style={{ background: c.bgSurface, border: `1px solid ${c.border}`,
        borderTop: `3px solid ${color}`, borderRadius: 12, padding: '18px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: c.primaryLt,
            textTransform: 'uppercase', letterSpacing: '.5px' }}>
            {DOC_TYPE_LABELS[document.doc_type] || document.doc_type}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
            background: `${color}18`, color, border: `1px solid ${color}44` }}>
            {label}
          </span>
        </div>

        {/* Description */}
        <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 10 }}>
          {document.description}
        </div>

        {/* Expiry */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: c.textMuted }}>Validade</span>
          <span style={{ fontSize: 13, fontWeight: 700, color }}>{expiryDate}</span>
        </div>

        {/* Progress bar */}
        {document.status !== 'expired' && (
          <div style={{ background: c.bgElevated, borderRadius: 4, height: 4, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (daysLeft / 365) * 100)}%`,
              height: '100%', background: color, borderRadius: 4 }} />
          </div>
        )}

        {/* Hash */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: c.textMuted }}>Hash</span>
          <code style={{ fontSize: 11, color: c.primaryLt, background: c.bgElevated,
            padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
            {document.hash.slice(0,10)}…{document.hash.slice(-6)}
          </code>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={verifyOnBlockchain} disabled={verifying}
            style={{ flex: 1, padding: '9px 0', background: 'transparent',
              border: `1px solid ${c.border}`, borderRadius: 8, color: c.textMuted,
              fontWeight: 600, cursor: verifying ? 'wait' : 'pointer',
              fontSize: 12, fontFamily: 'Inter, sans-serif', opacity: verifying ? .6 : 1 }}>
            {verifying ? 'A verificar…' : '🔗 Verificar Blockchain'}
          </button>
          <button onClick={loadQr} disabled={qrLoading}
            style={{ width: 40, background: 'transparent', border: `1px solid ${c.border}`,
              borderRadius: 8, color: c.textMuted, cursor: 'pointer',
              fontSize: 16, opacity: qrLoading ? .6 : 1 }}
            title="QR Code">
            {qrLoading ? '⏳' : '📱'}
          </button>
        </div>

        {/* Verification result */}
        {verification && (
          <div style={{ marginTop: 10, background: c.bgElevated, borderRadius: 8,
            padding: '10px 14px', border: `1px solid ${c.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600,
              color: verification.is_authentic && !verification.is_expired ? c.green : c.red }}>
              {verification.message}
            </div>
          </div>
        )}
        {verifyError && (
          <div style={{ marginTop: 10, background: `${c.red}11`, borderRadius: 8,
            padding: '10px 14px', fontSize: 12, color: c.red }}>
            {verifyError}
          </div>
        )}
      </div>
    </>
  );
}
