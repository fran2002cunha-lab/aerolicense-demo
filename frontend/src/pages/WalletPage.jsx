import { useState, useEffect } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ApiOfflineBanner from '../components/ApiOfflineBanner';
import { FICTIONAL_MARK } from '../components/DocumentCard';
import { c, shadow } from '../theme';

/* ── Icons ── */
const ShieldIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
  </svg>
);
const CalendarIcon = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
  </svg>
);
const HashIcon = () => (
  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
  </svg>
);
const ChevronIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
  </svg>
);

const DOC_LABELS = {
  ATPL:           'Licença ATPL',
  MEDICAL_CLASS1: 'Certificado Médico Classe 1',
  ICAO_ENGLISH:   'Proficiência ICAO',
  TYPE_RATING:    'Type Rating',
  CRM_TRAINING:   'Treino CRM',
  OTHER:          'Outro Documento',
};

const DOC_COLORS = {
  ATPL:           { from: '#1D4ED8', to: '#0EA5E9' },
  MEDICAL_CLASS1: { from: '#059669', to: '#10B981' },
  ICAO_ENGLISH:   { from: '#7C3AED', to: '#A78BFA' },
  TYPE_RATING:    { from: '#D97706', to: '#F59E0B' },
  CRM_TRAINING:   { from: '#DC2626', to: '#F87171' },
  OTHER:          { from: '#475569', to: '#94A3B8' },
};

function statusInfo(status) {
  if (status === 'valid')         return { label: 'Válido',     color: c.green,  bg: c.greenBg };
  if (status === 'expiring_soon') return { label: 'A expirar',  color: c.amber,  bg: c.amberBg };
  return                                 { label: 'Expirado',   color: c.red,    bg: c.redBg   };
}

