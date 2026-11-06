import { parseExamDate } from './utils';

const NEW_MS = 7 * 24 * 60 * 60 * 1000;
const EVENT = 'exampulse-seen-exams';

function storeKey(userId) {
  return `exampulse_seen_exams_${userId || 'guest'}`;
}

export function seenExamIds(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey(userId)) || '[]');
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch {
    return new Set();
  }
}

export function markExamSeen(userId, examId) {
  if (userId == null || examId == null) return;
  const next = Array.from(new Set([...seenExamIds(userId), String(examId)]));
  localStorage.setItem(storeKey(userId), JSON.stringify(next.slice(-200)));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function examStamp(exam) {
  return parseExamDate(
    exam?.createdAt || exam?.CreatedAt || exam?.startTime || exam?.StartTime || exam?.publishedAt,
  );
}

export function isNewExam(exam, { userId, submitted = false } = {}) {
  if (!exam?.id || submitted) return false;
  if (seenExamIds(userId).has(String(exam.id))) return false;
  const at = examStamp(exam);
  if (!at || Number.isNaN(at.getTime())) return false;
  const age = Date.now() - at.getTime();
  return age >= 0 && age < NEW_MS;
}

export function subscribeSeenExams(onChange) {
  const ping = () => onChange?.();
  window.addEventListener(EVENT, ping);
  window.addEventListener('storage', ping);
  return () => {
    window.removeEventListener(EVENT, ping);
    window.removeEventListener('storage', ping);
  };
}
