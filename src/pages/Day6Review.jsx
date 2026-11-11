import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, RotateCcw } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Button } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import {
  DAY6_DURATION_MIN,
  day6CycleInfo,
  day6ResultFor,
  ensureDay6Paper,
  isDay6ReviewDay,
} from '../lib/day6ReviewQuiz';

export default function Day6Review() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const info = useMemo(() => day6CycleInfo(), []);
  const open = isDay6ReviewDay();
  const paper = useMemo(() => ensureDay6Paper(user), [user?.id]);
  const done = day6ResultFor(user?.id, info.cycleKey);

  const start = () => {
    if (done) {
      navigate(`/student/day6/result/${encodeURIComponent(info.cycleKey)}`);
      return;
    }
    if (!open) return;
    navigate('/student/day6/take');
  };

  return (
    <AppShell title="5 günün təkrarı">
      <div className="desk-page space-y-4">
        <section className="rounded-[28px] bg-[var(--card)] p-5 ring-1 ring-white/10 min-[768px]:p-7">
          <p className="flex items-center gap-2 text-sm font-semibold text-white/65">
            <RotateCcw size={16} className="text-[#f0b429]" /> {info.label}
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">Səhv və cavabsızlar</h2>
          <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/75">
            Hər 6-cı gün əvvəlki 5 günün səhv və cavab verilməmiş suallarından qısa sınaq yığılır.
          </p>
          <div className="mt-5 flex gap-2">
            <div className="rounded-2xl bg-black/25 px-4 py-3">
              <p className="text-[11px] font-bold text-white/50">Suallar</p>
              <p className="mt-1 text-xl font-black">{paper.questions?.length || 0}</p>
            </div>
            <div className="rounded-2xl bg-black/25 px-4 py-3">
              <p className="text-[11px] font-bold text-white/50">Müddət</p>
              <p className="mt-1 text-xl font-black">{DAY6_DURATION_MIN} dəq</p>
            </div>
          </div>
          {done ? (
            <p className="mt-5 text-sm font-bold text-[#8fd4a4]">
              Bu dövrə verilib · {done.percent}% · {done.correct}/{done.total}
            </p>
          ) : open ? (
            <p className="mt-5 text-sm font-bold text-[#f0b429]">Bu gün açıqdır.</p>
          ) : (
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white/70">
              <Calendar size={15} /> Növbəti 6-cı gün: {info.reviewYmd}
            </p>
          )}
          <Button
            className="mt-6 w-full min-[768px]:w-auto min-[768px]:min-w-[220px]"
            disabled={!open && !done}
            onClick={start}
          >
            {done ? 'Nəticəyə bax' : open ? 'Sınağa başla →' : 'Hələ bağlıdır'}
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
