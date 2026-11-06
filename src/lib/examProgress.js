import { examSubject } from './publicExams';
import { parseExamDate } from './utils';

const MONTHS = ['YAN', 'FEV', 'MAR', 'APR', 'MAY', 'İYN', 'İYL', 'AVQ', 'SEN', 'OKT', 'NOY', 'DEK'];

export function progressScore(row) {
  const value = Number(row?.percent ?? row?.score ?? 0);
  return Number.isFinite(value) ? Math.round(value) : 0;
}

export function shortProgressDate(value) {
  const date = value instanceof Date ? value : parseExamDate(value) || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function buildExamProgress(history = [], exams = [], subject = '') {
  const examMap = new Map((exams || []).map((exam) => [String(exam.id ?? exam.Id), exam]));
  const latest = new Map();

  (history || []).forEach((row) => {
    const submitted = row?.submittedAt || row?.SubmittedAt;
    if (!submitted) return;
    const examId = String(row.examId ?? row.ExamId ?? '');
    if (!examId) return;
    const exam = examMap.get(examId);
    const subj = examSubject(exam || row);
    if (subject && subject !== 'all' && subj !== subject) return;
    const at = parseExamDate(submitted) || new Date(submitted);
    const next = {
      id: examId,
      title: String(exam?.title || exam?.Title || row.examTitle || row.title || 'Sınaq').replace(/VIS:(public|private)\s*/gi, '').trim(),
      subject: subj,
      at,
      percent: progressScore(row),
    };
    const prev = latest.get(examId);
    if (!prev || at > prev.at) latest.set(examId, next);
  });

  return Array.from(latest.values())
    .sort((a, b) => a.at - b.at)
    .map((row, index, all) => ({
      ...row,
      label: `S${index + 1}`,
      delta: index ? row.percent - all[index - 1].percent : 0,
    }));
}
