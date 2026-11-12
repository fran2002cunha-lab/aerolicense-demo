import { useState, useRef } from "react";
import { c, shadow } from '../theme';
import { api, backendUrl, sha256File, IS_DEMO } from '../api';

export const DEMO_LOCAL_NOTE = 'Modo demo: o ficheiro é processado só no teu browser, nada é enviado.';
export const WRITE_AUTH_NOTE =
  'O registo exige a chave AEROLICENSE_API_KEY no cabeçalho X-API-Key, e o frontend não inclui chaves. ' +
  'Em desenvolvimento, usa o Swagger UI do backend (/docs) para testar este endpoint.';

const DOC_TYPES = [
  { value: "ATPL",           label: "Licença ATPL",                   medical: false },
  { value: "MEDICAL_CLASS1", label: "Certificado Médico Classe 1",    medical: true  },
  { value: "ICAO_ENGLISH",   label: "Proficiência Linguística ICAO",  medical: false },
  { value: "TYPE_RATING",    label: "Type Rating",                    medical: false },
  { value: "CRM_TRAINING",   label: "Formação CRM",                   medical: false },
  { value: "OTHER",          label: "Outro",                          medical: false },
];

const UploadIcon = () => (
  <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 0 1-.88-7.903A5 5 0 1 1 15.9 6L16 6a5 5 0 0 1 1 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
  </svg>
);
const ShieldCheckIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
  </svg>
);
const LockIcon = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z"/>
  </svg>
);
const ChainIcon = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1"/>
  </svg>
);

