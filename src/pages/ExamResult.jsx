import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import LeaderboardTable from '../components/LeaderboardTable';
import QuestionReviewList from '../components/QuestionReviewList';
import { Button, Card, Skeleton, StatCard } from '../components/ui';
import { fetchExam, fetchExamReview, fetchExamReviewByExam, fetchQuestions } from '../lib/examApi';
import { AuthContext } from '../context/AuthContext';
import { Award, CheckCircle2, Percent, XCircle } from 'lucide-react';
import { durationSecondsBetween, formatDateTime, formatHms, isExamEnded } from '../lib/utils';
import PdfViewer from '../components/PdfViewer';

function toReviewQuestions(list = []) {
  return list.map((q, index) => {
    const options = (q.options || []).map((opt) => ({
      id: opt.id,
      text: opt.text || opt.optionText,
      isCorrect: Boolean(opt.isCorrect),
      isSelected: Boolean(opt.isSelected),
    }));
    const selected = options.find((opt) => opt.isSelected);
    const selectedText = q.selectedText || q.SelectedText || '';
    const correctText = q.correctText || q.CorrectText || '';
    const unanswered = Boolean(q.unanswered) || (!selected && !String(selectedText).trim());
    const isCorrect = unanswered ? false : Boolean(q.isCorrect ?? selected?.isCorrect);
    return {
      questionId: q.id ?? q.questionId,
      index: q.index || index + 1,
      text: q.text,
      isCorrect,
      unanswered,
      selectedText,
      correctText,
      options,
    };
  });
}

