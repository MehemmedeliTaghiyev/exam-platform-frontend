import { displayExamDescription } from './driveLinks';
import { examVisibility } from './examVisibility';
import { subscribedTeacherIds } from './groupSubscriptions';
import { studentResultsReady } from './utils';

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

export function findSyllabusTopic(id) {
  return allSyllabusTopics().find((topic) => topic.id === id) || null;
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

export function examSyllabusTopics(exam) {
  const subject = String(exam?.subjectName || exam?.subject || exam?.SubjectName || '').trim();
  const pool = subject && SYLLABUS_BY_SUBJECT[subject]
    ? syllabusTopics(subject)
    : allSyllabusTopics();
  const blob = examBlob(exam);
  return pool.filter((topic) => blob.includes(normalize(topic.title)));
}

export function isMixedSyllabusExam(exam) {
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
  if (isMixedSyllabusExam(exam)) return 'students';
  return examVisibility(exam) === 'public' ? 'everyone' : 'students';
}

function examOwnerId(exam) {
  const id = exam?.teacherId ?? exam?.TeacherId;
  return id == null || id === '' ? '' : String(id);
}

export function studentCanSeeExam(user, exam) {
  if (!user || !exam) return false;
  const owner = examOwnerId(exam);
  if (user.role === 'Admin') return true;
  const own = String(user.teacherId ?? user.TeacherId ?? '') === String(owner);
  if (isMixedSyllabusExam(exam)) return own;
  if (examAudience(exam) === 'everyone') return true;
  if (own) return true;
  return subscribedTeacherIds(user.id).includes(String(owner));
}

export function syllabusExamsForTopic(exams, topic, user) {
  if (!topic) return [];
  return (exams || []).filter((exam) => {
    if (user && !studentCanSeeExam(user, exam)) return false;
    const subject = String(exam?.subjectName || exam?.subject || '').trim();
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
      return isMixedMarked(exam) && matched.length === 0 && String(exam.subjectName || exam.subject || '') === subject;
    });
    const latest = list
      .slice()
      .sort((a, b) => new Date(b.startTime || b.createdAt || 0) - new Date(a.startTime || a.createdAt || 0))[0];
    return { ...topic, exams: list, latest };
  });
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
