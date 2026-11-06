import { orderPipelineQuiz } from './pipelineApi';
import { republicMonthKey, republicQuestions } from './republicExam';

const papers = new Map();
const inflight = new Map();

function monthOf(value) {
  return String(value || '').trim() || republicMonthKey();
}

function asOptions(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((opt) => {
    if (typeof opt === 'string') return opt;
    return String(opt?.optionText || opt?.text || opt?.latex || '').trim();
  }).filter(Boolean);
}

export function normalizeMonthlyQuestions(list, month) {
  const key = monthOf(month);
  return (Array.isArray(list) ? list : []).map((q, index) => {
    const options = asOptions(q?.options || q?.Options);
    const correctFromFlag = options.length
      ? (q?.options || []).findIndex((opt) => opt?.isCorrect || opt?.IsCorrect)
      : -1;
    const correct = Number.isFinite(Number(q?.correct))
      ? Number(q.correct)
      : (correctFromFlag >= 0 ? correctFromFlag : 0);
    return {
      id: q?.id || q?.Id || `m-${key}-${index}`,
      text: String(q?.text || q?.Text || q?.latex || q?.Latex || q?.questionText || '').trim(),
      options: options.length ? options : ['A', 'B', 'C', 'D', 'E'],
      correct: Math.max(0, correct),
      difficulty: q?.difficulty || q?.difficultyLevel || 'orta',
      topic: q?.topic || '',
      subject: q?.subject || q?.subjectName || 'Respublika',
      grade: q?.grade || '11',
    };
  }).filter((q) => q.text);
}

export function peekMonthlyQuizPaper(month) {
  return papers.get(monthOf(month)) || null;
}

async function loadFromServer(month) {
  const res = await fetch(`/monthly-quiz?month=${encodeURIComponent(month)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return normalizeMonthlyQuestions(data.questions || data.Questions, month);
}

async function seedServer(month, questions) {
  try {
    const res = await fetch('/monthly-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ month, questions }),
    });
    if (!res.ok) return questions;
    const data = await res.json().catch(() => ({}));
    const shared = normalizeMonthlyQuestions(data.questions, month);
    return shared.length ? shared : questions;
  } catch {
    return questions;
  }
}

async function loadFromPipeline(month) {
  try {
    const paper = await orderPipelineQuiz({
      audience: 'republic',
      subject: 'math',
      language: 'az',
      lang: 'az',
      grade: '11',
      count: 30,
      kind: 'Sınaq',
      month,
      ram: true,
    });
    return normalizeMonthlyQuestions(paper?.questions || paper?.Questions, month);
  } catch {
    return [];
  }
}

export async function getMonthlyQuizPaper(month) {
  const key = monthOf(month);
  if (papers.get(key)?.length) return papers.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    let questions = await loadFromServer(key);
    if (!questions.length) questions = await loadFromPipeline(key);
    if (!questions.length) questions = normalizeMonthlyQuestions(republicQuestions(key), key);
    if (questions.length) questions = await seedServer(key, questions);
    papers.set(key, questions);
    return questions;
  })();

  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}
