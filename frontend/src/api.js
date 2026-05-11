const isDev = process.env.NODE_ENV === 'development';
const DEV_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function proxyUrl(path) {
  if (isDev) return `${DEV_BASE}${path}`;
  return `/api/proxy?p=${encodeURIComponent(path)}`;
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
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(proxyUrl(path), { signal: controller.signal });
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

export const api = {
  status:                () => request('/'),
  pilots:                () => request('/demo/pilotos'),
  pilot:                 (id) => request(`/demo/pilotos/${id}`),
  alerts:                () => request('/demo/alertas'),
  blockchainDemo:        () => request('/demo/blockchain'),
  verifyDocument:        (hash) => request(`/documents/verify/${hash}`),
  analyticsSummary:      () => request('/analytics/summary'),
  analyticsMonthly:      () => request('/analytics/monthly'),
  analyticsDistribution: () => request('/analytics/distribution'),
  analyticsAnomalies:    () => request('/analytics/anomalies'),
  riskScores:            () => request('/analytics/risk-scores'),
  chat: async (message, history = []) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(proxyUrl('/chat'), {
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
