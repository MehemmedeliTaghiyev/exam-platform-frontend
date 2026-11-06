import { isoWeekKey } from './tokens';
import { republicHistoryForUser } from './republicExam';
import { practiceDemoWeakRows } from './weakExam';

export const WEEKEND_DURATION_MIN = 20;
export const WEEKEND_QUESTION_COUNT = 10;
export const WEEKEND_EVENT = 'exampulse-weekend';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(WEEKEND_EVENT));
}

function paperKey(userId, week) {
  return `exampulse_weekend_paper_${userId}_${week}`;
}

export function weekendWeekKey(date = new Date()) {
  return isoWeekKey(date);
}

export function weekendWindow(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const toSat = day === 6 ? 0 : day === 0 ? -1 : 6 - day;
  const sat = new Date(copy);
  sat.setDate(copy.getDate() + toSat);
  sat.setHours(0, 0, 0, 0);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  sun.setHours(23, 59, 59, 999);
  const week = weekendWeekKey(sat);
  return {
    week,
    start: sat,
    end: sun,
    label: `Həftəsonu sınağı · ${sat.getDate()}–${sun.getDate()}`,
  };
}

export function isWeekendDay(date = new Date()) {
  const day = date.getDay();
  return day === 6 || day === 0;
}

export function isWeekendOpen(user, date = new Date()) {
  if (user?.practice) return true;
  return isWeekendDay(date);
}

function optionTexts(row) {
  const options = (row.options || []).map((item) => (
    typeof item === 'string' ? item : (item.text || item.optionText || item.Text || '')
  )).filter(Boolean);
  if (options.length >= 2) return options;
  return ['A', 'B', 'C', 'D', 'E'];
}

function correctIndex(row, options) {
  if (Number.isFinite(Number(row.correctIndex))) return Number(row.correctIndex);
  if (Number.isFinite(Number(row.correct))) return Number(row.correct);
  const idx = (row.options || []).findIndex((item) => item?.isCorrect);
  return idx >= 0 ? idx : 0;
}

function fromReview(item) {
  const options = optionTexts(item);
  if (!item?.text || options.length < 2) return null;
  return {
    text: item.text,
    options,
    correct: correctIndex(item, options),
    subject: item.subject || item.topic || '',
    topic: item.topic || '',
  };
}

function fromDemo(row) {
  return {
    text: row.text,
    options: optionTexts(row),
    correct: correctIndex(row),
    subject: row.subjectName || 'Riyaziyyat',
    topic: 'Zəif mövzu',
  };
}

function mistakesThisWeek(user, week) {
  const rows = republicHistoryForUser(user?.id) || [];
  const pool = [];
  rows.forEach((row) => {
    const at = new Date(row.at || row.startedAt || 0);
    if (Number.isFinite(at.getTime()) && weekendWeekKey(at) !== week && !user?.practice) return;
    (row.review || []).forEach((item) => {
      if (item.isCorrect || item.unanswered) return;
      const q = fromReview(item);
      if (q) pool.push(q);
    });
  });
  return pool;
}

function uniqueQuestions(list) {
  const seen = new Set();
  return list.filter((row) => {
    const key = String(row.text || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function ensureWeekendPaper(user, date = new Date()) {
  const { week, label } = weekendWindow(date);
  if (!user?.id) return { week, label, questions: [] };
  const stored = read(paperKey(user.id, week), null);
  if (stored?.questions?.length) return stored;
  const mistakes = uniqueQuestions(mistakesThisWeek(user, week));
  const demo = practiceDemoWeakRows().map(fromDemo);
  const mixed = uniqueQuestions([...mistakes, ...demo]).slice(0, WEEKEND_QUESTION_COUNT);
  const questions = mixed.map((row, index) => ({
    ...row,
    id: `w-${week}-${index}`,
  }));
  const paper = {
    week,
    label,
    createdAt: new Date().toISOString(),
    questions,
  };
  write(paperKey(user.id, week), paper);
  return paper;
}

export function weekendQuestions(user, date = new Date()) {
  return ensureWeekendPaper(user, date).questions || [];
}

export function weekendResultFor(userId, week) {
  return (read('exampulse_weekend_results', []) || []).find(
    (row) => String(row.userId) === String(userId) && row.week === week,
  ) || null;
}

export function weekendHistoryForUser(userId) {
  return (read('exampulse_weekend_results', []) || [])
    .filter((row) => String(row.userId) === String(userId))
    .sort((a, b) => String(b.week).localeCompare(String(a.week)));
}

export function submitWeekend(user, answers, extra = {}) {
  const paper = ensureWeekendPaper(user);
  const questions = paper.questions || [];
  const review = questions.map((q, index) => {
    const selected = Number(answers[q.id]);
    const picked = Number.isFinite(selected);
    const isCorrect = picked && selected === q.correct;
    return {
      questionId: q.id,
      index: index + 1,
      text: q.text,
      subject: q.subject || '',
      topic: q.topic || '',
      isCorrect,
      unanswered: !picked,
      selectedIndex: picked ? selected : null,
      correctIndex: q.correct,
      selectedText: picked ? `${String.fromCharCode(65 + selected)}) ${q.options[selected] ?? ''}` : 'Cavab verilməyib',
      correctText: `${String.fromCharCode(65 + q.correct)}) ${q.options[q.correct] ?? ''}`,
      options: (q.options || []).map((text, oi) => ({
        id: `${q.id}-${oi}`,
        text,
        isCorrect: oi === q.correct,
        isSelected: picked && selected === oi,
      })),
    };
  });
  const correct = review.filter((item) => item.isCorrect).length;
  const row = {
    userId: user.id,
    fullName: user.fullName || user.email,
    week: paper.week,
    label: paper.label,
    correct,
    wrong: review.filter((item) => !item.unanswered && !item.isCorrect).length,
    blank: review.filter((item) => item.unanswered).length,
    total: questions.length,
    percent: questions.length ? Math.round((correct / questions.length) * 100) : 0,
    startedAt: extra.startedAt,
    durationSeconds: extra.startedAt
      ? Math.max(0, Math.round((Date.now() - new Date(extra.startedAt).getTime()) / 1000))
      : 0,
    durationLimit: WEEKEND_DURATION_MIN * 60,
    at: new Date().toISOString(),
    answers,
    review,
  };
  const all = read('exampulse_weekend_results', []);
  write(
    'exampulse_weekend_results',
    [row, ...all.filter((item) => !(item.userId === row.userId && item.week === row.week))].slice(0, 200),
  );
  return row;
}
