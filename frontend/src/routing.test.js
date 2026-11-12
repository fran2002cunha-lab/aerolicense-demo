import { pathToHashUrl, redirectPathToHash } from './routing';

test('plain paths become hash routes', () => {
  expect(pathToHashUrl({ pathname: '/analytics' })).toBe('/#/analytics');
  expect(pathToHashUrl({ pathname: '/pilots/P003/', search: '?x=1' })).toBe('/#/pilots/P003?x=1');
});

test('root, index.html and URLs that already have a hash are left alone', () => {
  expect(pathToHashUrl({ pathname: '/' })).toBeNull();
  expect(pathToHashUrl({ pathname: '/index.html' })).toBeNull();
  expect(pathToHashUrl({ pathname: '/analytics', hash: '#/alerts' })).toBeNull();
});

test('redirectPathToHash rewrites the URL without reloading', () => {
  const replaceState = jest.fn();
  const win = { location: { pathname: '/blockchain', search: '', hash: '' }, history: { replaceState } };
  expect(redirectPathToHash(win)).toBe('/#/blockchain');
  expect(replaceState).toHaveBeenCalledWith(null, '', '/#/blockchain');
});
