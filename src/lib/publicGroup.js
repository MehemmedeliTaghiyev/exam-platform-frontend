const fromEnv = String(import.meta.env.VITE_PUBLIC_GROUP_CODE || '').trim();
const envIsPlaceholder = !fromEnv || fromEnv.toLowerCase() === 'umumi' || fromEnv.toLowerCase() === 'ümumi' || fromEnv.toLowerCase() === 'g11';

export const PUBLIC_GROUP_CODE = envIsPlaceholder ? 'hamı' : fromEnv;
export const PUBLIC_GROUP_NAME = 'hamı';

const PUBLIC_CODES = new Set(['g11', 'hamı', 'hami', 'umumi', 'ümumi', PUBLIC_GROUP_CODE.toLowerCase()]);
const PUBLIC_NAMES = new Set(['hamı', 'hami', 'ümumi', 'umumi']);

function foldLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ə/g, 'e')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's');
}

function isOpenGroupLabel(value) {
  const folded = foldLabel(value);
  if (!folded) return false;
  if (PUBLIC_CODES.has(String(value || '').trim().toLowerCase()) || PUBLIC_NAMES.has(String(value || '').trim().toLowerCase())) {
    return true;
  }
  if (folded === 'hami' || folded === 'hamisi' || folded === 'umumi' || folded === 'g11' || folded === 'public' || folded === 'general' || folded === 'open') return true;
  return /(^|[^a-z0-9])(umumi|hamisi?|public|general|open)([^a-z0-9]|$)/.test(folded);
}

export function isPublicGroupCode(code) {
  return isOpenGroupLabel(code);
}

export function isPublicGroupName(name) {
  return isOpenGroupLabel(name);
}

export function publicJoinPath() {
  return `/join/${encodeURIComponent(PUBLIC_GROUP_CODE)}?group=${encodeURIComponent(PUBLIC_GROUP_NAME)}&icaze=yox`;
}
