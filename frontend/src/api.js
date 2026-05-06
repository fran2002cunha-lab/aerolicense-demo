const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

async function request(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Timeout: o servidor não respondeu em 10s');
    throw err;
  } finally {
    clearTimeout(timer);
  }
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
      const res = await fetch(`${BASE}/chat`, {
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
