import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { Button, Card } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import {
  canTryRepublic,
  hasFreeNextRepublic,
  hasPaidRepublic,
  payRepublic,
  REPUBLIC_DURATION_MIN,
  republicMonthKey,
  submitRepublic,
} from '../lib/republicExam';
import { getMonthlyQuizPaper } from '../lib/monthlyQuizRam';
import { formatHms } from '../lib/utils';
import ExamFinishConfirm, { useExamFinishGuard } from '../components/ExamFinishConfirm';

function clockKey(userId) {
  return `exampulse_republic_clock:${userId}:${republicMonthKey()}`;
}

function readStartedAt(userId) {
  try {
    const existing = sessionStorage.getItem(clockKey(userId));
    if (existing) return existing;
    const now = new Date().toISOString();
    sessionStorage.setItem(clockKey(userId), now);
    return now;
  } catch {
    return new Date().toISOString();
  }
}

export default function RepublicTake() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const allowed = Boolean(user && canTryRepublic(user));
  const startedAt = useMemo(() => (user ? readStartedAt(user.id) : new Date().toISOString()), [user]);
  const budget = REPUBLIC_DURATION_MIN * 60;
  const [left, setLeft] = useState(() => {
    const used = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
    return Math.max(0, budget - used);
  });
  const finishing = useRef(false);
  const finishGuardRef = useRef(null);

  useEffect(() => {
    if (user && !hasPaidRepublic(user) && hasFreeNextRepublic(user)) {
      payRepublic(user, 'winner-free');
    }
  }, [user]);

  useEffect(() => {
    let live = true;
    getMonthlyQuizPaper().then((list) => {
      if (live) setQuestions(list || []);
    }).catch(() => {
      if (live) setQuestions([]);
    });
    return () => { live = false; };
  }, []);

  const finish = () => {
    if (finishing.current || !user || !questionsRef.current.length) return;
    finishGuardRef.current?.release();
    finishing.current = true;
    try {
      sessionStorage.removeItem(clockKey(user.id));
    } catch {
      /* ignore */
    }
    const row = submitRepublic(user, answersRef.current, { startedAt, questions: questionsRef.current });
    navigate(`/student/republic/result/${encodeURIComponent(row.month)}`, { replace: true });
  };
  const finishGuard = useExamFinishGuard(allowed && !finishing.current, finish);
  finishGuardRef.current = finishGuard;

  useEffect(() => {
    if (!questions.length) return undefined;
    const timer = setInterval(() => {
      const used = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
      const next = Math.max(0, budget - used);
      setLeft(next);
      if (next <= 0) finish();
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt, budget, user, questions.length]);

  if (!allowed) {
    return <Navigate to="/student/republic" replace />;
  }

  if (!questions.length) {
    return (
      <AppShell title="Respublika sınağı">
        <Card>
          <p className="font-extrabold">Sınaq RAM-ə yüklənir...</p>
          <p className="mt-2 text-sm font-semibold text-[var(--muted)]">Suallar bazadan bir dəfə gətirilir, hamı eyni kağızdan işləyir.</p>
        </Card>
      </AppShell>
    );
  }

  const question = questions[index];
  const urgent = left > 0 && left <= 300;

  return (
    <AppShell title="Respublika sınağı" onLeaveExam={finishGuard.request}>
      <div className={`mb-3 flex items-center justify-between rounded-2xl px-4 py-3 ring-1 ${
        urgent ? 'bg-[#3a1c16] text-[#fbbf24] ring-[#f0b429]/40' : 'bg-[var(--card)] text-[var(--text)] ring-white/10'
      }`}>
        <p className="text-xs font-bold uppercase tracking-wide text-white/60">Qalan vaxt</p>
        <p className="font-mono text-2xl font-black tabular-nums">{formatHms(left)}</p>
        <p className="text-xs font-bold text-white/55">{REPUBLIC_DURATION_MIN} dəq</p>
      </div>
      <Card>
        <p className="text-xs font-bold text-[var(--muted)]">Sual {index + 1} / {questions.length}</p>
        <h2 className="mt-3 text-xl font-extrabold">{question.text}</h2>
        <div className="mt-5 grid gap-2">
          {question.options.map((option, optionIndex) => {
            const on = Number(answers[question.id]) === optionIndex;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))}
                className={`quiz-opt font-semibold ${on ? 'quiz-opt-on' : ''}`}
              >
                <span className="quiz-letter">{String.fromCharCode(65 + optionIndex)}</span>
                <span className="min-w-0 flex-1">{option}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <Button variant="secondary" disabled={index === 0} onClick={() => setIndex((n) => n - 1)}>Əvvəlki</Button>
          <div className="flex flex-wrap gap-2">
            {index + 1 < questions.length ? (
              <Button onClick={() => setIndex((n) => n + 1)}>Növbəti</Button>
            ) : null}
            <Button onClick={finishGuard.request}>Bitir</Button>
          </div>
        </div>
      </Card>
      <ExamFinishConfirm
        open={finishGuard.open}
        onStay={finishGuard.stay}
        onFinish={finishGuard.confirm}
      />
    </AppShell>
  );
}
