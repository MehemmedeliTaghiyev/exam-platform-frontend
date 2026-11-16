import { studentWallet } from './studentWallet';

/** Kept for older UI strings; weekly exams are free for students. */
export const WEEKLY_PASS_PRICE = 0;
export const WEEKLY_PASS_DAYS = 7;
export const WEEKLY_PASS_EVENT = 'exampulse-weekly-pass';

function keyOf(userId) {
  return `exampulse_weekly_pass_${userId || 'me'}`;
}

function readUntil(userId) {
  try {
    const raw = localStorage.getItem(keyOf(userId));
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeUntil(userId, until) {
  localStorage.setItem(keyOf(userId), String(until));
  window.dispatchEvent(new CustomEvent(WEEKLY_PASS_EVENT));
}

export function weeklyPassUntil(user) {
  if (!user?.id) return 0;
  return readUntil(user.id);
}

/** Weekly asan/orta papers are open for every logged-in student (no 1 ₼ gate). */
export function weeklyPassActive(user) {
  return Boolean(user?.id);
}

export function weeklyPassRemainingMs(user) {
  if (!user?.id) return 0;
  return Number.POSITIVE_INFINITY;
}

export function buyWeeklyPass(user) {
  if (!user?.id) {
    const err = new Error('LOGIN');
    err.code = 'LOGIN';
    throw err;
  }
  // No charge — keep a long-lived local stamp for older screens.
  const until = Date.now() + WEEKLY_PASS_DAYS * 24 * 60 * 60 * 1000;
  writeUntil(user.id, until);
  return { until, wallet: studentWallet(user), already: true, free: true };
}
