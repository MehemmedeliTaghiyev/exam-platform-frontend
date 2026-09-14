import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { Button, Card, Skeleton } from '../components/ui';
import { fetchExam, fetchQuestions, submitExam } from '../lib/examApi';
import { AuthContext } from '../context/AuthContext';

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
  const submittedRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      const [examData, qs] = await Promise.all([fetchExam(id), fetchQuestions(id)]);
      setExam(examData);
      setQuestions(qs);
      const minutes = examData?.durationMinutes || 30;
      setTimeLeft(minutes * 60);
      setLoading(false);
    };
    run();
  }, [id]);

  useEffect(() => {
    if (loading || submittedRef.current) return undefined;
    if (timeLeft <= 0) {
      handleSubmit();
      return undefined;
    }
    const timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, loading]);

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
        examId: Number.isNaN(Number(id)) ? id : parseInt(id, 10),
        studentId: user?.id,
        studentName: user?.fullName,
        answers: Object.entries(answers).map(([qId, optId]) => ({
          questionId: Number.isNaN(Number(qId)) ? qId : parseInt(qId, 10),
          selectedOptionId: Number.isNaN(Number(optId)) ? optId : parseInt(optId, 10),
        })),
      };
      const response = await submitExam(payload);
      const submissionId = response.submissionId || response.id || response;
      navigate(`/student/exam-result/${submissionId}`);
    } catch {
      alert('İmtahanı təhvil verərkən xəta baş verdi.');
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

      {questions.length === 0 ? (
        <Card>Bu imtahanda hələ sual yoxdur.</Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q, index) => (
            <Card key={q.id}>
              <h4 className="font-semibold">
                Sual {index + 1}: {q.text}
              </h4>
              <div className="mt-4 space-y-2">
                {(q.options || []).map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 ${
                      answers[q.id] === opt.id
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-600/10'
                        : 'border-gray-200 hover:border-gray-300 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${q.id}`}
                      checked={answers[q.id] === opt.id}
                      onChange={() => setAnswers((p) => ({ ...p, [q.id]: opt.id }))}
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
      )}
    </AppShell>
  );
}
