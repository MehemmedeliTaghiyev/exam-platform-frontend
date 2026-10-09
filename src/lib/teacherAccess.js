import { examVisibility } from './examVisibility';
import { localDb } from './localDb';
import { uid } from './utils';

export const TEACHER_ACCESS_PRICE = 2;

export function formatManat(amount) {
  const n = Number(amount) || 0;
  const text = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${text} ₼`;
}
export const TICKET_DISCOUNT_PERCENT = 20;
export const HIGH_SCORE_PERCENT = 80;
export const ACCESS_DAYS = 30;

export function examTeacherId(exam) {
  const id = exam?.teacherId ?? exam?.TeacherId;
  return id == null || id === '' ? '' : String(id);
}

export function isOwnTeacherStudent(user, teacherId) {
  if (!user || teacherId == null || teacherId === '') return false;
  return String(user.teacherId ?? user.TeacherId ?? '') === String(teacherId);
}

export function hasPaidTeacherAccess(studentId, teacherId) {
  return Boolean(localDb.getPaidTeacherAccess(studentId, teacherId));
}

export function canEnterExam(user, exam) {
  if (!exam) return false;
  const vis = examVisibility(exam);
  const owner = examTeacherId(exam);
  if (!user) return false;
  if (user.role === 'Admin' || user.role === 'Teacher') return vis === 'public' || String(user.id) === owner;
  if (user.role !== 'Student' && !user.practice) return false;
  if (vis === 'public') return true;
  if (isOwnTeacherStudent(user, owner)) return true;
  return hasPaidTeacherAccess(user.id, owner);
}

export function accessPrice(studentId, teacherId) {
  const ticket = localDb.unusedTicketForTeacher(studentId, teacherId);
  const base = TEACHER_ACCESS_PRICE;
  if (!ticket) return { amount: base, ticket: null, discount: 0 };
  const pct = ticket.discountPercent || TICKET_DISCOUNT_PERCENT;
  const discount = Math.round(base * pct) / 100;
  return { amount: Math.max(0, Math.round((base - discount) * 100) / 100), ticket, discount };
}

export function completeTeacherPayment(studentId, teacherId) {
  const quote = accessPrice(studentId, teacherId);
  if (quote.ticket?.code) localDb.markTicketUsed(quote.ticket.code);
  return localDb.grantPaidTeacherAccess(studentId, teacherId, {
    amount: quote.amount,
    days: ACCESS_DAYS,
    ticketCode: quote.ticket?.code || '',
  });
}

export function maybeAwardDiscountTicket({ studentId, teacherId, percent }) {
  if (studentId == null || !teacherId) return null;
  if (!hasPaidTeacherAccess(studentId, teacherId)) return null;
  if (Number(percent) < HIGH_SCORE_PERCENT) return null;
  const existing = localDb.ticketsForStudent(studentId).find((t) => String(t.teacherId) === String(teacherId));
  if (existing) return existing;
  const code = `EP-${String(teacherId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'T'}-${uid('t').slice(-6).toUpperCase()}`;
  return localDb.addDiscountTicket({
    id: uid('ticket'),
    code,
    studentId: String(studentId),
    teacherId: String(teacherId),
    discountPercent: TICKET_DISCOUNT_PERCENT,
    createdAt: new Date().toISOString(),
    usedAt: null,
  });
}
