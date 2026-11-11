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
import {
  bankKindForExam,
  isBlokKind,
  paperCopyQuota,
  questionsPerPaper,
} from './paperQuota';

export {
  bankKindForExam,
  isBlokKind,
  paperCopyQuota,
  questionsPerPaper,
} from './paperQuota';

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

function foldTopic(s) {
  return String(s || '')
    .toLocaleLowerCase('az')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    .replace(/\s+/g, ' ')
    .trim();
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

/** Bank MainTopic dəqiq uyğunluq istəyir — kalendardakı yazılışa sal. */
export function resolveBankTopics(raw) {
  const catalog = calendarTopicSuggestions();
  return parseTopicList(raw).map((topic) => {
    const exact = catalog.find((c) => c === topic);
    if (exact) return exact;
    const folded = foldTopic(topic);
    const hit = catalog.find((c) => foldTopic(c) === folded);
    return hit || topic;
  });
}

/**
 * Bank CSV-də Audience çox vaxt boşdur.
 * kind=teacher|weekly → server AudienceFromKind ilə yenə filtrə salır → 0 sual.
 * Anbar üçün əvvəl unscoped (mövzu + çətinlik), audience yox.
 */
function bankQuotaVariants(baseQuota) {
  const shared = { ...baseQuota };
  delete shared.audience;
  delete shared.kind;
  const preferredKind = baseQuota.kind || null;
  const preferredAudience = baseQuota.audience || null;
  // weekly/teacher sonrada: Audience dolu sətirlər azdır, əksər mövzunu boşaldır.
  return [
    { ...shared },
    preferredAudience || preferredKind
      ? { ...shared, audience: preferredAudience || undefined, kind: preferredKind || undefined }
      : null,
  ].filter(Boolean);
}

async function copyFromBankOnce(examId, quota, count) {
  let last = { added: 0, warnings: [] };
  const want = typeof count === 'number' && count > 0 ? count : null;
  for (const variant of bankQuotaVariants(quota)) {
    const body = {
      ...variant,
      excludeFigures: quota.excludeFigures === true,
      gradeStrict: quota.gradeStrict === true,
      difficultyStrict: quota.difficultyStrict !== false,
    };
    if (want != null && body.count == null && body.mcqCount == null && body.situationCount == null) {
      body.count = want;
    }
    if (body.count == null && body.mcqCount == null && body.situationCount == null && body.writtenCount == null) {
      body.count = want || 25;
    }
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
 * Mix = sual sayı (mövzu seriyası).
 * from-bank hər dəfə əvvəlki bank suallarını silir — bir neçə zolağı
 * DifficultyLevel: "Sadə;Orta" ilə TƏK çağırışda göndər (nisbət dəqiq olmur, amma silinmir).
 */
async function copyTeacherMixFromBank(examId, baseQuota, mix) {
  const bands = [
    [Math.max(0, Math.round(Number(mix?.asan) || 0)), LEVEL_MAP.asan],
    [Math.max(0, Math.round(Number(mix?.orta) || 0)), LEVEL_MAP.orta],
    [Math.max(0, Math.round(Number(mix?.çətin ?? mix?.cetin) || 0)), LEVEL_MAP.çətin],
  ].filter(([count]) => count > 0);

  const total = bands.reduce((n, [c]) => n + c, 0);
  if (!total) {
    return { bank: { added: 0, copiedQnums: [], warnings: [] }, difficultyUsed: LEVEL_MAP.orta, fallback: false };
  }

  // Tək zolaq — eyni çətinlik; 11 çatışsa eyni çətinlik 9-dan (API grade soft).
  if (bands.length === 1) {
    const [count, level] = bands[0];
    let bank = await copyFromBankOnce(examId, {
      ...baseQuota,
      difficultyLevel: level,
    }, count);
    let fallback = false;
    if (!(bank?.added > 0)) {
      bank = await copyFromBankOnce(examId, {
        ...baseQuota,
        grade: undefined,
        difficultyLevel: level,
      }, count);
      if ((bank?.added || 0) > 0) fallback = true;
    }
    return {
      bank: bank || { added: 0, copiedQnums: [], warnings: [] },
      difficultyUsed: level,
      fallback,
    };
  }

  // Çox zolaq: bir çağırışda bütün səviyyələr (replace silməsin).
  const levels = bands.map(([, level]) => level);
  const bank = await copyFromBankOnce(examId, {
    ...baseQuota,
    difficultyLevel: levels.join(';'),
  }, total);
  return {
    bank: bank || { added: 0, copiedQnums: [], warnings: [] },
    difficultyUsed: levels.join(';'),
    fallback: false,
  };
}

/**
 * Tam kağız (25/30) mütləq. Bank böyükdür — filtrləri addım-addım açırıq:
 * 1) 11 üstün + eyni çətinlik + şəkilsiz
 * 2) eyni çətinlik, bütün siniflər, şəkilsiz
 * 3) eyni çətinlik + şəkilli də (FigureUrl boş olmayanlar)
 * 4) Blok strukturu işləməsə → sadə count:30
 * 5) son çarə: mövzu saxla, çətinlik yumşaq (əvvəl istənilən)
 */
async function copyOnePaperFromBank(examId, baseMeta, difficultyLevel, kind) {
  const needed = questionsPerPaper(kind);
  const topics = baseMeta.topics;
  const language = baseMeta.language || 'az';
  const grade = baseMeta.grade || undefined;

  const attempts = [
    {
      label: 'grade+diff+nofig',
      grade,
      excludeFigures: true,
      difficultyStrict: true,
      difficultyLevel,
      fillAny: true,
    },
    {
      label: 'allgrade+diff+nofig',
      grade: undefined,
      excludeFigures: true,
      difficultyStrict: true,
      difficultyLevel,
      fillAny: true,
    },
    {
      label: 'grade+diff+figok',
      grade,
      excludeFigures: false,
      difficultyStrict: true,
      difficultyLevel,
      fillAny: true,
    },
    {
      label: 'allgrade+diff+figok',
      grade: undefined,
      excludeFigures: false,
      difficultyStrict: true,
      difficultyLevel,
      fillAny: true,
    },
  ];

  // Blok: əvvəl rəsmi 22+5+3, sonra fillAny 30.
  if (isBlokKind(kind)) {
    attempts.unshift({
      label: 'blok-structure',
      grade,
      excludeFigures: true,
      difficultyStrict: true,
      difficultyLevel,
      fillAny: false,
    });
  }

  // Son çarə — eyni mövzu, çətinlik geniş (bankda mütləq dolsun).
  attempts.push({
    label: 'topic-anydiff',
    grade: undefined,
    excludeFigures: false,
    difficultyStrict: false,
    difficultyLevel: ['Çətin', 'Orta', 'Sadə'].includes(difficultyLevel)
      ? `${difficultyLevel};Orta;Sadə;Çətin`
      : difficultyLevel,
    fillAny: true,
  });

  let best = { added: 0, copiedQnums: [], warnings: [] };
  let fallback = false;
  let usedLevel = difficultyLevel;

  for (const step of attempts) {
    // fillAny: kind göndərmə — əks halda Blok PaperQuotas count-u əzir (22+5+3).
    const quota = step.fillAny
      ? {
        count: needed,
        difficultyLevel: step.difficultyLevel,
        topics,
        language,
        grade: step.grade,
        excludeFigures: step.excludeFigures,
      }
      : {
        ...paperCopyQuota(kind, difficultyLevel),
        topics,
        language,
        grade: step.grade,
        excludeFigures: step.excludeFigures,
        difficultyLevel: step.difficultyLevel,
      };

    const body = {
      ...quota,
      gradeStrict: false,
      difficultyStrict: step.difficultyStrict,
      excludeFigures: step.excludeFigures,
    };

    const bank = await copyFromBankOnce(examId, body, needed);
    const added = Number(bank?.added || 0);
    if (added > Number(best.added || 0)) {
      best = bank;
      if (step.label !== 'grade+diff+nofig') fallback = true;
      if (step.label === 'topic-anydiff') usedLevel = `${difficultyLevel}+geniş`;
    }
    if (added >= needed) {
      return {
        bank,
        difficultyUsed: usedLevel,
        fallback: step.label !== 'grade+diff+nofig',
        needed,
      };
    }
  }

  return {
    bank: best || { added: 0, copiedQnums: [], warnings: [] },
    difficultyUsed: usedLevel,
    fallback,
    needed,
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

async function resolveSubject(input) {
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
  return { subject, subjectName };
}

/**
 * Tək imtahan yaradıb bankdan doldurur.
 * mix = sual sayı (default) və ya unit:'papers' ilə quiz sayı.
 */
async function createFilledTeacherExam(user, input = {}) {
  const asan = Math.max(0, Math.round(Number(input.mix?.asan) || 0));
  const orta = Math.max(0, Math.round(Number(input.mix?.orta) || 0));
  const hard = Math.max(0, Math.round(Number(input.mix?.çətin ?? input.mix?.cetin) || 0));
  const paperMode = input.unit === 'papers' || input.asQuizCount === true;
  const singleLevel = input.difficultyLevel
    || (asan && !orta && !hard ? LEVEL_MAP.asan
      : orta && !asan && !hard ? LEVEL_MAP.orta
        : hard && !asan && !orta ? LEVEL_MAP.çətin
          : null);

  const kind = String(input.kind || 'Sınaq');
  const topics = resolveBankTopics(input.topics);
  if (kind === 'Sınaq' && topics.length === 0) {
    const err = new Error('MOVZU_YOX');
    err.code = 'MOVZU_YOX';
    throw err;
  }

  const perPaper = questionsPerPaper(kind);
  // Anbar kağızı: Sınaq/Buraxılış = 25, Blok = 30. Mix heç vaxt sual sayı deyil.
  const count = paperMode ? perPaper : ((asan + orta + hard) || perPaper);
  if (!paperMode && !(asan + orta + hard)) {
    const err = new Error('SUAL_YOX');
    err.code = 'SUAL_YOX';
    throw err;
  }

  const { subject, subjectName } = await resolveSubject(input);
  const durationMinutes = durationMinutesForQuestionCount(count);
  const start = new Date();
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const topicLabel = topics.length ? topics.join(', ') : kind;
  const bandLabel = singleLevel || '';
  const paperTag = input.paperIndex && input.paperTotal
    ? ` · ${input.paperIndex}/${input.paperTotal}`
    : '';
  const title = `${subjectName} · ${kind}${bandLabel ? ` · ${bandLabel}` : ''} · ${topicLabel}${paperTag}`.slice(0, 180);

  const exam = await createExam({
    title,
    description: `[[STORAGE:order]]\n${topicLabel}\nVIS:private`,
    totalQuestions: count,
    durationMinutes,
    teacherId: user?.id,
    subjectId: Number(subject.id),
    subjectName: subject.name || subjectName,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    isDraft: false,
    status: 'Live',
    visibility: 'private',
    isPublic: false,
    rankingEnabled: true,
  });

  if (!exam?.id || String(exam.source || '') === 'local') {
    const err = new Error('İmtahan serverdə yaradılmadı. Yenidən daxil olub cəhd edin.');
    err.code = 'EXAM_CREATE';
    throw err;
  }

  // Sinif soft: 11 üstün, çatışmayanı 9 doldurur (API Grade soft + Difficulty soft).
  const baseMeta = {
    grade: String(input.grade || '11'),
    topics: topics.length ? topics : undefined,
    language: 'az',
    excludeFigures: true,
  };

  let bank;
  let difficultyUsed;
  let fallback = false;

  if (paperMode && singleLevel) {
    const copied = await copyOnePaperFromBank(exam.id, baseMeta, singleLevel, kind);
    bank = copied.bank;
    difficultyUsed = copied.difficultyUsed;
    fallback = copied.fallback;
  } else if (paperMode) {
    // paperMode amma singleLevel yox — yenə tam kağız (orta default).
    const copied = await copyOnePaperFromBank(exam.id, baseMeta, LEVEL_MAP.orta, kind);
    bank = copied.bank;
    difficultyUsed = copied.difficultyUsed;
    fallback = copied.fallback;
  } else {
    const bankKind = bankKindForExam(kind);
    const bankAudience = bankKind === 'blok' ? 'specialty' : null;
    const copied = await copyTeacherMixFromBank(
      exam.id,
      {
        ...(bankAudience ? { audience: bankAudience } : {}),
        ...(bankKind ? { kind: bankKind } : {}),
        grade: baseMeta.grade,
        topics: baseMeta.topics,
        language: 'az',
        excludeFigures: true,
      },
      { asan, orta, çətin: hard },
    );
    bank = copied.bank;
    difficultyUsed = copied.difficultyUsed;
    fallback = copied.fallback;
  }

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

  // Bankda minlərlə sual var — 25/30 dolmalıdır. Az gələrsə açıq xəta.
  if (paperMode && bank.added < count) {
    const err = new Error(
      `Bankdan ${bank.added}/${count} sual gəldi (${kind}, ${difficultyUsed}). Yenidən cəhd edin və ya mövzunu dəqiqləşdirin.`,
    );
    err.code = 'BANK_SHORT';
    err.added = bank.added;
    err.needed = count;
    throw err;
  }

  try {
    await updateExam(exam.id, {
      subjectId: subject.id,
      title,
      durationMinutes,
      totalQuestions: count,
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

  const rawQuestions = await fetchQuestions(exam.id).catch(() => []);
  // Yalnız gövdədə real şəkil olanları kənarlaşdır — FIGURE_QNUMS ilə kağızı 1 suala endirmə.
  const { questionHasEmbeddedFigure } = await import('./questionImage');
  let questions = rawQuestions || [];
  if (paperMode) {
    const textOnly = questions.filter((q) => !questionHasEmbeddedFigure(q));
    // Filtr demək olar hər şeyi silirsə, tam siyahını saxla (şəkilsiz render).
    if (textOnly.length >= Math.min(count, questions.length) * 0.6) {
      questions = textOnly;
    }
  }
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
    totalQuestions: count,
    topics,
    mix: paperMode
      ? { asan: singleLevel === LEVEL_MAP.asan ? 1 : 0, orta: singleLevel === LEVEL_MAP.orta ? 1 : 0, çətin: singleLevel === LEVEL_MAP.çətin ? 1 : 0 }
      : { asan, orta, çətin: hard },
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
 * Live order: create teacher exam → copy from QuestionBank → restore teacher flags → Anbar pack.
 * Default: mix = sual sayı.
 * unit:'papers' | asQuizCount: mix = quiz kağızı sayı (hər biri 25/30 sual).
 */
export async function fulfillTeacherBankOrder(user, input = {}) {
  const asan = Math.max(0, Math.round(Number(input.mix?.asan) || 0));
  const orta = Math.max(0, Math.round(Number(input.mix?.orta) || 0));
  const hard = Math.max(0, Math.round(Number(input.mix?.çətin ?? input.mix?.cetin) || 0));
  const paperMode = input.unit === 'papers' || input.asQuizCount === true;

  if (!paperMode) {
    return createFilledTeacherExam(user, input);
  }

  const slots = [];
  for (let i = 0; i < asan; i += 1) slots.push(LEVEL_MAP.asan);
  for (let i = 0; i < orta; i += 1) slots.push(LEVEL_MAP.orta);
  for (let i = 0; i < hard; i += 1) slots.push(LEVEL_MAP.çətin);

  if (!slots.length) {
    const err = new Error('SUAL_YOX');
    err.code = 'SUAL_YOX';
    throw err;
  }

  const results = [];
  let anyFallback = false;
  for (let i = 0; i < slots.length; i += 1) {
    const one = await createFilledTeacherExam(user, {
      ...input,
      unit: 'papers',
      asQuizCount: true,
      difficultyLevel: slots[i],
      mix: {
        asan: slots[i] === LEVEL_MAP.asan ? 1 : 0,
        orta: slots[i] === LEVEL_MAP.orta ? 1 : 0,
        çətin: slots[i] === LEVEL_MAP.çətin ? 1 : 0,
      },
      paperIndex: i + 1,
      paperTotal: slots.length,
    });
    if (one.difficultyFallback) anyFallback = true;
    results.push(one);
  }

  const last = results[results.length - 1];
  return {
    ...last,
    results,
    packs: results.map((r) => r.pack),
    pdfBlobs: results.map((r) => r.pdfBlob).filter(Boolean),
    difficultyFallback: anyFallback,
    paperCount: results.length,
    questionsPerPaper: questionsPerPaper(input.kind),
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
    // mövzu seriyası: mix = sual sayı, quiz sayı deyil
    unit: 'questions',
    asQuizCount: false,
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
