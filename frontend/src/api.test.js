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

describe('demo date shift', () => {
  test('shiftDaysSince counts whole days and ignores bad input', () => {
    const { shiftDaysSince } = require('./api');
    expect(shiftDaysSince('2026-11-02', new Date(2026, 10, 12, 23, 30))).toBe(10);
    expect(shiftDaysSince('2026-11-12T08:00:00Z', new Date(2026, 10, 12))).toBe(0);
    expect(shiftDaysSince(undefined)).toBe(0);
    expect(shiftDaysSince('ontem')).toBe(0);
  });

  test('shiftFixtureDates moves ISO dates and months, leaves other values alone', () => {
    const { shiftFixtureDates } = require('./api');
    const out = shiftFixtureDates({
      validade: '2026-03-15', dias_restantes: -242, recorded: '2026-01-31T10:00:00Z',
      month: '2026-11', conteudo: 'Valid until 2026-03-15', exported_at: '2026-01-01',
      docs: [{ emitido_em: '2025-12-31' }],
    }, 10, 0);
    expect(out).toEqual({
      validade: '2026-03-25', dias_restantes: -242, recorded: '2026-02-10T10:00:00Z',
      month: '2026-11', conteudo: 'Valid until 2026-03-15', exported_at: '2026-01-01',
      docs: [{ emitido_em: '2026-01-10' }],
    });
    expect(shiftFixtureDates({ month: '2026-11' }, 61, 2).month).toBe('2027-01');
    expect(shiftFixtureDates({ month: '2026-11' }, 1, 1).month).toBe('2026-12');
  });

  test('month buckets shift by calendar months, not days / 30.44', () => {
    const { shiftMonthsSince, shiftDaysSince } = require('./api');
    // 16 days later, same month: no month shift (round(16/30.44) would give 1).
    expect(shiftMonthsSince('2026-11-12', new Date(2026, 10, 28))).toBe(0);
    // 3 days later, next month: one month shift (round(3/30.44) would give 0).
    expect(shiftDaysSince('2026-11-28', new Date(2026, 11, 1))).toBe(3);
    expect(shiftMonthsSince('2026-11-28', new Date(2026, 11, 1))).toBe(1);
    expect(shiftMonthsSince('2025-12-31', new Date(2026, 0, 1))).toBe(1);
    expect(shiftMonthsSince(undefined)).toBe(0);
  });

  function demoModule() {
    let mod;
    process.env.REACT_APP_DEMO = 'true';
    jest.isolateModules(() => { mod = require('./api'); });
    delete process.env.REACT_APP_DEMO;
    return mod;
  }

  function fixtures(status) {
    return jest.fn(async (url) => ({
      ok: true,
      json: async () => url.endsWith('/status.json') ? status : {
        id: 'P001', documentos: [{ validade: '2026-03-15', emitido_em: '2023-03-15', dias_restantes: -242 }],
      },
    }));
  }

  test('fixture dates are shifted by today - exported_at and status.json is read once', async () => {
    const exported = new Date();
    exported.setDate(exported.getDate() - 30);
    const iso = `${exported.getFullYear()}-${String(exported.getMonth() + 1).padStart(2, '0')}-${String(exported.getDate()).padStart(2, '0')}`;
    global.fetch = fixtures({ status: 'demo', exported_at: iso });
    const { api: demoApi } = demoModule();
    const p = await demoApi.pilot('P001');
    expect(p.documentos[0].validade).toBe('2026-04-14');
    expect(p.documentos[0].emitido_em).toBe('2023-04-14');
    expect(p.documentos[0].dias_restantes).toBe(-242);
    await demoApi.pilot('P001');
    const statusCalls = fetch.mock.calls.filter(([u]) => u.endsWith('/status.json'));
    expect(statusCalls).toHaveLength(1);
  });

  test('a rejected status.json fetch is not cached, so the next read retries', async () => {
    const ok = fixtures({ status: 'demo' });
    let first = true;
    global.fetch = jest.fn(async (url) => {
      if (url.endsWith('/status.json') && first) { first = false; throw new Error('offline'); }
      return ok(url);
    });
    const { api: demoApi } = demoModule();
    await expect(demoApi.status()).rejects.toThrow('offline');
    await expect(demoApi.status()).resolves.toEqual({ status: 'demo' });
    const statusCalls = fetch.mock.calls.filter(([u]) => u.endsWith('/status.json'));
    expect(statusCalls).toHaveLength(2);
  });

  test('no exported_at means no shift', async () => {
    global.fetch = fixtures({ status: 'demo' });
    const { api: demoApi } = demoModule();
    const p = await demoApi.pilot('P001');
    expect(p.documentos[0].validade).toBe('2026-03-15');
  });
});
