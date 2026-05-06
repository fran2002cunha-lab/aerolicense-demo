import { useState } from "react";
import { c } from '../theme';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const DOC_TYPES = [
  { value: "ATPL",           label: "Licença ATPL" },
  { value: "MEDICAL_CLASS1", label: "Certificado Médico Classe 1" },
  { value: "ICAO_ENGLISH",   label: "Proficiência Linguística ICAO" },
  { value: "TYPE_RATING",    label: "Type Rating" },
  { value: "CRM_TRAINING",   label: "Formação CRM" },
  { value: "OTHER",          label: "Outro" },
];

export default function UploadDocument({ pilotAddress, onSuccess }) {
  const [file, setFile]           = useState(null);
  const [docType, setDocType]     = useState("ATPL");
  const [description, setDesc]    = useState("");
  const [expiresAt, setExpires]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file || !description || !expiresAt) return;

    setLoading(true);
    setResult(null);
    setError(null);

    // FormData para enviar o ficheiro ao backend Python
    const form = new FormData();
    form.append("file", file);

    const params = new URLSearchParams({
      pilot_address: pilotAddress,
      doc_type:      docType,
      description,
      expires_at:    new Date(expiresAt).toISOString(),
    });

    try {
      const res  = await fetch(`${API_URL}/documents/upload?${params}`, {
        method: "POST",
        body:   form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setResult(data);
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📁 Registar Novo Documento</h2>
      <p style={styles.subtitle}>
        O ficheiro não é armazenado — apenas o seu hash SHA-256 é registado na blockchain Ethereum.
        Qualquer alteração ao documento torna o hash inválido e a falsificação é imediatamente detetada.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Tipo de documento */}
        <label style={styles.label}>Tipo de Documento</label>
        <select
          value={docType}
          onChange={e => setDocType(e.target.value)}
          style={styles.input}
        >
          {DOC_TYPES.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>

        {/* Descrição */}
        <label style={styles.label}>Descrição</label>
        <input
          type="text"
          placeholder="ex: ATPL — TAP Air Portugal, emitido ANAC"
          value={description}
          onChange={e => setDesc(e.target.value)}
          style={styles.input}
          required
        />

        {/* Data de expiração */}
        <label style={styles.label}>Data de Validade</label>
        <input
          type="date"
          value={expiresAt}
          onChange={e => setExpires(e.target.value)}
          style={styles.input}
          required
        />

        {/* Upload do ficheiro */}
        <label style={styles.label}>Ficheiro (PDF / JPG / PNG)</label>
        <div
          style={styles.dropzone}
          onClick={() => document.getElementById("fileInput").click()}
        >
          {file
            ? <span style={{ color: c.primaryLt }}>📄 {file.name}</span>
            : <span style={{ color: c.textMuted }}>Clique para selecionar o ficheiro</span>
          }
          <input
            id="fileInput"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: "none" }}
            onChange={e => setFile(e.target.files[0])}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          style={{ ...styles.button, opacity: loading || !file ? 0.5 : 1 }}
        >
          {loading ? "A registar na blockchain..." : "🔗 Registar na Blockchain"}
        </button>
      </form>

      {/* Resultado do registo */}
      {result && (
        <div style={styles.success}>
          <p style={styles.successTitle}>✅ Documento registado com sucesso!</p>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Hash do documento:</span>
            <code style={styles.code}>{result.hash}</code>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Transação blockchain:</span>
            <code style={styles.code}>{result.tx_hash.slice(0, 20)}...</code>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Dias até expirar:</span>
            <span style={{ color: result.days_until_expiry < 30 ? "#F0A500" : "#27AE60", fontWeight: "bold" }}>
              {result.days_until_expiry} dias
            </span>
          </div>
          <p style={styles.note}>
            O hash está gravado permanentemente na Ethereum.
            Qualquer entidade pode verificar a autenticidade deste documento
            sem precisar de aceder ao ficheiro original.
          </p>
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          ❌ Erro: {error}
        </div>
      )}
    </div>
  );
}

const styles = {
  container:   { background: c.bgSurface, border: `1px solid ${c.border}`,
    borderRadius: 14, padding: '28px 32px', maxWidth: 560 },
  title:       { fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 6 },
  subtitle:    { fontSize: 13, color: c.textMuted, marginBottom: 24, lineHeight: 1.5 },
  form:        { display: 'flex', flexDirection: 'column', gap: 16 },
  label:       { fontSize: 12, fontWeight: 600, color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 },
  input:       { width: '100%', background: c.bgElevated, border: `1px solid ${c.border}`,
    borderRadius: 8, padding: '10px 14px', color: c.text, fontSize: 14,
    outline: 'none', fontFamily: 'Inter, sans-serif' },
  dropzone:    { background: c.bgElevated, border: `1px solid ${c.border}`,
    borderRadius: 8, padding: '20px', textAlign: 'center', cursor: 'pointer' },
  button:      { padding: '12px', background: c.primary, border: 'none',
    borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer',
    fontSize: 14, fontFamily: 'Inter, sans-serif', marginTop: 8 },
  success:     { background: `${c.green}11`, border: `1px solid ${c.green}33`,
    borderRadius: 8, padding: '12px 16px', color: c.green, fontSize: 13, marginTop: 16 },
  successTitle:{ color: c.green, fontWeight: 700, margin: '0 0 12px', fontSize: 15 },
  detailRow:   { display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap' },
  detailLabel: { color: c.textMuted, fontSize: 12, minWidth: 150 },
  code:        { color: c.primaryLt, fontSize: 11, background: c.bgElevated,
    padding: '2px 6px', borderRadius: 4, wordBreak: 'break-all' },
  note:        { color: c.textMuted, fontSize: 12, marginTop: 12, lineHeight: 1.5 },
  errorBox:    { background: `${c.red}11`, border: `1px solid ${c.red}33`,
    borderRadius: 8, padding: '12px 16px', color: c.red, fontSize: 13, marginTop: 16 },
};