function LicenseCard({ doc }) {
  const colors = DOC_COLORS[doc.doc_type] || DOC_COLORS.OTHER;
  const status = statusInfo(doc.status);

  return (
    <div style={s.licenseCard}>
      {/* Colored top band */}
      <div style={{
        ...s.cardBand,
        background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
      }}>
        <div style={s.cardBandLeft}>
          <div style={s.cardType}>{DOC_LABELS[doc.doc_type] || doc.doc_type}</div>
          <div style={s.cardIssuer}>
            {doc.emissor || doc.issuer}{' '}
            <span style={{ opacity: 0.75, whiteSpace: 'nowrap' }}>{FICTIONAL_MARK}</span>
          </div>
        </div>
        <div style={{ ...s.cardStatus, color: status.color, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
          {status.label === 'Válido' && <CheckIcon />}
          <span>{status.label}</span>
        </div>
      </div>

      {/* Card body */}
      <div style={s.cardBody}>
        <div style={s.cardDescription}>{doc.descricao || doc.description}</div>

        <div style={s.cardMeta}>
          <div style={s.cardMetaItem}>
            <CalendarIcon />
            <span style={s.cardMetaLabel}>Emissão</span>
            <span style={s.cardMetaValue}>{doc.emitido || doc.issued_at || '—'}</span>
          </div>
          <div style={s.cardMetaDivider} />
          <div style={s.cardMetaItem}>
            <CalendarIcon />
            <span style={s.cardMetaLabel}>Validade</span>
            <span style={{ ...s.cardMetaValue, color: status.color }}>{doc.validade || doc.expires_at}</span>
          </div>
          {(doc.dias_restantes !== undefined || doc.days_until_expiry !== undefined) && (
            <>
              <div style={s.cardMetaDivider} />
              <div style={s.cardMetaItem}>
                <span style={s.cardMetaLabel}>{(doc.dias_restantes ?? doc.days_until_expiry) < 0 ? 'Expirou há' : 'Dias restantes'}</span>
                <span style={{ ...s.cardMetaValue, color: status.color, fontWeight: 700 }}>
                  {Math.abs(doc.dias_restantes ?? doc.days_until_expiry)}d
                </span>
              </div>
            </>
          )}
        </div>

        <div style={s.cardHash}>
          <HashIcon />
          <span style={s.cardHashLabel}>Blockchain</span>
          <span style={s.cardHashValue}>{(doc.hash || '').slice(0, 22)}…</span>
          <div style={{ ...s.cardVerified, color: c.green }}>
            <CheckIcon />
            <span>Verificado</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PilotChip({ pilot, selected, onClick }) {
  const initials = pilot.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  return (
    <button onClick={onClick} style={{
      ...s.pilotChip,
      border: selected ? `2px solid ${c.primary}` : `2px solid ${c.border}`,
      background: selected ? `${c.primary}15` : c.bgCard,
    }}>
      <div style={{
        ...s.chipAvatar,
        background: selected ? `linear-gradient(135deg, ${c.primary}, #0EA5E9)` : c.bgElevated,
        color: selected ? '#fff' : c.textMuted,
      }}>{initials}</div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ ...s.chipName, color: selected ? c.primaryLt : c.text }}>{pilot.nome}</div>
        <div style={s.chipRole}>{pilot.cargo.split('—')[0].trim()}</div>
      </div>
      <div style={{ marginLeft: 'auto', color: selected ? c.primaryLt : c.textDim }}>
        <ChevronIcon />
      </div>
    </button>
  );
}

export default function WalletPage() {
  const [pilots,   setPilots]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [pilot,    setPilot]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [loadingPilot, setLoadingPilot] = useState(false);

  useEffect(() => {
    api.pilots()
      .then(data => {
        const list = data.pilotos || [];
        setPilots(list);
        setLoading(false);
        /* Pré-seleciona o primeiro piloto para a wallet nunca abrir vazia. */
        if (list.length) loadPilot(list[0].id);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  function loadPilot(id) {
    setSelected(id);
    setLoadingPilot(true);
    api.pilot(id)
      .then(setPilot)
      .catch(() => setError(true))
      .finally(() => setLoadingPilot(false));
  }

  function selectPilot(id) {
    if (selected === id) { setSelected(null); setPilot(null); return; }
    loadPilot(id);
  }

  if (loading) return <Spinner />;
  if (error)   return <ApiOfflineBanner />;

  const docs = pilot?.documentos?.map(d => ({
    hash:           d.hash,
    doc_type:       d.tipo,
    descricao:      d.descricao,
    validade:       d.validade,
    emitido:        d.emitido_em,
    emissor:        d.entidade_emissora,
    status:         d.status,
    dias_restantes: d.dias_restantes,
  })) || [];

  const validCount  = docs.filter(d => d.status === 'valid').length;
  const expCount    = docs.filter(d => d.status === 'expired').length;
  const soonCount   = docs.filter(d => d.status === 'expiring_soon').length;

  return (
    <div style={s.page}>

      {/* ── Header ── */}
      <div style={s.pageHeader}>
        <div style={s.pageIcon}>
          <ShieldIcon />
        </div>
        <div>
          <h1 style={s.pageTitle}>Wallet de Licenças</h1>
          <p style={s.pageSubtitle}>Documentação digital verificada por blockchain — seleciona um piloto para ver a sua wallet</p>
        </div>
      </div>

      <div style={s.layout} className="wallet-layout">

        {/* ── Pilot selector ── */}
        <div style={s.selectorPanel} className="wallet-selector">
          <div style={s.panelLabel}>Pilotos</div>
          <div style={s.pilotList}>
            {pilots.map(p => (
              <PilotChip
                key={p.id}
                pilot={p}
                selected={selected === p.id}
                onClick={() => selectPilot(p.id)}
              />
            ))}
          </div>

          {/* Gov.pt badge */}
          <div style={s.govBadge}>
            <ShieldIcon />
            <div>
              <div style={s.govBadgeTitle}>Verificado por Blockchain</div>
              <div style={s.govBadgeSub}>Ethereum · Modo simulação</div>
            </div>
          </div>
        </div>

        {/* ── Wallet view ── */}
        <div style={s.walletPanel}>
          {!selected && (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}><ShieldIcon /></div>
              <div style={s.emptyTitle}>Seleciona um piloto</div>
              <div style={s.emptySub}>A wallet de licenças digitais aparece aqui</div>
            </div>
          )}

          {selected && loadingPilot && <Spinner />}

          {selected && pilot && !loadingPilot && (
            <>
              {/* Pilot identity card */}
              <div style={s.identityCard}>
                <div style={s.identityLeft}>
                  <div style={s.identityAvatar}>
                    {pilot.nome.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <div style={s.identityName}>{pilot.nome}</div>
                    <div style={s.identityCargo}>{pilot.cargo} <span style={{ fontSize: 11, color: c.textMuted }}>{FICTIONAL_MARK}</span></div>
                    <div style={s.identityWallet}>{pilot.carteira_ethereum?.slice(0,18)}…</div>
                  </div>
                </div>
                <div style={s.identityStats}>
                  <div style={s.identityStat}>
                    <span style={{ ...s.identityStatNum, color: c.green }}>{validCount}</span>
                    <span style={s.identityStatLabel}>Válidos</span>
                  </div>
                  <div style={s.identityStat}>
                    <span style={{ ...s.identityStatNum, color: c.amber }}>{soonCount}</span>
                    <span style={s.identityStatLabel}>A expirar</span>
                  </div>
                  <div style={s.identityStat}>
                    <span style={{ ...s.identityStatNum, color: c.red }}>{expCount}</span>
                    <span style={s.identityStatLabel}>Expirados</span>
                  </div>
                </div>
              </div>

              {/* License cards */}
              <div style={s.panelLabel}>Licenças &amp; Certificados</div>
              <div style={s.cardsGrid} className="wallet-cards">
                {docs.map((doc, i) => <LicenseCard key={i} doc={doc} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { maxWidth: 1100 },

  pageHeader: {
    display: 'flex', alignItems: 'center', gap: 16,
    marginBottom: 28,
  },
  pageIcon: {
    width: 44, height: 44, borderRadius: 12,
    background: `linear-gradient(135deg, ${c.primary}, #0EA5E9)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', flexShrink: 0,
    boxShadow: '0 4px 16px rgba(29,78,216,0.35)',
  },
  pageTitle: { fontSize: 22, fontWeight: 700, color: c.text, margin: 0 },
  pageSubtitle: { fontSize: 13, color: c.textMuted, marginTop: 3 },

  layout: {
    display: 'flex', gap: 20, alignItems: 'flex-start',
  },

  selectorPanel: {
    width: 240, flexShrink: 0,
    background: c.bgCard,
    border: `1px solid ${c.border}`,
    borderRadius: 14,
    padding: 16,
    position: 'sticky', top: 0,
  },
  panelLabel: {
    fontSize: 10, fontWeight: 700, color: c.textDim,
    textTransform: 'uppercase', letterSpacing: '1px',
    marginBottom: 12,
  },
  pilotList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },

  pilotChip: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 10,
    cursor: 'pointer', width: '100%',
    transition: 'all .15s ease',
  },
  chipAvatar: {
    width: 34, height: 34, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, flexShrink: 0,
    transition: 'all .15s ease',
  },
  chipName: { fontSize: 12, fontWeight: 600, lineHeight: 1.3 },
  chipRole: { fontSize: 10, color: c.textMuted, marginTop: 1 },

  govBadge: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px',
    background: `${c.green}10`,
    border: `1px solid ${c.green}25`,
    borderRadius: 10,
    color: c.green,
  },
  govBadgeTitle: { fontSize: 11, fontWeight: 600, color: c.green },
  govBadgeSub:   { fontSize: 9,  color: c.textMuted, marginTop: 1 },

  walletPanel: { flex: 1, minWidth: 0 },

  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '80px 0',
    background: c.bgCard,
    border: `1px dashed ${c.border}`,
    borderRadius: 14,
    gap: 10,
  },
  emptyIcon:  { color: c.textDim, opacity: 0.5 },
  emptyTitle: { fontSize: 15, fontWeight: 600, color: c.textMuted },
  emptySub:   { fontSize: 12, color: c.textDim },

  identityCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
    background: `linear-gradient(135deg, ${c.bgCard}, ${c.bgElevated})`,
    border: `1px solid ${c.border}`,
    borderRadius: 14, padding: '18px 22px',
    marginBottom: 22,
    boxShadow: shadow.card,
  },
  identityLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  identityAvatar: {
    width: 52, height: 52, borderRadius: '50%',
    background: `linear-gradient(135deg, ${c.primary}, #0EA5E9)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
    boxShadow: '0 4px 14px rgba(29,78,216,0.4)',
  },
  identityName:   { fontSize: 16, fontWeight: 700, color: c.text },
  identityCargo:  { fontSize: 12, color: c.textMuted, marginTop: 2 },
  identityWallet: { fontSize: 10, color: c.textDim, marginTop: 4, fontFamily: 'monospace' },
  identityStats:  { display: 'flex', gap: 24 },
  identityStat:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  identityStatNum:   { fontSize: 22, fontWeight: 700 },
  identityStatLabel: { fontSize: 10, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' },

  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },

  licenseCard: {
    background: c.bgCard,
    border: `1px solid ${c.border}`,
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: shadow.card,
    transition: 'transform .15s ease, box-shadow .15s ease',
  },

  cardBand: {
    padding: '14px 16px',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
  },
  cardBandLeft: { flex: 1, minWidth: 0 },
  cardType: { fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.3 },
  cardIssuer: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  cardStatus: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
    flexShrink: 0, whiteSpace: 'nowrap',
  },

  cardBody: { padding: '12px 16px 14px' },
  cardDescription: {
    fontSize: 12, color: c.text, fontWeight: 500, marginBottom: 12, lineHeight: 1.4,
  },

  cardMeta: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px',
    background: c.bgElevated,
    borderRadius: 8, marginBottom: 10,
    flexWrap: 'wrap',
  },
  cardMetaItem: { display: 'flex', alignItems: 'center', gap: 5 },
  cardMetaLabel: { fontSize: 9, color: c.textDim, textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardMetaValue: { fontSize: 11, fontWeight: 600, color: c.textSub },
  cardMetaDivider: { width: 1, height: 16, background: c.border, flexShrink: 0 },

  cardHash: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 10px',
    background: `${c.green}08`,
    border: `1px solid ${c.green}20`,
    borderRadius: 6,
  },
  cardHashLabel: { fontSize: 9, color: c.textDim, textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardHashValue: { fontSize: 10, color: c.textMuted, fontFamily: 'monospace', flex: 1 },
  cardVerified: {
    display: 'flex', alignItems: 'center', gap: 3,
    fontSize: 9, fontWeight: 700,
    marginLeft: 'auto', flexShrink: 0,
  },
};