export default function ExamResult() {
  const { submissionId, examId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const queryStudentExamId = searchParams.get('studentExamId');
  const queryStudentId = searchParams.get('studentId');
  const reviewId = queryStudentExamId || submissionId;
  const [review, setReview] = useState(null);
  const [paper, setPaper] = useState([]);
  const [examMeta, setExamMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const data = reviewId
          ? await fetchExamReview(reviewId)
          : examId
            ? await fetchExamReviewByExam(examId)
            : await fetchExamReview(submissionId);
        setReview(data);

        const fallbackId = examId || data?.result?.examId;
        if (fallbackId) {
          try {
            const examData = await fetchExam(fallbackId);
            setExamMeta(examData);
          } catch {
            setExamMeta(null);
          }
        }

        const reviewQuestions = toReviewQuestions(data?.questions || []);
        if (reviewQuestions.length) {
          setPaper(reviewQuestions);
        } else if (fallbackId) {
          const qs = await fetchQuestions(fallbackId);
          setPaper(toReviewQuestions(qs));
        }
        if (data?.pdfFilePath || data?.pdfFileUrl) {
          setExamMeta((prev) => ({
            ...(prev || {}),
            id: fallbackId,
            pdfFilePath: data.pdfFilePath || prev?.pdfFilePath,
            pdfFileUrl: data.pdfFileUrl || prev?.pdfFileUrl,
          }));
        }
      } catch {
        try {
          if (examId) {
            const [qs, examData] = await Promise.all([fetchQuestions(examId), fetchExam(examId)]);
            setPaper(toReviewQuestions(qs));
            setExamMeta(examData);
            setReview({
              examEnded: isExamEnded(examData),
              result: { examId: Number(examId) },
              questions: [],
              leaderboard: [],
            });
          } else {
            setError('Nəticə tapılmadı.');
          }
        } catch {
          setError('Nəticə tapılmadı.');
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [submissionId, examId, reviewId, user?.role, navigate]);

  if (loading) {
    return (
      <AppShell title="Nəticə">
        <Skeleton className="h-64" />
      </AppShell>
    );
  }

  const result = review?.result || review;
  if ((!result && !paper.length) || error) {
    return (
      <AppShell title="Nəticə">
        <Card>{error || 'Nəticə tapılmadı.'}</Card>
      </AppShell>
    );
  }

  const questions = paper.length ? paper : toReviewQuestions(review?.questions || []);
  const total = result?.totalQuestions || questions.length || 1;
  const correct = result?.correctAnswersCount ?? 0;
  const scorePercentage = Math.round(Number(result?.percent ?? result?.score ?? 0));
  const isPassed = scorePercentage >= 50;
  const isPersonal = Boolean(result?.studentExamId || reviewId);
  const examEnded = examMeta ? isExamEnded(examMeta) : Boolean(review?.examEnded);
  const mistakes = questions.filter((q) => !q.unanswered && q.isCorrect === false);
  const leaderboard = examEnded ? review?.leaderboard || [] : [];
  const backTo = queryStudentId
    ? `/teacher/students/${queryStudentId}`
    : user?.role === 'Student'
      ? '/student'
      : `/teacher/exams/${result?.examId || examId}/stats`;
  const pdfExam = {
    ...(examMeta || {}),
    id: examMeta?.id || examId || result?.examId,
    pdfFilePath: examMeta?.pdfFilePath || examMeta?.PdfFilePath || review?.pdfFilePath,
    pdfFileUrl: examMeta?.pdfFileUrl || examMeta?.PdfFileUrl || review?.pdfFileUrl,
  };
  const hasPdf = Boolean(pdfExam.id);

  return (
    <AppShell title="İmtahan nəticəsi">
      <div className={`mx-auto space-y-8 ${hasPdf ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {isPersonal && examEnded && (
          <Card className="text-center">
            <p className="text-sm text-gray-500">{result.examTitle || `İmtahan #${result.examId}`}</p>
            {examEnded && result.rank ? (
              <p className="mt-2 text-sm font-medium text-brand-600">
                Sıralama: #{result.rank}
                {result.submittedAt ? ` · Bitirmə: ${formatDateTime(result.submittedAt)}` : ''}
                {result.startedAt && result.submittedAt
                  ? ` · Müddət: ${formatHms(result.durationSeconds ?? durationSecondsBetween(result.startedAt, result.submittedAt))}`
                  : ''}
              </p>
            ) : null}
            <div
              className={`mt-5 rounded-2xl px-4 py-5 text-lg font-bold ${
                isPassed
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
              }`}
            >
              {isPassed ? 'Təbriklər, imtahanı keçdiniz' : 'Təəssüf, kəsildiniz'}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <StatCard icon={Award} label="Uğur faizi" value={`${scorePercentage}%`} />
              <StatCard icon={Percent} label="Sıralama" value={examEnded && result.rank ? `#${result.rank}` : '—'} />
              <StatCard icon={CheckCircle2} label="Düzgün" value={`${correct} / ${total}`} />
              <StatCard icon={XCircle} label="Səhv" value={result.wrongAnswersCount ?? Math.max(total - correct, 0)} />
            </div>
          </Card>
        )}

        {examEnded ? (
          <>
            <div className={hasPdf ? 'grid gap-6 lg:grid-cols-[1.2fr_0.8fr]' : ''}>
              {hasPdf && <PdfViewer exam={pdfExam} title="İmtahan PDF" />}
              <div>
                <h3 className="mb-4 text-lg font-bold">İmtahan vərəqi</h3>
                {questions.length ? (
                  <QuestionReviewList questions={questions} />
                ) : (
                  <Card className="text-sm text-gray-500">Bu imtahana hələ sual əlavə edilməyib.</Card>
                )}
              </div>
            </div>

            {mistakes.length > 0 && (
              <div>
                <h3 className="mb-4 text-lg font-bold">Səhv cavablar</h3>
                <QuestionReviewList questions={mistakes} />
              </div>
            )}

            <Card className="p-0">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
                <h3 className="font-bold">İştirakçılar (sıralama)</h3>
                <p className="mt-1 text-sm text-gray-500">Bal, sonra bitirmə müddəti (saat:dəqiqə:saniyə) üzrə</p>
              </div>
              <LeaderboardTable rows={leaderboard} />
            </Card>
          </>
        ) : (
          <div className={hasPdf ? 'grid gap-6 lg:grid-cols-[1.2fr_0.8fr]' : ''}>
            {hasPdf && <PdfViewer exam={pdfExam} title="İmtahan PDF" />}
            <div>
              <p className="mb-4 text-center text-sm text-gray-500">
                İmtahan təhvil verilib. Cavablar dəyişdirilə bilməz. Düzgün/səhv yoxlama və sıralama imtahan bitəndən sonra açılacaq.
              </p>
              {questions.length ? (
                <QuestionReviewList questions={questions} reveal={false} />
              ) : (
                <Card className="text-sm text-gray-500">Cavablar tapılmadı.</Card>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <Button onClick={() => navigate(backTo)}>Panelə qayıt</Button>
        </div>
      </div>
    </AppShell>
  );
}
