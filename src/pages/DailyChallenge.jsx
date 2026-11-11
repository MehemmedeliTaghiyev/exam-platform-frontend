import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import AppShell from '../components/AppShell';
import StreakFlame from '../components/StreakFlame';
import LatexText from '../components/LatexText';
import { Button } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { formatHms } from '../lib/utils';
import {
  dailyKey,
  dailyLabel,
  dailyMine,
  dailyTopBoard,
  dailyDoneDays,
  dailyStreak,
  flameDying,
  flamePeak,
  formatCountdown,
  msUntilNextDaily,
  submitDailyRemote,
  syncDailyBoard,
  todaysQuestion,
} from '../lib/dailyChallenge';

export default function DailyChallenge() {
  const { user } = useContext(AuthContext);
  const { t } = useLocale();
  const question = useMemo(() => todaysQuestion(), []);
  const [mine, setMine] = useState(() => dailyMine(user?.id, question.day));
  const [pick, setPick] = useState(mine?.optionIndex ?? null);
  const [now, setNow] = useState(() => Date.now());
  const [boardTick, setBoardTick] = useState(0);
  const started = useRef(new Date().toISOString());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let live = true;
    syncDailyBoard(user, question.day).finally(() => {
      if (live) setBoardTick((n) => n + 1);
    });
    const timer = setInterval(() => {
      syncDailyBoard(user, question.day).finally(() => {
        if (live) setBoardTick((n) => n + 1);
      });
    }, 20000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [user?.id, question.day]);

  const { board, top, you } = useMemo(() => dailyTopBoard(user, question.day, 5), [user, question.day, mine, boardTick]);
  const days = dailyDoneDays(user?.id);
  const streak = dailyStreak(user?.id);
  const dying = flameDying(days, new Date(now));
  const peak = flamePeak(days);
  const left = formatCountdown(msUntilNextDaily(new Date(now)));

  const send = async () => {
    if (pick == null || mine) return;
    const row = await submitDailyRemote(user, pick, { startedAt: started.current, day: question.day });
    setMine(row);
    setBoardTick((n) => n + 1);
  };

  return (
    <AppShell title="">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-[var(--muted)]">{dailyLabel()} · {t('daily.badge')}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">{t('daily.title')}</h1>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--card)] px-3 py-1.5 text-sm font-black ring-1 ring-[var(--line)]">
            <StreakFlame streak={peak || streak} dying={dying} size={20} /> {streak}
          </span>
        </div>

        <section className="card-vector rounded-[24px] bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-extrabold text-[var(--muted)]">{question.subject}</p>
            {mine ? (
              <span className="text-xs font-extrabold text-[#22c55e]">{t('daily.answered')}</span>
            ) : null}
          </div>
          <div className="mt-3 text-lg font-extrabold leading-snug">
            <LatexText text={question.text} />
          </div>
          {mine ? (
            <p className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#22c55e]/12 px-4 py-3 text-sm font-extrabold text-[#22c55e] ring-1 ring-[#22c55e]/30">
              <span>✓ {t('daily.yourAnswer')}: <LatexText text={question.options[mine.optionIndex]} /></span>
              <span className="tabular-nums text-[var(--text)]">{formatHms(mine.durationSeconds)}</span>
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {question.options.map((opt, index) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPick(index)}
                  className={`quiz-opt ${pick === index ? 'quiz-opt-on' : ''}`}
                >
                  <span className="quiz-letter">{String.fromCharCode(65 + index)}</span>
                  <LatexText className="min-w-0 flex-1 text-left" text={opt} />
                </button>
              ))}
              <Button className="mt-2 w-full" disabled={pick == null} onClick={send}>
                {t('daily.submit')}
              </Button>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">{t('daily.ranking')}</h2>
              <p className="text-xs font-semibold text-[var(--muted)]">{t('daily.rule')}</p>
            </div>
            <p className="text-xs font-bold text-[var(--muted)]">{board.length} {t('daily.people')}</p>
          </div>
          <div className="space-y-2">
            {top.map((row) => (
              <div key={row.id} className="card-vector flex items-center gap-3 rounded-2xl bg-[var(--card)] px-4 py-3 ring-1 ring-[var(--line)]">
                <span className="w-6 text-sm font-black text-[var(--muted)]">{row.rank}</span>
                <span className="min-w-0 flex-1 truncate font-extrabold">{row.name}</span>
                <span className="text-[#22c55e]">✓</span>
                <span className="w-12 text-right text-sm font-black tabular-nums">{formatHms(row.durationSeconds).slice(-5)}</span>
              </div>
            ))}
            {you && you.rank > 5 ? (
              <>
                <p className="px-2 text-center text-[var(--muted)]">···</p>
                <div className="rank-you flex items-center gap-3 rounded-2xl px-4 py-3">
                  <span className="w-8 text-sm font-black text-[var(--accent)]">{you.rank}</span>
                  <span className="min-w-0 flex-1 truncate font-extrabold">{t('result.you')}</span>
                  <span className={you.correct ? 'text-[#22c55e]' : 'text-[#ef4444]'}>{you.correct ? '✓' : '✕'}</span>
                  <span className="w-12 text-right text-sm font-black tabular-nums">{formatHms(you.durationSeconds).slice(-5)}</span>
                </div>
              </>
            ) : null}
          </div>
        </section>

        {mine ? (
          <p className="pb-4 text-center text-sm font-semibold text-[var(--muted)]">
            {t('daily.nextIn', { time: left })}
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
