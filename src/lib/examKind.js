import { localDb } from './localDb';
import { isStudentWeeklyExam } from './weeklyMath';

function blob(exam) {
  return `${exam?.title || exam?.Title || ''} ${exam?.description || exam?.Description || ''}`;
}

export function isWeeklyQuiz(exam) {
  if (!exam) return false;
  if (isStudentWeeklyExam(exam)) return true;
  const kind = String(exam.kind || exam.Kind || '').toLowerCase();
  if (kind === 'weekly') return true;
  const status = String(exam.status || exam.Status || '').toLowerCase();
  if (status === 'weekly') return true;
  if (exam.source === 'weekly') return true;
  const text = blob(exam);
  if (/KIND:weekly/i.test(text)) return true;
  return /həftəlik|heftelik/i.test(text);
}

export function isRepublicExam(exam) {
  if (!exam) return false;
  if (exam.source === 'republic') return true;
  const kind = String(exam.kind || exam.Kind || '').toLowerCase();
  if (kind === 'republic') return true;
  return /respublika/i.test(blob(exam));
}

export function examRankingEnabled(exam) {
  if (!exam || isWeeklyQuiz(exam)) return false;
  if (isRepublicExam(exam)) return true;
  if (/RANK:off/i.test(blob(exam))) return false;
  if (exam.rankingEnabled === false || exam.RankingEnabled === false) return false;
  const stored = localDb.getExamRanking(exam.id ?? exam.Id);
  if (stored === 'off') return false;
  if (stored === 'on') return true;
  return true;
}

export function setExamRankingEnabled(examOrId, on) {
  const id = examOrId && typeof examOrId === 'object' ? (examOrId.id ?? examOrId.Id) : examOrId;
  localDb.setExamRanking(id, on ? 'on' : 'off');
}

export function withExamKind(exam) {
  if (!exam) return exam;
  const weekly = isWeeklyQuiz(exam);
  return {
    ...exam,
    kind: weekly ? 'weekly' : (exam.kind || exam.Kind || (isRepublicExam(exam) ? 'republic' : 'teacher')),
    rankingEnabled: examRankingEnabled(exam),
  };
}
