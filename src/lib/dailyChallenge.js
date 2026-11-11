import API from '../api/axios';
import { isPractice } from './practice';

export const DAILY_EVENT = 'exampulse-daily';
const STORE = 'exampulse_daily_attempts';

const BANK = [
  {
    subject: 'Riyaziyyat',
    text: 'Əgər $3x + 7 = 22$ olarsa, $2x - 1$ neçəyə bərabərdir?',
    options: ['$7$', '$9$', '$11$', '$5$'],
    correct: 1,
  },
  {
    subject: 'Riyaziyyat',
    text: '$f(x) = x^2 - 4x + 5$ funksiyasının minimum qiyməti neçədir?',
    options: ['$1$', '$5$', '$9$', '$0$'],
    correct: 0,
  },
  {
    subject: 'Riyaziyyat',
    text: 'Düzbucaqlının tərəfləri $8$ və $6$-dır. Diaqonalı neçədir?',
    options: ['$10$', '$12$', '$14$', '$7$'],
    correct: 0,
  },
  {
    subject: 'Məntiq',
    text: 'Ardıcıllığın növbəti həddi: $2,\\ 6,\\ 12,\\ 20,\\ 30,\\ \\ldots$',
    options: ['$40$', '$42$', '$44$', '$36$'],
    correct: 1,
  },
  {
    subject: 'Riyaziyyat',
    text: '$\\sin 30^\\circ + \\cos 60^\\circ$ cəmi neçədir?',
    options: ['$0$', '$1$', '$\\sqrt{2}$', '$1/2$'],
    correct: 1,
  },
  {
    subject: 'Riyaziyyat',
    text: '$\\dfrac{1}{2} + \\dfrac{1}{3}$ cəmi hansıdır?',
    options: ['$\\dfrac{1}{5}$', '$\\dfrac{2}{5}$', '$\\dfrac{5}{6}$', '$\\dfrac{2}{6}$'],
    correct: 2,
  },
  {
    subject: 'Riyaziyyat',
    text: 'Tənliyin kökü: $2(x-3)=10$',
    options: ['$5$', '$8$', '$2$', '$13$'],
    correct: 1,
  },
];

const GHOSTS = [
  { id: 'ghost-1', name: 'Leyla M.', times: [7, 9, 11, 8] },
  { id: 'ghost-2', name: 'Murad A.', times: [9, 12, 10, 14] },
  { id: 'ghost-3', name: 'Aysel H.', times: [11, 13, 15, 10] },
  { id: 'ghost-4', name: 'Kamran R.', times: [14, 16, 12, 18] },
];

function pad(n) {
  return String(n).padStart(2, '0');
}

export function dailyKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dailyLabel(date = new Date()) {
  return `${date.getDate()} ${date.toLocaleDateString('az-Latn-AZ', { month: 'long' })}`;
}

function hashDay(key) {
  let n = 0;
  for (let i = 0; i < key.length; i += 1) n = (n * 33 + key.charCodeAt(i)) >>> 0;
  return n;
}

export function todaysQuestion(date = new Date()) {
  const day = dailyKey(date);
  const item = BANK[hashDay(day) % BANK.length];
  return { ...item, id: `daily-${day}`, day };
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORE);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(STORE, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(DAILY_EVENT));
}

export function dailyMine(userId, day = dailyKey()) {
  if (!userId) return null;
  return readAll().find((row) => row.day === day && String(row.userId) === String(userId)) || null;
}

function normalizeServerRow(row, user) {
  const userId = row?.userId ?? row?.UserId;
  const you = user?.id != null && String(userId) === String(user.id);
  return {
    id: row?.id || `${userId}-${row?.day || row?.Day}`,
    userId,
    name: you ? 'Sən' : (row?.name || row?.Name || 'Şagird'),
    day: row?.day || row?.Day,
    optionIndex: Number(row?.optionIndex ?? row?.OptionIndex ?? 0),
    correct: Boolean(row?.correct ?? row?.Correct),
    durationSeconds: Number(row?.durationSeconds ?? row?.DurationSeconds ?? 0),
    at: row?.at || row?.SubmittedAt || new Date().toISOString(),
    you,
  };
}

/** Pull shared board from SmarterASP so all accounts see the same ranking. */
export async function syncDailyBoard(user, day = dailyKey()) {
  if (!user?.id || isPractice() || !localStorage.getItem('token')) {
    return dailyRanking(user, day);
  }
  try {
    const res = await API.get('/daily-challenge', { params: { day }, timeout: 12000 });
    const board = (res.data?.board || res.data?.Board || []).map((row) => normalizeServerRow(row, user));
    const kept = readAll().filter((row) => row.day !== day);
    writeAll([...kept, ...board.map((row) => ({ ...row, you: undefined }))]);
    return board.length ? board.map((row, index) => ({ ...row, rank: index + 1 })) : dailyRanking(user, day);
  } catch {
    return dailyRanking(user, day);
  }
}

