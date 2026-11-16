import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { Button, Card } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { formatHms } from '../lib/utils';
import ExamFinishConfirm, { useExamFinishGuard } from '../components/ExamFinishConfirm';
import {
  DAILY_TOPIC_DURATION_MIN,
  dailyTopicResultFor,
  ensureDailyTopicPaper,
  ensureDailyTopicPaperAsync,
  submitDailyTopic,
} from '../lib/dailyTopicPaper';
import { tbilisiYmd } from '../lib/mathCalendar';
import {
  fetchAllPublicExams,
  fetchExam,
  fetchExams,
  fetchListedExamsForTeacher,
} from '../lib/examApi';
import { studentSubscriptions } from '../lib/groupSubscriptions';
import { DAILY_TOPIC_SENDS } from '../lib/dailyTopicQuiz';
import { LIVE_WEEKLY_EASY_EXAM_ID, LIVE_WEEKLY_MEDIUM_EXAM_ID } from '../lib/weeklyMath';

function clockKey(userId, ymd, role) {
  return `exampulse_daily_topic_clock:${userId}:${ymd}:${role}`;
}

function readStartedAt(userId, ymd, role) {
  try {
    const existing = sessionStorage.getItem(clockKey(userId, ymd, role));
    if (existing) return existing;
    const now = new Date().toISOString();
    sessionStorage.setItem(clockKey(userId, ymd, role), now);
    return now;
  } catch {
    return new Date().toISOString();
  }
}

export default function DailyTopicTake() {
  const { role: roleParam } = useParams();
  const [searchParams] = useSearchParams();
  const role = roleParam === 'review' ? 'review' : 'primary';
  const ymd = searchParams.get('gun') || tbilisiYmd();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [paper, setPaper] = useState(() => ensureDailyTopicPaper(user, role, ymd));
  const questions = paper.questions || [];
  const done = dailyTopicResultFor(user?.id, ymd, role);
  const allowed = Boolean(user && paper.topic && questions.length && !done);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const startedAt = useMemo(
    () => (user ? readStartedAt(user.id, ymd, role) : new Date().toISOString()),
    [user, ymd, role],
  );
  const budget = DAILY_TOPIC_DURATION_MIN * 60;
  const [left, setLeft] = useState(() => {
    const used = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
    return Math.max(0, budget - used);
  });
  const finishing = useRef(false);
  const finishGuardRef = useRef(null);

  useEffect(() => {
    if (!user?.id || done) return undefined;
    let cancelled = false;
    (async () => {
      const teacherIds = [...new Set([
        user.teacherId ?? user.TeacherId,
        ...studentSubscriptions(user.id).map((row) => row.teacherId),
      ].filter((id) => id != null && id !== ''))];
      const dailyIds = [...new Set(DAILY_TOPIC_SENDS.map((row) => row.examId).filter(Boolean))];
      const [mine, pubs, listed, easy, medium, ...dailyExams] = await Promise.all([
        fetchExams().catch(() => []),
        fetchAllPublicExams().catch(() => []),
        Promise.all(teacherIds.map((id) => fetchListedExamsForTeacher(id).catch(() => []))),
        fetchExam(LIVE_WEEKLY_EASY_EXAM_ID).catch(() => null),
        fetchExam(LIVE_WEEKLY_MEDIUM_EXAM_ID).catch(() => null),
        ...dailyIds.map((id) => fetchExam(id).catch(() => null)),
      ]);
      const exams = [...mine, ...pubs, ...listed.flat(), easy, medium, ...dailyExams]
        .filter((exam, i, all) => exam?.id != null && all.findIndex((row) => String(row.id) === String(exam.id)) === i);
      const next = await ensureDailyTopicPaperAsync(user, role, ymd, exams);
      if (!cancelled && next?.questions?.length) setPaper(next);
    })();
    return () => { cancelled = true; };
  }, [user?.id, role, ymd, done]);

  const finish = () => {
    if (finishing.current || !user) return;
    finishGuardRef.current?.release();
    finishing.current = true;
    try {
      sessionStorage.removeItem(clockKey(user.id, ymd, role));
    } catch {
      /* ignore */
    }
    const row = submitDailyTopic(user, answersRef.current, { startedAt }, role, ymd);
    navigate(`/student/topic-quiz/result/${encodeURIComponent(row.ymd)}/${encodeURIComponent(row.role || role)}`, { replace: true });
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
    return (
      <Navigate
        to={`/student/topic-quiz/result/${encodeURIComponent(ymd)}/${encodeURIComponent(role)}`}
        replace
      />
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!paper.topic || !questions.length) {
    return <Navigate to="/student" replace />;
  }

  const question = questions[index];
  const urgent = left > 0 && left <= 180;

  return (
    <AppShell title={paper.label || 'Günün sınağı'} onLeaveExam={finishGuard.request}>
      <div className={`mb-3 flex items-center justify-between rounded-2xl px-4 py-3 ring-1 ${
        urgent ? 'bg-[#3a1518] ring-[#ef4444]/40' : 'bg-[var(--card)] ring-[var(--line)]'
      }`}
      >
        <p className="text-sm font-extrabold">{index + 1} / {questions.length}</p>
        <p className={`text-sm font-black tabular-nums ${urgent ? 'text-[#fb7185]' : ''}`}>{formatHms(left)}</p>
      </div>
      <Card>
        {question.topic ? (
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{question.topic}</p>
        ) : null}
        <p className="mt-1 text-base font-extrabold leading-snug">{question.text}</p>
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
