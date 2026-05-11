import { useState, useEffect } from 'react';
import { c, statusColor, statusLabel, shadow } from '../theme';

const isDev = process.env.NODE_ENV === 'development';
const DEV_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const apiUrl = (path) => isDev ? `${DEV_URL}${path}` : `/api/proxy?p=${encodeURIComponent(path)}`;

const DOC_TYPE_LABELS = {
  ATPL: 'Licença ATPL', MEDICAL_CLASS1: 'Médico Classe 1', ICAO_ENGLISH: 'Proficiência ICAO',
  TYPE_RATING: 'Type Rating', CRM_TRAINING: 'Formação CRM', OTHER: 'Outro',
};

const MEDICAL_TYPES = new Set(['MEDICAL_CLASS1']);

/* ── icon components ── */
const ChainIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
  </svg>
);
const LockIcon = () => (
  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z"/>
  </svg>
);
const QrIcon = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1zm12 0h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1zM5 20h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1z"/>
  </svg>
);

export default function DocumentCard({ document }) {
  const [verifying,    setVerifying]    = useState(false);
  const [verification, setVerification] = useState(null);
  const [verifyError,  setVerifyError]  = useState(null);
  const [showQr,       setShowQr]       = useState(false);
  const [qrUrl,        setQrUrl]        = useState(null);
  const [qrLoading,    setQrLoading]    = useState(false);
  const [proofOpen,    setProofOpen]    = useState(false);

  const color      = statusColor[document.status] || c.textMuted;
  const label      = statusLabel[document.status] || document.status;
  const daysLeft   = document.days_until_expiry;
  const expiryDate = new Date(document.expires_at).toLocaleDateString('pt-PT');
  const isMedical  = MEDICAL_TYPES.has(document.doc_type);

  useEffect(() => () => { if (qrUrl) URL.revokeObjectURL(qrUrl); }, [qrUrl]);

  async function verifyOnBlockchain() {
    setVerifying(true); setVerification(null); setVerifyError(null);
    try {
      const res  = await fetch(apiUrl(`/documents/verify/${document.hash}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setVerification(data);
      setProofOpen(true);
    } catch (err) { setVerifyError(err.message); }
    finally { setVerifying(false); }
  }

  async function loadQr() {
    if (qrUrl) { setShowQr(true); return; }
    setQrLoading(true);
    try {
      const res = await fetch(apiUrl(`/documents/qr/${document.hash}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setQrUrl(URL.createObjectURL(await res.blob()));
      setShowQr(true);
    } catch { setVerifyError('Não foi possível gerar o QR Code.'); }
    finally { setQrLoading(false); }
  }

  const isAuthentic = verification?.is_authentic && !verification?.is_expired;

  return (
    <>
      {/* QR Modal */}
      {showQr && (
        <div onClick={() => setShowQr(false)} style={modal.overlay}>
          <div onClick={e => e.stopPropagation()} style={modal.box}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#334', marginBottom: 14 }}>
              Verificar na Blockchain
            </div>
            <div style={{ fontSize: 11, color: '#667', marginBottom: 14 }}>
              Digitalize para verificar a autenticidade do documento
            </div>
            {qrUrl && <img src={qrUrl} alt="QR" style={{ width: 200, height: 200, display: 'block', margin: '0 auto' }} />}
            <div style={{ fontSize: 10, color: '#889', marginTop: 12, textAlign: 'center', fontFamily: 'monospace' }}>
              {document.hash.slice(0,12)}…{document.hash.slice(-8)}
            </div>
            <button onClick={() => setShowQr(false)} style={modal.closeBtn}>Fechar</button>
          </div>
        </div>
      )}

      <div style={{ ...s.card, borderTop: `3px solid ${color}` }}>

        {/* ── Header row ── */}
        <div style={s.headerRow}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: c.primaryLt,
              textTransform: 'uppercase', letterSpacing: '.6px' }}>
              {DOC_TYPE_LABELS[document.doc_type] || document.doc_type}
            </div>
            {isMedical && (
              <div style={s.gdprTag}>
                <LockIcon /> Dados de Saúde · Art. 9 RGPD
              </div>
            )}
          </div>
          <span style={{ ...s.statusBadge, color, background: `${color}18`, border: `1px solid ${color}35` }}>
            {label}
          </span>
        </div>

        {/* Description */}
        <div style={s.description}>{document.description}</div>

        {/* Expiry row */}
        <div style={s.expiryRow}>
          <span style={{ fontSize: 12, color: c.textMuted }}>Validade</span>
          <span style={{ fontSize: 13, fontWeight: 700, color }}>
            {expiryDate}
            {document.status !== 'expired' && daysLeft > 0 && (
              <span style={{ fontWeight: 500, color: c.textMuted, fontSize: 11 }}> · {daysLeft}d restantes</span>
            )}
          </span>
        </div>

        {/* Progress bar */}
        {document.status !== 'expired' && (
          <div style={s.progressBg}>
            <div style={{ ...s.progressFill, width: `${Math.min(100, (daysLeft / 365) * 100)}%`, background: color }} />
          </div>
        )}

        {/* Hash row */}
        <div style={s.hashRow}>
          <span style={{ fontSize: 11, color: c.textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
            <ChainIcon /> SHA-256
          </span>
          <code style={s.hashCode}>
            {document.hash.slice(0,10)}…{document.hash.slice(-6)}
          </code>
        </div>

        {/* Actions */}
        <div style={s.actions}>
          <button
            onClick={verifyOnBlockchain}
            disabled={verifying}
            style={{ ...s.btnOutline, ...(verifying ? { opacity: .6 } : {}) }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldIcon />
              {verifying ? 'A verificar…' : 'Verificar Blockchain'}
            </span>
          </button>
          <button
            onClick={loadQr}
            disabled={qrLoading}
            style={{ ...s.btnIcon, ...(qrLoading ? { opacity: .6 } : {}) }}
            title="QR Code de verificação"
          >
            <QrIcon />
          </button>
        </div>

        {/* ── Integrity Proof Panel ── */}
        {verification && proofOpen && (
          <div style={{ ...s.proofPanel, borderColor: isAuthentic ? `${c.green}40` : `${c.red}40` }}>
            <div style={s.proofHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ ...s.proofIcon, background: isAuthentic ? c.greenBg : c.redBg, color: isAuthentic ? c.green : c.red }}>
                  <ShieldIcon />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isAuthentic ? c.green : c.red }}>
                    {isAuthentic ? 'Documento Autêntico' : 'Verificação Falhou'}
                  </div>
                  <div style={{ fontSize: 10, color: c.textMuted, marginTop: 1 }}>
                    Prova de Integridade Criptográfica
                  </div>
                </div>
              </div>
              <button
                onClick={() => setProofOpen(false)}
                style={{ background: 'none', border: 'none', color: c.textMuted, cursor: 'pointer', fontSize: 14 }}
              >✕</button>
            </div>

            <div style={s.proofGrid}>
              <ProofRow label="Hash On-Chain" value={`${document.hash.slice(0,14)}…${document.hash.slice(-8)}`} mono />
              {verification.issued_by && (
                <ProofRow label="Emissor (Issuer)" value={`${verification.issued_by.slice(0,8)}…${verification.issued_by.slice(-6)}`} mono />
              )}
              {verification.expires_at && (
                <ProofRow
                  label="Expiração On-Chain"
                  value={new Date(verification.expires_at).toLocaleDateString('pt-PT')}
                />
              )}
              <ProofRow
                label="Integridade"
                value={verification.is_authentic ? '✓ Hash coincide com registo' : '✗ Hash não coincide'}
                color={verification.is_authentic ? c.green : c.red}
              />
              <ProofRow
                label="Estado"
                value={verification.is_expired ? 'Documento expirado' : 'Dentro do período de validade'}
                color={verification.is_expired ? c.red : c.green}
              />
            </div>

            <div style={s.proofFooter}>
              <LockIcon />
              <span>Verificação imutável · Registado na Ethereum · Sem acesso ao ficheiro original</span>
            </div>
          </div>
        )}

        {verifyError && (
          <div style={s.errorBox}>{verifyError}</div>
        )}
      </div>
    </>
  );
}

