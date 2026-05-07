import { useState, useEffect } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';
import { c, shadow } from '../theme';

/* ── icons ── */
const ChainIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/>
  </svg>
);

export default function BlockchainDemo() {
  const [data,    setData]    = useState(null);
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
    <div style={{ maxWidth: 860 }}>

      {/* ── Page header ── */}
      <div style={s.pageHeader}>
        <div style={s.headerIcon}><ChainIcon /></div>
        <div>
          <h1 style={s.pageTitle}>{data.conceito}</h1>
          <p style={s.pageSubtitle}>
            Demonstração de como a verificação criptográfica SHA-256 deteta falsificações automaticamente,
            sem necessidade de aceder ao ficheiro original.
          </p>
        </div>
      </div>

      {/* ── Section 1: How it works ── */}
      <SectionLabel label="1 — Como Funciona o Registo On-Chain" />

      <div style={s.stepsGrid}>
        {[
          { n: '01', title: 'Upload do Ficheiro',    desc: 'Piloto carrega o documento (PDF/JPG). O ficheiro fica apenas no browser.',        color: c.primaryLt },
          { n: '02', title: 'Hash SHA-256',           desc: 'O backend calcula o hash SHA-256 do conteúdo binário do ficheiro.',               color: c.green     },
          { n: '03', title: 'Registo Ethereum',       desc: 'O hash (bytes32) é enviado para o smart contract AeroLicenseRegistry.sol.',       color: c.amber     },
          { n: '04', title: 'Verificação Instantânea',desc: 'Qualquer entidade (ANAC, companhia) pode verificar o hash sem aceder ao ficheiro.',color: c.purple    },
        ].map(({ n, title, desc, color }) => (
          <div key={n} style={{ ...s.stepCard, borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 28, fontWeight: 900, color, opacity: .25, lineHeight: 1 }}>{n}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginTop: 8 }}>{title}</div>
            <div style={{ fontSize: 12, color: c.textMuted, marginTop: 6, lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* ── Section 2: Forgery detection ── */}
      <SectionLabel label="2 — Detecção de Falsificação" />

      <div style={s.hashRow}>
        <HashCard
          label="DOCUMENTO ORIGINAL"
          labelColor={c.green}
          badgeBg={c.greenBg}
          content={data.documento_original.conteudo}
          hash={data.documento_original.sha256}
          hashColor={c.green}
          icon="✓"
        />

        <div style={s.arrowCol}>
          <div style={s.arrowLine} />
          <div style={s.arrowLabel}>SHA-256</div>
          <div style={s.arrowLine} />
        </div>

        <HashCard
          label="DOCUMENTO FALSIFICADO"
          labelColor={c.red}
          badgeBg={c.redBg}
          content={data.documento_falsificado.conteudo}
          note={`Alteração: ${data.documento_falsificado.alteracao}`}
          hash={data.documento_falsificado.sha256}
          hashColor={c.red}
          icon="✗"
        />
      </div>

      <div style={s.resultBox}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...s.resultIcon, background: c.redBg, color: c.red }}>✗</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.red }}>
              Hashes diferentes — Falsificação detetada automaticamente
            </div>
            <div style={{ fontSize: 12, color: c.textMuted, marginTop: 3 }}>{data.conclusao}</div>
          </div>
        </div>
      </div>

      {/* ── Section 3: EPL Integration (Future) ── */}
      <SectionLabel label="3 — Arquitetura EPL / ICAO (Preparada)" badge="Futuro" />

      <div style={s.eplCard}>
        <div style={s.eplHeader}>
          <div style={s.eplHeaderLeft}>
            <div style={s.eplIcon}><ShieldIcon /></div>
            <div>
              <div style={s.eplTitle}>Fluxo de Verificação com Standard ICAO EPL</div>
              <div style={s.eplSubtitle}>
                Electronic Personnel Licence — projeto piloto EASA + ICAO + SITA
              </div>
            </div>
          </div>
          <div style={s.futureBadge}>Arquitetura Pronta</div>
        </div>

        <div style={s.eplNote}>
          A EASA não dispõe atualmente de API pública para validação de licenças.
          O AeroLicense está arquiteturalmente preparado para o momento em que o standard EPL avançar.
          Atualmente opera com assinatura própria — que prova <strong>integridade</strong> do documento,
          mas não autoridade de emissão.
        </div>

        {/* Flow diagram */}
        <div style={s.flowRow}>
          <FlowStep
            num="1"
            title="Piloto"
            desc="Solicita verificação da licença no ramp check"
            color={c.primaryLt}
          />
          <FlowArrow />
          <FlowStep
            num="2"
            title="AeroLicense"
            desc="Gera QR com hash SHA-256 + assinatura digital"
            color={c.green}
          />
          <FlowArrow />
          <FlowStep
            num="3"
            title="ANAC / EASA"
            desc="Valida licença via API EPL (quando disponível)"
            color={c.amber}
            future
          />
          <FlowArrow />
          <FlowStep
            num="4"
            title="Autoridade"
            desc="Resultado em segundos, sem ficheiro original"
            color={c.purple}
          />
        </div>

        <div style={s.eplStandardsRow}>
          {[
            { label: 'EASA Part-FCL', desc: 'Licenças de piloto' },
            { label: 'EASA Part-MED', desc: 'Certificados médicos' },
            { label: 'ICAO Doc 9379', desc: 'Machine Readable Travel Documents' },
            { label: 'ICAO EPL', desc: 'Electronic Personnel Licence (piloto)' },
          ].map(({ label, desc }) => (
            <div key={label} style={s.standardChip}>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.primaryLt }}>{label}</div>
              <div style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

/* ── Sub-components ── */

function SectionLabel({ label, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 14px' }}>
      <span style={s.sectionLabel}>{label}</span>
      {badge && (
        <span style={s.futureBadgeSmall}>{badge}</span>
      )}
    </div>
  );
}

function HashCard({ label, labelColor, badgeBg, content, note, hash, hashColor, icon }) {
  return (
    <div style={{ ...s.hashCard, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14, color: labelColor }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: labelColor,
          textTransform: 'uppercase', letterSpacing: '1px' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 13, color: c.text, marginBottom: note ? 8 : 14,
        background: c.bgElevated, borderRadius: 8, padding: '10px 12px', lineHeight: 1.4 }}>
        "{content}"
      </div>
      {note && (
        <div style={{ fontSize: 11, color: c.amber, marginBottom: 12,
          background: c.amberBg, borderRadius: 6, padding: '6px 10px' }}>
          ⚠ {note}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 10, color: c.textMuted, flexShrink: 0, paddingTop: 3,
          background: c.bgElevated, padding: '3px 7px', borderRadius: 4, fontWeight: 600 }}>
          SHA-256
        </span>
        <code style={{ fontSize: 10, color: hashColor, background: `${hashColor}10`,
          padding: '4px 10px', borderRadius: 6, wordBreak: 'break-all',
          fontFamily: 'monospace', border: `1px solid ${hashColor}30`, flex: 1 }}>
          {hash}
        </code>
      </div>
    </div>
  );
}

