const SUBJECTS = ['Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Kimya', 'Biologiya', 'Fizika'];
const GRADES = ['9', '10', '11'];
const KINDS = ['Sınaq', 'Buraxılış', 'Blok'];

function pack(subject, grade, kind, index) {
  return {
    id: `${subject}-${grade}-${kind}-${index}`.toLowerCase().replace(/\s+/g, '-'),
    title: `${subject} · ${grade}-ci sinif · ${kind} ${index}`,
    subject,
    grade,
    kind,
    durationMinutes: kind === 'Blok' ? 180 : 90,
    totalQuestions: kind === 'Blok' ? 50 : 25,
    driveFileId: '',
  };
}

export const PREFERENCE_OPTIONS = { subjects: SUBJECTS, grades: GRADES, kinds: KINDS };

export function defaultPreferences() {
  return { subject: '', grade: '11', kind: 'Sınaq' };
}

export function catalogPacks() {
  const rows = [];
  SUBJECTS.forEach((subject) => {
    GRADES.forEach((grade) => {
      KINDS.forEach((kind) => {
        [1, 2, 3].forEach((index) => rows.push(pack(subject, grade, kind, index)));
      });
    });
  });
  return rows;
}

export const STORAGE_PACK_LIMIT = 5;

export function teacherSubjectOf(user) {
  const fromUser = String(
    user?.teachingSubject
    || user?.TeachingSubject
    || user?.subject
    || user?.Subject
    || '',
  ).trim();
  if (SUBJECTS.includes(fromUser)) return fromUser;
  return '';
}

export function pickStoragePacks(preferences, source = catalogPacks()) {
  const subject = preferences?.subject || '';
  const grade = String(preferences?.grade || '11');
  const kind = preferences?.kind || 'Sınaq';
  const matched = subject ? source.filter((item) => item.subject === subject) : [];
  const score = (item) => {
    let n = 0;
    if (String(item.grade) === grade) n += 4;
    if (item.kind === kind) n += 3;
    return n;
  };
  return [...matched]
    .sort((a, b) => score(b) - score(a) || a.title.localeCompare(b.title, 'az'))
    .slice(0, STORAGE_PACK_LIMIT);
}

export function driveViewUrl(id) {
  const value = String(id || '').trim();
  if (!value) return '';
  if (/^https?:/i.test(value)) return value;
  return `https://drive.google.com/file/d/${value}/view?usp=sharing`;
}

export function driveDownloadUrl(id) {
  const value = String(id || '').trim();
  if (!value) return '';
  if (/^https?:/i.test(value)) {
    const file = value.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (file) return `https://drive.google.com/uc?export=download&id=${file[1]}`;
    return value;
  }
  return `https://drive.google.com/uc?export=download&id=${value}`;
}

export function packLatexSource(pack) {
  if (pack?.latexSource) return pack.latexSource;
  const title = String(pack?.title || 'Sınaq').replace(/[{}]/g, '');
  const subject = String(pack?.subject || '').replace(/[{}]/g, '');
  return `\\documentclass[12pt,a4paper]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{tikz}
\\usepackage{geometry}
\\geometry{margin=18mm}
\\begin{document}
\\begin{center}
{\\LARGE\\bfseries ExamPulse}\\\\[4pt]
{\\large ${title}}\\\\[2pt]
{\\normalsize ${subject}}
\\end{center}
\\vspace{8mm}
Bu material bazadan TikZ / LaTeX formatında gəlir və PDF-ə çevrilir.
\\vspace{8mm}
\\begin{center}
\\begin{tikzpicture}[scale=1.1]
  \\draw[thick,fill=green!12] (0,0) rectangle (6,2.2);
  \\node at (3,1.1) {${pack?.totalQuestions || 25} sual};
\\end{tikzpicture}
\\end{center}
\\end{document}
`;
}
