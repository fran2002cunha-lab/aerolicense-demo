import { c } from '../theme';
import { IS_DEMO } from '../api';

export default function ApiOfflineBanner() {
  return (
    <div style={{ background: `${c.red}11`, border: `1px solid ${c.red}44`,
      borderRadius: 10, padding: '14px 18px', color: c.red, fontSize: 13,
      margin: '16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>
        {IS_DEMO
          ? 'Dados de demonstração indisponíveis — tenta recarregar a página.'
          : 'Servidor indisponível — a tentar reconectar automaticamente…'}
      </span>
    </div>
  );
}
