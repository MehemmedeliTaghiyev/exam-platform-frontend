import {
  copyFromBank,
  createExam,
  fetchQuestions,
  fetchSubjects,
  updateExam,
} from './examApi';
import { durationMinutesForQuestionCount } from './examDuration';
import { MATH_CALENDAR } from './mathCalendar';
import {
  nextTopicQuizDifficulty,
  topicQuizBankQuota,
  topicQuizDifficultyLabel,
} from './topicQuizDifficulty';

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

const LEVEL_ORDER = ['Sadə', 'Orta', 'Çətin'];

function easierLevel(level) {
  const idx = LEVEL_ORDER.indexOf(level);
  return idx > 0 ? LEVEL_ORDER[idx - 1] : level;
}

function audienceFallbackChain(preferred) {
  const first = preferred === undefined ? null : preferred;
  const chain = [];
  const push = (value) => {
    const key = value === undefined || value === null || value === '' ? null : String(value);
    if (chain.some((row) => row === key)) return;
    chain.push(key);
  };
  push(first);
  push('teacher');
  push('weekly');
  push(null);
  return chain;
}

/** Preferred audience first, then teacher → weekly → unscoped. */
async function copyFromBankWithAudience(examId, quota, count) {
  let last = { added: 0, warnings: [] };
  for (const audience of audienceFallbackChain(quota.audience)) {
    const body = { ...quota, count };
    if (audience) body.audience = audience;
    else delete body.audience;
    try {
      const bank = await copyFromBank(examId, body);
      if ((bank?.added || 0) > 0) return bank;
      last = bank || last;
    } catch (err) {
      last = {
        added: 0,
        warnings: [...(last.warnings || []), err?.message || 'Bank xətası'].filter(Boolean),
      };
    }
  }
  return last;
}

/**
 * Müəllim mix: hər çətinliyi ayrı-ayrı bankdan çək (DB mövzu+çətinliyə görə bölünüb).
 * Exact level boşdursa bir səviyyə asanla doldur.
 */
