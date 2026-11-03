import { examVisibility } from './examVisibility';
import { subscribedTeacherIds } from './groupSubscriptions';
import { examAudience, isMixedSyllabusExam } from './syllabus';

export function formatManat(amount) {
  const n = Number(amount) || 0;
  const text = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${text} ₼`;
}

export function examTeacherId(exam) {
  const id = exam?.teacherId ?? exam?.TeacherId;
  return id == null || id === '' ? '' : String(id);
}

export function isOwnTeacherStudent(user, teacherId) {
  if (!user || teacherId == null || teacherId === '') return false;
  return String(user.teacherId ?? user.TeacherId ?? '') === String(teacherId);
}

export function canEnterExam(user, exam) {
  if (!exam) return false;
  const vis = examVisibility(exam);
  const owner = examTeacherId(exam);
  if (!user) return false;
  if (user.role === 'Admin' || user.role === 'Teacher') {
    return vis === 'public' || String(user.id) === owner || user.role === 'Admin';
  }
  if (user.role !== 'Student' && !user.practice) return false;
  if (isMixedSyllabusExam(exam)) return isOwnTeacherStudent(user, owner);
  if (examAudience(exam) === 'everyone') return true;
  if (isOwnTeacherStudent(user, owner)) return true;
  return subscribedTeacherIds(user.id).includes(String(owner));
}
