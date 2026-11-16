import { examVisibility } from './examVisibility.js';
import { canShareExamPublic } from './syllabus.js';
import { isClientGeneratedExamId, parseExamDate, resolveExamStatus, toDateInput } from './utils.js';
import { isLiveWeeklyExamId, isStudentWeeklyExam } from './weeklyMath.js';

/**
 * Core catalog the student exams page and teacher profile try, in order.
 * Live SmarterASP (2026-11-16) still has no IsPublic; GET /Exams/public is
 * treated as GET /Exams/{id} and 400s. Keep calling these so a Core PR that
 * adds isPublic / teacherId filters lights up without another frontend change.
 *
 * Contract (do not publish Core from this repo):
 * - POST/PUT /Exams send isPublic + visibility (and VIS:public in Description).
 * - List: GET /Exams/cards (GetStudentExamCardsAsync), then
 *   GET /Exams?isPublic=true, GET /Exams?visibility=public, GET /Exams/public.
 * - Teacher: same with ?teacherId=.
 * - A row is public iff isPublic/IsPublic true, visibility/Visibility === "public",
 *   or Description contains VIS:public. Client still blocks multi-topic papers.
 */
export const PUBLIC_EXAM_CATALOG_PATHS = [
  '/Exams/cards',
  '/Exams/cards?isPublic=true',
  '/Exams?isPublic=true&pageSize=50',
  '/Exams?visibility=public&pageSize=50',
  '/Exams/public',
];

export function publicExamCatalogPathsForTeacher(teacherId) {
  const id = encodeURIComponent(teacherId ?? '');
  if (!id) return [...PUBLIC_EXAM_CATALOG_PATHS];
  return [
    `/Exams/cards?teacherId=${id}`,
    `/Exams/cards?teacherId=${id}&isPublic=true`,
    `/Exams?teacherId=${id}&isPublic=true&pageSize=50`,
    `/Exams?teacherId=${id}&visibility=public&pageSize=50`,
    `/Exams/public?teacherId=${id}`,
  ];
}

export function examOwnerKey(exam) {
  const tid = exam?.teacherId ?? exam?.TeacherId;
  return tid == null || tid === '' ? '' : String(tid);
}

function listedAsPublic(exam) {
  if (!exam) return false;
  const flag = exam.isPublic ?? exam.IsPublic ?? exam.visibility ?? exam.Visibility;
  if (flag === true || String(flag).toLowerCase() === 'public') return true;
  if (flag === false || String(flag).toLowerCase() === 'private') return false;
  return /VIS:public/i.test(String(exam.description || exam.Description || ''));
}

export function publicExamsOfTeacher(exams, teacherId) {
  const owner = String(teacherId ?? '');
  if (!owner) return [];
  return (exams || []).filter((exam) => {
    if (examOwnerKey(exam) !== owner) return false;
    return keepPublicCatalogExam(exam);
  });
}

export function keepPublicCatalogExam(exam) {
  if (!exam || (exam.id == null && exam.Id == null)) return false;
  if (isClientGeneratedExamId(exam.id ?? exam.Id)) return false;
  if (resolveExamStatus(exam) === 'Draft') return false;
  const weekly = isStudentWeeklyExam(exam) || isLiveWeeklyExamId(exam.id ?? exam.Id);
  if (weekly) return true;
  if (!canShareExamPublic(exam)) return false;
  return listedAsPublic(exam) || examVisibility(exam) === 'public';
}

export function examSubject(exam) {
  return String(exam?.subjectName || exam?.subject || exam?.SubjectName || 'Digər').trim() || 'Digər';
}

export function examMoment(exam) {
  return parseExamDate(
    exam?.startTime || exam?.StartTime || exam?.createdAt || exam?.CreatedAt || exam?.endTime || exam?.EndTime,
  );
}

export function dayStamp(value) {
  const d = value instanceof Date ? value : parseExamDate(value);
  if (!d || Number.isNaN(d.getTime())) return '';
  return toDateInput(d);
}

export function examDateKeys(exam) {
  const keys = new Set();
  [
    exam?.startTime,
    exam?.StartTime,
    exam?.createdAt,
    exam?.CreatedAt,
    exam?.endTime,
    exam?.EndTime,
    exam?.submittedAt,
    exam?.SubmittedAt,
  ].forEach((value) => {
    const raw = String(value || '');
    const prefix = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (prefix) keys.add(prefix[1]);
    const parsed = parseExamDate(value);
    if (parsed) keys.add(toDateInput(parsed));
  });
  return keys;
}

export function examSearchBlob(exam) {
  const desc = String(exam?.description || exam?.Description || '')
    .replace(/VIS:(public|private)\s*/gi, '')
    .replace(/DRVFILE:\S+\s*/gi, '');
  const title = String(exam?.title || exam?.Title || exam?.examTitle || '')
    .replace(/VIS:(public|private)\s*/gi, '')
    .replace(/DRVFILE:\S+\s*/gi, '');
  return `${title} ${desc} ${exam?.subjectName || exam?.subject || exam?.SubjectName || ''} ${exam?.teacherName || exam?.TeacherName || ''}`
    .toLocaleLowerCase('az');
}

export function examMatchesSearch(exam, { name = '', date = '' } = {}) {
  const q = String(name || '').trim().toLocaleLowerCase('az');
  if (q && !examSearchBlob(exam).includes(q)) return false;
  const day = String(date || '').trim();
  if (day && !examDateKeys(exam).has(day)) return false;
  return true;
}

export function filterPublicExams(exams, {
  dateMode = 'all',
  pickDate = '',
  subject = 'all',
  query = '',
  savedIds = null,
} = {}) {
  const today = new Date();
  const todayKey = dayStamp(today);
  const y = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  y.setDate(y.getDate() - 1);
  const yesterdayKey = dayStamp(y);
  const sub = String(subject || 'all');
  const saved = savedIds instanceof Set ? savedIds : null;

  return (exams || []).filter((exam) => {
    if (saved && !saved.has(String(exam?.id))) return false;
    if (sub !== 'all' && examSubject(exam) !== sub) return false;
    if (!examMatchesSearch(exam, { name: query })) return false;
    if (dateMode === 'all') return true;
    const keys = examDateKeys(exam);
    if (dateMode === 'today') return keys.has(todayKey);
    if (dateMode === 'yesterday') return keys.has(yesterdayKey);
    if (dateMode === 'pick') return Boolean(pickDate) && keys.has(pickDate);
    return true;
  });
}

export function groupBySubject(exams) {
  const map = new Map();
  (exams || []).forEach((exam) => {
    const key = examSubject(exam);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(exam);
  });
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'az'));
}

export function uniqueSubjects(exams) {
  return [...new Set((exams || []).map(examSubject))].sort((a, b) => a.localeCompare(b, 'az'));
}

export function enteredExamIds(history) {
  return new Set(
    (history || [])
      .map((h) => h?.examId ?? h?.ExamId)
      .filter((id) => id != null)
      .map(String),
  );
}

export function subjectProgress(publicExams, history, joinedSubjects) {
  const entered = enteredExamIds(history);
  const list = (joinedSubjects || []).filter(Boolean);
  return list
    .map((subject) => {
      const pool = (publicExams || []).filter((exam) => examSubject(exam) === subject);
      return {
        subject,
        total: pool.length,
        entered: pool.filter((exam) => entered.has(String(exam.id ?? exam.Id))).length,
      };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => a.subject.localeCompare(b.subject, 'az'));
}
