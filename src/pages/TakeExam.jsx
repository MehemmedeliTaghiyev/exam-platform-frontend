import { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Bookmark, ChevronLeft, Flag, Infinity as InfinityIcon } from 'lucide-react';
import QuestionCard, { visibleStudentOptions } from '../components/QuestionCard';
import { Button, Card } from '../components/ui';
import { fetchExam, fetchQuestions, paperQuestionsOf, saveExamProgress, startExam, submitExam } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { examRetakeReady, formatDateTime, isExamEnded, isExamScheduled, isOpenChoiceOption, parseExamDate, studentResultsReady } from '../lib/utils';
import { displayExamDescription, examDriveFileId } from '../lib/driveLinks';
import { canEnterExam, examTeacherId } from '../lib/teacherAccess';
import { teacherWatermarkText } from '../lib/storageAccess';
import DrivePreview from '../components/DrivePreview';
import ScreenGuard from '../components/ScreenGuard';
import ExamFinishConfirm, { useExamFinishGuard } from '../components/ExamFinishConfirm';
import { isPublicExam } from '../lib/examVisibility';
import { letterOfOption, optionIdValue } from '../lib/gradeExam';

const OPEN_SENTINEL = 'open';
const LETTER_KEYS = ['A', 'B', 'C', 'D', 'E'];
const NUMBER_KEYS = ['1', '2', '3', '4', '5'];

function isOpenQuestion(q) {
  const type = String(q?.type || '');
  const kind = String(q?.inputKind || '');
  return type === 'OpenEnded' || ['Text', 'Integer', 'Decimal', 'Number'].includes(kind);
}

