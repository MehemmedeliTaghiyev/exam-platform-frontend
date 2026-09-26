import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { Button, Card, Skeleton } from '../components/ui';
import { fetchExam, fetchQuestions, saveExamProgress, startExam, submitExam } from '../lib/examApi';
import { AuthContext } from '../context/AuthContext';
import { examPdfUrl, formatDateTime, isExamEnded, isExamScheduled, isLetterOption, isOpenChoiceOption, optionLetter, parseExamDate } from '../lib/utils';
import PdfViewer from '../components/PdfViewer';

const OPEN_SENTINEL = 'open';

function isOpenQuestion(q) {
  const type = String(q?.type || '');
  const kind = String(q?.inputKind || '');
  return type === 'OpenEnded' || ['Text', 'Integer', 'Decimal', 'Number'].includes(kind);
}

function choiceDisplayText(opt, index) {
  const t = String(opt?.optionText || opt?.text || '').trim();
  if (isOpenChoiceOption(opt)) return 'Açıq';
  if (/^[A-E]$/i.test(t)) return t.toUpperCase();
  const letter = isLetterOption(opt) ? optionLetter(opt) : String.fromCharCode(65 + index);
  if (/^[A-E][\.\)\:\-]/i.test(t)) return t;
  return `${letter}) ${t}`;
}

function serializeAnswers(map) {
  return Object.entries(map).map(([qId, val]) => {
    if (val && typeof val === 'object') {
      return {
        questionId: parseInt(qId, 10),
        selectedOptionId: val.optionId && val.optionId !== OPEN_SENTINEL ? Number(val.optionId) : 0,
        textAnswer: val.text || '',
      };
    }
    return {
      questionId: parseInt(qId, 10),
      selectedOptionId: parseInt(val, 10) || 0,
      textAnswer: '',
    };
  });
}

