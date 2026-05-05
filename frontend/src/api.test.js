import { api } from './api';

global.fetch = jest.fn();

beforeEach(() => fetch.mockClear());

test('api.pilots calls correct URL', async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ pilotos: [] }) });
  await api.pilots();
  expect(fetch).toHaveBeenCalledWith('http://localhost:8000/demo/pilotos');
});

test('api throws on non-ok response', async () => {
  fetch.mockResolvedValueOnce({ ok: false, status: 500 });
  await expect(api.pilots()).rejects.toThrow('HTTP 500');
});
