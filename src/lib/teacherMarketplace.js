import { examSubject } from './publicExams';
import { startOfWeek, toKey, scoreOf } from './weeklyRanking';
import { parseExamDate } from './utils';

function examWhen(exam) {
  return parseExamDate(
    exam?.startTime || exam?.StartTime || exam?.createdAt || exam?.CreatedAt || exam?.endTime,
  );
}

export function decorateTeacher(teacher, exams = [], submissions = []) {
  const week = toKey(startOfWeek(new Date()) || new Date());
  const weeklyExamCount = exams.filter((exam) => {
    const when = examWhen(exam);
    if (!when) return false;
    const start = startOfWeek(when);
    return start && toKey(start) === week;
  }).length;
  const ids = new Set(exams.map((e) => String(e.id ?? e.Id)));
  const scores = (submissions || [])
    .filter((s) => ids.has(String(s.examId ?? s.ExamId)))
    .map(scoreOf)
    .filter((n) => Number.isFinite(n));
  const avgScore = scores.length
    ? scores.reduce((sum, n) => sum + n, 0) / scores.length
    : 0;
  const fromExams = exams.map(examSubject).filter(Boolean);
  const subjects = [...new Set([...(teacher.subjects || []), ...fromExams])].sort((a, b) =>
    String(a).localeCompare(String(b), 'az'),
  );
  return {
    ...teacher,
    subjects,
    weeklyExamCount,
    avgScore,
    examCount: exams.length,
  };
}

export function uniqueRegions(teachers) {
  return [...new Set((teachers || []).map((t) => t.position || 'Digər'))].sort((a, b) =>
    a.localeCompare(b, 'az'),
  );
}

export function uniqueTeacherSubjects(teachers) {
  return [...new Set((teachers || []).flatMap((t) => t.subjects || []))].sort((a, b) =>
    a.localeCompare(b, 'az'),
  );
}

export function filterSortTeachers(teachers, {
  query = '',
  region = 'all',
  subject = 'all',
  sortBy = 'rank',
  dir = 'desc',
} = {}) {
  const q = query.trim().toLowerCase();
  let rows = (teachers || []).filter((t) => {
    if (region !== 'all' && String(t.position || 'Digər') !== region) return false;
    if (subject !== 'all' && !(t.subjects || []).includes(subject)) return false;
    if (!q) return true;
    const hay = `${t.fullName} ${t.position} ${(t.subjects || []).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
  const sign = dir === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'weekly') cmp = a.weeklyExamCount - b.weeklyExamCount;
    else if (sortBy === 'avg') cmp = a.avgScore - b.avgScore;
    else if (sortBy === 'region') cmp = String(a.position || '').localeCompare(String(b.position || ''), 'az');
    else if (sortBy === 'subject') cmp = String((a.subjects || [])[0] || '').localeCompare(String((b.subjects || [])[0] || ''), 'az');
    else if (sortBy === 'name') cmp = String(a.fullName || '').localeCompare(String(b.fullName || ''), 'az');
    else {
      cmp = a.weeklyExamCount - b.weeklyExamCount;
      if (!cmp) cmp = a.avgScore - b.avgScore;
      if (!cmp) cmp = String(a.fullName || '').localeCompare(String(b.fullName || ''), 'az');
    }
    if (sortBy === 'rank') return -cmp || 0;
    return cmp * sign || String(a.fullName || '').localeCompare(String(b.fullName || ''), 'az');
  });
  if (sortBy === 'rank' && dir === 'asc') rows.reverse();
  return rows;
}
