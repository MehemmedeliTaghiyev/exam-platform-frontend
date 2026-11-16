import { latestCoveredTopicForDay, tbilisiYmd } from './mathCalendar.js';
import {
  coveredTopicsThrough,
  reviewTopicForDay,
  todaysTopicQuiz,
} from './dailyTopicQuiz.js';
import { topicQuizDifficultyLabel } from './topicQuizDifficulty.js';
import { orderPipelineQuiz, pipelineUnconfigured } from './pipelineApi.js';
import { fetchQuestions } from './examApi.js';

export const DAILY_TOPIC_QUESTION_COUNT = 10;
export const DAILY_TOPIC_DURATION_MIN = 20;
export const DAILY_TOPIC_EVENT = 'exampulse-daily-topic';

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
  window.dispatchEvent(new CustomEvent(DAILY_TOPIC_EVENT));
}

function paperKey(userId, ymd, role, topic) {
  const slug = String(topic || '')
    .toLocaleLowerCase('az')
    .replace(/\s+/g, '-')
    .slice(0, 48);
  return `exampulse_daily_topic_${userId}_${ymd}_${role}_${slug}`;
}

function resultsKey() {
  return 'exampulse_daily_topic_results';
}

function hashSeed(text) {
  let h = 2166136261;
  const s = String(text || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(rng, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function optionTexts(row) {
  const options = (row.options || row.Options || []).map((item) => (
    typeof item === 'string' ? item : (item.text || item.optionText || item.Text || item.latex || '')
  )).filter(Boolean);
  return options;
}

function correctIndex(row, options) {
  if (Number.isFinite(Number(row.correct))) return Number(row.correct);
  if (Number.isFinite(Number(row.correctIndex))) return Number(row.correctIndex);
  const idx = (row.options || []).findIndex((item) => item?.isCorrect || item?.IsCorrect);
  if (idx >= 0) return idx;
  const letter = String(row.correctLetter || row.CorrectLetter || '').trim().toUpperCase();
  if (/^[A-E]$/.test(letter)) return letter.charCodeAt(0) - 65;
  return 0;
}

function normalizeBankRow(row, topic, index, prefix) {
  const options = optionTexts(row);
  const text = String(row.text || row.Text || row.questionText || row.latex || '').trim();
  if (!text || options.length < 2) return null;
  return {
    id: `${prefix}-${index}`,
    text,
    options: options.length >= 2 ? options.slice(0, 5) : ['A', 'B', 'C', 'D', 'E'],
    correct: Math.max(0, Math.min(options.length - 1, correctIndex(row, options))),
    subject: row.subject || row.subjectName || 'Riyaziyyat',
    topic: row.topic || topic,
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

/** Deterministic practice MCQs when bank/pipeline is empty — same day+topic → same paper. */
function practiceQuestionsForTopic(topic, ymd, count = DAILY_TOPIC_QUESTION_COUNT) {
  const rng = mulberry32(hashSeed(`${ymd}|${topic}`));
  const title = String(topic || 'Riyaziyyat');
  const lower = title.toLocaleLowerCase('az');
  const templates = [];

  const push = (text, correct, wrongs) => {
    const opts = shuffle(rng, [String(correct), ...wrongs.map(String)]).slice(0, 5);
    while (opts.length < 4) opts.push(String(Number(correct) + opts.length + 1));
    templates.push({
      text,
      options: opts,
      correct: opts.indexOf(String(correct)),
      subject: 'Riyaziyyat',
      topic: title,
    });
  };

  for (let i = 0; i < count + 4; i += 1) {
    const a = 2 + Math.floor(rng() * 12);
    const b = 2 + Math.floor(rng() * 10);
    const c = 1 + Math.floor(rng() * 9);

    if (/faiz|tənasüb|nisbət/.test(lower)) {
      const pct = [10, 20, 25, 50][Math.floor(rng() * 4)];
      const base = 40 + a * 10;
      push(`${title}. ${base} ədədinin ${pct}%-i neçədir?`, (base * pct) / 100, [
        (base * pct) / 100 + 5,
        (base * pct) / 100 - 5,
        base - pct,
        pct,
      ]);
    } else if (/kök|irrasional|üstlü|qüvvət/.test(lower)) {
      const n = [4, 9, 16, 25, 36, 49, 64, 81][Math.floor(rng() * 8)];
      const root = Math.round(Math.sqrt(n));
      push(`${title}. √${n} = ?`, root, [root + 1, root - 1, n / 2, root + 2]);
    } else if (/üçbucaq|həndəsi|çevrə|dördbuca|fiqur|sahə/.test(lower)) {
      push(`${title}. Tərəfləri ${a}, ${b} və ${a + 1} olan üçbucağın perimetri?`, a + b + a + 1, [
        a + b,
        a * b,
        a + b + c,
        2 * (a + b),
      ]);
    } else if (/ehtimal|statistika|çoxluq|birləşmə/.test(lower)) {
      const total = a + b;
      push(`${title}. ${total} nəfərdən ${a}-i seçilir. Seçilmə ehtimalı (sadə)?`, `${a}/${total}`, [
        `${b}/${total}`,
        `${a}/${b}`,
        `${total}/${a}`,
        '1',
      ]);
    } else if (/tənlik|bərabərsizlik|sistem/.test(lower)) {
      const x = a;
      push(`${title}. ${b}x + ${c} = ${b * x + c} tənliyində x = ?`, x, [x + 1, x - 1, b, c]);
    } else if (/funksiya|qrafik|ardıcıllıq|silsilə/.test(lower)) {
      push(`${title}. f(x) = ${a}x + ${b} olduqda f(${c}) = ?`, a * c + b, [
        a * c - b,
        a + b + c,
        a * b,
        c,
      ]);
    } else {
      push(`${title}. ${a} · ${b} + ${c} = ?`, a * b + c, [
        a * b - c,
        (a + b) * c,
        a + b + c,
        a * (b + c),
      ]);
    }
  }

  return uniqueQuestions(templates).slice(0, count).map((row, index) => ({
    ...row,
    id: `dt-${ymd}-${index}`,
  }));
}

async function questionsFromExam(exam) {
  if (!exam?.id) return [];
  try {
    const list = await fetchQuestions(exam.id, exam);
    return uniqueQuestions(
      (list || [])
        .map((row, index) => normalizeBankRow(row, '', index, `ex-${exam.id}`))
        .filter(Boolean),
    );
  } catch {
    return [];
  }
}

async function questionsFromPipeline(topic, band, count) {
  try {
    const paper = await orderPipelineQuiz({
      audience: 'teacher',
      subject: 'math',
      language: 'az',
      lang: 'az',
      grade: '11',
      count,
      kind: 'Sınaq',
      topics: topic,
      difficulty: band || 'orta',
    });
    return uniqueQuestions(
      (paper?.questions || paper?.Questions || [])
        .map((row, index) => normalizeBankRow(row, topic, index, 'pipe'))
        .filter(Boolean),
    );
  } catch (err) {
    if (pipelineUnconfigured(err)) return [];
    return [];
  }
}

/**
 * @param {'primary'|'review'} role
 */
export function dailyPaperMeta(role = 'primary', ymd = tbilisiYmd()) {
  const key = String(ymd || tbilisiYmd());
  if (role === 'review') {
    const review = reviewTopicForDay(key);
    return {
      ymd: key,
      role: 'review',
      topic: review?.topic || '',
      band: review?.band || 'orta',
      bandLabel: topicQuizDifficultyLabel(review?.band || 'orta'),
      label: review?.topic ? `Təkrar · ${review.topic}` : 'Təkrar sınaq',
      slot: review?.slot ?? 0,
      series: review?.series ?? 1,
    };
  }
  const covered = latestCoveredTopicForDay(key);
  const primary = todaysTopicQuiz([], key);
  return {
    ymd: key,
    role: 'primary',
    topic: covered.topic || primary.topic || '',
    band: primary.band || 'orta',
    bandLabel: primary.bandLabel || topicQuizDifficultyLabel('orta'),
    label: covered.topic ? `Günün sınağı · ${covered.topic}` : 'Günün sınağı',
    slot: primary.slot ?? covered.dayInTopic ?? 0,
    series: primary.series ?? 1,
  };
}

export function dailyTopicResultFor(userId, ymd, role = 'primary') {
  const key = String(ymd || tbilisiYmd());
  return (read(resultsKey(), []) || []).find(
    (row) => (
      String(row.userId) === String(userId)
      && row.ymd === key
      && (row.role || 'primary') === role
    ),
  ) || null;
}

export function peekDailyTopicPaper(user, role = 'primary', ymd = tbilisiYmd()) {
  const meta = dailyPaperMeta(role, ymd);
  if (!user?.id || !meta.topic) return { ...meta, questions: [] };
  const stored = read(paperKey(user.id, meta.ymd, role, meta.topic), null);
  if (stored?.questions?.length) return { ...meta, ...stored };
  return { ...meta, questions: [] };
}

/**
 * Sync ensure: practice pool immediately so UI always has a quiz.
 * Call ensureDailyTopicPaperAsync afterward to upgrade from bank/exam when possible.
 */
export function ensureDailyTopicPaper(user, role = 'primary', ymd = tbilisiYmd()) {
  const meta = dailyPaperMeta(role, ymd);
  if (!user?.id || !meta.topic) return { ...meta, questions: [] };
  const stored = read(paperKey(user.id, meta.ymd, role, meta.topic), null);
  if (stored?.questions?.length && !stored.practiceOnly) {
    return { ...meta, ...stored };
  }
  if (stored?.questions?.length) return { ...meta, ...stored };

  const questions = practiceQuestionsForTopic(meta.topic, meta.ymd);
  const paper = {
    ymd: meta.ymd,
    role,
    topic: meta.topic,
    band: meta.band,
    bandLabel: meta.bandLabel,
    label: meta.label,
    createdAt: new Date().toISOString(),
    practiceOnly: true,
    questions,
  };
  write(paperKey(user.id, meta.ymd, role, meta.topic), paper);
  return { ...meta, ...paper };
}

/**
 * Upgrade personal paper with real exam/pipeline questions when available.
 */
export async function ensureDailyTopicPaperAsync(user, role = 'primary', ymd = tbilisiYmd(), exams = []) {
  const meta = dailyPaperMeta(role, ymd);
  if (!user?.id || !meta.topic) return { ...meta, questions: [] };

  const key = paperKey(user.id, meta.ymd, role, meta.topic);
  const stored = read(key, null);
  if (stored?.questions?.length && !stored.practiceOnly) {
    return { ...meta, ...stored };
  }

  const matched = todaysTopicQuiz(
    (exams || []).filter((exam) => {
      const blob = `${exam?.title || ''} ${exam?.description || ''}`.toLocaleLowerCase('az');
      return blob.includes(String(meta.topic).toLocaleLowerCase('az'));
    }),
    meta.ymd,
  );
  // Force match on this topic's papers even for review role
  const topicExams = (exams || []).filter((exam) => {
    const blob = `${exam?.title || ''} ${exam?.description || ''}`.toLocaleLowerCase('az');
    return blob.includes(String(meta.topic).toLocaleLowerCase('az'));
  });

  let pool = [];
  if (matched.exam && role === 'primary') {
    pool = await questionsFromExam(matched.exam);
  }
  if (pool.length < DAILY_TOPIC_QUESTION_COUNT && topicExams.length) {
    for (const exam of topicExams.slice(0, 3)) {
      const more = await questionsFromExam(exam);
      pool = uniqueQuestions([...pool, ...more]);
      if (pool.length >= DAILY_TOPIC_QUESTION_COUNT) break;
    }
  }
  if (pool.length < DAILY_TOPIC_QUESTION_COUNT) {
    const piped = await questionsFromPipeline(meta.topic, meta.band, DAILY_TOPIC_QUESTION_COUNT);
    pool = uniqueQuestions([...pool, ...piped]);
  }

  const practice = practiceQuestionsForTopic(meta.topic, meta.ymd, DAILY_TOPIC_QUESTION_COUNT);
  const questions = uniqueQuestions([...pool, ...practice])
    .slice(0, DAILY_TOPIC_QUESTION_COUNT)
    .map((row, index) => ({ ...row, id: row.id || `dt-${meta.ymd}-${role}-${index}` }));

  const paper = {
    ymd: meta.ymd,
    role,
    topic: meta.topic,
    band: meta.band,
    bandLabel: meta.bandLabel,
    label: meta.label,
    createdAt: new Date().toISOString(),
    practiceOnly: pool.length === 0,
    sourceExamId: matched.exam?.id || topicExams[0]?.id || null,
    questions,
  };
  write(key, paper);
  return { ...meta, ...paper };
}

export function submitDailyTopic(user, answers, extra = {}, role = 'primary', ymd = tbilisiYmd()) {
  const paper = ensureDailyTopicPaper(user, role, ymd);
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
      topic: q.topic || paper.topic || '',
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
    ymd: paper.ymd,
    role,
    topic: paper.topic,
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
    durationLimit: DAILY_TOPIC_DURATION_MIN * 60,
    at: new Date().toISOString(),
    answers,
    review,
  };
  const all = read(resultsKey(), []);
  write(
    resultsKey(),
    [
      row,
      ...all.filter((item) => !(
        String(item.userId) === String(row.userId)
        && item.ymd === row.ymd
        && (item.role || 'primary') === role
      )),
    ].slice(0, 400),
  );
  return row;
}

export function coveredTopicTitles(ymd = tbilisiYmd()) {
  return coveredTopicsThrough(ymd).map((row) => row.topic);
}
