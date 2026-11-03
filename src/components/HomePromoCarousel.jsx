import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Share2, User } from 'lucide-react';
import {
  lastMonthRepublicWinner,
  REPUBLIC_EVENT,
  REPUBLIC_PRICE,
  republicMonthLabel,
  republicMonthTitle,
  republicPrevMonthKey,
} from '../lib/republicExam';
import { getStudentPhoto, STUDENT_PHOTO_EVENT } from '../lib/studentPhoto';
import { formatManat } from '../lib/teacherAccess';
import TeacherReveal from './TeacherReveal';

function untilMonthEnd(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const ms = Math.max(0, end.getTime() - now.getTime());
  return {
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
  };
}

function CountBox({ value, label }) {
  return (
    <span className="flex min-w-[4.2rem] flex-1 flex-col items-center rounded-2xl bg-black/25 px-3 py-3 ring-1 ring-white/10">
      <span className="text-[28px] font-black tabular-nums leading-none text-[#f0b429]">{String(value).padStart(2, '0')}</span>
      <span className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-white/70">{label}</span>
    </span>
  );
}

function RepublicAd({ left }) {
  return (
    <Link
      to="/student/republic"
      className="block h-full overflow-hidden rounded-[28px] bg-[linear-gradient(165deg,#163022_0%,#1f4a32_48%,#2a3a18_100%)] p-5 text-white no-underline ring-1 ring-[#4cae6e]/25"
    >
      <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide">
        <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" /> Reklam · İmtahan açıqdır
      </p>
      <h2 className="mt-3 text-[28px] font-black leading-tight tracking-tight">{republicMonthTitle()}</h2>
      <p className="mt-1 text-sm font-semibold text-white/80">
        Sillabus mövzularından qarışıq sınaq. Səviyyəni ölç.
      </p>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-white/55">Bağlanır</p>
      <div className="mt-2 flex gap-2">
        <CountBox value={left.d} label="gün" />
        <CountBox value={left.h} label="saat" />
        <CountBox value={left.m} label="dəq" />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#f0b429] px-3 py-1.5 text-xs font-extrabold text-[#3a2a00]">Riyaziyyat</span>
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{formatManat(REPUBLIC_PRICE)}</span>
      </div>
      <p className="mt-4 rounded-2xl bg-[#f0b429] px-4 py-2.5 text-center text-sm font-extrabold text-[#3a2a00]">
        Sillabus · qarışıq sınaq
      </p>
    </Link>
  );
}

function shareWinner(winner, month) {
  const text = [
    'Son ayın qalibi',
    `${republicMonthLabel(month)} · Respublika sınağı`,
    winner?.fullName || '',
    winner?.percent != null ? `${winner.percent}%` : '',
    winner?.correct != null && winner?.total != null ? `${winner.correct}/${winner.total} düzgün` : '',
  ].filter(Boolean).join('\n');
  if (navigator.share) {
    navigator.share({ title: 'Son ayın qalibi', text }).catch(() => {});
    return;
  }
  navigator.clipboard?.writeText(text).catch(() => {});
}

function WinnerAd({ winner }) {
  const month = winner?.month || republicPrevMonthKey();
  const photo = winner?.photo || getStudentPhoto(winner?.userId);
  return (
    <div className="flex h-full flex-col rounded-[28px] bg-[#171d27] p-4 text-white ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#f0b429]">Son ayın qalibi</p>
          <p className="mt-1 text-sm font-semibold text-white/55">
            {republicMonthLabel(month)} · Respublika sınağı
          </p>
        </div>
        {winner ? (
          <button
            type="button"
            aria-label="Paylaş"
            onClick={() => shareWinner(winner, month)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/5 text-white/70"
          >
            <Share2 size={18} />
          </button>
        ) : null}
      </div>

      {winner ? (
        <>
          <div className="mt-4 flex items-center gap-3">
            <span className="relative shrink-0">
              <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-[#3a4656] text-white/70 ring-1 ring-white/10">
                {photo ? (
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User size={28} />
                )}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-[#f0b429] text-[11px] font-black text-[#3a2a00] ring-2 ring-[#171d27]">
                1
              </span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-black leading-tight">{winner.fullName}</span>
              <span className="mt-1 block truncate text-sm font-semibold text-white/55">
                {winner.teachingSubject ? `${winner.teachingSubject} · ` : ''}
                {winner.teacherName ? (
                  <TeacherReveal
                    teacher={winner}
                    className="font-semibold text-white/55 underline decoration-white/25 underline-offset-2"
                  />
                ) : (
                  'Müəllim yoxdur'
                )}
              </span>
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[18px] bg-[#121820] px-3 py-3 text-center">
              <p className="text-2xl font-black tabular-nums">{winner.percent != null ? `${winner.percent}%` : '—'}</p>
              <p className="mt-1 text-xs font-semibold text-white/45">Nəticə</p>
            </div>
            <div className="rounded-[18px] bg-[#121820] px-3 py-3 text-center">
              <p className="text-2xl font-black tabular-nums">
                {winner.correct != null && winner.total != null ? `${winner.correct}/${winner.total}` : '—'}
              </p>
              <p className="mt-1 text-xs font-semibold text-white/45">Düzgün cavab</p>
            </div>
          </div>

          <p className="mt-3 flex items-center justify-center gap-2 rounded-[16px] bg-[#f0b429] px-4 py-3 text-sm font-extrabold text-[#3a2a00]">
            <Gift size={16} /> Növbəti imtahan pulsuzdur
          </p>
        </>
      ) : (
        <p className="mt-6 text-sm font-semibold text-white/70">
          Keçən ayın qalibi hələ seçilməyib. Respublika sınağında birinci olan burada görünəcək.
        </p>
      )}
    </div>
  );
}

export default function HomePromoCarousel() {
  const [left, setLeft] = useState(() => untilMonthEnd());
  const [winner, setWinner] = useState(() => lastMonthRepublicWinner());

  useEffect(() => {
    const timer = setInterval(() => setLeft(untilMonthEnd()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const refresh = () => {
      setWinner(lastMonthRepublicWinner());
    };
    window.addEventListener(REPUBLIC_EVENT, refresh);
    window.addEventListener(STUDENT_PHOTO_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(REPUBLIC_EVENT, refresh);
      window.removeEventListener(STUDENT_PHOTO_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return (
    <div className="home-promo mb-6">
      <div className="home-promo-window overflow-hidden rounded-[28px]">
        <div className="home-promo-track">
          <RepublicAd left={left} />
          <WinnerAd winner={winner} />
        </div>
      </div>
    </div>
  );
}