function FlowStep({ num, title, desc, color, future }) {
  return (
    <div style={{ ...s.flowStep, borderColor: future ? `${color}40` : `${color}60`,
      opacity: future ? 0.75 : 1 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color, marginBottom: 6,
        background: `${color}15`, padding: '2px 8px', borderRadius: 4, alignSelf: 'flex-start' }}>
        {num}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{title}</div>
      <div style={{ fontSize: 10, color: c.textMuted, marginTop: 4, lineHeight: 1.4 }}>{desc}</div>
      {future && (
        <div style={{ fontSize: 9, color: c.amber, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ClockIcon /> Pendente EPL
        </div>
      )}
    </div>
  );
}

function FlowArrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', color: c.textDim, fontSize: 18, padding: '0 4px' }}>
      →
    </div>
  );
}

const s = {
  pageHeader: {
    display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 8,
  },
  headerIcon: {
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    background: `${c.primary}20`, color: c.primaryLt,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pageTitle:   { fontSize: 20, fontWeight: 800, color: c.text, margin: '0 0 5px', letterSpacing: '-0.3px' },
  pageSubtitle:{ fontSize: 13, color: c.textMuted, margin: 0, lineHeight: 1.5 },

  sectionLabel: {
    fontSize: 11, fontWeight: 700, color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.8px',
  },
  futureBadgeSmall: {
    fontSize: 9, fontWeight: 700, color: c.amber,
    background: c.amberBg, border: `1px solid ${c.amber}40`,
    padding: '2px 8px', borderRadius: 4, letterSpacing: '0.4px',
  },

  hashRow: {
    display: 'flex', gap: 12, alignItems: 'stretch', flexWrap: 'wrap',
  },
  hashCard: {
    background: c.bgCard, border: `1px solid ${c.border}`,
    borderRadius: 12, padding: '18px 20px', minWidth: 220,
    boxShadow: shadow.card,
  },
  arrowCol: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 4, padding: '0 4px', minWidth: 40,
  },
  arrowLine: { flex: 1, width: 1, background: c.border, minHeight: 20 },
  arrowLabel: { fontSize: 9, fontWeight: 700, color: c.textDim, letterSpacing: '0.5px' },

  resultBox: {
    marginTop: 12,
    background: c.redBg, border: `1px solid ${c.red}35`,
    borderRadius: 12, padding: '16px 20px',
    boxShadow: shadow.card,
  },
  resultIcon: {
    width: 34, height: 34, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 700, flexShrink: 0,
  },

  /* EPL card */
  eplCard: {
    background: c.bgCard, border: `1px solid ${c.border}`,
    borderRadius: 14, overflow: 'hidden', boxShadow: shadow.card,
  },
  eplHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 20px', borderBottom: `1px solid ${c.border}`,
    flexWrap: 'wrap', gap: 12,
  },
  eplHeaderLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  eplIcon: {
    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
    background: `${c.amber}15`, color: c.amber,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  eplTitle:   { fontSize: 14, fontWeight: 700, color: c.text },
  eplSubtitle:{ fontSize: 11, color: c.textMuted, marginTop: 2 },
  futureBadge:{
    fontSize: 10, fontWeight: 700, color: c.amber,
    background: c.amberBg, border: `1px solid ${c.amber}40`,
    padding: '4px 12px', borderRadius: 20, letterSpacing: '0.4px', whiteSpace: 'nowrap',
  },
  eplNote: {
    fontSize: 12, color: c.textMuted, lineHeight: 1.6,
    padding: '14px 20px', background: c.bgElevated,
    borderBottom: `1px solid ${c.border}`,
  },
  flowRow: {
    display: 'flex', alignItems: 'stretch', padding: '20px',
    gap: 4, flexWrap: 'wrap',
  },
  flowStep: {
    flex: 1, minWidth: 130,
    background: c.bgElevated, border: `1px solid`,
    borderRadius: 10, padding: '12px 14px',
    display: 'flex', flexDirection: 'column',
  },
  eplStandardsRow: {
    display: 'flex', flexWrap: 'wrap', gap: 8,
    padding: '0 20px 20px',
  },
  standardChip: {
    background: `${c.primary}12`, border: `1px solid ${c.primary}30`,
    borderRadius: 8, padding: '8px 12px', flex: '1 1 160px',
  },

  /* How it works */
  stepsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
  },
  stepCard: {
    background: c.bgCard, border: `1px solid ${c.border}`,
    borderRadius: 12, padding: '18px 18px', boxShadow: shadow.card,
  },
};
