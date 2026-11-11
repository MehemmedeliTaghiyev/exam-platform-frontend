import { Capacitor } from '@capacitor/core';

// Frontend apex → Vercel. API: api.exampulse.az DNS → SmarterASP, amma host binding/SSL hazır olmayana qədər jtempurl.
export const LIVE_API = 'https://mahammadali-001-site1.jtempurl.com/api';
export const LIVE_WEB = 'https://exampulse.az';
// Hazır olanda: VITE_API_URL=https://api.exampulse.az/api

export function isNativeApp() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function nativePlatform() {
  try {
    return String(Capacitor.getPlatform() || 'web').toLowerCase();
  } catch {
    return 'web';
  }
}

export function publicWebOrigin() {
  if (isNativeApp()) return LIVE_WEB.replace(/\/$/, '');
  return String(window.location.origin || '').replace(/\/$/, '');
}

export function applyNativeChrome() {
  const platform = nativePlatform();
  document.documentElement.dataset.platform = platform;
  document.documentElement.classList.add(`plat-${platform}`);
  try {
    const params = new URLSearchParams(window.location.search || '');
    if (params.has('plat-ios') || params.get('plat') === 'ios') {
      document.documentElement.dataset.platform = 'ios';
      document.documentElement.classList.add('plat-ios');
    }
  } catch {
    /* ignore */
  }
}

export function apiBase() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (isNativeApp()) return LIVE_API;
  if (import.meta.env.DEV) return '/api';
  return LIVE_API;
}

export function drivePdfSrc(fileId) {
  const path = `/drive-pdf?id=${encodeURIComponent(fileId)}`;
  return isNativeApp() ? `${LIVE_WEB}${path}` : path;
}
