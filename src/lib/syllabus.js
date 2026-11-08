import { displayExamDescription } from './driveLinks';
import { examVisibility } from './examVisibility';
import { subscribedTeacherIds } from './groupSubscriptions';
import { studentResultsReady } from './utils';
import { MATH_CALENDAR, calendarTopicId } from './mathCalendar';
import { examPulseAudience, isStudentWeeklyExam } from './weeklyMath';

const MIXED_MARK = '[[MIXED]]';

export const SYLLABUS_BY_SUBJECT = {
  Riyaziyyat: [
    'Natural ədədlər və bölünmə',
    'Kəsrlər və faiz',
    'Tənliklər',
    'Bərabərsizliklər',
    'Funksiyalar',
    'Triqonometriya',
    'Planimetriya',
    'Stereometriya',
    'Ardıcıllıqlar və silsilə',
    'Törəmə',
    'İntegral',
    'Ehtimal və statistika',
  ],
  'Azərbaycan dili': [
    'Fonetika',
    'Leksika',
    'Söz yaradıcılığı',
    'Morfologiya',
    'Sintaksis',
    'Cümlə üzvləri',
    'Orfoqrafiya',
    'Durğu işarələri',
    'Üslubiyyat',
    'Mətnin təhlili',
  ],
  'İngilis dili': [
    'Qrammatika',
    'Zamanlar',
    'Lüğət',
    'Oxu',
    'Yazı',
    'Dinləmə',
    'Danışıq',
    'İdiomlar',
  ],
  Kimya: [
    'Atom quruluşu',
    'Kimyəvi rabitə',
    'Maddənin halları',
    'Kimyəvi reaksiyalar',
    'Məhlullar',
    'Turşular və əsaslar',
    'Üzvi kimya',
    'Metalllar',
  ],
  Biologiya: [
    'Hüceyrə',
    'Genetika',
    'Təkamül',
    'Bitkilər',
    'Heyvanlar',
    'İnsan anatomiyası',
    'Ekologiya',
    'Mikrobiologiya',
  ],
  Fizika: [
    'Mexanika',
    'Dinamika',
    'İş və enerji',
    'Molekulyar fizika',
    'Elektrik',
    'Maqnitizm',
    'Rəqslər və dalğalar',
    'Optika',
    'Atom fizikası',
  ],
};

function slug(text) {
  return String(text || '')
    .toLocaleLowerCase('az')
    .replace(/[^a-z0-9əöüğçışı\- ]/gi, '')
    .trim()
    .replace(/\s+/g, '-');
}

export const OPEN_SYLLABUS_SUBJECT = 'Riyaziyyat';

export function syllabusSubjects() {
  return Object.keys(SYLLABUS_BY_SUBJECT);
}

export function isSyllabusSubjectOpen(subject) {
  return String(subject || '').trim().toLocaleLowerCase('az') === OPEN_SYLLABUS_SUBJECT.toLocaleLowerCase('az');
}

export function syllabusTopics(subject) {
  const titles = SYLLABUS_BY_SUBJECT[subject] || [];
  return titles.map((title, index) => ({
    id: `${slug(subject)}__${slug(title)}`,
    subject,
    title,
    order: index + 1,
  }));
}

export function allSyllabusTopics() {
  return syllabusSubjects().flatMap((subject) => syllabusTopics(subject));
}

export function catchAllTopic(subject) {
  const titles = SYLLABUS_BY_SUBJECT[subject] || [];
  return {
    id: `${slug(subject)}__diger`,
    subject,
    title: 'Digər',
    order: titles.length + 1,
    catchAll: true,
  };
}

export function findSyllabusTopic(id) {
  let raw = String(id || '');
  try { raw = decodeURIComponent(raw); } catch { /* keep */ }
  const found = allSyllabusTopics().find((topic) => topic.id === raw);
  if (found) return found;
  const subject = syllabusSubjects().find((name) => `${slug(name)}__diger` === raw);
  return subject ? catchAllTopic(subject) : null;
}

