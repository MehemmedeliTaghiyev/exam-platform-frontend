import { LIVE_WEB } from './runtime';

const APP_PATHS = [
  '/join/',
  '/student',
  '/student/account',
  '/teacher',
  '/admin',
  '/login',
  '/forgot-password',
  '/register',
  '/privacy',
  '/terms',
  '/support',
  '/delete-account',
  '/teachers',
  '/exams',
  '/reklam',
];

export function pathFromAppUrl(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    if (url.hash && url.hash.startsWith('#/')) {
      return `${url.hash.slice(1)}${url.search || ''}`;
    }
    const path = `${url.pathname || '/'}${url.search || ''}`;
    if (path === '/' || path === '') return '';
    if (APP_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || (prefix.endsWith('/') && path.startsWith(prefix)))) {
      return path;
    }
    if (url.hostname.includes('exampulse') || text.startsWith(LIVE_WEB)) return path;
    return path.startsWith('/') ? path : '';
  } catch {
    if (text.startsWith('/')) return text;
    return '';
  }
}

export function openAppPath(path) {
  const clean = String(path || '').trim();
  if (!clean) return;
  const hash = clean.startsWith('#') ? clean : `#${clean.startsWith('/') ? clean : `/${clean}`}`;
  if (window.location.hash === hash) return;
  window.location.hash = hash;
}

export async function bindNativeDeepLinks() {
  const { App } = await import('@capacitor/app');
  const launch = await App.getLaunchUrl().catch(() => null);
  if (launch?.url) openAppPath(pathFromAppUrl(launch.url));
  App.addListener('appUrlOpen', (event) => {
    openAppPath(pathFromAppUrl(event?.url));
  });
}
