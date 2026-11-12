import { api, fixtureName } from './api';

global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockReset();
  sessionStorage.clear();
});

test('api.pilots calls correct URL', async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ pilotos: [] }) });
  await api.pilots();
  expect(fetch).toHaveBeenCalledWith('http://localhost:8000/demo/pilotos', expect.anything());
});

test('api throws on non-ok response', async () => {
  fetch.mockResolvedValue({ ok: false, status: 500 });
  await expect(api.pilots()).rejects.toThrow('HTTP 500');
}, 10000);

test('fixtureName maps endpoints to static fixtures and rejects unknown paths', () => {
  expect(fixtureName('/')).toBe('status');
  expect(fixtureName('/demo/pilotos')).toBe('pilots');
  expect(fixtureName('/demo/pilotos/P003')).toBe('pilot_P003');
  expect(fixtureName('/analytics/risk-scores')).toBe('risk_scores');
  expect(fixtureName('/demo/pilotos/../../etc')).toBeNull();
  expect(fixtureName('/chat')).toBeNull();
});

describe('demo mode', () => {
  let demoApi;
  beforeAll(() => {
    process.env.REACT_APP_DEMO = 'true';
    jest.isolateModules(() => { demoApi = require('./api'); });
  });
  afterAll(() => { delete process.env.REACT_APP_DEMO; });

  test('reads come from same-origin fixtures', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ pilotos: [] }) });
    await demoApi.api.pilots();
    expect(fetch).toHaveBeenCalledWith('/fixtures/pilots.json');
  });

  test('verifyDocument looks the hash up in pilot fixtures', async () => {
    fetch.mockImplementation(async (url) => ({
      ok: true,
      json: async () => url.endsWith('/pilots.json')
        ? { pilotos: [{ id: 'P001' }] }
        : { id: 'P001', nome: 'Teste', documentos: [{ hash: '0xABC', status: 'valid', validade: '2030-01-01', descricao: 'ATPL' }] },
    }));
    const hit = await demoApi.api.verifyDocument('0xabc');
    expect(hit.is_authentic).toBe(true);
    expect(hit.pilot_id).toBe('P001');
    const miss = await demoApi.api.verifyDocument('0xdef');
    expect(miss.is_authentic).toBe(false);
  });
});