async function copyTeacherMixFromBank(examId, baseQuota, mix) {
  const bands = [
    [Math.max(0, Math.round(Number(mix?.asan) || 0)), LEVEL_MAP.asan],
    [Math.max(0, Math.round(Number(mix?.orta) || 0)), LEVEL_MAP.orta],
    [Math.max(0, Math.round(Number(mix?.çətin ?? mix?.cetin) || 0)), LEVEL_MAP.çətin],
  ].filter(([count]) => count > 0);

  let added = 0;
  let fallback = false;
  const used = [];
  const copiedQnums = [];
  const warnings = [];

  for (const [count, level] of bands) {
    let bank = await copyFromBankWithAudience(examId, {
      ...baseQuota,
      difficultyLevel: level,
    }, count);
    let usedLevel = level;
    if (!(bank?.added > 0)) {
      const soft = easierLevel(level);
      if (soft !== level) {
        bank = await copyFromBankWithAudience(examId, {
          ...baseQuota,
          difficultyLevel: soft,
        }, count);
        if (bank?.added > 0) {
          fallback = true;
          usedLevel = soft;
        }
      }
    }
    added += Number(bank?.added || 0);
    if (bank?.copiedQnums?.length) copiedQnums.push(...bank.copiedQnums);
    if (bank?.warnings?.length) warnings.push(...bank.warnings);
    if (bank?.added > 0) used.push(usedLevel);
  }

  return {
    bank: { added, copiedQnums, warnings },
    difficultyUsed: used.join(';') || LEVEL_MAP.orta,
    fallback,
  };
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

  const bankKind = (() => {
    const raw = String(kind || '').toLocaleLowerCase('az');
    if (/blok|block|specialty/.test(raw)) return 'blok';
    if (/burax/.test(raw)) return 'buraxılış';
    return 'teacher';
  })();
  const bankAudience = bankKind === 'blok' ? 'specialty' : bankKind === 'buraxılış' ? undefined : 'teacher';
  const { bank, difficultyUsed, fallback } = await copyTeacherMixFromBank(
    exam.id,
    {
      audience: bankAudience,
      kind: bankKind,
      grade: String(input.grade || '11'),
      topics: topics.length ? topics : undefined,
      subject: subject.name || subjectName,
      language: 'az',
    },
    { asan, orta, çətin: hard },
  );

  if (!bank?.added) {
    const hint = (bank?.warnings || []).filter(Boolean).join(' · ');
    const err = new Error(
      hint && !/status code 400/i.test(hint)
        ? hint
        : 'Bankdan sual gəlmədi. Mövzu adını bankdakı kimi yazın (məs. Üçbucaqlar) və çətinliyi dəyişib yenidən yoxlayın.',
    );
    err.code = /400|BANK_BAD_REQUEST/i.test(hint) ? 'BANK_BAD_REQUEST' : 'BANK_EMPTY';
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
      description: `[[STORAGE:order]]\n${topicLabel}${fallback ? `\n[[DIFF_FALLBACK:${difficultyUsed}]]` : ''}`,
    });
  } catch {
    /* suallar artıq yazılıb */
  }

  const questions = await fetchQuestions(exam.id).catch(() => []);
  const latexSource = questionsToLatex(questions, title);
  let pdfBlob = null;
  try {
    const { buildExamPaperPdf } = await import('./examPaperPdf');
    pdfBlob = await buildExamPaperPdf(questions, title);
  } catch {
    pdfBlob = null;
  }

  const pack = {
    id: `order-${exam.id}`,
    examId: exam.id,
    title,
    subject: subject.name || subjectName,
    grade: String(input.grade || '11'),
    kind,
    language: 'az',
    durationMinutes,
    totalQuestions: questions.length || bank.added || count,
    topics,
    mix: { asan, orta, çətin: hard },
    latexSource,
    difficultyUsed,
    difficultyFallback: Boolean(fallback),
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
    pdfBlob,
    difficultyFallback: Boolean(fallback),
  };
}

/**
 * Mövzu seriyası: bankdan yalnız o mövzu + o çətinlik (DB artıq bölünüb).
 * Sıra: orta… → ortada 1 asan → son 2 çətin.
 */
export async function fulfillTopicSeriesOrder(user, input = {}) {
  const topic = String(input.topic || parseTopicList(input.topics)[0] || '').trim();
  if (!topic) {
    const err = new Error('MOVZU_YOX');
    err.code = 'MOVZU_YOX';
    throw err;
  }
  const slot = Math.max(0, Math.round(Number(input.slot ?? input.existingCount) || 0));
  const questionCount = Math.max(1, Math.round(Number(input.count) || 10));
  const series = Math.max(1, Math.round(Number(input.series) || Number(input.days) || 0) || slot + 1);
  const quota = topicQuizBankQuota(topic, slot, questionCount, series);
  const bandLabel = topicQuizDifficultyLabel(quota.band);
  const result = await fulfillTeacherBankOrder(user, {
    ...input,
    kind: input.kind || 'Sınaq',
    topics: topic,
    subject: input.subject || 'Riyaziyyat',
    mix: quota.mix,
    grade: input.grade || '11',
  });
  const markedTitle = `${result.exam?.title || topic} · ${bandLabel}`.slice(0, 180);
  try {
    await updateExam(result.exam.id, {
      title: markedTitle,
      description: `${result.pack?.topics?.join?.(', ') || topic}\n[[TOPIC_BAND:${quota.band}]]\nVIS:private`,
    });
    result.exam = { ...result.exam, title: markedTitle };
    if (result.pack) {
      result.pack.title = markedTitle;
      result.pack.band = quota.band;
      result.pack.plannedDifficulty = quota.difficultyLevel;
    }
  } catch {
    /* title mark optional */
  }
  return { ...result, band: quota.band, bankDifficulty: quota.difficultyLevel };
}

export { nextTopicQuizDifficulty, topicQuizBankQuota };
