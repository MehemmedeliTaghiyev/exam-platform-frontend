export const URGENT_EVENT = 'exampulse-urgent-broadcast';
const KEY = 'exampulse_urgent_broadcasts';
const PING = 'exampulse_urgent_ping';

function readList() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeList(rows) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 50)));
  localStorage.setItem(PING, String(Date.now()));
  window.dispatchEvent(new CustomEvent(URGENT_EVENT));
}

function seenKey(userId) {
  return `exampulse_urgent_seen_${userId || 'guest'}`;
}

function readSeen(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(seenKey(userId)) || '[]');
    return Array.isArray(raw) ? raw.map(String) : [];
  } catch {
    return [];
  }
}

export function urgentBroadcasts() {
  return readList();
}

export function mergeRemoteUrgent(rows = []) {
  const local = readList();
  const known = new Set(local.map((row) => String(row.id)));
  const extra = rows.filter((row) => row?.id && row?.text && !known.has(String(row.id)));
  if (!extra.length) return local;
  writeList([...extra, ...local]);
  return readList();
}

export function sendUrgentBroadcast(text, admin) {
  const body = String(text || '').trim().slice(0, 800);
  if (!body) return null;
  const row = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: body,
    at: new Date().toISOString(),
    fromName: admin?.fullName || 'Admin',
    fromId: admin?.id ?? null,
  };
  writeList([row, ...readList()]);
  return row;
}

export function latestUnseenUrgent(userId) {
  if (userId == null) return null;
  const seen = new Set(readSeen(userId));
  return readList().find((row) => !seen.has(String(row.id))) || null;
}

export function markUrgentSeen(userId, messageId) {
  if (userId == null || !messageId) return;
  const next = Array.from(new Set([...readSeen(userId), String(messageId)]));
  localStorage.setItem(seenKey(userId), JSON.stringify(next.slice(-80)));
  window.dispatchEvent(new CustomEvent(URGENT_EVENT));
}

export function subscribeUrgent(onChange) {
  const ping = () => onChange?.();
  window.addEventListener(URGENT_EVENT, ping);
  window.addEventListener('storage', ping);
  const timer = window.setInterval(ping, 2500);
  return () => {
    window.removeEventListener(URGENT_EVENT, ping);
    window.removeEventListener('storage', ping);
    window.clearInterval(timer);
  };
}
