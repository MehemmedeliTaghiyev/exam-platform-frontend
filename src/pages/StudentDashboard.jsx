import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import AppShell from '../components/AppShell';
import DreamUniversityCard from '../components/DreamUniversityCard';
import StudentAlerts from '../components/StudentAlerts';
import ExamRow from '../components/ExamRow';
import { Button, Card, EmptyState, Skeleton } from '../components/ui';
import { fetchAllPublicExams, fetchExams, fetchStudentHistory } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import { examSubject, subjectProgress } from '../lib/publicExams';
import { formatHms, isExamOpen, isExamScheduled, resolveExamStatus } from '../lib/utils';
import {
  ensureWeekendPaper,
  isWeekendDay,
  isWeekendOpen,
  weekendResultFor,
  weekendWindow,
} from '../lib/weekendWeakExam';
import { countStreak, DAILY_EVENT, dailyDoneDays, dailyKey, dailyMine, dailyTopBoard, flameDying, flamePeak, syncDailyBoard, todaysQuestion, weekDots } from '../lib/dailyChallenge';
import { examSortNewest, todaysTopicQuiz } from '../lib/dailyTopicQuiz';
import { tbilisiYmd } from '../lib/mathCalendar';
import StreakFlame from '../components/StreakFlame';
import { Check } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const submittedNotice = searchParams.get('teslim') === '1';
  const [exams, setExams] = useState([]);
  const [publicExams, setPublicExams] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    const bump = () => setTick((n) => n + 1);
    window.addEventListener(DAILY_EVENT, bump);
    window.addEventListener('storage', bump);
    return () => {
      clearInterval(timer);
      window.removeEventListener(DAILY_EVENT, bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    const day = todaysQuestion().day;
    syncDailyBoard(user, day).finally(() => setTick((n) => n + 1));
    const timer = setInterval(() => {
      syncDailyBoard(user, day).finally(() => setTick((n) => n + 1));
    }, 30000);
    return () => clearInterval(timer);
  }, [user?.id]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [examList, hist, pubs] = await Promise.all([
          fetchExams(),
          fetchStudentHistory(user?.id),
          fetchAllPublicExams().catch(() => []),
        ]);
        setExams(examList.filter((e) => resolveExamStatus(e) !== 'Draft'));
        setHistory(hist);
        setPublicExams(pubs);
      } finally {
        setLoading(false);
      }
    };
    if (user) run();
  }, [user]);

  const openExam = (exam) => {
    if (isExamScheduled(exam)) return;
    const submitted = history.some((h) => {
      if (String(h.examId) !== String(exam.id)) return false;
      const status = String(h.status || h.Status || '').toLowerCase();
      if (status === 'inprogress' || status === 'in_progress') return false;
      return Boolean(h.submittedAt || h.SubmittedAt);
    });
    if (isExamOpen(exam) && (!submitted || user?.practice)) {
      navigate(`/student/exams/${exam.id}`);
      return;
    }
    navigate(`/student/exams/${exam.id}/review`);
  };

  const boardExams = useMemo(() => {
    const map = new Map();
    [...exams, ...publicExams].forEach((exam) => {
      if (!exam || exam.id == null) return;
      if (resolveExamStatus(exam) === 'Draft') return;
      map.set(String(exam.id), exam);
    });
    return Array.from(map.values()).sort(examSortNewest);
  }, [exams, publicExams]);

  const latestExams = useMemo(() => boardExams.slice(0, 5), [boardExams]);

  const dayQuiz = useMemo(
    () => todaysTopicQuiz(boardExams, tbilisiYmd()),
    [boardExams],
  );

  const daily = useMemo(() => {
    const q = todaysQuestion();
    const days = dailyDoneDays(user?.id);
    history.forEach((row) => {
      const date = new Date(row.submittedAt || row.SubmittedAt);
      if (!Number.isNaN(date.getTime())) days.add(dailyKey(date));
    });
    const now = new Date();
    const board = dailyTopBoard(user, q.day, 5);
    return {
      q,
      done: dailyMine(user?.id, q.day),
      streak: countStreak(days, now),
      peak: flamePeak(days),
      dying: flameDying(days, now),
      week: weekDots(days, now),
      top: board.top,
      you: board.you,
    };
  }, [user, history, tick]);

  const weekend = useMemo(() => {
    const now = new Date();
    const win = weekendWindow(now);
    return {
      win,
      paper: ensureWeekendPaper(user),
      done: weekendResultFor(user?.id, win.week),
      open: isWeekendOpen(user, now),
      visible: isWeekendDay(now),
    };
  }, [user?.id, tick]);

  const fenStats = useMemo(() => {
    const followed = new Set(localDb.followedTeacherIds(user?.id).map(String));
    const mine = user?.teacherId != null ? String(user.teacherId) : '';
    const joined = new Set();
    exams.forEach((exam) => joined.add(examSubject(exam)));
    publicExams.forEach((exam) => {
      const owner = String(exam.teacherId ?? exam.TeacherId ?? '');
      if (followed.has(owner) || (mine && owner === mine)) joined.add(examSubject(exam));
    });
    history.forEach((item) => {
      const exam = publicExams.find((e) => String(e.id) === String(item.examId))
        || exams.find((e) => String(e.id) === String(item.examId));
      if (exam) joined.add(examSubject(exam));
    });
    return subjectProgress(publicExams, history, Array.from(joined));
  }, [publicExams, history, exams, user?.id, user?.teacherId]);

  return (
    <AppShell title="">
      {submittedNotice ? (
        <Card className="mb-6 text-center">
          <p className="text-lg font-extrabold">{t('student.submitted')}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t('student.submittedText')}
          </p>
          <Button className="mt-4" variant="secondary" onClick={() => setSearchParams({})}>{t('common.close')}</Button>
        </Card>
      ) : null}

      <div className="student-home">
        <div className="student-home-primary">
      <StudentAlerts variant="panel" />
      <DreamUniversityCard user={user} />

      <button
        type="button"
        onClick={() => navigate('/student/daily')}
        className="card-vector mb-4 w-full rounded-[24px] bg-[var(--card)] p-4 text-left ring-1 ring-[var(--line)]"
      >
        <div className="flex items-center gap-2">
          <StreakFlame streak={daily.peak || daily.streak} dying={daily.dying} size={36} />
          <p className="text-xl font-black">{t('streak.title', { n: daily.streak })}</p>
        </div>
        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
          {daily.dying > 0.12
            ? t('streak.fade')
            : daily.week.some((d) => d.today && d.done) || daily.done
              ? t('streak.keep')
              : t('streak.start')}
        </p>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {daily.week.map((day) => {
            const labels = t('streak.days');
            const name = Array.isArray(labels) ? labels[day.index] : '';
            return (
              <span key={day.key} className="grid justify-items-center gap-1.5">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black ${
                    day.done
                      ? 'bg-[var(--accent)] text-[#3a2200]'
                      : day.today
                        ? 'ring-2 ring-[var(--accent)] text-[var(--accent)]'
                        : 'ring-1 ring-[var(--line)] text-[var(--muted)]'
                  }`}
                >
                  {day.done ? <Check size={18} strokeWidth={3} /> : ''}
                </span>
                <span className="text-[11px] font-bold text-[var(--muted)]">{name}</span>
              </span>
            );
          })}
        </div>
      </button>

      {dayQuiz.exam ? (
        <button
          type="button"
          onClick={() => openExam(dayQuiz.exam)}
          className="card-vector mb-4 w-full rounded-[24px] bg-[var(--card)] p-4 text-left ring-1 ring-[var(--line)]"
        >
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">Günün sınağı</p>
          <p className="mt-1 text-lg font-black">{dayQuiz.topic || dayQuiz.exam.title}</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--muted)]">
            {String(dayQuiz.exam.title || '').replace(/VIS:(public|private)\s*/gi, '').trim()}
          </p>
          <span className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffb84a,#f5a623)] text-sm font-extrabold text-[#3a2200]">
            Sınağı aç
          </span>
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => navigate('/student/daily')}
        className="card-vector mb-4 w-full rounded-[24px] bg-[var(--card)] p-4 text-left ring-1 ring-[var(--line)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">{t('daily.badge')}</p>
            <p className="mt-1 text-lg font-black">{t('daily.title')}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{daily.q.subject}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg)] px-2.5 py-1 text-sm font-black">
            <StreakFlame streak={daily.peak || daily.streak} dying={daily.dying} size={18} /> {daily.streak}
          </span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm font-extrabold leading-snug">{daily.q.text.replace(/\$/g, '')}</p>
        <span className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffb84a,#f5a623)] text-sm font-extrabold text-[#3a2200]">
          {daily.done ? t('daily.answered') : t('daily.open')}
        </span>
      </button>

      <section className="card-vector mb-4 rounded-[24px] bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">{t('daily.ranking')}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Top 5 · hər yeni sualda sıfırlanır</p>
          </div>
          <button type="button" className="text-xs font-extrabold text-[var(--accent)]" onClick={() => navigate('/student/daily')}>
            Aç
          </button>
        </div>
        <div className="space-y-2">
          {(daily.top || []).map((row) => (
            <div key={row.id} className="flex items-center gap-3 rounded-2xl bg-[var(--bg)] px-3 py-2.5">
              <span className="w-6 text-sm font-black text-[var(--muted)]">{row.rank}</span>
              <span className={`min-w-0 flex-1 truncate text-sm font-extrabold ${row.you ? 'text-[var(--accent)]' : ''}`}>{row.name}</span>
              <span className={row.correct ? 'text-[#22c55e]' : 'text-[#ef4444]'}>{row.correct ? '✓' : '✕'}</span>
              <span className="w-12 text-right text-xs font-black tabular-nums">{formatHms(row.durationSeconds).slice(-5)}</span>
            </div>
          ))}
          {daily.you && daily.you.rank > 5 ? (
            <div className="rank-you flex items-center gap-3 rounded-2xl px-3 py-2.5">
              <span className="w-6 text-sm font-black text-[var(--accent)]">{daily.you.rank}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-extrabold">{t('result.you')}</span>
              <span className={daily.you.correct ? 'text-[#22c55e]' : 'text-[#ef4444]'}>{daily.you.correct ? '✓' : '✕'}</span>
            </div>
          ) : null}
          {!daily.top?.length ? (
            <p className="text-sm font-semibold text-[var(--muted)]">Hələ cavab yoxdur — ilk sən ol.</p>
          ) : null}
        </div>
      </section>

      {weekend.visible ? (
      <button
        type="button"
        onClick={() => navigate(weekend.done ? `/student/weekend/result/${encodeURIComponent(weekend.win.week)}` : '/student/weekend')}
        className="card-vector mb-6 w-full rounded-[24px] bg-[var(--card)] p-4 text-left ring-1 ring-[var(--line)]"
      >
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">{t('student.weekend')}</p>
        <p className="mt-2 text-lg font-black">{weekend.win.label}</p>
        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
          {weekend.done
            ? t('student.weekendDone', { pct: weekend.done.percent })
            : weekend.open
              ? t('student.weekendOpen', { n: weekend.paper.questions?.length || 0 })
              : t('student.weekendSoon')}
        </p>
        <span className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffb84a,#f5a623)] text-sm font-extrabold text-[#3a2200]">
          {weekend.done ? t('student.viewResult') : weekend.open ? t('student.startChallenge') : t('student.soon')}
        </span>
      </button>
      ) : null}
        </div>
        <aside className="student-home-aside">
      <div className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t('student.subjects')}</h2>
          <Button variant="secondary" onClick={() => navigate('/student/public')}>{t('nav.examPlace')}</Button>
        </div>
        {fenStats.length === 0 ? (
          <div className="card-vector rounded-[22px] bg-[var(--card)] px-4 py-5 text-sm font-semibold text-[var(--muted)] ring-1 ring-[var(--line)]">
            {t('student.noSubjects')}
          </div>
        ) : (
          <div className="grid gap-3">
            {fenStats.map((row) => {
              const pct = row.total ? Math.min(100, Math.round((row.entered / row.total) * 100)) : 0;
              const letter = String(row.subject || '?').trim().charAt(0).toUpperCase();
              const bar = pct >= 70 ? 'bg-[#2ee07a]' : 'bg-[var(--accent)]';
              const badge = pct >= 70 ? 'bg-[#2ee07a]/18 text-[#2ee07a]' : 'bg-[var(--accent)]/18 text-[var(--accent)]';
              return (
                <button
                  key={row.subject}
                  type="button"
                  onClick={() => navigate(`/student/public?subject=${encodeURIComponent(row.subject)}`)}
                  className="card-vector flex items-center gap-3 rounded-[22px] bg-[var(--card)] px-4 py-4 text-left ring-1 ring-[var(--line)]"
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-black ${badge}`}>{letter}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-extrabold leading-tight">{row.subject}</p>
                    <p className="mt-0.5 text-xs font-semibold text-[var(--muted)]">{t('student.examCount', { entered: row.entered, total: row.total })}</p>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
                      <span className={`block h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-black text-[var(--muted)]">{pct}%</span>
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          onClick={() => navigate('/student/progress')}
          className="card-vector mt-3 w-full rounded-[22px] bg-[var(--card)] px-4 py-4 text-left ring-1 ring-[var(--line)]"
        >
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">{t('student.progress')}</p>
          <p className="mt-1 text-lg font-black">{t('progress.title')}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{t('student.progressText')}</p>
        </button>
      </div>

      <div className="card-vector min-w-0 overflow-hidden rounded-[28px] bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-lg font-bold">{t('student.latest')}</h2>
          <button
            type="button"
            onClick={() => navigate('/student/public')}
            className="shrink-0 text-xs font-extrabold text-[var(--accent)]"
          >
            {t('common.all')}
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-[22px]" />
            <Skeleton className="h-16 rounded-[22px]" />
          </div>
        ) : latestExams.length === 0 ? (
          <EmptyState
            title={t('student.noExams')}
            text={t('student.noExamsText')}
            action={
              <Button variant="secondary" onClick={() => navigate('/student/public')}>
                {t('nav.examPlace')}
              </Button>
            }
          />
        ) : (
          <div className="exam-board-list">
            {latestExams.map((exam) => (
              <ExamRow
                key={exam.id}
                exam={exam}
                mine={history.find((row) => String(row.examId) === String(exam.id))}
                onOpen={isExamScheduled(exam) ? undefined : () => openExam(exam)}
              />
            ))}
          </div>
        )}
      </div>
        </aside>
      </div>
    </AppShell>
  );
}
