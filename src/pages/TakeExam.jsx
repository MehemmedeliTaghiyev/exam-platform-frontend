import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { Button, Card, Skeleton } from '../components/ui';
import { fetchExam, fetchQuestions, saveExamProgress, startExam, submitExam } from '../lib/examApi';
import { AuthContext } from '../context/AuthContext';
import { examPdfUrl, formatDateTime, isExamEnded, isExamScheduled, parseExamDate } from '../lib/utils';
import PdfViewer from '../components/PdfViewer';

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
      const payloadAnswers = Object.entries(answersRef.current).map(([qId, optId]) => ({
        questionId: parseInt(qId, 10),
        selectedOptionId: parseInt(optId, 10),
      }));
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
        answers: Object.entries(answersRef.current).map(([qId, optId]) => ({
          questionId: parseInt(qId, 10),
          selectedOptionId: parseInt(optId, 10),
        })),
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
      ) : questions.length === 0 ? (
        <Card>Bu imtahanda hələ sual yoxdur.</Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <PdfViewer exam={exam} title="İmtahan PDF" />
          <div className="space-y-4">
          {questions.map((q, index) => (
            <Card key={q.id}>
              <h4 className="font-semibold">
                Sual {index + 1}
                {q.text && q.text !== `Sual ${index + 1}` ? `: ${q.text}` : ''}
              </h4>
              <div className={`mt-4 ${examPdfUrl(exam) ? 'grid grid-cols-4 gap-2' : 'space-y-2'}`}>
                {(q.options || []).map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 ${
                      submitting ? 'cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      String(answers[q.id]) === String(opt.id)
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-600/10'
                        : submitting
                          ? 'border-gray-200 dark:border-slate-700'
                          : 'border-gray-200 hover:border-gray-300 dark:border-slate-700'
                    } ${examPdfUrl(exam) ? 'justify-center font-semibold' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`question-${q.id}`}
                      disabled={submitting}
                      className={examPdfUrl(exam) ? 'sr-only' : ''}
                      checked={String(answers[q.id]) === String(opt.id)}
                      onChange={() => {
                        if (submittedRef.current || submitting) return;
                        setAnswers((p) => ({ ...p, [q.id]: opt.id }));
                      }}
                    />
                    {opt.optionText || opt.text}
                  </label>
                ))}
              </div>
            </Card>
          ))}
          <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
            {submitting ? 'Göndərilir...' : 'İmtahanı bitir'}
          </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
