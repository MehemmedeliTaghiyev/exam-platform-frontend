import { useContext, useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, Megaphone } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { fetchAllPublicExams, fetchStudentHistory } from '../lib/examApi';
import { examRowTitle } from './ExamRow';
import { isNewExam } from '../lib/examFresh';
import { isWeekendDay, weekendResultFor, weekendWindow } from '../lib/weekendWeakExam';
import { latestUnseenUrgent, subscribeUrgent } from '../lib/urgentBroadcast';
import { examSubject } from '../lib/publicExams';

export default function StudentAlerts({ variant = 'bell' }) {
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [exams, setExams] = useState([]);
  const [history, setHistory] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    Promise.all([
      fetchAllPublicExams().catch(() => []),
      fetchStudentHistory(user.id).catch(() => []),
    ]).then(([list, hist]) => {
      if (!cancelled) {
        setExams(list);
        setHistory(hist);
      }
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => subscribeUrgent(() => setTick((n) => n + 1)), []);

  const submitted = useMemo(() => {
    const ids = new Set();
    history.forEach((row) => {
      if (row?.submittedAt || row?.SubmittedAt) ids.add(String(row.examId ?? row.ExamId));
    });
    return ids;
  }, [history]);

  const items = useMemo(() => {
    if (!user?.id) return [];
    const rows = [];
    const urgent = latestUnseenUrgent(user.id);
    if (urgent) {
      rows.push({
        id: `urgent-${urgent.id}`,
        kind: 'urgent',
        title: 'Təcili mesaj',
        text: urgent.text,
      });
    }
    if (isWeekendDay() && !weekendResultFor(user.id, weekendWindow().week)) {
      rows.push({
        id: 'weekend',
        kind: 'weekend',
        title: 'Həftəsonu zəiflik sınağı',
        text: 'Şənbə–bazar sınağı açıqdır',
      });
    }
    exams
      .filter((exam) => isNewExam(exam, { userId: user.id, submitted: submitted.has(String(exam.id)) }))
      .slice(0, 8)
      .forEach((exam) => {
        rows.push({
          id: `exam-${exam.id}`,
          kind: 'exam',
          title: examRowTitle(exam),
          text: `${examSubject(exam)} · yeni imtahan`,
        });
      });
    return rows;
  }, [user?.id, exams, submitted, tick]);

  const count = items.length;

  const list = (
    <div className="space-y-2">
      {count === 0 ? (
        <p className="px-1 py-2 text-sm font-semibold text-[var(--muted)]">Hələ bildiriş yoxdur</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="flex w-full items-start gap-3 rounded-[18px] bg-[var(--bg)] px-3 py-3 ring-1 ring-[var(--line)]"
          >
            <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
              item.kind === 'urgent' ? 'bg-[#f5a623]/20 text-[#f5a623]' : item.kind === 'weekend' ? 'bg-[#2ee07a]/15 text-[#2ee07a]' : 'bg-[var(--accent)]/18 text-[var(--accent)]'
            }`}
            >
              {item.kind === 'urgent' ? <Megaphone size={15} /> : item.kind === 'weekend' ? <CalendarDays size={15} /> : <Bell size={15} />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-extrabold">{item.title}</span>
              <span className="mt-0.5 block whitespace-pre-wrap text-xs font-semibold text-[var(--muted)]">{item.text}</span>
            </span>
          </div>
        ))
      )}
    </div>
  );

  if (variant === 'panel') {
    return (
      <section className="card-vector mb-4 rounded-[24px] bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-lg font-black">Bildirişlər</p>
          {count ? (
            <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-black text-[#3a2200]">{count}</span>
          ) : null}
        </div>
        {list}
      </section>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Bildirişlər"
        onClick={() => setOpen((on) => !on)}
        className="shell-jeton relative px-3"
      >
        <Bell size={16} />
        {count ? (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#f5a623] px-1 text-[10px] font-black text-[#3a2200]">
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-[60]" aria-label="Bağla" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-[61] mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-[22px] bg-[var(--card)] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.28)] ring-1 ring-[var(--line)]">
            <p className="mb-2 px-1 text-sm font-black">Bildirişlər</p>
            {list}
          </div>
        </>
      ) : null}
    </div>
  );
}