function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('az')
    .replace(/[[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function examBlob(exam) {
  const title = String(exam?.title || exam?.Title || '').replace(/VIS:(public|private)/gi, '');
  const desc = displayExamDescription(exam) || String(exam?.description || exam?.Description || '');
  return normalize(`${title} ${desc} ${exam?.subjectName || exam?.subject || ''}`);
}

export function isMixedExamKind(kind) {
  return /blok|burax[ıi]l[ıi][sş]/i.test(String(kind || ''));
}

export function isMixedMarked(exam) {
  const raw = `${exam?.title || ''} ${exam?.description || exam?.Description || ''} ${exam?.mixed ? 'qarışıq' : ''}`;
  if (raw.includes(MIXED_MARK)) return true;
  return /qar[iı][sş][iı]q|blok sınaq|ümumi sınaq|bir neçə mövzu/i.test(raw);
}

function mathCalendarTopicPool() {
  const seen = new Set();
  const rows = [];
  MATH_CALENDAR.intervals.forEach((interval) => {
    (interval.topics || []).forEach((title) => {
      const id = calendarTopicId(title);
      if (seen.has(id)) return;
      seen.add(id);
      rows.push({ id, subject: OPEN_SYLLABUS_SUBJECT, title });
    });
  });
  return rows;
}

export function examSyllabusTopics(exam) {
  const subject = String(exam?.subjectName || exam?.subject || exam?.SubjectName || '').trim();
  const blob = examBlob(exam);
  if (!subject || subject === OPEN_SYLLABUS_SUBJECT) {
    const calendarHits = mathCalendarTopicPool().filter((topic) => blob.includes(normalize(topic.title)));
    if (calendarHits.length) return calendarHits;
  }
  const pool = subject && SYLLABUS_BY_SUBJECT[subject]
    ? syllabusTopics(subject)
    : allSyllabusTopics();
  return pool.filter((topic) => blob.includes(normalize(topic.title)));
}

export function isMixedSyllabusExam(exam) {
  const audience = examPulseAudience(exam);
  if (audience === 'weekly' || audience === 'hidden') return false;
  if (audience === 'mixed' || audience === 'specialty') return true;
  if (isMixedMarked(exam)) return true;
  return examSyllabusTopics(exam).length >= 2;
}

export function withMixedMark(description, mixed) {
  const text = String(description || '').replace(/\s*\[\[MIXED\]\]\s*/g, ' ').trim();
  return mixed ? `${text}\n${MIXED_MARK}`.trim() : text;
}

export function canShareExamPublic(exam) {
  return !isMixedSyllabusExam(exam);
}

export function examAudience(exam) {
  if (isStudentWeeklyExam(exam)) return 'everyone';
  if (isMixedSyllabusExam(exam)) return 'students';
  return examVisibility(exam) === 'public' ? 'everyone' : 'students';
}

function examOwnerId(exam) {
  const id = exam?.teacherId ?? exam?.TeacherId;
  return id == null || id === '' ? '' : String(id);
}

export function studentCanSeeExam(user, exam) {
  if (!user || !exam) return false;
  if (examPulseAudience(exam) === 'hidden') return false;
  const owner = examOwnerId(exam);
  if (user.role === 'Admin') return true;
  if (isStudentWeeklyExam(exam)) return true;
  const own = String(user.teacherId ?? user.TeacherId ?? '') === String(owner);
  if (isMixedSyllabusExam(exam)) return own;
  if (examAudience(exam) === 'everyone') return true;
  if (own) return true;
  return subscribedTeacherIds(user.id).includes(String(owner));
}

function examSubjectName(exam) {
  return String(exam?.subjectName || exam?.subject || exam?.SubjectName || '').trim();
}

export function unmatchedSyllabusExams(exams, subject, user) {
  return (exams || []).filter((exam) => {
    if (user && !studentCanSeeExam(user, exam)) return false;
    const sub = examSubjectName(exam);
    if (sub !== subject) return false;
    if (isMixedMarked(exam)) return false;
    return examSyllabusTopics(exam).length === 0;
  });
}

export function syllabusTopicsForList(subject, exams, user) {
  const topics = syllabusTopics(subject);
  if (unmatchedSyllabusExams(exams, subject, user).length) {
    return [...topics, catchAllTopic(subject)];
  }
  return topics;
}

export function syllabusExamsForTopic(exams, topic, user) {
  if (!topic) return [];
  if (topic.catchAll) return unmatchedSyllabusExams(exams, topic.subject, user);
  return (exams || []).filter((exam) => {
    if (user && !studentCanSeeExam(user, exam)) return false;
    const subject = examSubjectName(exam);
    if (subject && subject !== topic.subject) return false;
    const matched = examSyllabusTopics(exam);
    if (matched.some((row) => row.id === topic.id)) return true;
    if (isMixedMarked(exam) && matched.length === 0 && (!subject || subject === topic.subject)) return true;
    return false;
  });
}

export function teacherSyllabusState(exams, subject) {
  const topics = syllabusTopics(subject);
  const published = (exams || []).filter((exam) => String(exam?.status || '').toLowerCase() !== 'draft');
  const rows = topics.map((topic) => {
    const list = published.filter((exam) => {
      const matched = examSyllabusTopics(exam);
      if (matched.some((row) => row.id === topic.id)) return true;
      return isMixedMarked(exam) && matched.length === 0 && examSubjectName(exam) === subject;
    });
    const latest = list
      .slice()
      .sort((a, b) => new Date(b.startTime || b.createdAt || 0) - new Date(a.startTime || a.createdAt || 0))[0];
    return { ...topic, exams: list, latest };
  });
  const leftover = unmatchedSyllabusExams(published, subject);
  if (leftover.length) {
    const extra = catchAllTopic(subject);
    const latest = leftover
      .slice()
      .sort((a, b) => new Date(b.startTime || b.createdAt || 0) - new Date(a.startTime || a.createdAt || 0))[0];
    rows.push({ ...extra, exams: leftover, latest });
  }
  const current = [...rows].reverse().find((row) => row.exams.length) || rows[0] || null;
  const done = rows.filter((row) => row.exams.length).length;
  return { topics: rows, current, done, total: rows.length };
}

export function resultLabel(item, exam, user) {
  if (exam && !studentResultsReady(exam, user)) return '';
  if (!item || item.percent == null || item.percent === '') return '';
  const pct = Math.round(Number(item.percent));
  if (!Number.isFinite(pct)) return '';
  if (item.correctAnswersCount != null && item.totalQuestions) {
    return `${pct}% · ${item.correctAnswersCount}/${item.totalQuestions}`;
  }
  return `${pct}%`;
}