export default function TakeExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800);
  const [studentExamId, setStudentExamId] = useState(null);
  const submittedRef = useRef(false);
  const answersRef = useRef({});
  const sessionRef = useRef(null);

  useEffect(() => {
    const run = async () => {
      const examId = Number.isNaN(Number(id)) ? id : parseInt(id, 10);
      try {
        const examData = await fetchExam(examId);
        setExam(examData);

        if (isExamScheduled(examData)) {
          setQuestions([]);
          return;
        }

        const qs = await fetchQuestions(examId);
        setQuestions(Array.isArray(qs) ? qs : []);

        if (isExamEnded(examData)) {
          navigate(`/student/exams/${examId}/review`, { replace: true });
          return;
        }

        try {
          const started = await startExam({ examId, studentId: user?.id });
          const sessionId = started.studentExamId || started.id;
          if (started.alreadySubmitted) {
            navigate(`/student/exams/${examId}/review`, { replace: true });
            return;
          }
          setStudentExamId(sessionId);
          sessionRef.current = sessionId;
        } catch {
          /* still allow answering */
        }

        const endAt = parseExamDate(examData?.endTime);
        let remainingMs = endAt ? endAt.getTime() - Date.now() : NaN;
        if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
          remainingMs = (examData?.durationMinutes || 30) * 60 * 1000;
        }
        setTimeLeft(Math.max(1, Math.floor(remainingMs / 1000)));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id, user?.id, navigate]);

  useEffect(() => {
    if (loading || submittedRef.current || isExamScheduled(exam)) return undefined;
    if (timeLeft <= 0) {
      handleSubmit();
      return undefined;
    }
    const timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, loading, exam]);

  useEffect(() => {
    answersRef.current = answers;
    const sessionId = sessionRef.current || studentExamId;
    if (!sessionId || submittedRef.current || submitting) return undefined;
    const timer = setTimeout(() => {
      const payloadAnswers = serializeAnswers(answersRef.current);
      saveExamProgress({
        studentExamId: sessionId,
        examId: parseInt(id, 10),
        studentId: user?.id,
        answers: payloadAnswers,
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [answers, studentExamId, id, user?.id]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (submitting || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payload = {
        studentExamId: Number(sessionRef.current || studentExamId) || 0,
        examId: parseInt(id, 10),
        studentId: user?.id,
        studentName: user?.fullName,
        answers: serializeAnswers(answersRef.current),
      };
      await submitExam(payload);
      navigate(`/student/exams/${parseInt(id, 10)}/review`, { replace: true });
    } catch {
      alert('İmtahanı təhvil verərkən xəta baş verdi.');
      submittedRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="İmtahan">
        <Skeleton className="h-24" />
        <Skeleton className="mt-4 h-40" />
      </AppShell>
    );
  }

  return (
    <AppShell title={exam?.title || 'İmtahan'}>
      <div className="sticky top-20 z-10 mb-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white/90 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div>
          <p className="text-sm text-gray-500">{exam?.subjectName}</p>
          <p className="font-semibold">{user?.fullName}</p>
        </div>
        <p className={`text-lg font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-brand-600'}`}>
          {formatTime(timeLeft)}
        </p>
      </div>

      {isExamScheduled(exam) ? (
        <Card>
          <p className="font-medium">İmtahan hələ başlamayıb.</p>
          <p className="mt-2 text-sm text-gray-500">
            Mövzu: {exam?.description || exam?.subjectName || exam?.title}
          </p>
          {(exam?.startTime || exam?.StartTime) && (
            <p className="mt-1 text-sm text-gray-500">Başlama: {formatDateTime(exam.startTime || exam.StartTime)}</p>
          )}
          <p className="mt-3 text-sm text-gray-500">Suallar yalnız Live olanda görünəcək.</p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="min-w-0">
            <PdfViewer exam={exam || { id }} title="İmtahan PDF" />
          </div>
          <div className="space-y-4">
          {questions.length === 0 ? (
            <Card>Bu imtahanda hələ sual yoxdur.</Card>
          ) : (
            questions.map((q, index) => {
              const current = answers[q.id] && typeof answers[q.id] === 'object' ? answers[q.id] : { optionId: answers[q.id], text: '' };
              const open = isOpenQuestion(q);
              const letterOpts = (q.options || []).filter(isLetterOption).sort((a, b) => String(a.optionText || a.text).localeCompare(String(b.optionText || b.text)));
              const openOpt = (q.options || []).find(isOpenChoiceOption);
              const displayOpts = letterOpts.length ? letterOpts : (q.options || []).filter((opt) => !isOpenChoiceOption(opt));
              const hasFullText = displayOpts.some((opt) => !isLetterOption(opt));
              const snapLayout = hasFullText || !examPdfUrl(exam);
              const openId = openOpt?.id ?? OPEN_SENTINEL;
              const selectedOpen = String(current.optionId) === String(openId);
              const stem = String(q.text || '').trim();
              return (
            <Card key={q.id}>
              <h4 className="text-sm font-semibold text-gray-500">Sual {index + 1}</h4>
              {stem && stem !== `Sual ${index + 1}` ? (
                <div className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium dark:border-slate-700 dark:bg-slate-900">
                  {stem}
                </div>
              ) : null}
              {open ? (
                <input
                  className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                  type={q.inputKind === 'Text' ? 'text' : 'number'}
                  step={q.inputKind === 'Decimal' ? 'any' : q.inputKind === 'Integer' ? '1' : undefined}
                  inputMode={q.inputKind === 'Text' ? 'text' : 'decimal'}
                  placeholder={q.inputKind === 'Text' ? 'Cavabı yazın' : 'Rəqəm daxil edin'}
                  disabled={submitting}
                  value={current.text || ''}
                  onChange={(e) => {
                    if (submittedRef.current || submitting) return;
                    setAnswers((p) => ({ ...p, [q.id]: { text: e.target.value } }));
                  }}
                />
              ) : (
                <>
              <div className={`mt-4 ${snapLayout ? 'space-y-2' : 'grid grid-cols-3 gap-2 sm:grid-cols-6'}`}>
                {displayOpts.map((opt, oi) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 ${
                      submitting ? 'cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      String(current.optionId) === String(opt.id)
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-600/10'
                        : submitting
                          ? 'border-gray-200 dark:border-slate-700'
                          : 'border-gray-200 hover:border-gray-300 dark:border-slate-700'
                    } ${snapLayout ? '' : 'justify-center font-semibold'}`}
                  >
                    <input
                      type="radio"
                      name={`question-${q.id}`}
                      disabled={submitting}
                      className={snapLayout ? 'h-4 w-4 accent-brand-600' : 'sr-only'}
                      checked={String(current.optionId) === String(opt.id)}
                      onChange={() => {
                        if (submittedRef.current || submitting) return;
                        setAnswers((p) => ({
                          ...p,
                          [q.id]: { optionId: opt.id, text: '' },
                        }));
                      }}
                    />
                    {snapLayout ? choiceDisplayText(opt, oi) : (opt.optionText || opt.text)}
                  </label>
                ))}
                <label
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 ${
                    submitting ? 'cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    selectedOpen
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-600/10'
                      : 'border-gray-200 hover:border-gray-300 dark:border-slate-700'
                  } ${snapLayout ? '' : 'justify-center font-semibold'}`}
                >
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    disabled={submitting}
                    className={snapLayout ? 'h-4 w-4 accent-brand-600' : 'sr-only'}
                    checked={Boolean(selectedOpen)}
                    onChange={() => {
                      if (submittedRef.current || submitting) return;
                      setAnswers((p) => ({
                        ...p,
                        [q.id]: { optionId: openId, text: current.text || '' },
                      }));
                    }}
                  />
                  Açıq
                </label>
              </div>
              {selectedOpen && (
                <textarea
                  className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                  rows={3}
                  placeholder="Öz cavabınızı yazın"
                  disabled={submitting}
                  value={current.text || ''}
                  onChange={(e) => {
                    if (submittedRef.current || submitting) return;
                    setAnswers((p) => ({
                      ...p,
                      [q.id]: { optionId: openId, text: e.target.value },
                    }));
                  }}
                />
              )}
                </>
              )}
            </Card>
              );
            })
          )}
          <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
            {submitting ? 'Göndərilir...' : 'İmtahanı bitir'}
          </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