function serializeAnswers(map, questions = []) {
  if (questions.length) {
    return questions.map((q, index) => {
      const val = map[q.id] || map[String(q.id)] || map[`p${index + 1}`] || {};
      const letter = String(val.letter || '').toUpperCase();
      const opt = (q.options || []).find((o, oi) => {
        const mark = letterOfOption(o, oi);
        return mark && mark === letter;
      });
      const rawId = val.optionId && val.optionId !== OPEN_SENTINEL ? val.optionId : opt?.id;
      return {
        questionId: Number.isNaN(Number(q.id)) ? q.id : (Number(q.id) || index + 1),
        selectedOptionId: optionIdValue(rawId),
        letter: letter || letterOfOption(opt, 0),
        textAnswer: val.text || letter || '',
      };
    });
  }
  return Object.entries(map).map(([qId, val], index) => ({
    questionId: parseInt(qId, 10) || qId || index + 1,
    selectedOptionId: optionIdValue(val && val.optionId !== OPEN_SENTINEL ? val.optionId : 0),
    letter: String(val?.letter || '').toUpperCase(),
    textAnswer: (val && typeof val === 'object') ? (val.text || val.letter || '') : String(val || ''),
  }));
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const ExamTimer = memo(function ExamTimer({ initialSeconds, running, onExpire }) {
  const [seconds, setSeconds] = useState(() => Math.max(0, initialSeconds || 0));
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setSeconds(Math.max(0, initialSeconds || 0));
    firedRef.current = false;
  }, [initialSeconds]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      setSeconds((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [running, initialSeconds]);

  useEffect(() => {
    if (!running || seconds > 0 || firedRef.current) return;
    firedRef.current = true;
    onExpireRef.current?.();
  }, [running, seconds]);

  const urgent = seconds > 0 && seconds <= 300;
  return (
    <p className={`text-sm font-black tabular-nums ${urgent ? 'exam-timer-urgent text-[#fbbf24]' : 'text-[var(--text)]'}`}>
      {formatTime(seconds)}
    </p>
  );
});

const QuestionNav = memo(function QuestionNav({ questions, currentIndex, answers, flagged, onJump }) {
  return (
    <nav aria-label="Suallar" className="grid grid-cols-4 gap-2">
      {questions.map((question, index) => {
        const answered = Boolean(answers[question.id] || answers[String(question.id)]);
        const isFlagged = flagged.has(question.id);
        const current = index === currentIndex;
        return (
          <button
            key={question.id}
            type="button"
            onClick={() => onJump(index)}
            className={`flex h-10 items-center justify-center rounded-lg border text-sm font-semibold transition-all duration-150 ease-in-out ${
              isFlagged
                ? 'border-[#f0b429] bg-[#f0b429] text-[#3a2a00]'
                : current
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[#3a2200]'
                  : answered
                    ? 'border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--text)]'
                    : 'border-[var(--line)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--accent)]/50'
            }`}
          >
            {index + 1}
          </button>
        );
      })}
    </nav>
  );
});

const QuestionCanvas = memo(function QuestionCanvas({
  question,
  index,
  answer,
  flagged,
  disabled,
  flash,
  theme,
  onSelect,
  onOpenText,
  onToggleFlag,
}) {
  if (!question) return null;
  const current = answer && typeof answer === 'object' ? answer : { optionId: answer, text: '' };
  const open = isOpenQuestion(question);
  const openOpt = (question.options || []).find(isOpenChoiceOption);
  const openId = openOpt?.id ?? OPEN_SENTINEL;
  const showSaved = flash?.id != null && String(flash.id) === String(question.id);
  const dark = theme === 'dark';

  return (
    <div className="flex min-h-[12rem] flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onToggleFlag(question.id)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium ring-1 ${
            flagged
              ? 'bg-[#f0b429] text-[#3a2a00] ring-[#f0b429]'
              : dark
                ? 'bg-transparent text-white/70 ring-white/15'
                : 'bg-white text-[#6B7280] ring-[#E5E7EB]'
          }`}
        >
          <Flag size={14} /> {flagged ? 'İşarələnib' : 'İşarələ'}
        </button>
        <span className={`min-h-5 text-sm ${dark ? 'text-white/50' : 'text-[#6B7280]'}`}>
          {showSaved ? <span key={flash.n} className="exam-saved">✓ Saxlanıldı</span> : null}
        </span>
      </div>
      <div className="mt-1">
        {open ? (
          <div className={`rounded-2xl border p-5 ${dark ? 'border-white/10 bg-[var(--card)]' : 'border-[#E5E7EB] bg-white'}`}>
            <p className={`text-sm font-semibold ${dark ? 'text-white/55' : 'text-[#6B7280]'}`}>Sual {index + 1}</p>
            <div className={`mt-2 select-none text-[18px] font-medium leading-[1.5] ${dark ? 'text-[#f3f0ea]' : 'text-[#1F2937]'}`}>
              {question.text}
            </div>
            <input
              className={`mt-4 w-full rounded-xl border px-3 py-2.5 text-[16px] outline-none ${dark ? 'border-white/10 bg-[#120e24] text-[#f7f4ff]' : 'border-[#E5E7EB] text-[#1F2937]'}`}
              type={question.inputKind === 'Text' ? 'text' : 'number'}
              step={question.inputKind === 'Decimal' ? 'any' : question.inputKind === 'Integer' ? '1' : undefined}
              placeholder={question.inputKind === 'Text' ? 'Cavabı yazın' : 'Rəqəm daxil edin'}
              disabled={disabled}
              value={current.text || ''}
              onChange={(e) => onOpenText(question.id, e.target.value)}
            />
          </div>
        ) : (
          <QuestionCard
            index={index}
            mode="student"
            theme={theme}
            question={question}
            disabled={disabled}
            selectedOptionId={current.optionId}
            openText={current.text || ''}
            onSelect={(opt) => onSelect(question.id, opt, openId)}
            onOpenText={(text) => onOpenText(question.id, text, openId)}
          />
        )}
      </div>
    </div>
  );
});

function ExamSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 gap-4 p-4 sm:p-6">
      <div className="min-w-0 flex-1 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="h-4 w-24 animate-pulse rounded bg-[#E5E7EB]" />
        <div className="mt-4 h-7 w-4/5 animate-pulse rounded bg-[#E5E7EB]" />
        <div className="mt-3 h-7 w-3/5 animate-pulse rounded bg-[#E5E7EB]" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]" />
          ))}
        </div>
      </div>
      <aside className="hidden w-64 shrink-0 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:block">
        <div className="mb-3 h-4 w-16 animate-pulse rounded bg-[#E5E7EB]" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-[#F3F4F6]" />
          ))}
        </div>
      </aside>
    </div>
  );
}

export default function TakeExam() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const wantsRetry = searchParams.get('yeniden') === '1';
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();
  const { t } = useLocale();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(() => new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [secondsBudget, setSecondsBudget] = useState(0);
  const [studentExamId, setStudentExamId] = useState(null);
  const [flash, setFlash] = useState({ id: null, n: 0 });
  const [saved, setSaved] = useState(false);
  const submittedRef = useRef(false);
  const finishGuardRef = useRef(null);
  const answersRef = useRef({});
  const sessionRef = useRef(null);
  const questionsRef = useRef([]);
  const indexRef = useRef(0);

  const paperQuestions = useMemo(() => paperQuestionsOf(questions), [questions]);
  questionsRef.current = paperQuestions;
  indexRef.current = currentIndex;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      const examId = Number.isNaN(Number(id)) ? id : parseInt(id, 10);
      try {
        const examData = await fetchExam(examId);
        setExam(examData);

        if (!user) {
          navigate('/login', { replace: true });
          return;
        }
        if (!canEnterExam(user, examData)) {
          const owner = examTeacherId(examData);
          navigate(owner ? `/teachers/${owner}` : '/teachers', { replace: true });
          return;
        }

        if (isExamScheduled(examData)) {
          setQuestions([]);
          return;
        }

        const qs = await fetchQuestions(examId, examData).catch(() => []);
        setQuestions(Array.isArray(qs) ? qs : []);

        const retry = wantsRetry && examRetakeReady(examData);
        if (isExamEnded(examData) && !retry) {
          navigate(`/student/exams/${examId}/review`, { replace: true });
          return;
        }

        const endAt = parseExamDate(examData?.endTime);
        let remainingMs = endAt ? endAt.getTime() - Date.now() : NaN;
        if (user?.practice || retry) {
          remainingMs = (examData?.durationMinutes || 30) * 60 * 1000;
        } else if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
          remainingMs = (examData?.durationMinutes || 30) * 60 * 1000;
        }
        setSecondsBudget(Math.max(1, Math.floor(remainingMs / 1000)));

        startExam({ examId, studentId: user?.id })
          .then((started) => {
            if (started.alreadySubmitted && !retry) {
              navigate(`/student/exams/${examId}/review`, { replace: true });
              return;
            }
            const sessionId = started.alreadySubmitted
              ? `retry-${examId}-${Date.now()}`
              : (started.studentExamId || started.id);
            sessionRef.current = sessionId;
            setStudentExamId(sessionId);
          })
          .catch(() => {
            if (!retry) return;
            const sessionId = `retry-${examId}-${Date.now()}`;
            sessionRef.current = sessionId;
            setStudentExamId(sessionId);
          });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id, navigate, user?.id, user?.practice, wantsRetry]);

  useEffect(() => {
    answersRef.current = answers;
    const sessionId = sessionRef.current || studentExamId;
    if (!sessionId || submittedRef.current || submitting) return undefined;
    const timer = setTimeout(() => {
      saveExamProgress({
        studentExamId: sessionId,
        examId: Number.isNaN(Number(id)) ? id : parseInt(id, 10),
        studentId: user?.id,
        answers: serializeAnswers(answersRef.current, paperQuestionsOf(questionsRef.current)),
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [answers, id, studentExamId, submitting, user?.id]);

  useEffect(() => {
    setSaved(Boolean(user?.id) && localDb.isExamSaved(user.id, id));
  }, [id, user?.id]);

  const toggleSave = () => {
    if (!user?.id || !exam) return;
    const next = localDb.toggleSavedExam(user.id, exam);
    setSaved(next.some((item) => String(item.id) === String(exam.id)));
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || submittedRef.current) return;
    finishGuardRef.current?.release();
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const examKey = Number.isNaN(Number(id)) ? id : parseInt(id, 10);
      await submitExam({
        studentExamId: sessionRef.current || 0,
        examId: examKey,
        studentId: user?.id,
        studentName: user?.fullName,
        answers: serializeAnswers(answersRef.current, paperQuestionsOf(questionsRef.current)),
      });
      if (studentResultsReady(exam, user)) {
        navigate(`/student/exams/${examKey}/review`, { replace: true });
      } else {
        navigate('/student?teslim=1', { replace: true });
      }
    } catch {
      alert('İmtahanı təhvil verərkən xəta baş verdi.');
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [exam, id, navigate, submitting, user]);

  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;
  const onExpire = useCallback(() => {
    submitRef.current?.();
  }, []);
  const inExam = !loading && !submitting && exam && !isExamScheduled(exam) && paperQuestions.length > 0;
  const finishGuard = useExamFinishGuard(inExam, () => {
    submitRef.current?.();
  });
  finishGuardRef.current = finishGuard;

  const jumpTo = useCallback((index) => {
    const last = questionsRef.current.length - 1;
    if (last < 0) return;
    setCurrentIndex(Math.min(last, Math.max(0, index)));
  }, []);

  const markSaved = useCallback((questionId) => {
    setFlash((prev) => ({ id: questionId, n: prev.n + 1 }));
  }, []);

  const onSelect = useCallback((questionId, opt, openId) => {
    if (submittedRef.current) return;
    if (opt.letter === 'OPEN' || String(opt.id) === String(openId) || opt.id === 'open') {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: { optionId: openId, text: prev[questionId]?.text || '' },
      }));
    } else {
      setAnswers((prev) => ({ ...prev, [questionId]: { optionId: opt.id, letter: opt.letter, text: '' } }));
    }
    markSaved(questionId);
  }, [markSaved]);

  const onOpenText = useCallback((questionId, text, openId) => {
    if (submittedRef.current) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: openId == null ? { text } : { optionId: openId, text },
    }));
  }, []);

  const onToggleFlag = useCallback((questionId) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (loading || isExamScheduled(exam) || submitting) return undefined;
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = String(event.target?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      const list = questionsRef.current;
      const index = indexRef.current;
      if (event.key === 'ArrowRight') {
        if (index < list.length - 1) {
          event.preventDefault();
          setCurrentIndex(index + 1);
        }
        return;
      }
      if (event.key === 'ArrowLeft') {
        if (index > 0) {
          event.preventDefault();
          setCurrentIndex(index - 1);
        }
        return;
      }
      const question = list[index];
      if (!question || isOpenQuestion(question)) return;
      const choices = visibleStudentOptions(question);
      const key = String(event.key || '').toUpperCase();
      let optionIndex = LETTER_KEYS.indexOf(key);
      if (optionIndex < 0) optionIndex = NUMBER_KEYS.indexOf(key);
      if (optionIndex < 0 || optionIndex >= choices.length) return;
      event.preventDefault();
      const openOpt = (question.options || []).find(isOpenChoiceOption);
      onSelect(question.id, choices[optionIndex], openOpt?.id ?? OPEN_SENTINEL);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exam, loading, onSelect, submitting]);

  const active = paperQuestions[currentIndex] || null;
  const scheduled = isExamScheduled(exam);
  const timerRunning = !loading && !scheduled && !submitting && secondsBudget > 0 && paperQuestions.length > 0;
  const personalQuiz = !isPublicExam(exam);
  const watermarkName = teacherWatermarkText(examTeacherId(exam)) || (personalQuiz ? (user?.fullName || user?.email || 'ExamPulse') : '');

  return (
    <div className={`fixed inset-0 z-[60] flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)] ${personalQuiz || watermarkName ? 'exam-guard' : ''}`} style={{ height: '100vh' }}>
      <header className="shrink-0 border-b border-white/10 bg-[var(--bg)] px-4 py-3 text-[var(--text)] sm:px-6">
        <div className="flex items-center gap-3">
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--card)] ring-1 ring-[var(--line)]" onClick={inExam ? finishGuard.request : () => navigate('/student')} aria-label={t('quiz.close')}>
            <ChevronLeft size={18} />
          </button>
          <div className="quiz-track h-2 min-w-0 flex-1 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${paperQuestions.length ? ((currentIndex + 1) / paperQuestions.length) * 100 : 0}%` }}
            />
          </div>
          <p className="shrink-0 text-sm font-extrabold tabular-nums">
            {paperQuestions.length ? `${currentIndex + 1}/${paperQuestions.length}` : '—'}
          </p>
          <button
            type="button"
            onClick={toggleSave}
            className={`grid h-9 w-9 place-items-center rounded-full ${saved ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}
            aria-label={saved ? t('common.saved') : t('common.save')}
          >
            <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
          </button>
          <Button
            onClick={finishGuard.request}
            disabled={submitting || loading || scheduled}
            className="shrink-0 px-3 py-1.5 text-xs"
          >
            {submitting ? '...' : t('quiz.finish')}
          </Button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-semibold text-[var(--muted)]">
            {exam?.subjectName || exam?.title || t('quiz.exam')}
            {exam?.title && exam?.subjectName ? ` · ${exam.title}` : ''}
          </p>
          <div className="flex shrink-0 items-center gap-1 font-extrabold tabular-nums text-[var(--accent)]">
            {!loading && !scheduled && secondsBudget > 0 ? (
              <ExamTimer initialSeconds={secondsBudget} running={timerRunning} onExpire={onExpire} />
            ) : (
              <InfinityIcon size={18} />
            )}
            <span className="text-xs font-extrabold">{t('quiz.left')}</span>
          </div>
        </div>
      </header>

      {loading ? (
        <ExamSkeleton />
      ) : (
        <div className="exam-fade-in flex min-h-0 flex-1">
          {scheduled ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <Card className="max-w-lg border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <p className="font-medium text-[#1F2937]">İmtahan hələ başlamayıb.</p>
                <p className="mt-2 text-sm leading-[1.5] text-[#6B7280]">
                  Mövzu: {displayExamDescription(exam) || exam?.subjectName || exam?.title}
                </p>
                {(exam?.startTime || exam?.StartTime) && (
                  <p className="mt-1 text-sm text-[#6B7280]">Başlama: {formatDateTime(exam.startTime || exam.StartTime)}</p>
                )}
                <p className="mt-3 text-sm text-[#6B7280]">Suallar yalnız Live olanda görünəcək.</p>
                <Button variant="secondary" className="mt-4" onClick={() => navigate('/student')}>Panelə qayıt</Button>
              </Card>
            </div>
          ) : (
            <>
              <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-6">
                <div className="mx-auto w-full max-w-3xl">
                  {paperQuestions.length > 0 ? (
                    <QuestionCanvas
                      question={active}
                      index={currentIndex}
                      answer={active ? (answers[active.id] || answers[String(active.id)]) : null}
                      flagged={active ? flagged.has(active.id) : false}
                      disabled={submitting}
                      flash={flash}
                      theme={dark ? 'dark' : 'light'}
                      onSelect={onSelect}
                      onOpenText={onOpenText}
                      onToggleFlag={onToggleFlag}
                    />
                  ) : examDriveFileId(exam) ? (
                    <DrivePreview exam={exam} title="İmtahan PDF" mode="iframe" />
                  ) : (
                    <Card className="border-[#E5E7EB] bg-white text-[#1F2937] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                      Bu imtahanda PDF və ya sual yoxdur.
                    </Card>
                  )}
                </div>
              </main>
              {paperQuestions.length > 0 ? (
                <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-[var(--line)] bg-[var(--bg)] p-4 sm:block">
                  <p className="mb-3 text-sm font-semibold text-[var(--text)]">Suallar</p>
                  <QuestionNav
                    questions={paperQuestions}
                    currentIndex={currentIndex}
                    answers={answers}
                    flagged={flagged}
                    onJump={jumpTo}
                  />
                  <p className="mt-4 text-xs leading-[1.5] text-[var(--muted)]">
                    Ox düymələri sualı dəyişir. A–E və ya 1–{Math.min(5, visibleStudentOptions(active || {}).length || 4)} cavabı seçir.
                  </p>
                </aside>
              ) : null}
            </>
          )}
        </div>
      )}
      {!loading && !scheduled && paperQuestions.length > 0 ? (
        <div className="flex shrink-0 gap-3 border-t border-white/10 bg-[var(--bg)] px-4 py-3 sm:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            disabled={currentIndex <= 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] disabled:opacity-40"
            aria-label="Əvvəlki sual"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (currentIndex >= paperQuestions.length - 1) finishGuard.request();
              else setCurrentIndex((i) => Math.min(paperQuestions.length - 1, i + 1));
            }}
            className="flex h-14 min-w-0 flex-1 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffb84a,#f5a623)] text-sm font-extrabold text-[#3a2200]"
          >
            {currentIndex >= paperQuestions.length - 1 ? t('quiz.finish') : t('quiz.continue')}
          </button>
        </div>
      ) : null}
      <ScreenGuard active={Boolean(watermarkName)} name={watermarkName} />
      <ExamFinishConfirm
        open={finishGuard.open}
        busy={submitting}
        onStay={finishGuard.stay}
        onFinish={finishGuard.confirm}
      />
    </div>
  );
}
