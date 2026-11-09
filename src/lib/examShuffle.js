import { isOpenChoiceOption, unwrapOptions } from './utils';
import { correctLetterOf, letterOfOption } from './gradeExam';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

function hashSeed(text) {
  let h = 2166136261;
  const raw = String(text || '');
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(list, rng) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function optionBody(opt) {
  return String(opt?.optionText || opt?.OptionText || opt?.text || opt?.Text || '')
    .replace(/^[A-E][\)\.\-:]\s*/i, '')
    .trim();
}

function correctOptionBody(question, choices) {
  const want = correctLetterOf(question);
  const hit = choices.find((opt, index) => {
    if (opt?.isCorrect || opt?.IsCorrect) return true;
    return Boolean(want && letterOfOption(opt, index) === want);
  });
  return hit ? optionBody(hit) : '';
}

/**
 * Deterministic per-student shuffle of question order and choice options.
 * Keeps option ids so grading by selectedOptionId stays correct.
 */
export function shuffleExamPaper(questions = [], seedText = '') {
  const rng = mulberry32(hashSeed(seedText || 'exampulse'));
  const paper = shuffleInPlace([...(questions || [])], rng);
  return paper.map((question) => shuffleQuestionOptions(question, rng));
}

export function shuffleQuestionOptions(question, rng) {
  if (!question) return question;
  const type = String(question.type || '');
  const kind = String(question.inputKind || '');
  if (type === 'OpenEnded' || ['Text', 'Integer', 'Decimal', 'Number'].includes(kind)) {
    return question;
  }

  const raw = unwrapOptions(question.options);
  if (raw.length < 2) return question;

  const open = raw.filter(isOpenChoiceOption);
  const choices = raw.filter((opt) => !isOpenChoiceOption(opt));
  if (choices.length < 2) return question;

  const correctBody = correctOptionBody(question, choices);
  const remapped = shuffleInPlace([...choices], rng).map((opt, index) => {
    const letter = LETTERS[index] || 'A';
    const body = optionBody(opt);
    const ok = Boolean(correctBody) && body.toLowerCase() === correctBody.toLowerCase();
    return {
      ...opt,
      letter,
      Letter: letter,
      text: body,
      optionText: body ? `${letter}) ${body}` : letter,
      OptionText: body ? `${letter}) ${body}` : letter,
      isCorrect: ok,
      IsCorrect: ok,
    };
  });
  const correctLetter = remapped.find((opt) => opt.isCorrect)?.letter || '';

  return {
    ...question,
    options: [...remapped, ...open],
    correctLetter,
    CorrectLetter: correctLetter,
  };
}

export function examShuffleSeed(examId, studentId) {
  return `exam:${examId}|student:${studentId || 'anon'}`;
}

export function readPersistedShuffle(examId, studentId) {
  try {
    const key = `exampulse_shuffle_${examId}_${studentId || 'anon'}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : null;
  } catch {
    return null;
  }
}

export function persistShuffle(examId, studentId, questions) {
  try {
    const key = `exampulse_shuffle_${examId}_${studentId || 'anon'}`;
    sessionStorage.setItem(key, JSON.stringify(questions || []));
  } catch {
    /* ignore quota */
  }
}
