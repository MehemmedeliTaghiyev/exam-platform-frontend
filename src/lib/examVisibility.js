import { localDb } from './localDb';

export function examVisibility(exam) {
  if (!exam) return 'private';
  const flag = exam.isPublic ?? exam.IsPublic ?? exam.visibility ?? exam.Visibility;
  if (flag === true || String(flag).toLowerCase() === 'public') return 'public';
  if (flag === false || String(flag).toLowerCase() === 'private') return 'private';
  if (/VIS:public/i.test(String(exam.description || exam.Description || ''))) return 'public';
  const stored = localDb.getExamVisibility(exam.id ?? exam.Id);
  if (stored === 'public' || stored === 'private') return stored;
  return 'private';
}

export function isPublicExam(exam) {
  return examVisibility(exam) === 'public';
}

export function withExamVisibility(exam) {
  if (!exam) return exam;
  const visibility = examVisibility(exam);
  return { ...exam, visibility, isPublic: visibility === 'public' };
}
