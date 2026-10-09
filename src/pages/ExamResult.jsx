import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import DualExamRanking from '../components/DualExamRanking';
import QuestionReviewList from '../components/QuestionReviewList';
import { Button, Card, Skeleton, StatCard } from '../components/ui';
import { fetchExam, fetchExamReview, fetchExamReviewByExam, fetchExamSubmissions, fetchOwnStudentIdsForTeacher, fetchQuestions } from '../lib/examApi';
import { splitExamLeaderboards } from '../lib/stats';
import { AuthContext } from '../context/AuthContext';
import { Award, CheckCircle2, Percent, Ticket, XCircle } from 'lucide-react';
import { durationSecondsBetween, formatDateTime, formatHms, isExamEnded } from '../lib/utils';
import { parseQuestionImage, stripQuestionImage } from '../lib/questionImage';
import { isAiExam, pointsForDifficulty } from '../lib/questionDifficulty';
import { examTeacherId, maybeAwardDiscountTicket } from '../lib/teacherAccess';

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
      text: stripQuestionImage(q.text),
      imageUrl: parseQuestionImage(q),
      isCorrect,
      unanswered,
      selectedText,
      correctText,
      difficultyLevel: q.difficultyLevel || q.DifficultyLevel,
      points: Number(q.points ?? q.Points) || 0,
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
  const [ticket, setTicket] = useState(null);
  const [boards, setBoards] = useState({ own: [], general: [] });

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

  useEffect(() => {
    if (!review || !examMeta || !user?.id) return;
    if (user.role !== 'Student' && !user.practice) return;
    const row = review.result || review;
    const pct = Number(row?.percent ?? row?.score);
    if (!Number.isFinite(pct)) return;
    const awarded = maybeAwardDiscountTicket({
      studentId: user.id,
      teacherId: examTeacherId(examMeta),
      percent: pct,
    });
    if (awarded) setTicket(awarded);
  }, [review, examMeta, user]);

  useEffect(() => {
    const eid = examMeta?.id || examId;
    if (!eid) return undefined;
    let cancelled = false;
    (async () => {
      const teacherId = examTeacherId(examMeta);
      const [subs, ownIds] = await Promise.all([
        fetchExamSubmissions(eid).catch(() => []),
        fetchOwnStudentIdsForTeacher(teacherId).catch(() => new Set()),
      ]);
      const map = new Map();
      [...(review?.leaderboard || []), ...subs].forEach((row) => {
        const key = String(row.studentId ?? row.studentExamId ?? row.id);
        if (key === 'undefined' || key === 'null') return;
        map.set(key, { ...(map.get(key) || {}), ...row });
      });
      if (!cancelled) {
        setBoards(splitExamLeaderboards(Array.from(map.values()), {
          teacherId,
          ownStudentIds: [...ownIds],
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examMeta, examId, review]);

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
  const weightedMax = Number(result?.maxPoints ?? result?.MaxPoints) || questions.reduce((sum, q) => sum + (q.points || pointsForDifficulty(q.difficultyLevel)), 0);
  const weightedEarned = Number(result?.earnedPoints ?? result?.EarnedPoints)
    || questions.filter((q) => q.isCorrect).reduce((sum, q) => sum + (q.points || pointsForDifficulty(q.difficultyLevel)), 0);
  const scorePercentage = Math.round(Number(result?.percent ?? result?.score ?? (weightedMax ? (weightedEarned / weightedMax) * 100 : 0)));
  const aiWeighted = isAiExam(examMeta) || questions.some((q) => q.difficultyLevel);
  const isPassed = scorePercentage >= 50;
  const isPersonal = Boolean(result?.studentExamId || reviewId);
  const examEnded = Boolean(user?.practice) || (examMeta ? isExamEnded(examMeta) : Boolean(review?.examEnded));
  const mistakes = questions.filter((q) => !q.unanswered && q.isCorrect === false);
  const myId = String(user?.id || '');
  const ownRank = boards.own.find((r) => String(r.studentId) === myId)?.rank;
  const generalRank = boards.general.find((r) => String(r.studentId) === myId)?.rank;
  const backTo = queryStudentId
    ? `/teacher/students/${queryStudentId}`
    : user?.role === 'Student'
      ? '/student'
      : `/teacher/exams/${result?.examId || examId}/stats`;

  return (
    <AppShell title="İmtahan nəticəsi">
      <div className="mx-auto max-w-3xl space-y-8">
        {isPersonal && examEnded && (
          <Card className="text-center">
            <p className="text-sm text-gray-500">{result.examTitle || `İmtahan #${result.examId}`}</p>
            {examEnded && (ownRank || generalRank || result.rank) ? (
              <p className="mt-2 text-sm font-medium text-brand-600">
                Öz şagirdlər: {ownRank ? `#${ownRank}` : '—'}
                {' · '}Ümumi: {generalRank ? `#${generalRank}` : (result.rank ? `#${result.rank}` : '—')}
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
              <StatCard
                icon={Percent}
                label="Öz / ümumi"
                value={examEnded ? `${ownRank ? `#${ownRank}` : '—'} / ${generalRank ? `#${generalRank}` : (result.rank ? `#${result.rank}` : '—')}` : '—'}
              />
              <StatCard icon={CheckCircle2} label="Düzgün" value={`${correct} / ${total}`} />
              <StatCard icon={XCircle} label="Səhv" value={result.wrongAnswersCount ?? Math.max(total - correct, 0)} />
            </div>
            {ticket ? (
              <div className="mt-5 inline-flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                <Ticket size={18} className="mt-0.5 shrink-0" />
                <p>
                  Yüksək nəticəyə görə şəxsi endirim bileti: <span className="font-bold">{ticket.code}</span>.
                  Yalnız sizə aiddir; bu müəllimdən hazırlıq müddətində növbəti ödənişdə endirim verir.
                </p>
              </div>
            ) : null}
            {aiWeighted && weightedMax > 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                Çətinlik balı: <span className="font-semibold text-ink dark:text-white">{weightedEarned} / {weightedMax}</span>
                {' '}(asan 1 · orta 2 · çətin 3). Orta faiz bu ballara görə hesablanıb.
              </p>
            ) : null}
          </Card>
        )}

        {examEnded ? (
          <>
            <div>
                <h3 className="mb-4 text-lg font-bold">İmtahan vərəqi</h3>
                {questions.length ? (
                  <QuestionReviewList questions={questions} />
                ) : (
                  <Card className="text-sm text-gray-500">Bu imtahana hələ sual əlavə edilməyib.</Card>
                )}
            </div>

            {mistakes.length > 0 && (
              <div>
                <h3 className="mb-4 text-lg font-bold">Səhv cavablar</h3>
                <QuestionReviewList questions={mistakes} />
              </div>
            )}

            <DualExamRanking ownRows={boards.own} generalRows={boards.general} />
          </>
        ) : (
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
        )}

        <div className="flex justify-center">
          <Button onClick={() => navigate(backTo)}>Panelə qayıt</Button>
        </div>
      </div>
    </AppShell>
  );
}
