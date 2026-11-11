import { attemptReviewsInYmds } from './attemptReviewLog.js';
import {
  calendarDayIndex,
  day6CycleInfo,
  isDay6ReviewDay,
} from './day6Calendar.js';
import { tbilisiYmd } from './mathCalendar.js';
import { republicHistoryForUser } from './republicExam.js';
import { practiceDemoWeakRows } from './weakExam.js';
import { weekendHistoryForUser } from './weekendWeakExam.js';

export { calendarDayIndex, day6CycleInfo, isDay6ReviewDay };

export const DAY6_QUESTION_COUNT = 12;
export const DAY6_DURATION_MIN = 25;
export const DAY6_EVENT = 'exampulse-day6';

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
  window.dispatchEvent(new CustomEvent(DAY6_EVENT));
}

function paperKey(userId, cycleKey) {
  return `exampulse_day6_paper_${userId}_${cycleKey}`;
}

function optionTexts(row) {
  const options = (row.options || []).map((item) => (
    typeof item === 'string' ? item : (item.text || item.optionText || item.Text || '')
  )).filter(Boolean);
  if (options.length >= 2) return options;
  return ['A', 'B', 'C', 'D', 'E'];
}

function correctIndex(row) {
  if (Number.isFinite(Number(row.correctIndex))) return Number(row.correctIndex);
  if (Number.isFinite(Number(row.correct))) return Number(row.correct);
  const idx = (row.options || []).findIndex((item) => item?.isCorrect);
  return idx >= 0 ? idx : 0;
}

function fromReview(item) {
  const options = optionTexts(item);
  if (!item?.text || options.length < 2) return null;
  if (!(item.isCorrect === false || item.unanswered)) return null;
  return {
    text: item.text,
    options,
    correct: correctIndex(item),
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
    topic: 'Təkrar',
  };
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

function inYmds(at, ymds) {
  const set = new Set(ymds.map(String));
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return false;
  return set.has(tbilisiYmd(date));
}

function poolFromPreviousFive(user, lookbackYmds) {
  const pool = [];
  attemptReviewsInYmds(user?.id, lookbackYmds).forEach((row) => {
    (row.review || []).forEach((item) => {
      const q = {
        text: item.text,
        options: item.options,
        correct: item.correct,
        subject: item.subject,
        topic: item.topic,
        unanswered: item.unanswered,
        isCorrect: false,
      };
      const hit = fromReview(q);
      if (hit) pool.push(hit);
    });
  });

  (republicHistoryForUser(user?.id) || []).forEach((row) => {
    if (!inYmds(row.at || row.startedAt, lookbackYmds) && !user?.practice) return;
    (row.review || []).forEach((item) => {
      const hit = fromReview(item);
      if (hit) pool.push(hit);
    });
  });

  (weekendHistoryForUser(user?.id) || []).forEach((row) => {
    if (!inYmds(row.at || row.startedAt, lookbackYmds) && !user?.practice) return;
    (row.review || []).forEach((item) => {
      const hit = fromReview(item);
      if (hit) pool.push(hit);
    });
  });

  return uniqueQuestions(pool);
}

export function ensureDay6Paper(user, ymd = tbilisiYmd()) {
  const info = day6CycleInfo(ymd);
  if (!user?.id) return { ...info, questions: [] };
  const stored = read(paperKey(user.id, info.cycleKey), null);
  if (stored?.questions?.length) return { ...info, ...stored };

  const mistakes = poolFromPreviousFive(user, info.lookbackYmds);
  const demo = practiceDemoWeakRows().map(fromDemo);
  const mixed = uniqueQuestions([...mistakes, ...(user?.practice || !mistakes.length ? demo : [])])
    .slice(0, DAY6_QUESTION_COUNT);
  const questions = mixed.map((row, index) => ({
    ...row,
    id: `d6-${info.cycleKey}-${index}`,
  }));
  const paper = {
    cycleKey: info.cycleKey,
    label: info.label,
    lookbackYmds: info.lookbackYmds,
    createdAt: new Date().toISOString(),
    questions,
  };
  write(paperKey(user.id, info.cycleKey), paper);
  return { ...info, ...paper };
}

export function day6ResultFor(userId, cycleKey) {
  return (read('exampulse_day6_results', []) || []).find(
    (row) => String(row.userId) === String(userId) && row.cycleKey === cycleKey,
  ) || null;
}

export function submitDay6(user, answers, extra = {}, ymd = tbilisiYmd()) {
  const paper = ensureDay6Paper(user, ymd);
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
    cycleKey: paper.cycleKey,
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
    durationLimit: DAY6_DURATION_MIN * 60,
    at: new Date().toISOString(),
    answers,
    review,
  };
  const all = read('exampulse_day6_results', []);
  write(
    'exampulse_day6_results',
    [row, ...all.filter((item) => !(item.userId === row.userId && item.cycleKey === row.cycleKey))].slice(0, 200),
  );
  return row;
}
