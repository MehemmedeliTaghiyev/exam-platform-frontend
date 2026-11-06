import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, TrendingDown } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Button } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { formatHms } from '../lib/utils';
import {
  ensureWeekendPaper,
  isWeekendOpen,
  WEEKEND_DURATION_MIN,
  weekendHistoryForUser,
  weekendResultFor,
  weekendWindow,
} from '../lib/weekendWeakExam';

export default function WeekendWeak() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const windowInfo = weekendWindow();
  const open = isWeekendOpen(user);
  const paper = useMemo(() => ensureWeekendPaper(user), [user?.id]);
  const done = weekendResultFor(user?.id, windowInfo.week);
  const past = weekendHistoryForUser(user?.id);

  const start = () => {
    if (done) {
      navigate(`/student/weekend/result/${encodeURIComponent(windowInfo.week)}`);
      return;
    }
    if (!open) return;
    navigate('/student/weekend/take');
  };

  return (
    <AppShell title="Həftəsonu sınağı">
      <div className="desk-page space-y-4">
        <section className="rounded-[28px] bg-[var(--card)] p-5 ring-1 ring-white/10 min-[768px]:p-7">
          <p className="flex items-center gap-2 text-sm font-semibold text-white/65">
            <TrendingDown size={16} className="text-[#f0b429]" /> {windowInfo.label}
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">Zəifliklərdən sınaq</h2>
          <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/75">
            Hər həftəsonu sənin səhv etdiyin suallardan qısa sınaq yığılır. Məqsəd eyni zəifliyi təkrarlamamaqdır.
          </p>
          <div className="mt-5 flex gap-2">
            <div className="rounded-2xl bg-black/25 px-4 py-3">
              <p className="text-[11px] font-bold text-white/50">Suallar</p>
              <p className="mt-1 text-xl font-black">{paper.questions?.length || 0}</p>
            </div>
            <div className="rounded-2xl bg-black/25 px-4 py-3">
              <p className="text-[11px] font-bold text-white/50">Müddət</p>
              <p className="mt-1 text-xl font-black">{WEEKEND_DURATION_MIN} dəq</p>
            </div>
          </div>
          {done ? (
            <p className="mt-5 text-sm font-bold text-[#8fd4a4]">
              Bu həftəsonu verilib · {done.percent}% · {done.correct}/{done.total}
            </p>
          ) : open ? (
            <p className="mt-5 text-sm font-bold text-[#f0b429]">Şənbə–bazar açıqdır.</p>
          ) : (
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white/70">
              <Calendar size={15} /> Şənbə günü avtomatik açılacaq.
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

        <section className="rounded-[22px] bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
          <p className="font-extrabold">Keçmiş həftəsonları</p>
          {past.length ? (
            <ul className="mt-3 space-y-2">
              {past.map((row) => (
                <li key={row.week}>
                  <button
                    type="button"
                    onClick={() => navigate(`/student/weekend/result/${encodeURIComponent(row.week)}`)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[var(--bg)] px-3 py-3 text-left"
                  >
                    <span>
                      <span className="block font-extrabold">{row.label || row.week}</span>
                      <span className="text-xs font-semibold text-[var(--muted)]">
                        {row.correct}/{row.total} düzgün
                        {row.durationSeconds != null ? ` · ${formatHms(row.durationSeconds)}` : ''}
                      </span>
                    </span>
                    <span className="font-black">{row.percent}%</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm font-semibold text-[var(--muted)]">Hələ nəticə yoxdur.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
