const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

async function request(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  status:          () => request('/'),
  pilots:          () => request('/demo/pilotos'),
  pilot:           (id) => request(`/demo/pilotos/${id}`),
  alerts:          () => request('/demo/alertas'),
  blockchainDemo:  () => request('/demo/blockchain'),
  verifyDocument:  (hash) => request(`/documents/verify/${hash}`),
};
