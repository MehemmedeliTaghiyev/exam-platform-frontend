import { localDb } from './localDb';
import {
  republicMonthKey,
  republicMonthLabel,
  republicPrevMonthKey,
  republicResults,
} from './republicExam';
import { applicantCode, normalizeDuelCode } from './studentCode';

export const TEACHER_TICKET_EVENT = 'exampulse-teacher-ticket';

function rowCode(row) {
  return normalizeDuelCode(applicantCode({ id: row?.userId }) || row?.coupon || '');
}

export function republicEntryByApplicantCode(user) {
  const code = normalizeDuelCode(applicantCode(user));
  if (!code) return null;
  const months = [republicMonthKey(), republicPrevMonthKey()];
  for (const month of months) {
    const row = republicResults(month).find((item) => rowCode(item) === code);
    if (row) {
      return {
        ...row,
        month,
        code,
      };
    }
  }
  return null;
}

export function teacherRevealState(user) {
  if (!user?.id) return { ok: false, reason: 'login' };
  const code = normalizeDuelCode(applicantCode(user));
  if (!code) return { ok: false, reason: 'nocode' };
  const entry = republicEntryByApplicantCode(user);
  if (!entry) return { ok: false, reason: 'not-entered', code };
  return { ok: true, code, entry };
}

export function issueTeacherVisitTicket(user, teacher = {}) {
  const access = teacherRevealState(user);
  if (!access.ok) return access;
  const teacherId = teacher.teacherId ?? teacher.id ?? '';
  const teacherName = teacher.teacherName || teacher.fullName || 'Müəllim';
  const existing = teacherId
    ? localDb.unusedTicketForTeacher(user.id, teacherId)
    : localDb.ticketsForStudent(user.id).find((t) => !t.usedAt && t.teacherName === teacherName);
  if (existing) return { ...access, ticket: existing, already: true };
  const ticket = {
    id: `tv-${user.id}-${teacherId || 't'}-${Date.now()}`,
    code: `T-${access.code}-${String(teacherId || 'X').replace(/[^A-Za-z0-9]/g, '').slice(-4) || 'X'}`.toUpperCase(),
    studentId: user.id,
    studentName: user.fullName || user.email,
    applicantCode: access.code,
    teacherId,
    teacherName,
    subject: teacher.teachingSubject || teacher.subject || '',
    kind: 'visit-discount',
    createdAt: new Date().toISOString(),
    usedAt: null,
  };
  localDb.addDiscountTicket(ticket);
  window.dispatchEvent(new CustomEvent(TEACHER_TICKET_EVENT));
  return { ...access, ticket, already: false };
}