export function submitDaily(user, optionIndex, { startedAt, day } = {}) {
  const q = todaysQuestion();
  const key = day || q.day;
  const started = startedAt ? new Date(startedAt).getTime() : Date.now();
  const durationSeconds = Math.max(1, Math.round((Date.now() - started) / 1000));
  const correct = Number(optionIndex) === Number(q.correct);
  const row = {
    id: `${user?.id || 'u'}-${key}`,
    userId: user?.id,
    name: user?.fullName || user?.email || 'Sən',
    day: key,
    optionIndex: Number(optionIndex),
    correct,
    durationSeconds,
    at: new Date().toISOString(),
  };
  const next = readAll().filter((item) => !(item.day === key && String(item.userId) === String(user?.id)));
  next.push(row);
  writeAll(next);
  return row;
}

/** Local save + SmarterASP sync (all phones share the same top board). */
export async function submitDailyRemote(user, optionIndex, { startedAt, day } = {}) {
  const row = submitDaily(user, optionIndex, { startedAt, day });
  if (!user?.id || isPractice() || !localStorage.getItem('token')) return row;
  try {
    await API.post('/daily-challenge', {
      day: row.day,
      optionIndex: row.optionIndex,
      correct: row.correct,
      durationSeconds: row.durationSeconds,
      name: user?.fullName || user?.email || 'Şagird',
    }, { timeout: 12000 });
    await syncDailyBoard(user, row.day);
  } catch {
    /* local board still works offline */
  }
  return row;
}

function ghostBoard(day) {
  const seed = hashDay(day);
  return GHOSTS.map((ghost, i) => ({
    id: `${ghost.id}-${day}`,
    userId: ghost.id,
    name: ghost.name,
    day,
    correct: true,
    durationSeconds: ghost.times[seed % ghost.times.length] + i,
    ghost: true,
  }));
}

export function dailyRanking(user, day = dailyKey()) {
  const byUser = new Map();
  readAll()
    .filter((row) => row.day === day && row.userId != null && !row.ghost)
    .forEach((row) => {
      byUser.set(String(row.userId), row);
    });
  const people = [...byUser.values()].map((row) => {
    const you = user?.id != null && String(row.userId) === String(user.id);
    return {
      ...row,
      you,
      name: you ? 'Sən' : (row.name || 'Şagird'),
    };
  });
  // Empty board: light demo ghosts so UI is not blank; cleared when real answers exist.
  if (!people.length) people.push(...ghostBoard(day));
  people.sort((a, b) => {
    if (Boolean(b.correct) !== Boolean(a.correct)) return b.correct ? 1 : -1;
    return (a.durationSeconds || 9999) - (b.durationSeconds || 9999);
  });
  return people.map((row, index) => ({ ...row, rank: index + 1 }));
}

/** Top N for home / daily board. Resets automatically when `day` changes. */
export function dailyTopBoard(user, day = dailyKey(), limit = 5) {
  const board = dailyRanking(user, day);
  const top = board.slice(0, limit);
  const you = board.find((row) => row.you) || null;
  return { board, top, you, day };
}

export function dailyDoneDays(userId) {
  if (!userId) return new Set();
  return new Set(
    readAll()
      .filter((row) => String(row.userId) === String(userId))
      .map((row) => row.day),
  );
}

export function parseDailyKey(key) {
  const [year, month, day] = String(key || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function lastDoneDay(days) {
  let last = '';
  const set = days instanceof Set ? days : new Set(days || []);
  set.forEach((key) => {
    if (key > last) last = key;
  });
  return last || null;
}

export function consecutiveEnding(days, endKey) {
  const set = days instanceof Set ? days : new Set(days || []);
  const cursor = parseDailyKey(endKey);
  if (!cursor) return 0;
  let streak = 0;
  while (set.has(dailyKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function countStreak(days, date = new Date()) {
  const set = days instanceof Set ? days : new Set(days || []);
  let streak = 0;
  const cursor = new Date(date);
  for (;;) {
    const key = dailyKey(cursor);
    if (!set.has(key)) {
      if (streak === 0) {
        cursor.setDate(cursor.getDate() - 1);
        if (!set.has(dailyKey(cursor))) return 0;
        continue;
      }
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function flameDying(days, date = new Date()) {
  const set = days instanceof Set ? days : new Set(days || []);
  if (set.has(dailyKey(date))) return 0;
  const last = lastDoneDay(set);
  if (!last) return 0;
  const lastEnd = parseDailyKey(last);
  if (!lastEnd) return 0;
  lastEnd.setHours(24, 0, 0, 0);
  const hours = Math.max(0, (date.getTime() - lastEnd.getTime()) / 3600000);
  if (hours <= 8) return (hours / 8) * 0.12;
  if (hours <= 32) return 0.12 + ((hours - 8) / 24) * 0.38;
  if (hours <= 72) return 0.5 + ((hours - 32) / 40) * 0.5;
  return 1;
}

export function flamePeak(days) {
  const last = lastDoneDay(days);
  return last ? consecutiveEnding(days, last) : 0;
}

export function dailyStreak(userId, date = new Date()) {
  return countStreak(dailyDoneDays(userId), date);
}

export function msUntilNextDaily(date = new Date()) {
  const next = new Date(date);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - date.getTime());
}

export function weekDots(doneKeys, date = new Date()) {
  const days = doneKeys instanceof Set ? doneKeys : new Set(doneKeys || []);
  const weekday = date.getDay();
  const mondayShift = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + mondayShift);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    const key = dailyKey(day);
    return {
      key,
      index,
      done: days.has(key),
      today: key === dailyKey(date),
    };
  });
}

export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h} saat ${m} dəq`;
  return `${m} dəq`;
}
