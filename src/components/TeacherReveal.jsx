import { useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Gift, Ticket } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { issueTeacherVisitTicket, teacherRevealState } from '../lib/teacherReveal';
import { republicMonthLabel } from '../lib/republicExam';
import { Button, Modal } from './ui';

export default function TeacherReveal({ teacher, className = '' }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [copied, setCopied] = useState(false);
  const name = teacher?.teacherName || teacher?.fullName || 'Müəllim';
  const access = teacherRevealState(user);

  const openSheet = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!user?.id) {
      navigate('/login');
      return;
    }
    setTicket(null);
    setCopied(false);
    setOpen(true);
  };

  const giveTicket = () => {
    const result = issueTeacherVisitTicket(user, teacher);
    if (result.ticket) setTicket(result.ticket);
  };

  const copy = async () => {
    if (!ticket?.code) return;
    try {
      await navigator.clipboard.writeText(ticket.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={className || 'font-extrabold text-[#f0b429] underline decoration-[#f0b429]/40 underline-offset-2'}
      >
        {name}
      </button>
      {createPortal(
      <Modal open={open} title="Müəllim məlumatı" onClose={() => setOpen(false)}>
        {!access.ok && access.reason === 'not-entered' ? (
          <div className="space-y-4 text-sm">
            <p>
              Müəllimin məlumatını görmək üçün aylıq Respublika sınağında iştirak etməlisiniz.
              Abituriyent kodunuz ({access.code || 'yoxdur'}) imtahana daxil olanlar arasında tapılmadı.
            </p>
            <Button onClick={() => { setOpen(false); navigate('/student/republic'); }}>
              Aylıq imtahana keç
            </Button>
          </div>
        ) : !access.ok ? (
          <p className="text-sm">Abituriyent kodu tapılmadı. Profilinizə daxil olun.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="rounded-xl bg-[var(--bg)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">
              Abituriyent kodu {access.code} · {republicMonthLabel(access.entry.month)} sınağına daxil olub
            </p>
            <div>
              <p className="text-xs font-bold text-[var(--muted)]">Müəllim</p>
              <p className="text-lg font-black">{name}</p>
              {teacher?.teachingSubject ? (
                <p className="mt-1 font-semibold">{teacher.teachingSubject}</p>
              ) : null}
            </div>
            {ticket ? (
              <div className="rounded-2xl border border-[#ead9a8] bg-[#fff8e8] p-4 text-[#3a2a00] dark:border-[#3d4a32] dark:bg-[#1c2818] dark:text-[#f4e6c2]">
                <p className="flex items-center gap-2 font-extrabold">
                  <Ticket size={16} /> Endirim bileti
                </p>
                <p className="mt-2 font-mono text-lg font-black tracking-wide">{ticket.code}</p>
                <p className="mt-2 text-xs font-semibold opacity-80">
                  Müəllimin yanına getmək üçün bu kodu göstərin. İstifadə qaydası sonra bağlanacaq.
                </p>
                <Button className="mt-3" variant="secondary" onClick={copy}>
                  {copied ? 'Kopyalandı' : 'Kodu kopyala'}
                </Button>
              </div>
            ) : (
              <Button onClick={giveTicket}>
                <Gift size={16} /> Müəllimin yanına getmək istəyirəm
              </Button>
            )}
          </div>
        )}
      </Modal>,
      document.body,
      )}
    </>
  );
}
