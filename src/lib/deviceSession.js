const KEY = 'exampulse_live_session';

export function claimDeviceSession(userId) {
  const id = `${userId}:${crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`}`;
  localStorage.setItem(KEY, id);
  sessionStorage.setItem(KEY, id);
  return id;
}

export function watchDeviceSession(onKicked) {
  const check = () => {
    const mine = sessionStorage.getItem(KEY);
    const live = localStorage.getItem(KEY);
    if (mine && live && mine !== live) onKicked();
  };
  window.addEventListener('storage', check);
  const timer = window.setInterval(check, 4000);
  return () => {
    window.removeEventListener('storage', check);
    window.clearInterval(timer);
  };
}
