import { examSubject } from './publicExams';
import { examVisibility } from './examVisibility';
import { startOfWeek, toKey, scoreOf } from './weeklyRanking';
import { parseExamDate } from './utils';

export {
  directoryRowFromUser,
  emptyTeacherSearch,
  filterSortTeachers,
  mergeTeacherDirectory,
  teacherSearchActive,
  uniqueRegions,
  uniqueTeacherSubjects,
} from './teacherSearch';

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
    hasPublic: exams.some((exam) => examVisibility(exam) === 'public'),
    hasPrivate: exams.some((exam) => examVisibility(exam) === 'private'),
  };
}
