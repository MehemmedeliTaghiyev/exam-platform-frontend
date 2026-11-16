import {
  findIntervalByStart,
  intervalContaining,
  lastWeeklyOnOrBefore,
  MATH_CALENDAR,
  tbilisiYmd,
  weeklyIntervals,
} from './mathCalendar.js';

/** Empty Respublika listing — never bind as weekly. */
export const REPUBLIC_NOV_2026_EXAM_ID = '94';
/** Leftover smoke copy — do not show as weekly. */
export const WEEKLY_SMOKE_EXAM_ID = '96';
/** Leftover orta half of the cancelled asan+orta pair. */
export const LIVE_WEEKLY_MEDIUM_EXAM_ID = '98';
/** Live weekly copy for 8–21 Nov 2026 (one paper; not labeled asan/orta). */
export const LIVE_WEEKLY_EXAM_ID = '97';
/** @deprecated Use LIVE_WEEKLY_EXAM_ID — pair UI is gone. */
export const LIVE_WEEKLY_EASY_EXAM_ID = LIVE_WEEKLY_EXAM_ID;
export const LIVE_WEEKLY_INTERVAL_START = '2026-11-08';

const HIDDEN_WEEKLY_IDS = new Set([
  REPUBLIC_NOV_2026_EXAM_ID,
  WEEKLY_SMOKE_EXAM_ID,
  LIVE_WEEKLY_MEDIUM_EXAM_ID,
]);

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
  return String(id ?? '') === LIVE_WEEKLY_EXAM_ID;
}

/**
 * ExamPulse kind → audience.
 * Sınaq → weekly, Buraxılış/Respublika → mixed, Blok → specialty.
 */
export function examPulseAudience(exam) {
  const id = examIdOf(exam);
  if (id === WEEKLY_SMOKE_EXAM_ID || id === LIVE_WEEKLY_MEDIUM_EXAM_ID) return 'hidden';
  if (id === REPUBLIC_NOV_2026_EXAM_ID) return 'mixed';
  if (isLiveWeeklyExamId(id)) return 'weekly';

  const kind = examKindOf(exam);
  const blob = examBlob(exam);

  if (/respublika/i.test(kind) || /respublika/i.test(blob)) return 'mixed';
  if (/burax[ıi]l[ıi][sş]/i.test(kind) || /burax[ıi]l[ıi][sş]/i.test(blob)) return 'mixed';
  if (/blok/i.test(kind)) return 'specialty';
  if (/weekly/i.test(kind) || /s[ıi]naq/i.test(kind) || /həftəlik/i.test(blob)) {
    if (/ümumi/i.test(blob) && /qar[iı][sş][iı]q/i.test(blob)) return 'hidden';
    return 'weekly';
  }
  return 'other';
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

function matchWeeklyInInterval(exams, interval) {
  const hits = (exams || []).filter((exam) => {
    if (isHiddenWeeklyExam(exam)) return false;
    if (examPulseAudience(exam) !== 'weekly') return false;
    return examInInterval(exam, interval);
  });
  hits.sort((a, b) => Number(examIdOf(a) || 0) - Number(examIdOf(b) || 0));
  return hits[0] || null;
}

/** One weekly paper per calendar window. No asan/orta pair. */
export function weeklyPaperForInterval(interval, exams = []) {
  if (!interval?.send?.weekly) return { exam: null, archived: true };
  const live = interval.start === LIVE_WEEKLY_INTERVAL_START;
  let exam = live
    ? pickFromList(exams, LIVE_WEEKLY_EXAM_ID) || matchWeeklyInInterval(exams, interval)
    : matchWeeklyInInterval(exams, interval);
  if (exam && isHiddenWeeklyExam(exam)) exam = null;
  const today = tbilisiYmd();
  return {
    exam,
    archived: interval.end < today,
  };
}

/** @deprecated One paper now — use weeklyPaperForInterval. */
export function weeklyPairForInterval(interval, exams = []) {
  const row = weeklyPaperForInterval(interval, exams);
  return { easy: row.exam, medium: null, exam: row.exam, archived: row.archived };
}

export function weeklyPaperForDate(ymd, exams = []) {
  const interval = lastWeeklyOnOrBefore(intervalContaining(ymd) || findIntervalByStart(MATH_CALENDAR.from));
  return { interval, ...weeklyPaperForInterval(interval, exams) };
}

/** @deprecated Use weeklyPaperForDate. */
export function weeklyPairForDate(ymd, exams = []) {
  const row = weeklyPaperForDate(ymd, exams);
  return { ...row, easy: row.exam, medium: null };
}

export function republicMixedExams(exams = []) {
  return (exams || []).filter((exam) => {
    const id = examIdOf(exam);
    if (id === WEEKLY_SMOKE_EXAM_ID || isLiveWeeklyExamId(id) || id === LIVE_WEEKLY_MEDIUM_EXAM_ID) {
      return false;
    }
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
