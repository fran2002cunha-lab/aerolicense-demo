// AeroLicense — Componente React: Upload de Documento
// Faz upload do ficheiro, o backend calcula o hash e regista na blockchain

import { useState } from "react";

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
            ? <span style={{ color: "#00AAEE" }}>📄 {file.name}</span>
            : <span style={{ color: "#AABBCC" }}>Clique para selecionar o ficheiro</span>
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
          <p style={{ margin: 0, color: "#C0392B" }}>❌ Erro: {error}</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { background: "#1A3F7A", borderRadius: 12, padding: "24px 28px", maxWidth: 520 },
  title:     { color: "#FFFFFF", fontSize: 20, fontWeight: "bold", margin: "0 0 8px" },
  subtitle:  { color: "#AABBCC", fontSize: 13, margin: "0 0 24px", lineHeight: 1.5 },
  form:      { display: "flex", flexDirection: "column", gap: 12 },
  label:     { color: "#ECF0F4", fontSize: 13, fontWeight: "600" },
  input: {
    background:   "#0A1F44",
    border:       "1.5px solid #2C4F7A",
    borderRadius: 8,
    padding:      "10px 14px",
    color:        "#FFFFFF",
    fontSize:     14,
    outline:      "none",
  },
  dropzone: {
    background:   "#0A1F44",
    border:       "2px dashed #2C4F7A",
    borderRadius: 8,
    padding:      "20px",
    textAlign:    "center",
    cursor:       "pointer",
  },
  button: {
    padding:      "12px 0",
    background:   "#0087CC",
    border:       "none",
    borderRadius: 8,
    color:        "#FFFFFF",
    fontWeight:   "bold",
    fontSize:     15,
    cursor:       "pointer",
    marginTop:    8,
  },
  success: {
    marginTop:    20,
    background:   "#0A1F44",
    border:       "1.5px solid #27AE60",
    borderRadius: 8,
    padding:      16,
  },
  successTitle: { color: "#27AE60", fontWeight: "bold", margin: "0 0 12px", fontSize: 15 },
  detailRow:    { display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap" },
  detailLabel:  { color: "#AABBCC", fontSize: 12, minWidth: 150 },
  code:         { color: "#00AAEE", fontSize: 11, background: "#0A1F44", padding: "2px 6px", borderRadius: 4, wordBreak: "break-all" },
  note:         { color: "#AABBCC", fontSize: 12, marginTop: 12, lineHeight: 1.5 },
  errorBox:     { marginTop: 12, padding: 12, background: "#2C0A0A", borderRadius: 8 },
};
