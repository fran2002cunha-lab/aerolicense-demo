import { c, shadow } from '../theme';

const REFS = [
  {
    num: 1,
    text: 'Yu, D., & Dattel, A. R. (2025). The Impact of Electronic Flight Bags on General Aviation Pilots\' Situation Awareness.',
    doi: '10.1177/10711813251370740',
  },
  {
    num: 2,
    text: 'Simoncini, A. (2020). Aircraft Pilots Workload Analysis. Aerospace, 7(9), 137.',
    doi: '10.3390/aerospace7090137',
  },
  {
    num: 3,
    text: 'Babb, T. A. (2017). Professional Pilot COTS EFB Usage. International Journal of Aviation, Aeronautics, and Aerospace, 4(1).',
    doi: '10.15394/ijaaa.2017.1159',
  },
  {
    num: 4,
    text: 'Bhardwaj, P., & Purdy, C. (2019). Safety and Human Factors for EFB Usage. IEEE NAECON.',
    doi: '10.1109/NAECON46414.2019.9057898',
  },
  {
    num: 5,
    text: 'Burns, K. J., et al. (2019). Quantifying the Safety Benefits of a Digital Copilot. Journal of Aerospace Information Systems, 16(8).',
    doi: '10.2514/1.I010704',
  },
  {
    num: 6,
    text: 'Liu, C., et al. (2023). Detection of Pilot\'s Mental Workload Using a Wireless EEG Headset. Entropy, 25(7), 1035.',
    doi: '10.3390/e25071035',
  },
];

const MEMBERS = [
  { nome: 'Francisco Cunha',   papel: 'Arquitectura de Sistema & Full-Stack' },
  { nome: 'Manuel Dourado',    papel: 'Backend & Blockchain' },
  { nome: 'Frederico Murta',   papel: 'Machine Learning & Analytics' },
  { nome: 'João Leão',         papel: 'Frontend & UX' },
];

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 720 }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: c.text, margin: '0 0 4px', letterSpacing: '-0.4px' }}>
          Sobre o Projeto
        </h1>
        <p style={{ fontSize: 13, color: c.textMuted, margin: 0 }}>
          Contexto académico e referências bibliográficas
        </p>
      </div>

      {/* Project card */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={s.cardTitle}>AeroLicense</div>
        <div style={s.row}>
          <span style={s.label}>Instituição</span>
          <span style={s.value}>ISEC Lisboa · Escola de Gestão, Engenharia e Aeronáutica</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Cadeira</span>
          <span style={s.value}>Inovação e Sustentabilidade na Indústria Aeronáutica</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Ano letivo</span>
          <span style={s.value}>2025/2026</span>
        </div>
        <div style={{ ...s.row, borderBottom: 'none', paddingBottom: 0 }}>
          <span style={s.label}>Grupo</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MEMBERS.map(m => (
              <div key={m.nome} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{m.nome}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: c.primaryLt,
                  background: `${c.primary}18`, border: `1px solid ${c.primary}30`,
                  borderRadius: 20, padding: '2px 9px',
                }}>{m.papel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stack card */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={s.cardTitle}>Stack Técnica</div>
        {[
          ['Frontend', 'React 18 · inline styles · Recharts'],
          ['Backend', 'FastAPI · SQLAlchemy · PostgreSQL'],
          ['Blockchain', 'Solidity · AeroLicenseRegistry.sol · Web3.py · Hardhat'],
          ['Machine Learning', 'scikit-learn · IsolationForest · 4 features'],
          ['Deploy', 'Vercel (frontend) · Railway (backend)'],
        ].map(([k, v]) => (
          <div key={k} style={s.row}>
            <span style={s.label}>{k}</span>
            <span style={s.value}>{v}</span>
          </div>
        ))}
      </div>

      {/* References */}
      <div style={s.card}>
        <div style={s.cardTitle}>Referências Académicas</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {REFS.map(r => (
            <div key={r.num} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={s.refNum}>[{r.num}]</span>
              <span style={s.refText}>
                {r.text}{' '}
                <a
                  href={`https://doi.org/${r.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={s.refLink}
                >
                  DOI: {r.doi}
                </a>
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

const s = {
  card: {
    background: c.bgCard, border: `1px solid ${c.border}`,
    borderRadius: 12, padding: '20px 24px', boxShadow: shadow.card,
  },
  cardTitle: {
    fontSize: 12, fontWeight: 700, color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.7px',
    marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${c.border}`,
  },
  row: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    paddingBottom: 10, marginBottom: 10,
    borderBottom: `1px solid ${c.bgElevated}`,
  },
  label: {
    fontSize: 11, fontWeight: 600, color: c.textMuted,
    width: 110, flexShrink: 0, paddingTop: 1,
  },
  value: { fontSize: 13, color: c.text, lineHeight: 1.45 },
  refNum: {
    fontSize: 11, fontWeight: 700, color: c.textDim,
    flexShrink: 0, width: 24, paddingTop: 2,
  },
  refText: { fontSize: 12, color: c.textMuted, lineHeight: 1.6 },
  refLink: { color: c.primaryLt, textDecoration: 'none', fontWeight: 500 },
};
