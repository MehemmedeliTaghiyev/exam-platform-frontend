/** Canonical DİM pipeline types used by ExamPulse. See docs/exampulse-api.md in the Project store. */

export const PIPELINE_PROXY = '/pipeline';

export const LANGS = [
  { code: 'az', label: 'Azərbaycan' },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
];

export const GRADES = ['9', '10', '11'];

export const SUBJECTS = [
  { code: 'math', label: 'Riyaziyyat', live: true },
  { code: 'english', label: 'İngilis dili', live: false },
  { code: 'azerbaijani', label: 'Azərbaycan dili', live: false },
];

export const WEEKLY_BANDS = [
  { code: 'easy', label: 'Asan' },
  { code: 'medium', label: 'Orta' },
];

export const AUDIENCE = {
  teacher: 'teacher',
  weekly: 'weekly',
  specialty: 'specialty',
};

const LANG_ALIAS = {
  az: 'az', aze: 'az', azərbaycan: 'az', azerbaycan: 'az',
  ru: 'ru', rus: 'ru', russian: 'ru',
  en: 'en', eng: 'en', english: 'en', ingilis: 'en',
};

/**
 * @typedef {object} PipelineOrder
 * @property {'teacher'|'weekly'|'specialty'} [audience]
 * @property {'math'|'english'|'azerbaijani'} [subject]
 * @property {string} [language]
 * @property {string} [grade]
 * @property {number} [count]
 * @property {string} [topics]
 * @property {string} [level]
 * @property {string} [order]
 * @property {string} [week]
 * @property {string} [group_id]
 * @property {string} [band]
 * @property {string} [action]
 */

/**
 * @typedef {object} WeeklyPaper
 * @property {number|string} exam_id
 * @property {string} [title]
 * @property {string[]} [chapters_used]
 */

/**
 * @typedef {object} WeeklyPairPayload
 * @property {string} audience
 * @property {string} subject
 * @property {string} grade
 * @property {string} group_id
 * @property {string} week
 * @property {string} action
 * @property {boolean} generated
 * @property {boolean} complete
 * @property {string[]} missing
 * @property {{ easy?: WeeklyPaper, medium?: WeeklyPaper }} pair
 */

/**
 * @typedef {object} PipelineAttempt
 * @property {number|string} question_id
 * @property {boolean} correct
 * @property {string} [answer]
 */

/**
 * @typedef {object} PipelineQuestion
 * @property {number|string} id
 * @property {string} [qnum]
 * @property {string} text
 * @property {string[]|object[]} [options]
 * @property {string} [correct_answer]
 * @property {string} [difficulty_level]
 * @property {string} [main_topic]
 * @property {string} [stem]
 * @property {string} [situation_title]
 * @property {string|number} [situation_id]
 * @property {string} [figure]
 * @property {string} [figure_path]
 */

export function isoWeek(day = new Date()) {
  const d = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function parseLang(raw, fallback = 'az') {
  const key = String(raw || '').trim().toLowerCase().replace(/ı/g, 'i').replace(/ə/g, 'e');
  return LANG_ALIAS[key] || fallback;
}

export function parseBand(raw) {
  const key = String(raw || '').trim().toLowerCase().replace(/ı/g, 'i').replace(/ə/g, 'e');
  if (['easy', 'asan', 'sade', 'sadə'].includes(key)) return 'easy';
  if (['medium', 'middle', 'orta'].includes(key)) return 'medium';
  return null;
}

export function isPastWeek(week, today = new Date()) {
  return String(week || '') < isoWeek(today);
}

export function optionLetter(opt, index) {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  if (opt && typeof opt === 'object') {
    const mark = String(opt.letter || '').toUpperCase();
    if (letters.includes(mark)) return mark;
  }
  const raw = String(typeof opt === 'string' ? opt : (opt?.text || opt?.optionText || '')).trim();
  const m = raw.match(/^([A-E])[\)\.\-:]\s*/i);
  if (m) return m[1].toUpperCase();
  return letters[index] || 'A';
}

export function optionBody(opt) {
  const raw = String(typeof opt === 'string' ? opt : (opt?.text || opt?.optionText || '')).trim();
  return raw.replace(/^[A-E][\)\.\-:]\s*/i, '').trim() || raw;
}

export function mapPipelineQuestion(q, index = 0) {
  const options = Array.isArray(q?.options) ? q.options : [];
  return {
    id: q.id ?? q.question_id ?? index + 1,
    qnum: q.qnum || '',
    text: q.text || q.stem || '',
    stem: q.stem || '',
    situationTitle: q.situation_title || '',
    situationId: q.situation_id ?? null,
    imageUrl: q.figure || q.figure_data_url || q.imageUrl || '',
    difficultyLevel: q.difficulty_level || q.difficultyLevel || '',
    mainTopic: q.main_topic || '',
    type: options.length ? 'SingleChoice' : 'OpenEnded',
    inputKind: options.length ? 'Choice' : 'Text',
    options: options.map((opt, i) => {
      const letter = optionLetter(opt, i);
      return {
        id: `${q.id ?? index}-${letter}`,
        letter,
        text: optionBody(opt),
        optionText: typeof opt === 'string' ? opt : (opt?.text || opt?.optionText || letter),
      };
    }),
    _correct: q.correct_answer || q.correctAnswer || '',
  };
}

export function scoreAnswer(question, answer) {
  const given = String(answer || '').trim();
  const expected = String(question?._correct || question?.correct_answer || '').trim();
  if (!given) return { correct: false, answer: given };
  if (!expected) return { correct: false, answer: given };
  const norm = (v) => v.replace(/[.)\s]/g, '').toUpperCase();
  if (norm(given) === norm(expected)) return { correct: true, answer: given };
  const letter = given.toUpperCase().slice(0, 1);
  if (/^[A-E]$/.test(letter) && norm(expected).startsWith(letter)) {
    return { correct: true, answer: given };
  }
  const opt = (question.options || []).find((o) => String(o.letter).toUpperCase() === letter);
  if (opt && optionBody(opt) && norm(optionBody(opt)) === norm(expected)) {
    return { correct: true, answer: given };
  }
  return { correct: false, answer: given };
}

export function pipelineErrorMessage(err) {
  const data = err?.data || err?.response?.data;
  const code = data?.code || err?.code;
  if (code === 'pipeline_unconfigured') {
    return 'DİM bankı hələ qoşulmayıb. Serverdə PIPELINE_API_URL təyin edin.';
  }
  if (data?.error) return String(data.error);
  if (err?.message) return String(err.message);
  return 'DİM bankına çatmaq olmadı.';
}
