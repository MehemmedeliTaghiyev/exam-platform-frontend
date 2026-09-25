import { useContext, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BarChart3, ChevronLeft, ChevronRight, Sparkles, Trophy } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { fetchWeeklyRankingSource, mapStudent } from '../lib/examApi';
import {
  MONTHS_TITLE,
  WEEKDAY_SHORT,
  buildWeeklyBoards,
  formatWeekLabel,
  monthWeeks,
  previousWeekStart,
  toKey,
} from '../lib/weeklyRanking';
import { Button, Card, Modal, Skeleton } from './ui';

function RankDelta({ change, isNew }) {
  if (isNew) {
    return <span className="text-xs font-medium text-amber-600 dark:text-amber-400">yeni</span>;
  }
  if (change == null || change === 0) {
    return <span className="text-xs font-medium text-gray-400">0</span>;
  }
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
        <ArrowUp size={16} strokeWidth={2.75} />
        {change}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-sm font-bold text-red-600 dark:text-red-400">
      <ArrowDown size={16} strokeWidth={2.75} />
      {Math.abs(change)}
    </span>
  );
}

function RankingBars({ rows = [], highlightId }) {
  const max = Math.max(100, ...rows.map((r) => Number(r.percent) || 0));
  return (
    <div className="space-y-2.5">
      {rows.map((row) => {
        const mine = String(row.studentId) === String(highlightId);
        const width = Math.max(8, (Number(row.percent) / max) * 100);
        const tone = row.rank === 1
          ? 'from-amber-400 to-orange-500'
          : row.rank === 2
            ? 'from-slate-300 to-slate-500'
            : row.rank === 3
              ? 'from-orange-300 to-amber-700'
              : 'from-brand-400 to-brand-600';
        return (
          <div
            key={row.studentId}
            className={`rounded-xl px-3 py-2 ${mine ? 'bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-950/40 dark:ring-brand-800' : ''}`}
          >
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <p className="min-w-0 truncate font-medium">
                <span className="mr-2 font-bold text-brand-600">#{row.rank}</span>
                {row.studentName}
                {mine ? ' · sən' : ''}
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <RankDelta change={row.rankChange} isNew={row.isNew} />
                <span className="w-12 text-right font-bold tabular-nums">{Math.round(row.percent)}%</span>
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
              <div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChampionCard({ week, emptyText }) {
  if (!week?.champion) {
    return (
      <div className="rounded-2xl border border-dashed border-white/30 bg-white/10 px-5 py-8 text-center text-sm text-white/80">
        {emptyText}
      </div>
    );
  }
  const star = week.champion;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/15 p-5 text-white shadow-inner ring-1 ring-white/20">
      <Sparkles className="absolute right-4 top-4 text-amber-200 opacity-80" size={22} />
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-100">Həftənin ulduzu</p>
      <p className="mt-1 text-sm text-white/80">{week.label}</p>
      <p className="mt-4 text-2xl font-black tracking-tight">{star.studentName}</p>
      <p className="mt-2 text-sm text-white/85">
        Orta nəticə <span className="font-bold text-amber-200">{Math.round(star.percent)}%</span>
        {' · '}
        {star.examCount} imtahan
      </p>
      <div className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1">
        <RankDelta change={star.rankChange} isNew={star.isNew} />
      </div>
    </div>
  );
}

function WeekCalendar({ weeksByKey, selectedKey, onSelect }) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const rows = monthWeeks(year, month);

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Əvvəlki ay"
          className="rounded-lg p-1.5 hover:bg-white/10"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-bold">{MONTHS_TITLE[month]} {year}</p>
        <button
          type="button"
          aria-label="Növbəti ay"
          className="rounded-lg p-1.5 hover:bg-white/10"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white/60">
        {WEEKDAY_SHORT.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="space-y-1">
        {rows.map((week) => {
          const data = weeksByKey.get(week.key);
          const active = selectedKey === week.key;
          return (
            <button
              key={week.key}
              type="button"
              onClick={() => onSelect(week.key)}
              className={`grid w-full grid-cols-7 gap-1 rounded-xl p-1 transition ${
                active ? 'bg-white/25 ring-1 ring-amber-200' : 'hover:bg-white/10'
              }`}
              title={data?.champion ? `${formatWeekLabel(week.start)} · ${data.champion.studentName}` : formatWeekLabel(week.start)}
            >
              {week.days.map((day) => {
                const inMonth = day.getMonth() === month;
                const isChampDay = data?.champion && day.getDay() === 1;
                return (
                  <span
                    key={toKey(day)}
                    className={`flex h-8 items-center justify-center rounded-lg text-xs ${
                      inMonth ? 'text-white' : 'text-white/30'
                    } ${isChampDay ? 'bg-amber-400/90 font-bold text-amber-950' : ''}`}
                  >
                    {day.getDate()}
                  </span>
                );
              })}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-white/70">Qızıl gün olan həftəyə toxunun — o həftənin ən güclüsünü görəcəksiniz.</p>
    </div>
  );
}

export default function WeeklyRanking({ variant = 'teacher' }) {
  const { user } = useContext(AuthContext);
  const isTeacher = variant === 'teacher';
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState({ exams: [], students: [], submissions: [] });
  const [graphOpen, setGraphOpen] = useState(false);
  const [pickedKey, setPickedKey] = useState('');

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const data = await fetchWeeklyRankingSource();
        if (alive) setSource(data);
      } catch {
        if (alive) setSource({ exams: [], students: [], submissions: [] });
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, [user?.id]);

  const groupKey = isTeacher
    ? ''
    : (user?.groupName || source.students.find((s) => String(s.id) === String(user?.id))?.groupName || '');

  const { weeks, previousWeek } = useMemo(
    () => buildWeeklyBoards({
      exams: source.exams,
      submissions: source.submissions,
      students: source.students.map(mapStudent).filter(Boolean),
      groupKey,
    }),
    [source, groupKey],
  );

  const weeksByKey = useMemo(() => new Map(weeks.map((w) => [w.key, w])), [weeks]);
  const prevStart = previousWeekStart();
  const defaultKey = previousWeek?.key || (prevStart ? toKey(prevStart) : '');
  const selectedWeek = weeksByKey.get(pickedKey) || previousWeek;
  const graphWeek = isTeacher ? (weeksByKey.get(pickedKey) || previousWeek) : previousWeek;
  const myRow = previousWeek?.rows.find((r) => String(r.studentId) === String(user?.id));

  if (loading) {
    return <Skeleton className="mb-8 h-48" />;
  }

  return (
    <section className="mb-10">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-brand-600 to-violet-700 p-5 shadow-lg sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 shadow-md">
              <Trophy size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black sm:text-xl">Həftəlik sıralama</h2>
              <p className="text-sm text-white/80">
                {isTeacher
                  ? 'Keçən həftənin qalibi ön plandadır. Kalendardan bütün həftələrə baxın.'
                  : 'Yalnız keçən həftənin nəticələri — qalib, sənin yerin və qrafik.'}
              </p>
            </div>
          </div>
          {graphWeek?.rows?.length ? (
            <Button
              variant="secondary"
              className="bg-white text-brand-700 hover:bg-amber-50"
              onClick={() => setGraphOpen(true)}
            >
              <BarChart3 size={16} /> Həftənin qrafiki
            </Button>
          ) : null}
        </div>

        <div className={`grid gap-4 ${isTeacher ? 'lg:grid-cols-2' : ''}`}>
          <ChampionCard
            week={previousWeek}
            emptyText="Keçən həftə imtahan nəticəsi yoxdur. Növbəti həftə burada ulduz görünəcək!"
          />

          {!isTeacher && (
            <div className="rounded-2xl bg-white/15 p-5 text-white ring-1 ring-white/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-100">Sənin yerin</p>
              {myRow ? (
                <>
                  <p className="mt-3 text-4xl font-black">#{myRow.rank}</p>
                  <p className="mt-1 text-sm text-white/80">{Math.round(myRow.percent)}% orta nəticə</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm text-white/70">Sıralamada dəyişiklik:</span>
                    <span className="inline-flex rounded-full bg-white px-2.5 py-1">
                      <RankDelta change={myRow.rankChange} isNew={myRow.isNew} />
                    </span>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-white/80">Keçən həftə imtahanda iştirakın yoxdur. Bu həftə qoşul, yerin burada yanacaq!</p>
              )}
            </div>
          )}

          {isTeacher && (
            <WeekCalendar
              weeksByKey={weeksByKey}
              selectedKey={pickedKey || defaultKey}
              onSelect={setPickedKey}
            />
          )}
        </div>

        {isTeacher && pickedKey && selectedWeek && selectedWeek.key !== defaultKey && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-100">Seçilmiş həftənin ən güclüsü</p>
            <ChampionCard week={selectedWeek} emptyText="Bu həftədə nəticə yoxdur." />
          </div>
        )}
      </div>

      <Modal
        open={graphOpen}
        title={graphWeek ? `${graphWeek.label} — ümumi sıralama` : 'Həftənin qrafiki'}
        onClose={() => setGraphOpen(false)}
        className="max-w-3xl"
      >
        {graphWeek?.rows?.length ? (
          <RankingBars rows={graphWeek.rows} highlightId={user?.id} />
        ) : (
          <p className="text-sm text-gray-500">Bu həftə üçün qrafik yoxdur.</p>
        )}
      </Modal>
    </section>
  );
}
