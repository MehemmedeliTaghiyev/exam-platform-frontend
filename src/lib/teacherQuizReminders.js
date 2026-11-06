import { isoWeekKey, teacherTokenRequests } from './tokens';
import { isNativeApp } from './runtime';
import { showLocalUrgent } from './pushNotify';

const STATE_PREFIX = 'exampulse_teacher_nudge_';
const IDS = {
  weekStart: 42101,
  weekOrder: 42102,
  success: 42103,
  pendingBase: 42200,
};
const PENDING_SLOTS = 42;

function stateKey(userId) {
  return `${STATE_PREFIX}${userId || 'me'}`;
}

function readState(userId) {
  try {
    const raw = localStorage.getItem(stateKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeState(userId, row) {
  localStorage.setItem(stateKey(userId), JSON.stringify(row));
}

function orderedThisWeek(user) {
  const week = isoWeekKey();
  return teacherTokenRequests(user).some((row) => row.week === week);
}

async function nativePlugin() {
  if (!isNativeApp()) return null;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    return LocalNotifications;
  } catch {
    return null;
  }
}

async function cancelIds(ids) {
  const plugin = await nativePlugin();
  if (!plugin) return;
  try {
    await plugin.cancel({ notifications: ids.map((id) => ({ id })) });
  } catch {
    /* ignore */
  }
}

async function fire(title, body, id) {
  const plugin = await nativePlugin();
  if (plugin) {
    try {
      await plugin.schedule({
        notifications: [{
          id,
          title,
          body,
          schedule: { at: new Date(Date.now() + 800), allowWhileIdle: true },
        }],
      });
      return;
    } catch {
      /* fall through */
    }
  }
  await showLocalUrgent(title, body);
}

export async function cancelPendingQuizReminders() {
  const ids = Array.from({ length: PENDING_SLOTS }, (_, i) => IDS.pendingBase + i);
  await cancelIds(ids);
}

export async function notifyTeacherQuizSuccess(user) {
  if (!user?.id || user.practice) return;
  const week = isoWeekKey();
  const state = readState(user.id);
  const already = state.week === week && state.successSent;
  writeState(user.id, { ...state, week, ordered: true, successSent: true });
  await cancelPendingQuizReminders();
  if (already) return;
  await fire('Uğurlar', 'Quiz götürüldü. Həftəlik xatırlatmalar dayandırıldı.', IDS.success);
}

async function scheduleEveryFourHours() {
  await cancelPendingQuizReminders();
  const plugin = await nativePlugin();
  const four = 4 * 60 * 60 * 1000;
  if (!plugin) return;
  const notifications = Array.from({ length: PENDING_SLOTS }, (_, i) => ({
    id: IDS.pendingBase + i,
    title: 'Gözləyən quiz',
    body: 'Sizin gözləyən quiziniz var, götürməmisiniz.',
    schedule: {
      at: new Date(Date.now() + four * (i + 1)),
      allowWhileIdle: true,
    },
  }));
  try {
    await plugin.schedule({ notifications });
  } catch {
    /* ignore */
  }
}

async function scheduleWeekStart() {
  const plugin = await nativePlugin();
  if (!plugin) return;
  try {
    await plugin.schedule({
      notifications: [
        {
          id: IDS.weekStart,
          title: 'Yeni həftə',
          body: 'Siz yenidən imtahan götürə bilərsiniz. Hesaba 30 qəpik əlavə olundu.',
          schedule: { on: { weekday: 2, hour: 8, minute: 0 }, repeats: true, allowWhileIdle: true },
        },
        {
          id: IDS.weekOrder,
          title: 'Həftəlik sifariş',
          body: 'Bu həftənin quiz sifarişini edin.',
          schedule: { on: { weekday: 2, hour: 8, minute: 5 }, repeats: true, allowWhileIdle: true },
        },
      ],
    });
  } catch {
    /* ignore */
  }
}

export async function syncTeacherQuizReminders(user) {
  if (!user?.id || user.practice) return;
  if (user.role !== 'Teacher' && user.role !== 'Admin') return;
  const week = isoWeekKey();
  const ordered = orderedThisWeek(user);
  let state = readState(user.id);
  if (state.week !== week) {
    state = { week, ordered: false, successSent: false, welcomeSent: false };
    writeState(user.id, state);
  }
  await scheduleWeekStart();
  if (ordered) {
    writeState(user.id, { ...state, ordered: true });
    await cancelPendingQuizReminders();
    return;
  }
  if (!state.welcomeSent) {
    writeState(user.id, { ...state, week, welcomeSent: true });
    await fire('Yeni həftə', 'Siz yenidən imtahan götürə bilərsiniz. Hesaba 30 qəpik əlavə olundu.', 42111);
    await fire('Həftəlik sifariş', 'Bu həftənin quiz sifarişini edin.', 42112);
  }
  await scheduleEveryFourHours();
}
