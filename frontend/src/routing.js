/*
 * A app usa HashRouter (alojamento estático), por isso /analytics sem hash
 * abria sempre o dashboard. Ao carregar, um caminho "normal" sem hash passa a
 * /#<caminho>, para que os links do README (/analytics, /blockchain…) funcionem.
 */
const IGNORED = new Set(['/', '/index.html']);

export function pathToHashUrl({ pathname = '/', search = '', hash = '' } = {}) {
  if (hash && hash !== '#') return null;
  const path = pathname.replace(/\/+$/, '') || '/';
  if (IGNORED.has(path)) return null;
  return `/#${path}${search}`;
}

export function redirectPathToHash(win = window) {
  const target = pathToHashUrl(win.location);
  if (target) win.history.replaceState(null, '', target);
  return target;
}
