import { useEffect, useState } from 'react';
import { normalizeDifficulty } from './questionDifficulty';
import { completeStoragePayment, storageSubscription } from './storageAccess';

export const WEEKLY_TOKENS = 30;
export const STARTER_TOKENS = 30;
export const TOKEN_COSTS = {
  asan: 5,
  orta: 7,
  çətin: 8,
};
export const TOKEN_EVENT = 'exampulse-tokens';

function accountKey(userId) {
  return `exampulse_tokens_${userId || 'me'}`;
}

function requestsKey(userId) {
  return `exampulse_token_requests_${userId || 'me'}`;
}

export function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function emitTokens() {
  window.dispatchEvent(new CustomEvent(TOKEN_EVENT));
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function tokenCostForLevel(level) {
  const key = normalizeDifficulty(level) || 'orta';
  return TOKEN_COSTS[key] || TOKEN_COSTS.orta;
}

export function tokenCostForMix(mix = {}) {
  const asan = Math.max(0, Number(mix.asan) || 0);
  const orta = Math.max(0, Number(mix.orta) || 0);
  const hard = Math.max(0, Number(mix.çətin ?? mix.cetin) || 0);
  return asan * TOKEN_COSTS.asan + orta * TOKEN_COSTS.orta + hard * TOKEN_COSTS.çətin;
}

export function tokenCostForQuestions(questions = []) {
  return (questions || []).reduce((sum, question) => sum + tokenCostForLevel(question?.difficultyLevel), 0);
}

function emptyAccount() {
  return {
    balance: STARTER_TOKENS,
    createdAt: new Date().toISOString(),
    lastWeeklyKey: isoWeekKey(),
    history: [],
    starterGranted: true,
  };
}

function persistAccount(userId, row) {
  const stored = {
    balance: Math.max(0, Number(row.balance) || 0),
    createdAt: row.createdAt || new Date().toISOString(),
    lastWeeklyKey: row.lastWeeklyKey || '',
    starterGranted: row.starterGranted !== false,
    history: Array.isArray(row.history) ? row.history.slice(0, 40) : [],
  };
  writeJson(accountKey(userId), stored);
  emitTokens();
  return stored;
}

function applyWeeklyGrant(userId, row) {
  const week = isoWeekKey();
  if (!row || row.lastWeeklyKey === week) return row;
  return persistAccount(userId, {
    ...row,
    lastWeeklyKey: week,
    balance: Math.max(0, Number(row.balance) || 0) + WEEKLY_TOKENS,
    history: [
      {
        at: new Date().toISOString(),
        amount: WEEKLY_TOKENS,
        note: `Həftəlik ${WEEKLY_TOKENS} qəpik`,
        kind: 'credit',
      },
      ...(row.history || []),
    ],
  });
}

export function ensureWeeklyTokens(user) {
  if (!user?.id) return teacherTokenAccount(user);
  if (user.practice || user.role === 'Admin') return teacherTokenAccount(user);
  if (user.role !== 'Teacher') return teacherTokenAccount(user);
  return teacherTokenAccount(user);
}

export function isTokenUnlimited(user) {
  if (!user) return false;
  if (user.practice || user.role === 'Admin') return true;
  return Boolean(storageSubscription(user));
}

const emptyView = {
  balance: 0,
  subscribed: false,
  unlimited: false,
  lastWeeklyKey: '',
  history: [],
  subscription: null,
};

export function teacherTokenAccount(user) {
  if (!user?.id) return emptyView;
  if (user.role !== 'Teacher' && user.role !== 'Admin' && !user.practice) return emptyView;
  const subscription = storageSubscription(user);
  if (isTokenUnlimited(user)) {
    return {
      balance: STARTER_TOKENS,
      subscribed: true,
      unlimited: true,
      lastWeeklyKey: isoWeekKey(),
      history: [],
      subscription,
    };
  }
  let row = readJson(accountKey(user.id), null);
  if (!row || typeof row !== 'object') {
    row = persistAccount(user.id, emptyAccount());
  } else {
    row = applyWeeklyGrant(user.id, row);
  }
  return {
    ...row,
    balance: Math.max(0, Number(row.balance) || 0),
    subscribed: Boolean(subscription),
    unlimited: false,
    subscription,
  };
}

export function spendTokens(user, amount, note = '', meta = {}) {
  const cost = Math.max(0, Math.round(Number(amount) || 0));
  if (!cost) return teacherTokenAccount(user);
  if (isTokenUnlimited(user)) return teacherTokenAccount(user);
  const account = teacherTokenAccount(user);
  if (account.balance < cost) {
    const err = new Error('JETON_YOX');
    err.code = 'JETON_YOX';
    throw err;
  }
  return persistAccount(user.id, {
    ...account,
    balance: account.balance - cost,
    history: [
      {
        at: new Date().toISOString(),
        amount: cost,
        note,
        ...meta,
      },
      ...(account.history || []),
    ],
  });
}

export function completeTokenPayment(user, options = {}) {
  const payment = completeStoragePayment(user, options);
  emitTokens();
  const account = teacherTokenAccount(user);
  return { payment, account };
}

export function teacherTokenRequests(user) {
  if (!user?.id) return [];
  const list = readJson(requestsKey(user.id), []);
  return Array.isArray(list) ? list.slice(0, 30) : [];
}

export function markStorageRequestSeen(user, id) {
  if (!user?.id || !id) return teacherTokenRequests(user);
  const next = teacherTokenRequests(user).map((row) => (row.id === id ? { ...row, seen: true } : row));
  writeJson(requestsKey(user.id), next);
  emitTokens();
  return next;
}

export async function requestStorageExam(user, mix, extras = {}) {
  const asan = Math.max(0, Math.round(Number(mix?.asan) || 0));
  const orta = Math.max(0, Math.round(Number(mix?.orta) || 0));
  const hard = Math.max(0, Math.round(Number(mix?.çətin) || 0));
  const quizCount = asan + orta + hard;
  if (!quizCount) {
    const err = new Error('SUAL_YOX');
    err.code = 'SUAL_YOX';
    throw err;
  }
  const cost = tokenCostForMix({ asan, orta, çətin: hard });
  // Balansı əvvəlcədən yoxla; jetoni yalnız uğurlu sifarişdən sonra sil.
  if (!isTokenUnlimited(user)) {
    const account = teacherTokenAccount(user);
    if (account.balance < cost) {
      const err = new Error('JETON_YOX');
      err.code = 'JETON_YOX';
      throw err;
    }
  }

  const language = 'az';
  const subject = String(extras.subject || '');
  const grade = String(extras.grade || '11');
  const kind = String(extras.kind || 'Sınaq');
  const week = isoWeekKey();

  const { fulfillTeacherBankOrder, questionsPerPaper } = await import('./teacherBankOrder');
  const perPaper = questionsPerPaper(kind);
  // Anbar steppers = quiz kağızı sayı (hər biri 25 və ya Blokda 30).
  const result = await fulfillTeacherBankOrder(user, {
    mix: { asan, orta, çətin: hard },
    language,
    subject,
    grade,
    kind,
    topics: extras.topics,
    unit: 'papers',
    asQuizCount: true,
  });

  const examIds = (result.results || [result]).map((r) => r.exam?.id).filter(Boolean);
  spendTokens(user, cost, `${quizCount} quiz Anbara düşdü`, {
    asan,
    orta,
    çətin: hard,
    examId: result.exam?.id,
    examIds,
    questionsPerPaper: perPaper,
  });

  const rows = (result.results || [result]).map((one, index) => ({
    id: one.pack?.id || `${week}-${Date.now()}-${index}`,
    week,
    at: new Date().toISOString(),
    asan: index === 0 ? asan : 0,
    orta: index === 0 ? orta : 0,
    çətin: index === 0 ? hard : 0,
    cost: index === 0 ? cost : 0,
    language,
    subject,
    grade,
    kind,
    topics: extras.topics || '',
    seen: false,
    status: 'ready',
    examId: one.exam?.id,
    title: one.pack?.title || `Quiz · ${asan}/${orta}/${hard}`,
    paper: {
      exam_id: one.exam?.id,
      title: one.pack?.title,
      questions: one.questions,
      latexSource: one.latexSource,
    },
    pack: one.pack,
    pdfBlob: one.pdfBlob || null,
    paperCount: quizCount,
    questionsPerPaper: perPaper,
  }));

  const previous = readJson(requestsKey(user.id), []);
  writeJson(requestsKey(user.id), [...rows, ...(Array.isArray(previous) ? previous : [])]);
  emitTokens();
  try {
    const { notifyTeacherQuizSuccess } = await import('./teacherQuizReminders');
    await notifyTeacherQuizSuccess(user);
  } catch {
    /* bildiriş olmasa da quiz qalır */
  }
  // UI: ilk PDF + bütün nəticələr
  return {
    ...rows[0],
    results: rows,
    pdfBlobs: rows.map((r) => r.pdfBlob).filter(Boolean),
    paperCount: quizCount,
    questionsPerPaper: perPaper,
    pack: {
      ...rows[0].pack,
      difficultyFallback: Boolean(result.difficultyFallback),
      paperCount: quizCount,
      questionsPerPaper: perPaper,
    },
  };
}

export function useTeacherTokens(user) {
  const [account, setAccount] = useState(() => teacherTokenAccount(user));
  useEffect(() => {
    const refresh = () => setAccount(teacherTokenAccount(user));
    refresh();
    window.addEventListener(TOKEN_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(TOKEN_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [user?.id, user?.role, user?.practice]);
  return account;
}
