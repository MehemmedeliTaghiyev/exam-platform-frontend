import {
  copyFromBank,
  createExam,
  fetchQuestions,
  fetchSubjects,
  updateExam,
} from './examApi';
import { durationMinutesForQuestionCount } from './examDuration';
import { MATH_CALENDAR } from './mathCalendar';

const LEVEL_MAP = {
  asan: 'Sadə',
  orta: 'Orta',
  çətin: 'Çətin',
  cetin: 'Çətin',
};

const PACKS_KEY = (userId) => `exampulse_ordered_packs_${userId || 'me'}`;

function readPacks(userId) {
  try {
    const raw = localStorage.getItem(PACKS_KEY(userId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writePacks(userId, list) {
  localStorage.setItem(PACKS_KEY(userId), JSON.stringify((list || []).slice(0, 40)));
}

export function teacherOrderedPacks(userId) {
  return readPacks(userId);
}

export function parseTopicList(raw) {
  return String(raw || '')
    .split(/[;,\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function calendarTopicSuggestions() {
  const seen = new Set();
  const rows = [];
  MATH_CALENDAR.intervals.forEach((interval) => {
    (interval.topics || []).forEach((title) => {
      if (seen.has(title)) return;
      seen.add(title);
      rows.push(title);
    });
  });
  return rows;
}

function difficultyCsv(mix) {
  const levels = [];
  if (Number(mix?.asan) > 0) levels.push(LEVEL_MAP.asan);
  if (Number(mix?.orta) > 0) levels.push(LEVEL_MAP.orta);
  if (Number(mix?.çətin ?? mix?.cetin) > 0) levels.push(LEVEL_MAP.çətin);
  return levels.join(';') || LEVEL_MAP.orta;
}

function questionLatexLine(q, index) {
  const stem = String(q?.text || q?.Text || '').replace(/__IMG__[\s\S]*?__\n?/g, '').trim();
  const opts = (q?.options || []).map((o, oi) => {
    const letter = String.fromCharCode(65 + oi);
    const text = String(o.optionText || o.text || '').replace(/^[A-E][\)\.\-:]\s*/i, '');
    return `${letter}) ${text}`;
  }).join(' \\quad ');
  return `${index + 1}. ${stem}${opts ? `\\\\\n${opts}` : ''}`;
}

export function questionsToLatex(questions, title = 'Sınaq') {
  const body = (questions || []).map(questionLatexLine).join('\n\n');
  const safeTitle = String(title || 'Sınaq').replace(/[{}]/g, '');
  return `\\documentclass[12pt,a4paper]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\geometry{margin=18mm}
\\begin{document}
\\section*{${safeTitle}}
${body || 'Suallar yoxdur.'}
\\end{document}`;
}

/**
 * Live order: create teacher exam → copy from QuestionBank → restore teacher flags → Anbar pack.
 */
export async function fulfillTeacherBankOrder(user, input = {}) {
  const asan = Math.max(0, Math.round(Number(input.mix?.asan) || 0));
  const orta = Math.max(0, Math.round(Number(input.mix?.orta) || 0));
  const hard = Math.max(0, Math.round(Number(input.mix?.çətin ?? input.mix?.cetin) || 0));
  const count = asan + orta + hard;
  if (!count) {
    const err = new Error('SUAL_YOX');
    err.code = 'SUAL_YOX';
    throw err;
  }

  const kind = String(input.kind || 'Sınaq');
  const topics = parseTopicList(input.topics);
  if (kind === 'Sınaq' && topics.length === 0) {
    const err = new Error('MOVZU_YOX');
    err.code = 'MOVZU_YOX';
    throw err;
  }

  const subjects = await fetchSubjects().catch(() => []);
  const subjectName = String(input.subject || 'Riyaziyyat').trim() || 'Riyaziyyat';
  const subject = subjects.find((s) => String(s.name || '').toLocaleLowerCase('az') === subjectName.toLocaleLowerCase('az'))
    || subjects.find((s) => /riyaz/i.test(String(s.name || '')))
    || subjects[0];
  if (!subject?.id) {
    const err = new Error('Fənn tapılmadı. Əvvəl kabinetdə fənn seçin.');
    err.code = 'FENN_YOX';
    throw err;
  }

  const durationMinutes = durationMinutesForQuestionCount(count);
  const start = new Date();
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const topicLabel = topics.length ? topics.join(', ') : kind;
  const title = `${subjectName} · ${kind} · ${topicLabel}`.slice(0, 180);

  const exam = await createExam({
    title,
    description: `[[STORAGE:order]]\n${topicLabel}\nVIS:private`,
    totalQuestions: count,
    durationMinutes,
    teacherId: user?.id,
    subjectId: subject.id,
    subjectName: subject.name || subjectName,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    isDraft: false,
    status: 'Live',
    visibility: 'private',
    isPublic: false,
    kind: 'teacher',
    rankingEnabled: true,
  });

  if (!exam?.id || String(exam.source || '') === 'local') {
    const err = new Error('İmtahan serverdə yaradılmadı. Yenidən daxil olub cəhd edin.');
    err.code = 'EXAM_CREATE';
    throw err;
  }

  const bank = await copyFromBank(exam.id, {
    audience: 'weekly',
    kind: 'teacher',
    grade: String(input.grade || '11'),
    difficultyLevel: difficultyCsv({ asan, orta, çətin: hard }),
    topics: topics.length ? topics : undefined,
    count,
    language: input.language || 'az',
  });

  if (!bank?.added) {
    const err = new Error(bank?.warnings?.join(' ') || 'Bankdan sual gəlmədi. Mövzu və ya çətinliyi dəyişin.');
    err.code = 'BANK_EMPTY';
    throw err;
  }

  try {
    await updateExam(exam.id, {
      subjectId: subject.id,
      title,
      durationMinutes,
      totalQuestions: bank.added || count,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      status: 'Live',
      kind: 'teacher',
      rankingEnabled: true,
      visibility: 'private',
      isPublic: false,
      description: `[[STORAGE:order]]\n${topicLabel}`,
    });
  } catch {
    /* suallar artıq yazılıb */
  }

  const questions = await fetchQuestions(exam.id).catch(() => []);
  const latexSource = questionsToLatex(questions, title);
  const pack = {
    id: `order-${exam.id}`,
    examId: exam.id,
    title,
    subject: subject.name || subjectName,
    grade: String(input.grade || '11'),
    kind,
    language: input.language || 'az',
    durationMinutes,
    totalQuestions: questions.length || bank.added || count,
    topics,
    mix: { asan, orta, çətin: hard },
    latexSource,
    copiedQnums: bank.copiedQnums || [],
    at: new Date().toISOString(),
    driveFileId: '',
    pdfUrl: '',
  };

  const prev = readPacks(user?.id).filter((row) => String(row.examId) !== String(exam.id));
  writePacks(user?.id, [pack, ...prev]);

  return {
    exam,
    bank,
    questions,
    pack,
    latexSource,
  };
}
