import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { REPUBLIC_EVENT, republicMonthTitle, republicResults, republicWinners, winnerSlotsFor } from '../lib/republicExam';
import TeacherReveal from './TeacherReveal';

function WinnerCard({ winner, rank }) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-[var(--hp-line)] bg-[var(--hp-card)]">
      <div className="grid place-items-center bg-[linear-gradient(135deg,#2f7a45,#1f5c34)] p-5">
        {winner.photo ? (
          <img src={winner.photo} alt={winner.fullName} className="h-28 w-28 rounded-full object-cover ring-4 ring-white/40" />
        ) : (
          <span className="grid h-28 w-28 place-items-center rounded-full bg-white/15 text-4xl font-black text-white">
            {String(winner.fullName || 'Q').trim().charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs font-extrabold text-[#2f7a45]">#{rank} qalib</p>
        <h3 className="mt-1 text-lg font-black tracking-tight">{winner.fullName}</h3>
        <p className="mt-2 text-sm text-[var(--hp-muted)]">
          Müəllim:{' '}
          {winner.teacherName ? (
            <TeacherReveal
              teacher={winner}
              className="font-extrabold text-[#2f7a45] underline decoration-[#2f7a45]/40 underline-offset-2"
            />
          ) : (
            'Naməlum'
          )}
          {winner.teachingSubject ? ` · ${winner.teachingSubject}` : ''}
        </p>
        {winner.percent != null ? (
          <p className="mt-1 text-sm font-bold text-[var(--hp-text)]">{winner.percent}%</p>
        ) : null}
      </div>
    </article>
  );
}

export default function RepublicWinnerBanner() {
  const [winners, setWinners] = useState(() => republicWinners());
  const [slots, setSlots] = useState(() => winnerSlotsFor(republicResults().length));

  useEffect(() => {
    const refresh = () => {
      setWinners(republicWinners());
      setSlots(winnerSlotsFor(republicResults().length));
    };
    window.addEventListener(REPUBLIC_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(REPUBLIC_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (!winners.length) return null;
  return (
    <section className="hp-section pt-6">
      <div className="mx-auto max-w-[1120px] px-5">
        <p className="mb-4 inline-flex items-center gap-2 text-sm font-extrabold text-[#2f7a45]">
          <Trophy size={16} /> {republicMonthTitle()} qalibləri
        </p>
        <p className="mb-4 text-sm text-[var(--hp-muted)]">
          Qalib sayı iştirakçılara görədir (indi {slots}). Hər qalibin fənn müəllimi də görünür.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {winners.map((winner, index) => (
            <WinnerCard key={winner.userId || index} winner={winner} rank={index + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
