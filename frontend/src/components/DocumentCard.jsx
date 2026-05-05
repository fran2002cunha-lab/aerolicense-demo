// AeroLicense — Componente React: Cartão de Documento
// Mostra o estado de um documento e permite verificar autenticidade na blockchain

import { useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Cores e labels por estado
const STATUS_CONFIG = {
  valid:          { color: "#27AE60", label: "Válido",          icon: "✅" },
  expiring_soon:  { color: "#F0A500", label: "A expirar",       icon: "⚠️" },
  expired:        { color: "#C0392B", label: "Expirado",        icon: "❌" },
};

const DOC_TYPE_LABELS = {
  ATPL:           "Licença ATPL",
  MEDICAL_CLASS1: "Médico Classe 1",
  ICAO_ENGLISH:   "Proficiência ICAO",
  TYPE_RATING:    "Type Rating",
  CRM_TRAINING:   "Formação CRM",
  OTHER:          "Outro",
};

export default function DocumentCard({ document }) {
  const [verifying, setVerifying]     = useState(false);
  const [verification, setVerification] = useState(null);
  const [error, setError]             = useState(null);

  const { color, label, icon } = STATUS_CONFIG[document.status] || STATUS_CONFIG.valid;
  const daysLeft = document.days_until_expiry;
  const expiryDate = new Date(document.expires_at).toLocaleDateString("pt-PT");

  // Chama o backend que por sua vez consulta a blockchain
  async function verifyOnBlockchain() {
    setVerifying(true);
    setVerification(null);
    setError(null);
    try {
      const res  = await fetch(`${API_URL}/documents/verify/${document.hash}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setVerification(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div style={styles.card}>

      {/* Barra colorida de estado */}
      <div style={{ ...styles.statusBar, backgroundColor: color }} />

      {/* Cabeçalho */}
      <div style={styles.header}>
        <div>
          <span style={styles.icon}>{icon}</span>
          <span style={{ ...styles.statusBadge, backgroundColor: color }}>{label}</span>
        </div>
        <span style={styles.docType}>{DOC_TYPE_LABELS[document.doc_type]}</span>
      </div>

      {/* Nome do documento */}
      <p style={styles.description}>{document.description}</p>

      {/* Datas */}
      <div style={styles.dateRow}>
        <span style={styles.dateLabel}>Validade:</span>
        <span style={{ color, fontWeight: "bold" }}>{expiryDate}</span>
      </div>

      {/* Barra de progresso dos dias restantes */}
      {document.status !== "expired" && (
        <div style={styles.progressContainer}>
          <div
            style={{
              ...styles.progressBar,
              width: `${Math.min(100, (daysLeft / 365) * 100)}%`,
              backgroundColor: color,
            }}
          />
          <span style={styles.progressLabel}>{daysLeft} dias restantes</span>
        </div>
      )}

      {/* Hash do documento (identificador na blockchain) */}
      <div style={styles.hashRow}>
        <span style={styles.hashLabel}>Hash blockchain:</span>
        <code style={styles.hash}>
          {document.hash.slice(0, 10)}...{document.hash.slice(-6)}
        </code>
      </div>

      {/* Botão de verificação na blockchain */}
      <button
        onClick={verifyOnBlockchain}
        disabled={verifying}
        style={{ ...styles.button, opacity: verifying ? 0.6 : 1 }}
      >
        {verifying ? "A verificar na blockchain..." : "🔗 Verificar na Blockchain"}
      </button>

      {/* Resultado da verificação */}
      {verification && (
        <div style={{
          ...styles.verificationResult,
          borderColor: verification.is_authentic && !verification.is_expired ? "#27AE60" : "#C0392B",
        }}>
          <p style={{ margin: 0, fontWeight: "bold", color: verification.is_authentic ? "#27AE60" : "#C0392B" }}>
            {verification.message}
          </p>
          <p style={styles.txNote}>
            Verificado diretamente na Ethereum — não pode ser falsificado.
          </p>
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          <p style={{ margin: 0, color: "#C0392B" }}>Erro: {error}</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background:   "#1A3F7A",
    borderRadius: 12,
    padding:      "20px 24px",
    marginBottom: 16,
    position:     "relative",
    overflow:     "hidden",
    boxShadow:    "0 4px 16px rgba(0,0,0,0.3)",
  },
  statusBar:   { position: "absolute", top: 0, left: 0, right: 0, height: 4 },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  icon:        { fontSize: 20, marginRight: 8 },
  statusBadge: { color: "#fff", fontSize: 12, fontWeight: "bold", borderRadius: 20, padding: "3px 10px" },
  docType:     { color: "#00AAEE", fontSize: 13, fontWeight: "600" },
  description: { color: "#ECF0F4", fontSize: 16, fontWeight: "bold", margin: "8px 0" },
  dateRow:     { display: "flex", gap: 8, alignItems: "center", margin: "8px 0" },
  dateLabel:   { color: "#AABBCC", fontSize: 13 },
  progressContainer: { background: "#0A1F44", borderRadius: 8, height: 8, margin: "10px 0", position: "relative" },
  progressBar:       { height: "100%", borderRadius: 8, transition: "width 0.5s ease" },
  progressLabel:     { color: "#AABBCC", fontSize: 11, display: "block", marginTop: 4 },
  hashRow:     { display: "flex", gap: 8, alignItems: "center", margin: "10px 0" },
  hashLabel:   { color: "#AABBCC", fontSize: 12 },
  hash:        { color: "#00AAEE", fontSize: 12, background: "#0A1F44", padding: "2px 8px", borderRadius: 4 },
  button: {
    width:        "100%",
    marginTop:    12,
    padding:      "10px 0",
    background:   "transparent",
    border:       "2px solid #0087CC",
    borderRadius: 8,
    color:        "#0087CC",
    fontWeight:   "bold",
    cursor:       "pointer",
    fontSize:     14,
    transition:   "all 0.2s",
  },
  verificationResult: {
    marginTop:    12,
    padding:      12,
    borderRadius: 8,
    border:       "1.5px solid",
    background:   "#0A1F44",
  },
  txNote: { margin: "6px 0 0", color: "#AABBCC", fontSize: 12 },
  errorBox: { marginTop: 10, padding: 10, background: "#2C0A0A", borderRadius: 8 },
};
