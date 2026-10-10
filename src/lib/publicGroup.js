const fromEnv = String(import.meta.env.VITE_PUBLIC_GROUP_CODE || '').trim();
const envIsPlaceholder = !fromEnv || fromEnv.toLowerCase() === 'umumi' || fromEnv.toLowerCase() === 'ümumi';

export const PUBLIC_GROUP_CODE = envIsPlaceholder ? 'g11' : fromEnv;
export const PUBLIC_GROUP_NAME = 'hamı';

const PUBLIC_CODES = new Set(['g11', 'umumi', 'ümumi', PUBLIC_GROUP_CODE.toLowerCase()]);
const PUBLIC_NAMES = new Set(['hamı', 'ümumi', 'umumi']);

export function isPublicGroupCode(code) {
  return PUBLIC_CODES.has(String(code || '').trim().toLowerCase());
}

export function isPublicGroupName(name) {
  return PUBLIC_NAMES.has(String(name || '').trim().toLowerCase());
}

export function publicJoinPath() {
  return `/join/${encodeURIComponent(PUBLIC_GROUP_CODE)}?group=${encodeURIComponent(PUBLIC_GROUP_NAME)}`;
}
