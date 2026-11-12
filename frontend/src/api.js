/*
 * Camada de acesso a dados.
 *
 * - Modo demo (REACT_APP_DEMO=true, usado no build de produção): sem backend.
 *   Todas as leituras vêm de ficheiros estáticos em /fixtures/*.json servidos
 *   pela própria origem. Nenhum ficheiro do utilizador é enviado para lado nenhum.
 * - Caso contrário (desenvolvimento local): backend FastAPI em REACT_APP_API_URL
 *   ou http://localhost:8000.
 */
export const IS_DEMO = process.env.REACT_APP_DEMO === 'true';
const DEV_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function backendUrl(path) {
  return `${DEV_BASE}${path}`;
}

/* ── Mapeamento endpoint → fixture estática (modo demo) ── */
const PILOT_ID_RE = /^P\d{3}$/;
const STATIC_FIXTURES = {
  '/':                       'status',
  '/demo/pilotos':           'pilots',
  '/demo/alertas':           'alerts',
  '/demo/blockchain':        'blockchain',
  '/analytics/summary':      'analytics_summary',
  '/analytics/monthly':      'analytics_monthly',
  '/analytics/distribution': 'analytics_distribution',
  '/analytics/anomalies':    'analytics_anomalies',
  '/analytics/risk-scores':  'risk_scores',
};

export function fixtureName(path) {
  if (STATIC_FIXTURES[path]) return STATIC_FIXTURES[path];
  const m = path.match(/^\/demo\/pilotos\/([^/]+)$/);
  if (m && PILOT_ID_RE.test(m[1])) return `pilot_${m[1]}`;
  return null;
}

async function fetchFixture(name) {
  const res = await fetch(`/fixtures/${name}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ── Cache simples em sessionStorage ── */
function cacheSet(path, data) {
  try { sessionStorage.setItem(`aero:${path}`, JSON.stringify(data)); } catch {}
}
function cacheGet(path) {
  try {
    const raw = sessionStorage.getItem(`aero:${path}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/* ── Listeners de status de API ── */
let _listeners = [];
export function onApiStatusChange(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(f => f !== fn); };
}
function notifyStatus(online) {
  _listeners.forEach(fn => fn(online));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── request com retry (3 tentativas, backoff exponencial) ── */
async function request(path) {
  if (IS_DEMO) {
    const name = fixtureName(path);
    if (!name) throw new Error('Dados de demonstração indisponíveis');
    return fetchFixture(name);
  }

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(backendUrl(path), { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cacheSet(path, data);
      notifyStatus(true);
      return data;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err.name === 'AbortError' ? new Error('Timeout: sem resposta do servidor') : err;
      if (attempt < 2) await sleep(Math.pow(2, attempt) * 800);
    }
  }
  /* Todas as tentativas falharam — retornar cache se existir */
  const cached = cacheGet(path);
  notifyStatus(false);
  if (cached) return cached;
  throw lastErr;
}

/* ── SHA-256 no browser (o ficheiro nunca sai do dispositivo) ── */
export async function sha256File(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const hex = Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return `0x${hex}`;
}

function normHash(h) {
  return String(h || '').toLowerCase().replace(/^0x/, '');
}

/* Procura um hash nos documentos das fixtures de pilotos (modo demo). */
async function demoVerify(hash) {
  const target = normHash(hash);
  const { pilotos = [] } = await request('/demo/pilotos');
  const ids = pilotos.map(p => p.id).filter(id => PILOT_ID_RE.test(id));
  const details = await Promise.all(ids.map(id => request(`/demo/pilotos/${id}`).catch(() => null)));
  for (const pilot of details) {
    if (!pilot) continue;
    const doc = (pilot.documentos || []).find(d => normHash(d.hash) === target);
    if (doc) {
      const expired = doc.status === 'expired';
      return {
        hash,
        is_authentic: true,
        is_expired:   expired,
        expires_at:   doc.validade || null,
        message: expired
          ? 'Hash encontrado nos registos de demonstração — documento EXPIRADO.'
          : 'Hash encontrado nos registos de demonstração — documento válido.',
        demo:       true,
        pilot_id:   pilot.id,
        pilot_nome: pilot.nome,
        doc_tipo:   doc.tipo,
        doc_descricao: doc.descricao,
      };
    }
  }
  return {
    hash,
    is_authentic: false,
    is_expired:   false,
    expires_at:   null,
    message: 'Hash não encontrado nos registos de demonstração.',
    demo: true,
  };
}

export const api = {
  status:                () => request('/'),
  pilots:                () => request('/demo/pilotos'),
  pilot:                 (id) => request(`/demo/pilotos/${id}`),
  alerts:                () => request('/demo/alertas'),
  blockchainDemo:        () => request('/demo/blockchain'),
  verifyDocument:        (hash) => IS_DEMO
    ? demoVerify(hash)
    : request(`/documents/verify/${encodeURIComponent(hash)}`),
  analyticsSummary:      () => request('/analytics/summary'),
  analyticsMonthly:      () => request('/analytics/monthly'),
  analyticsDistribution: () => request('/analytics/distribution'),
  analyticsAnomalies:    () => request('/analytics/anomalies'),
  riskScores:            () => request('/analytics/risk-scores'),
  /* Respostas gravadas do modelo real (só modo demo). */
  chatRecordings:        () => fetchFixture('chat_recordings'),
  chat: async (message, history = []) => {
    if (IS_DEMO) throw new Error('Chat em texto livre indisponível no modo demo');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(backendUrl('/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Timeout: o servidor não respondeu em 10s');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  },
};
