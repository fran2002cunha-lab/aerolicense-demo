import { IS_DEMO } from '../api';

export const GITHUB_URL = 'https://github.com/fran2002cunha-lab/aerolicense-demo';

/* Faixa discreta e persistente, visível em todas as páginas no modo demo. */
export default function DemoBanner() {
  if (!IS_DEMO) return null;
  return (
    <div role="note" style={s.bar}>
      Demo estática — dados fictícios; as respostas do assistente foram gravadas do modelo real.
      {' '}Código completo no{' '}
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={s.link}>GitHub</a>.
    </div>
  );
}

const s = {
  bar: {
    background: '#0A1A2E', borderBottom: '1px solid #1E3A5F',
    color: '#8FA9C6', fontSize: 11.5, lineHeight: 1.4,
    padding: '6px 16px', textAlign: 'center',
  },
  link: { color: '#60A5FA', fontWeight: 600, textDecoration: 'underline' },
};
