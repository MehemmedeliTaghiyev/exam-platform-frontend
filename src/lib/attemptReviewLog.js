import { tbilisiYmd } from './mathCalendar.js';

const STORE = 'exampulse_attempt_reviews';
export const ATTEMPT_REVIEW_EVENT = 'exampulse-attempt-review';

function read() {
  try {
    const raw = localStorage.getItem(STORE);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(STORE, JSON.stringify((list || []).slice(0, 400)));
  window.dispatchEvent(new CustomEvent(ATTEMPT_REVIEW_EVENT));
}

function optionTexts(question) {
  return (question?.options || question?.Options || []).map((item) => (
    typeof item === 'string' ? item : (item.optionText || item.OptionText || item.text || item.Text || '')
  )).filter(Boolean);
}

function correctIndexOf(question) {
  if (Number.isFinite(Number(question?.correctIndex))) return Number(question.correctIndex);
  if (Number.isFinite(Number(question?.correct))) return Number(question.correct);
  const idx = (question?.options || []).findIndex((item) => item?.isCorrect || item?.IsCorrect);
  return idx >= 0 ? idx : 0;
}

function selectedIndexOf(question, answer, options) {
  if (answer == null || answer === '') return null;
  if (typeof answer === 'number' && Number.isFinite(answer)) return answer;
  if (typeof answer === 'string' && /^\d+$/.test(answer)) return Number(answer);
  const letter = String(answer?.letter || answer || '').toUpperCase();
  if (letter && /^[A-E]$/.test(letter)) {
    return letter.charCodeAt(0) - 65;
  }
  const optionId = answer?.optionId;
  if (optionId && optionId !== 'open') {
    const byId = (question?.options || []).findIndex((o) => String(o?.id ?? o?.Id) === String(optionId));
    if (byId >= 0) return byId;
  }
  return null;
}

/**
 * Log wrong + unanswered items after an exam submit (for day-6 review pool).
 */
export function logAttemptReview(user, exam, questions, answers = {}, at = new Date()) {
  if (!user?.id || !questions?.length) return null;
  const ymd = tbilisiYmd(at);
  const review = [];
  (questions || []).forEach((q, index) => {
    const options = optionTexts(q);
    if (options.length < 2) return;
    const qid = String(q.id ?? q.Id ?? index);
    const answer = answers[qid] ?? answers[q.id] ?? answers[`p${index + 1}`] ?? answers[index];
    const selected = selectedIndexOf(q, answer, options);
    const picked = selected != null && Number.isFinite(selected);
    const correct = correctIndexOf(q);
    const isCorrect = picked && selected === correct;
    if (isCorrect) return;
    review.push({
      text: String(q.text || q.Text || '').trim(),
      options,
      correct,
      subject: exam?.subjectName || exam?.subject || q.subjectName || 'Riyaziyyat',
      topic: q.topic || q.mainTopic || exam?.title || '',
      unanswered: !picked,
      questionId: qid,
    });
  });
  if (!review.length) return null;
  const row = {
    userId: user.id,
    examId: exam?.id ?? exam?.Id ?? null,
    ymd,
    at: (at instanceof Date ? at : new Date(at)).toISOString(),
    review,
  };
  const prev = read().filter((item) => !(
    String(item.userId) === String(row.userId)
    && String(item.examId) === String(row.examId)
    && item.ymd === row.ymd
  ));
  write([row, ...prev]);
  return row;
}

export function attemptReviewsForUser(userId) {
  return read().filter((row) => String(row.userId) === String(userId));
}

export function attemptReviewsInYmds(userId, ymds = []) {
  const set = new Set((ymds || []).map(String));
  return attemptReviewsForUser(userId).filter((row) => set.has(String(row.ymd)));
}