function ProofRow({ label, value, mono, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 11, color: c.textMuted, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 11, fontFamily: mono ? 'monospace' : 'inherit',
        color: color || c.primaryLt, textAlign: 'right', wordBreak: 'break-all',
      }}>
        {value}
      </span>
    </div>
  );
}

const s = {
  card: {
    background: c.bgCard,
    border: `1px solid ${c.border}`,
    borderRadius: 14,
    padding: '18px 20px',
    boxShadow: shadow.card,
  },
  headerRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10,
  },
  gdprTag: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 9, fontWeight: 600, color: c.purple,
    background: `${c.purple}15`, border: `1px solid ${c.purple}35`,
    padding: '2px 7px', borderRadius: 4, marginTop: 5, letterSpacing: '0.2px',
  },
  statusBadge: {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.8px',
    padding: '4px 9px', borderRadius: 6, whiteSpace: 'nowrap',
  },
  description: {
    fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 12,
  },
  expiryRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  progressBg: {
    background: c.bgElevated, borderRadius: 4, height: 4, marginBottom: 14, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, transition: 'width .4s ease' },
  hashRow: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  hashCode: {
    fontSize: 11, color: c.primaryLt, background: c.bgElevated,
    padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace',
  },
  actions: { display: 'flex', gap: 8 },
  btnOutline: {
    flex: 1, padding: '9px 12px',
    background: 'transparent', border: `1px solid ${c.border}`,
    borderRadius: 8, color: c.textSub, fontWeight: 600,
    cursor: 'pointer', fontSize: 12,
    fontFamily: 'Inter, system-ui, sans-serif',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'border-color .15s, color .15s',
  },
  btnIcon: {
    width: 38, background: 'transparent',
    border: `1px solid ${c.border}`, borderRadius: 8,
    color: c.textMuted, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  /* Proof panel */
  proofPanel: {
    marginTop: 14,
    background: c.bgElevated,
    border: `1px solid`,
    borderRadius: 10,
    overflow: 'hidden',
  },
  proofHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px',
    borderBottom: `1px solid ${c.border}`,
  },
  proofIcon: {
    width: 28, height: 28, borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  proofGrid: {
    padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  proofFooter: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px',
    background: `${c.border}40`,
    fontSize: 10, color: c.textMuted, fontWeight: 500,
    borderTop: `1px solid ${c.border}`,
  },
  errorBox: {
    marginTop: 10,
    background: c.redBg, border: `1px solid ${c.red}35`,
    borderRadius: 8, padding: '10px 14px',
    fontSize: 12, color: c.red,
  },
};

const modal = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,.8)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  box: {
    background: '#fff', borderRadius: 16,
    padding: '28px 32px', textAlign: 'center',
    maxWidth: 300,
  },
  closeBtn: {
    display: 'block', margin: '16px auto 0',
    padding: '8px 28px',
    background: '#1D4ED8', border: 'none',
    borderRadius: 8, color: '#fff',
    fontWeight: 600, cursor: 'pointer', fontSize: 13,
  },
};
