import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import QuestionCard from '../components/QuestionCard';
import { Button, Card, Skeleton } from '../components/ui';
import { fetchExam, fetchQuestions, paperQuestionsOf, saveExamProgress, startExam, submitExam } from '../lib/examApi';
import { AuthContext } from '../context/AuthContext';
import { formatDateTime, isExamEnded, isExamScheduled, isOpenChoiceOption, parseExamDate } from '../lib/utils';
import { displayExamDescription, examDriveFileId } from '../lib/driveLinks';
import { canEnterExam, examTeacherId } from '../lib/teacherAccess';
import DrivePreview from '../components/DrivePreview';

const OPEN_SENTINEL = 'open';

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
      const opt = (q.options || []).find((o) => {
        const mark = String(o.letter || o.optionText || o.text || '').trim().toUpperCase();
        return mark === letter || mark.startsWith(`${letter})`);
      });
      const rawId = val.optionId && val.optionId !== OPEN_SENTINEL ? val.optionId : opt?.id;
      const selected = rawId == null || rawId === '' ? 0 : (Number.isNaN(Number(rawId)) ? rawId : Number(rawId));
      return {
        questionId: Number.isNaN(Number(q.id)) ? q.id : (Number(q.id) || index + 1),
        selectedOptionId: selected,
        textAnswer: val.text || letter || '',
      };
    });
  }
  return Object.entries(map).map(([qId, val], index) => ({
    questionId: parseInt(qId, 10) || index + 1,
    selectedOptionId: (val && val.optionId && val.optionId !== OPEN_SENTINEL) ? Number(val.optionId) : 0,
    textAnswer: (val && typeof val === 'object') ? (val.text || val.letter || '') : String(val || ''),
  }));
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
        const [examData, qs] = await Promise.all([
          fetchExam(examId),
          fetchQuestions(examId).catch(() => []),
        ]);
        setExam(examData);

        if (!user) {
          navigate('/login', { replace: true });
          return;
        }
        if (!canEnterExam(user, examData)) {
          const owner = examTeacherId(examData);
          navigate(owner ? `/teachers/${owner}?pay=1` : '/teachers', { replace: true });
          return;
        }

        if (isExamScheduled(examData)) {
          setQuestions([]);
          return;
        }

        setQuestions(Array.isArray(qs) ? qs : []);

        if (isExamEnded(examData)) {
          navigate(`/student/exams/${examId}/review`, { replace: true });
          return;
        }

        const endAt = parseExamDate(examData?.endTime);
        let remainingMs = endAt ? endAt.getTime() - Date.now() : NaN;
        if (user?.practice) {
          remainingMs = (examData?.durationMinutes || 30) * 60 * 1000;
        } else if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
          remainingMs = (examData?.durationMinutes || 30) * 60 * 1000;
        }
        setTimeLeft(Math.max(1, Math.floor(remainingMs / 1000)));

        startExam({ examId, studentId: user?.id })
          .then((started) => {
            const sessionId = started.studentExamId || started.id;
            if (started.alreadySubmitted) {
              navigate(`/student/exams/${examId}/review`, { replace: true });
              return;
            }
            setStudentExamId(sessionId);
            sessionRef.current = sessionId;
          })
          .catch(() => {});
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
      saveExamProgress({
        studentExamId: sessionId,
        examId: Number.isNaN(Number(id)) ? id : parseInt(id, 10),
        studentId: user?.id,
        answers: serializeAnswers(answersRef.current, paperQuestionsOf(questions)),
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [answers, studentExamId, id, user?.id, submitting, questions]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const paperQuestions = paperQuestionsOf(questions);

  const handleSubmit = async () => {
    if (submitting || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const examKey = Number.isNaN(Number(id)) ? id : parseInt(id, 10);
      await submitExam({
        studentExamId: sessionRef.current || studentExamId || 0,
        examId: examKey,
        studentId: user?.id,
        studentName: user?.fullName,
        answers: serializeAnswers(answersRef.current, paperQuestionsOf(questions)),
      });
      navigate(`/student/exams/${examKey}/review`, { replace: true });
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
            Mövzu: {displayExamDescription(exam) || exam?.subjectName || exam?.title}
          </p>
          {(exam?.startTime || exam?.StartTime) && (
            <p className="mt-1 text-sm text-gray-500">Başlama: {formatDateTime(exam.startTime || exam.StartTime)}</p>
          )}
          <p className="mt-3 text-sm text-gray-500">Suallar yalnız Live olanda görünəcək.</p>
        </Card>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          {paperQuestions.length > 0 ? (
            paperQuestions.map((q, index) => {
              const current = answers[q.id] && typeof answers[q.id] === 'object' ? answers[q.id] : { optionId: answers[q.id], text: '' };
              const open = isOpenQuestion(q);
              const openOpt = (q.options || []).find(isOpenChoiceOption);
              const openId = openOpt?.id ?? OPEN_SENTINEL;
              if (open) {
                return (
                  <Card key={q.id}>
                    <p className="text-sm font-semibold text-gray-500">Sual {index + 1}</p>
                    <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800">
                      {q.text}
                    </div>
                    <input
                      className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                      type={q.inputKind === 'Text' ? 'text' : 'number'}
                      step={q.inputKind === 'Decimal' ? 'any' : q.inputKind === 'Integer' ? '1' : undefined}
                      placeholder={q.inputKind === 'Text' ? 'Cavabı yazın' : 'Rəqəm daxil edin'}
                      disabled={submitting}
                      value={current.text || ''}
                      onChange={(e) => {
                        if (submittedRef.current || submitting) return;
                        setAnswers((p) => ({ ...p, [q.id]: { text: e.target.value } }));
                      }}
                    />
                  </Card>
                );
              }
              return (
                <QuestionCard
                  key={q.id}
                  index={index}
                  mode="student"
                  question={q}
                  disabled={submitting}
                  selectedOptionId={current.optionId}
                  openText={current.text || ''}
                  onSelect={(opt) => {
                    if (submittedRef.current || submitting) return;
                    if (opt.letter === 'OPEN' || String(opt.id) === String(openId) || opt.id === 'open') {
                      setAnswers((p) => ({ ...p, [q.id]: { optionId: openId, text: current.text || '' } }));
                      return;
                    }
                    setAnswers((p) => ({ ...p, [q.id]: { optionId: opt.id, text: '' } }));
                  }}
                  onOpenText={(text) => {
                    if (submittedRef.current || submitting) return;
                    setAnswers((p) => ({ ...p, [q.id]: { optionId: openId, text } }));
                  }}
                />
              );
            })
          ) : examDriveFileId(exam) ? (
            <DrivePreview exam={exam} title="İmtahan PDF" mode="iframe" />
          ) : (
            <Card>Bu imtahanda PDF və ya sual yoxdur.</Card>
          )}
          <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
            {submitting ? 'Göndərilir...' : 'İmtahanı bitir'}
          </Button>
        </div>
      )}
    </AppShell>
  );
}