export default function UploadDocument({ pilotAddress, onSuccess }) {
  const [file,        setFile]     = useState(null);
  const [docType,     setDocType]  = useState("ATPL");
  const [description, setDesc]     = useState("");
  const [expiresAt,   setExpires]  = useState("");
  const [loading,     setLoading]  = useState(false);
  const [result,      setResult]   = useState(null);
  const [demoResult,  setDemoRes]  = useState(null);
  const [error,       setError]    = useState(null);
  const [dragOver,    setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const openFilePicker = () => fileInputRef.current?.click();

  const isMedical = DOC_TYPES.find(d => d.value === docType)?.medical;

  async function handleDemoSubmit() {
    if (!file) return;
    setLoading(true); setDemoRes(null); setError(null);
    try {
      /* SHA-256 calculado localmente — o ficheiro não sai do browser. */
      const hash  = await sha256File(file);
      const check = await api.verifyDocument(hash);
      setDemoRes({ hash, check });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (IS_DEMO) { handleDemoSubmit(); return; }
    if (!file || !description || !expiresAt) return;
    setLoading(true); setResult(null); setError(null);

    const form = new FormData();
    form.append("file", file);
    const params = new URLSearchParams({
      pilot_address: pilotAddress, doc_type: docType,
      description, expires_at: new Date(expiresAt).toISOString(),
    });

    try {
      const res  = await fetch(backendUrl(`/documents/upload?${params}`), { method: "POST", body: form });
      if (res.status === 401 || res.status === 503) throw new Error(WRITE_AUTH_NOTE);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setResult(data);
      onSuccess?.(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  return (
    <div style={s.container}>

      {/* Title */}
      <div style={s.titleRow}>
        <div style={s.titleIcon}><ChainIcon /></div>
        <div>
          <h2 style={s.title}>Registar Novo Documento</h2>
          <p style={s.subtitle}>
            O ficheiro não é armazenado: só o hash SHA-256 é registado (num contrato Ethereum local/testnet,
            se configurado; caso contrário, numa blockchain simulada). Qualquer alteração ao ficheiro muda o hash.
          </p>
        </div>
      </div>

      {IS_DEMO && (
        <div role="note" style={s.demoNote}>
          <LockIcon /> <span>{DEMO_LOCAL_NOTE}</span>
        </div>
      )}

      {/* O que o código faz de facto com o ficheiro */}
      <div style={s.rgpdBox}>
        <div style={s.rgpdRow}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: c.green }}>
            <LockIcon /> <strong>Hash SHA-256</strong>
          </span>
          <span style={{ color: c.border }}>·</span>
          <span style={{ color: c.textMuted }}>
            {IS_DEMO ? 'Calculado no browser' : 'Calculado no servidor; o ficheiro não é guardado'}
          </span>
          <span style={{ color: c.border }}>·</span>
          <span style={{ color: c.textMuted }}>Dados fictícios</span>
        </div>
        {isMedical && (
          <div style={s.medicalWarning}>
            <LockIcon />
            <span>
              <strong>Dados de saúde são categoria especial (Art. 9 RGPD).</strong>{' '}
              Um sistema real precisaria de base legal e de uma AIPD; este projeto académico não as tem.
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={s.form}>

        <Field label="Tipo de Documento">
          <select value={docType} onChange={e => setDocType(e.target.value)} style={s.input}>
            {DOC_TYPES.map(d => (
              <option key={d.value} value={d.value}>
                {d.label}{d.medical ? ' 🔒' : ''}
              </option>
            ))}
          </select>
        </Field>

        {!IS_DEMO && (<>
        <Field label="Descrição">
          <input
            type="text"
            placeholder="ex: ATPL — Atlântica Air"
            value={description}
            onChange={e => setDesc(e.target.value)}
            style={s.input}
            required
          />
        </Field>

        <Field label="Data de Validade">
          <input
            type="date"
            value={expiresAt}
            onChange={e => setExpires(e.target.value)}
            style={s.input}
            required
          />
        </Field>
        </>)}

        <Field label="Ficheiro (PDF / JPG / PNG)">
          <div
            style={{
              ...s.dropzone,
              borderColor: dragOver ? c.primary : file ? c.green : c.border,
              background:  dragOver ? `${c.primary}08` : file ? `${c.green}08` : c.bgElevated,
            }}
            role="button"
            tabIndex={0}
            aria-label={file ? `Ficheiro selecionado: ${file.name}. Clique para alterar` : 'Selecionar ficheiro PDF, JPG ou PNG'}
            onClick={openFilePicker}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFilePicker(); } }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 26 }}>📄</div>
                <span style={{ color: c.green, fontWeight: 600, fontSize: 13 }}>{file.name}</span>
                <span style={{ color: c.textMuted, fontSize: 11 }}>
                  {(file.size / 1024).toFixed(1)} KB · Clique para alterar
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ color: c.textMuted }}><UploadIcon /></span>
                <span style={{ color: c.textMuted, fontSize: 13 }}>
                  Arraste ou{' '}
                  <span style={{ color: c.primaryLt, fontWeight: 600 }}>clique para selecionar</span>
                </span>
                <span style={{ color: c.textDim, fontSize: 11 }}>PDF · JPG · PNG · máx. 10 MB</span>
              </div>
            )}
            <input
              id="fileInput" ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
              onClick={e => e.stopPropagation()}
              style={{ display: "none" }}
              onChange={e => setFile(e.target.files[0])}
            />
          </div>
        </Field>

        <button
          type="submit"
          disabled={loading || !file}
          style={{ ...s.submitBtn, opacity: loading || !file ? 0.5 : 1,
            cursor: loading || !file ? 'not-allowed' : 'pointer' }}
        >
          {IS_DEMO
            ? (loading ? 'A calcular SHA-256…' : 'Calcular hash e verificar (local)')
            : (loading ? 'A registar na blockchain…' : 'Registar na Blockchain')}
        </button>
      </form>

      {/* Success result */}
      {result && (
        <div style={s.successBox}>
          <div style={s.successHeader}>
            <ShieldCheckIcon />
            {result.blockchain_mode === 'real'
              ? 'Documento registado no contrato Ethereum'
              : 'Hash calculado (blockchain simulada, nada foi gravado on-chain)'}
          </div>
          <div style={s.resultGrid}>
            <ResultRow label="Hash SHA-256"       value={result.hash} mono />
            <ResultRow label="Transação"          value={`${result.tx_hash.slice(0,18)}…${result.tx_hash.slice(-6)}`} mono />
            <ResultRow
              label="Validade"
              value={`${result.days_until_expiry} dias restantes`}
              color={result.days_until_expiry < 30 ? c.amber : c.green}
            />
          </div>
          <p style={s.successNote}>
            {result.blockchain_mode === 'real'
              ? 'Hash gravado no contrato. Quem tiver o ficheiro pode recalcular o hash e compará-lo.'
              : 'Sem CONTRACT_ADDRESS o backend simula o tx_hash; nenhuma transação foi enviada.'}
          </p>
        </div>
      )}

      {demoResult && (
        <div style={demoResult.check.is_authentic ? s.successBox : s.neutralBox}>
          <div style={demoResult.check.is_authentic ? s.successHeader : s.neutralHeader}>
            <ShieldCheckIcon />
            {demoResult.check.is_authentic
              ? 'Hash encontrado nos registos de demonstração'
              : 'Hash não registado nos dados de demonstração'}
          </div>
          <div style={s.resultGrid}>
            <ResultRow label="Hash SHA-256 (calculado no browser)" value={demoResult.hash} mono />
            {demoResult.check.is_authentic && (
              <>
                <ResultRow label="Documento" value={demoResult.check.doc_descricao} />
                <ResultRow label="Titular" value={`${demoResult.check.pilot_nome} (${demoResult.check.pilot_id})`} />
                <ResultRow
                  label="Estado"
                  value={demoResult.check.is_expired ? 'Expirado' : 'Dentro da validade'}
                  color={demoResult.check.is_expired ? c.red : c.green}
                />
              </>
            )}
          </div>
          <p style={s.successNote}>
            {demoResult.check.is_authentic
              ? 'O hash coincide com um documento dos dados fictícios desta demo.'
              : 'Qualquer alteração ao ficheiro muda o hash. Na versão completa (com backend), este hash seria gravado na Ethereum; nesta demo estática nada é registado.'}
          </p>
        </div>
      )}

      {error && (
        <div style={s.errorBox}><strong>Erro:</strong> {error}</div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label style={{
        fontSize: 11, fontWeight: 600, color: c.textMuted,
        textTransform: 'uppercase', letterSpacing: '.6px',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ResultRow({ label, value, mono, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 11, color: c.textMuted, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 11,
        fontFamily: mono ? 'monospace' : 'inherit',
        color: color || c.primaryLt,
        textAlign: 'right', wordBreak: 'break-all',
      }}>{value}</span>
    </div>
  );
}

const s = {
  container: {
    background: c.bgCard, border: `1px solid ${c.border}`,
    borderRadius: 16, padding: '28px 32px', maxWidth: 580,
    boxShadow: shadow.card,
  },
  titleRow: { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 },
  titleIcon: {
    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
    background: `${c.primary}20`, color: c.primaryLt,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontSize: 17, fontWeight: 700, color: c.text, margin: '0 0 5px' },
  subtitle: { fontSize: 12, color: c.textMuted, margin: 0, lineHeight: 1.55 },

  rgpdBox: {
    background: c.bgElevated, border: `1px solid ${c.border}`,
    borderRadius: 10, padding: '12px 14px', marginBottom: 24,
  },
  rgpdRow: {
    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11,
  },
  medicalWarning: {
    display: 'flex', alignItems: 'flex-start', gap: 7,
    marginTop: 10, paddingTop: 10, borderTop: `1px solid ${c.border}`,
    fontSize: 11, color: c.purpleLt, lineHeight: 1.45,
  },

  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  input: {
    background: c.bgElevated, border: `1px solid ${c.border}`,
    borderRadius: 9, padding: '10px 14px',
    color: c.text, fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif',
    width: '100%', boxSizing: 'border-box',
  },
  dropzone: {
    border: '1.5px dashed', borderRadius: 10,
    padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
    transition: 'border-color .15s, background .15s',
  },
  submitBtn: {
    padding: '13px', marginTop: 4,
    background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)',
    border: 'none', borderRadius: 10,
    color: '#fff', fontWeight: 700, fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif',
    boxShadow: '0 4px 14px rgba(29,78,216,.35)',
  },

  successBox: {
    marginTop: 20, background: `${c.green}0D`,
    border: `1px solid ${c.green}35`, borderRadius: 12, overflow: 'hidden',
  },
  successHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px', borderBottom: `1px solid ${c.green}25`,
    fontSize: 13, fontWeight: 700, color: c.green,
  },
  resultGrid: {
    padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 9,
  },
  successNote: {
    fontSize: 11, color: c.textMuted, margin: 0,
    padding: '10px 16px', borderTop: `1px solid ${c.green}20`, lineHeight: 1.5,
  },
  demoNote: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: `${c.primary}12`, border: `1px solid ${c.primary}35`,
    borderRadius: 10, padding: '10px 14px', marginBottom: 16,
    fontSize: 12, color: c.primaryLt, lineHeight: 1.45,
  },
  neutralBox: {
    marginTop: 20, background: c.bgElevated,
    border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden',
  },
  neutralHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px', borderBottom: `1px solid ${c.border}`,
    fontSize: 13, fontWeight: 700, color: c.textMuted,
  },
  errorBox: {
    marginTop: 16, background: c.redBg, border: `1px solid ${c.red}35`,
    borderRadius: 10, padding: '12px 16px', fontSize: 13, color: c.red,
  },
};
