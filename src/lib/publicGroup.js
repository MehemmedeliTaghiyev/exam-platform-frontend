export const PUBLIC_GROUP_CODE = String(import.meta.env.VITE_PUBLIC_GROUP_CODE || 'umumi').trim() || 'umumi';
export const PUBLIC_GROUP_NAME = 'Ümumi';

export function isPublicGroupCode(code) {
  const value = String(code || '').trim().toLowerCase();
  return value === PUBLIC_GROUP_CODE.toLowerCase() || value === 'umumi' || value === 'ümumi';
}

export function publicJoinPath() {
  return `/join/${encodeURIComponent(PUBLIC_GROUP_CODE)}?group=${encodeURIComponent(PUBLIC_GROUP_NAME)}`;
}
