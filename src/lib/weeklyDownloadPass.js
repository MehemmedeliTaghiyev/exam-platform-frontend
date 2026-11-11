import { spendWallet, studentWallet } from './studentWallet';

export const WEEKLY_PASS_PRICE = 1;
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

export function weeklyPassActive(user) {
  if (!user?.id) return false;
  if (user.practice) return true;
  return Date.now() < weeklyPassUntil(user);
}

export function weeklyPassRemainingMs(user) {
  return Math.max(0, weeklyPassUntil(user) - Date.now());
}

export function buyWeeklyPass(user) {
  if (!user?.id) {
    const err = new Error('LOGIN');
    err.code = 'LOGIN';
    throw err;
  }
  if (weeklyPassActive(user) && !user.practice) {
    return { until: weeklyPassUntil(user), wallet: studentWallet(user), already: true };
  }
  const wallet = spendWallet(user, WEEKLY_PASS_PRICE, 'Həftəlik sınaqlar — 7 gün', 'weekly-pass');
  const until = Date.now() + WEEKLY_PASS_DAYS * 24 * 60 * 60 * 1000;
  writeUntil(user.id, until);
  return { until, wallet, already: false };
}
