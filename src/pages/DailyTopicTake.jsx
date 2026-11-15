import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ExamFinishConfirm, { useExamFinishGuard } from '../components/ExamFinishConfirm';
import ExamCardStage from '../components/ExamCardStage';
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
import { LIVE_WEEKLY_EXAM_ID } from '../lib/weeklyMath';

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
  const [flagged, setFlagged] = useState(() => new Set());
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
      const [mine, pubs, listed, weekly, ...dailyExams] = await Promise.all([
        fetchExams().catch(() => []),
        fetchAllPublicExams().catch(() => []),
        Promise.all(teacherIds.map((id) => fetchListedExamsForTeacher(id).catch(() => []))),
        fetchExam(LIVE_WEEKLY_EXAM_ID).catch(() => null),
        ...dailyIds.map((id) => fetchExam(id).catch(() => null)),
      ]);
      const exams = [...mine, ...pubs, ...listed.flat(), weekly, ...dailyExams]
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

  const goNext = () => {
    if (index >= questions.length - 1) finishGuard.request();
    else setIndex((n) => Math.min(questions.length - 1, n + 1));
  };

  return (
    <>
      <ExamCardStage
        badge={role === 'review' ? 'ƏVVƏLKİ MÖVZU' : 'GÜNÜN SINAĞI'}
        title={paper.topic}
        subject={questions[index]?.subject || 'Riyaziyyat'}
        questions={questions}
        index={index}
        answers={answers}
        flagged={flagged}
        leftSeconds={left}
        scratchKey={`exampulse-ecs-scratch-${user.id}-${ymd}-${role}`}
        onExit={finishGuard.request}
        onJump={setIndex}
        onSelect={(_opt, optionIndex) => {
          const q = questions[index];
          if (!q) return;
          setAnswers((prev) => ({ ...prev, [q.id]: optionIndex }));
        }}
        onToggleFlag={(questionId) => {
          setFlagged((prev) => {
            const next = new Set(prev);
            if (next.has(questionId)) next.delete(questionId);
            else next.add(questionId);
            return next;
          });
        }}
        onPrev={() => setIndex((n) => Math.max(0, n - 1))}
        onNext={goNext}
        nextLabel={index >= questions.length - 1 ? 'Bitir' : 'Növbəti →'}
      />
      <ExamFinishConfirm
        open={finishGuard.open}
        onStay={finishGuard.stay}
        onFinish={finishGuard.confirm}
      />
    </>
  );
}
