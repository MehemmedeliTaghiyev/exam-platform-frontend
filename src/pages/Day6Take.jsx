import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { Button, Card } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { formatHms } from '../lib/utils';
import ExamFinishConfirm, { useExamFinishGuard } from '../components/ExamFinishConfirm';
import {
  DAY6_DURATION_MIN,
  day6CycleInfo,
  day6ResultFor,
  ensureDay6Paper,
  isDay6ReviewDay,
  submitDay6,
} from '../lib/day6ReviewQuiz';

function clockKey(userId, cycleKey) {
  return `exampulse_day6_clock:${userId}:${cycleKey}`;
}

function readStartedAt(userId, cycleKey) {
  try {
    const existing = sessionStorage.getItem(clockKey(userId, cycleKey));
    if (existing) return existing;
    const now = new Date().toISOString();
    sessionStorage.setItem(clockKey(userId, cycleKey), now);
    return now;
  } catch {
    return new Date().toISOString();
  }
}

export default function Day6Take() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const info = useMemo(() => day6CycleInfo(), []);
  const paper = useMemo(() => ensureDay6Paper(user), [user?.id]);
  const questions = paper.questions || [];
  const done = day6ResultFor(user?.id, info.cycleKey);
  const allowed = Boolean(user && isDay6ReviewDay() && questions.length && !done);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const startedAt = useMemo(
    () => (user ? readStartedAt(user.id, info.cycleKey) : new Date().toISOString()),
    [user, info.cycleKey],
  );
  const budget = DAY6_DURATION_MIN * 60;
  const [left, setLeft] = useState(() => {
    const used = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
    return Math.max(0, budget - used);
  });
  const finishing = useRef(false);
  const finishGuardRef = useRef(null);

  const finish = () => {
    if (finishing.current || !user) return;
    finishGuardRef.current?.release();
    finishing.current = true;
    try {
      sessionStorage.removeItem(clockKey(user.id, info.cycleKey));
    } catch {
      /* ignore */
    }
    const row = submitDay6(user, answersRef.current, { startedAt });
    navigate(`/student/day6/result/${encodeURIComponent(row.cycleKey)}`, { replace: true });
  };
  const finishGuard = useExamFinishGuard(allowed && !done && !finishing.current, finish);
  finishGuardRef.current = finishGuard;

  useEffect(() => {
    const timer = setInterval(() => {
      const used = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
      const next = Math.max(0, budget - used);
      setLeft(next);
      if (next <= 0) finish();
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt, budget, user]);

  if (done) {
    return <Navigate to={`/student/day6/result/${encodeURIComponent(info.cycleKey)}`} replace />;
  }
  if (!allowed) {
    return <Navigate to="/student/day6" replace />;
  }

  const question = questions[index];
  const urgent = left > 0 && left <= 180;

  return (
    <AppShell title="5 günün təkrarı" onLeaveExam={finishGuard.request}>
      <div className={`mb-3 flex items-center justify-between rounded-2xl px-4 py-3 ring-1 ${
        urgent ? 'bg-[#3a1518] ring-[#ef4444]/40' : 'bg-[var(--card)] ring-[var(--line)]'
      }`}
      >
        <p className="text-sm font-extrabold">{index + 1} / {questions.length}</p>
        <p className={`text-sm font-black tabular-nums ${urgent ? 'text-[#fb7185]' : ''}`}>{formatHms(left)}</p>
      </div>
      <Card>
        <p className="text-base font-extrabold leading-snug">{question.text}</p>
        <div className="mt-4 grid gap-2">
          {(question.options || []).map((text, oi) => {
            const selected = answers[question.id] === oi;
            return (
              <button
                key={`${question.id}-${oi}`}
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: oi }))}
                className={`rounded-2xl px-4 py-3 text-left text-sm font-bold ring-1 ${
                  selected
                    ? 'bg-[var(--accent)] text-[#3a2200] ring-[var(--accent)]'
                    : 'bg-[var(--bg)] text-[var(--text)] ring-[var(--line)]'
                }`}
              >
                {String.fromCharCode(65 + oi)}) {text}
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" disabled={index <= 0} onClick={() => setIndex((n) => Math.max(0, n - 1))}>
            Əvvəlki
          </Button>
          {index < questions.length - 1 ? (
            <Button className="flex-1" onClick={() => setIndex((n) => Math.min(questions.length - 1, n + 1))}>
              Növbəti
            </Button>
          ) : (
            <Button className="flex-1" onClick={finishGuard.request}>Bitir</Button>
          )}
        </div>
      </Card>
      <ExamFinishConfirm guard={finishGuard} />
    </AppShell>
  );
}
