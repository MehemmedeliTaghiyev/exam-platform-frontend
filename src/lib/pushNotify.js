import { isNativeApp } from './runtime';
import { VAPID_PUBLIC_KEY } from './pushKeys';

export const URGENT_HUB = '/urgent';

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerUrgentWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

export function notificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function enableUrgentPush(userId) {
  if (typeof Notification === 'undefined') return { ok: false, reason: 'unsupported' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: permission };

  await registerUrgentWorker();
  try {
    const ready = await navigator.serviceWorker.ready.catch(() => null);
    if (ready?.pushManager) {
      let sub = await ready.pushManager.getSubscription();
      if (!sub) {
        sub = await ready.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      await fetch(URGENT_HUB, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe', userId, subscription: sub.toJSON() }),
      }).catch(() => {});
    }
  } catch {
    /* Web Push bu brauzerdə olmaya bilər */
  }

  if (isNativeApp()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.requestPermissions();
    } catch {
      /* web only */
    }
  }
  return { ok: true };
}

export async function showLocalUrgent(title, body) {
  try {
    if (isNativeApp()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now() % 100000,
          title: title || 'Təcili mesaj',
          body: body || '',
        }],
      });
      return;
    }
  } catch {
    /* fall through */
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      const ready = await navigator.serviceWorker.ready.catch(() => null);
      if (ready?.showNotification) {
        await ready.showNotification(title || 'Təcili mesaj', { body, icon: '/app-icon-1024.png' });
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      new Notification(title || 'Təcili mesaj', { body, icon: '/app-icon-1024.png' });
    } catch {
      /* ignore */
    }
  }
}

export async function fetchUrgentHub() {
  const res = await fetch(URGENT_HUB, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('hub');
  return res.json();
}

export async function publishUrgentHub(text, admin) {
  const res = await fetch(URGENT_HUB, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'send',
      text,
      fromName: admin?.fullName || 'Admin',
      fromId: admin?.id ?? null,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Göndərilmədi');
  return data;
}
