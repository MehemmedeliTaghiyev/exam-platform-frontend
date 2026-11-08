import {
  findIntervalByStart,
  intervalContaining,
  lastWeeklyOnOrBefore,
  MATH_CALENDAR,
  tbilisiYmd,
  weeklyIntervals,
} from './mathCalendar.js';

function parseBand(raw) {
  const key = String(raw || '').trim().toLowerCase().replace(/ı/g, 'i').replace(/ə/g, 'e');
  if (['easy', 'asan', 'sade', 'sadə'].includes(key)) return 'easy';
  if (['medium', 'middle', 'orta'].includes(key)) return 'medium';
  return null;
}

/** Empty Respublika listing — never bind as weekly. */
export const REPUBLIC_NOV_2026_EXAM_ID = '94';
/** Leftover smoke copy — do not show as weekly. */
export const WEEKLY_SMOKE_EXAM_ID = '96';
/** Live weekly copies for 8–21 Nov 2026. */
export const LIVE_WEEKLY_EASY_EXAM_ID = '97';
export const LIVE_WEEKLY_MEDIUM_EXAM_ID = '98';
export const LIVE_WEEKLY_INTERVAL_START = '2026-11-08';

const HIDDEN_WEEKLY_IDS = new Set([REPUBLIC_NOV_2026_EXAM_ID, WEEKLY_SMOKE_EXAM_ID]);

export function examIdOf(exam) {
  return String(exam?.id ?? exam?.Id ?? '');
}

export function examKindOf(exam) {
  return String(
    exam?.kind
    || exam?.Kind
    || exam?.examKind
    || exam?.ExamKind
    || exam?.nov
    || exam?.Nov
    || '',
  ).trim();
}

function examBlob(exam) {
  return `${exam?.title || exam?.Title || ''} ${exam?.description || exam?.Description || ''} ${examKindOf(exam)}`;
}

export function isHiddenWeeklyExam(examOrId) {
  const id = typeof examOrId === 'object' ? examIdOf(examOrId) : String(examOrId || '');
  return HIDDEN_WEEKLY_IDS.has(id);
}

export function isLiveWeeklyExamId(id) {
  const key = String(id ?? '');
  return key === LIVE_WEEKLY_EASY_EXAM_ID || key === LIVE_WEEKLY_MEDIUM_EXAM_ID;
}

/**
 * ExamPulse kind → audience.
 * Sınaq → weekly, Buraxılış/Respublika → mixed, Blok → specialty.
 */
export function examPulseAudience(exam) {
  const id = examIdOf(exam);
  if (id === WEEKLY_SMOKE_EXAM_ID) return 'hidden';
  if (id === REPUBLIC_NOV_2026_EXAM_ID) return 'mixed';
  if (isLiveWeeklyExamId(id)) return 'weekly';

  const kind = examKindOf(exam);
  const blob = examBlob(exam);

  if (/respublika/i.test(kind) || /respublika/i.test(blob)) return 'mixed';
  if (/burax[ıi]l[ıi][sş]/i.test(kind) || /burax[ıi]l[ıi][sş]/i.test(blob)) return 'mixed';
  if (/blok/i.test(kind)) return 'specialty';
  if (/s[ıi]naq/i.test(kind) || /həftəlik/i.test(blob)) {
    if (/ümumi/i.test(blob) && /qar[iı][sş][iı]q/i.test(blob)) return 'hidden';
    return 'weekly';
  }
  return 'other';
}

export function weeklyBandOf(exam) {
  const id = examIdOf(exam);
  if (id === LIVE_WEEKLY_EASY_EXAM_ID) return 'easy';
  if (id === LIVE_WEEKLY_MEDIUM_EXAM_ID) return 'medium';
  const marked = parseBand(exam?.weeklyBand || exam?.band || exam?.level || '');
  if (marked) return marked;
  return parseBand(examBlob(exam));
}

function examInInterval(exam, interval) {
  if (!interval) return false;
  const start = exam?.startTime || exam?.StartTime || exam?.createdAt || exam?.CreatedAt;
  if (!start) return false;
  const key = tbilisiYmd(start);
  return interval.start <= key && key <= interval.end;
}

function pickFromList(exams, id) {
  return (exams || []).find((exam) => examIdOf(exam) === String(id)) || null;
}

function stubWeeklyPaper(id, band, interval) {
  const label = band === 'easy' ? 'Asan' : 'Orta';
  return {
    id: Number(id) || id,
    title: `Həftəlik sınaq · ${label}`,
    subjectName: 'Riyaziyyat',
    kind: 'Sınaq',
    weeklyBand: band,
    visibility: 'public',
    isPublic: true,
    status: 'Weekly',
    totalQuestions: null,
    durationMinutes: 90,
    intervalStart: interval?.start,
  };
}

function matchBandInInterval(exams, interval, band) {
  return (exams || []).find((exam) => {
    if (isHiddenWeeklyExam(exam)) return false;
    if (examPulseAudience(exam) !== 'weekly') return false;
    if (weeklyBandOf(exam) !== band) return false;
    if (examInInterval(exam, interval)) return true;
    return false;
  }) || null;
}

export function weeklyPairForInterval(interval, exams = []) {
  if (!interval?.send?.weekly) return { easy: null, medium: null, archived: true };
  const live = interval.start === LIVE_WEEKLY_INTERVAL_START;
  let easy = live
    ? pickFromList(exams, LIVE_WEEKLY_EASY_EXAM_ID) || stubWeeklyPaper(LIVE_WEEKLY_EASY_EXAM_ID, 'easy', interval)
    : matchBandInInterval(exams, interval, 'easy');
  let medium = live
    ? pickFromList(exams, LIVE_WEEKLY_MEDIUM_EXAM_ID) || stubWeeklyPaper(LIVE_WEEKLY_MEDIUM_EXAM_ID, 'medium', interval)
    : matchBandInInterval(exams, interval, 'medium');
  if (easy && isHiddenWeeklyExam(easy)) easy = live ? stubWeeklyPaper(LIVE_WEEKLY_EASY_EXAM_ID, 'easy', interval) : null;
  if (medium && isHiddenWeeklyExam(medium)) medium = live ? stubWeeklyPaper(LIVE_WEEKLY_MEDIUM_EXAM_ID, 'medium', interval) : null;
  const today = tbilisiYmd();
  return {
    easy,
    medium,
    archived: interval.end < today,
  };
}

export function weeklyPairForDate(ymd, exams = []) {
  const interval = lastWeeklyOnOrBefore(intervalContaining(ymd) || findIntervalByStart(MATH_CALENDAR.from));
  return { interval, ...weeklyPairForInterval(interval, exams) };
}

export function republicMixedExams(exams = []) {
  return (exams || []).filter((exam) => {
    const id = examIdOf(exam);
    if (id === WEEKLY_SMOKE_EXAM_ID || isLiveWeeklyExamId(id)) return false;
    if (id === REPUBLIC_NOV_2026_EXAM_ID) return true;
    if (examPulseAudience(exam) !== 'mixed') return false;
    const blob = `${exam?.title || exam?.Title || ''} ${examKindOf(exam)}`;
    return /respublika/i.test(blob);
  });
}

export function isStudentWeeklyExam(exam) {
  if (!exam || isHiddenWeeklyExam(exam)) return false;
  return examPulseAudience(exam) === 'weekly';
}

export function archiveWeeklyWindows(todayYmd = tbilisiYmd()) {
  return weeklyIntervals().filter((row) => row.end < todayYmd);
}
