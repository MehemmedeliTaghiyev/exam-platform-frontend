import { Ticket } from 'lucide-react';
import { Button, Modal } from './ui';
import {
  ACCESS_DAYS,
  HIGH_SCORE_PERCENT,
  TEACHER_ACCESS_PRICE,
  TICKET_DISCOUNT_PERCENT,
  accessPrice,
  formatManat,
  completeTeacherPayment,
  hasPaidTeacherAccess,
} from '../lib/teacherAccess';
import { localDb } from '../lib/localDb';

export default function AccessPaymentModal({
  open,
  onClose,
  user,
  teacher,
  exam,
  onPaid,
  onNeedLogin,
}) {
  const teacherId = teacher?.id;
  const paid = user?.id && teacherId ? hasPaidTeacherAccess(user.id, teacherId) : false;
  const quote = user?.id && teacherId ? accessPrice(user.id, teacherId) : { amount: TEACHER_ACCESS_PRICE, ticket: null, discount: 0 };
  const ticket = user?.id && teacherId
    ? localDb.unusedTicketForTeacher(user.id, teacherId) || localDb.ticketsForStudent(user.id).find((t) => String(t.teacherId) === String(teacherId))
    : null;

  const pay = () => {
    if (!user || (user.role !== 'Student' && !user.practice)) {
      onNeedLogin?.();
      return;
    }
    const row = completeTeacherPayment(user.id, teacherId);
    onPaid?.(row);
  };

  return (
    <Modal open={open} title="Özəl imtahan — ödəniş" onClose={onClose}>
      <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
        <p>
          <span className="font-semibold text-ink dark:text-white">{exam?.title || exam?.description || 'Özəl imtahan'}</span>
          {' '}kart kimi görünür, amma kilidlidir. Daxil olmaq üçün{' '}
          <span className="font-semibold">{teacher?.fullName || 'bu müəllimin'}</span>
          {' '}imtahanlarına hazırlıq müddəti ({ACCESS_DAYS} gün) ödənişi lazımdır.
        </p>
        <p>
          Ödəyib imtahanlarda yüksək nəticə ({HIGH_SCORE_PERCENT}% və daha çox) göstərsəniz,
          yalnız sizə aid endirim bileti qazanırsınız. Bilet növbəti ödənişdə {TICKET_DISCOUNT_PERCENT}% endirim verir
          və başqasına keçmir.
        </p>
        {ticket ? (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <Ticket size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Şəxsi bilet: {ticket.code}</p>
              <p className="mt-1 text-xs">
                {ticket.usedAt
                  ? 'Bu bilet artıq istifadə olunub.'
                  : `Bu ödənişdə ${TICKET_DISCOUNT_PERCENT}% endirim tətbiq olunur.`}
              </p>
            </div>
          </div>
        ) : null}
        {paid ? (
          <p className="font-medium text-emerald-700 dark:text-emerald-300">Girişiniz aktivdir. İmtahana başlaya bilərsiniz.</p>
        ) : (
          <p className="text-base font-bold text-ink dark:text-white">
            {quote.discount > 0 ? (
              <>
                <span className="mr-2 text-sm font-medium text-gray-400 line-through">{formatManat(TEACHER_ACCESS_PRICE)}</span>
                {formatManat(quote.amount)}
              </>
            ) : (
              <>{formatManat(quote.amount)}</>
            )}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Bağla</Button>
          {paid ? (
            <Button onClick={onClose}>Tamam</Button>
          ) : (
            <Button onClick={pay}>{user ? 'Ödənişi təsdiqlə' : 'Daxil olub ödə'}</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
