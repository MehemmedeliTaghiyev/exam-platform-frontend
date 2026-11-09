import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import DualExamRanking from '../components/DualExamRanking';
import QuestionReviewList from '../components/QuestionReviewList';
import { Button, Card, Skeleton } from '../components/ui';
import { fetchExam, fetchExamReview, fetchExamReviewByExam, fetchExamSubmissions, fetchOwnStudentIdsForTeacher, fetchQuestions } from '../lib/examApi';
import { splitExamLeaderboards } from '../lib/stats';
import { leaderboardRowIsUser, openLeaderboardPdf, rememberExamOutcome } from '../lib/examOutcomes';
import { AuthContext } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { Download } from 'lucide-react';
import { examRetakeReady, formatDateTime, isExamEnded, studentResultsReady } from '../lib/utils';
import { parseQuestionImage, stripQuestionImage } from '../lib/questionImage';
import { isAiExam, pointsForDifficulty } from '../lib/questionDifficulty';
import { examTeacherId } from '../lib/teacherAccess';
import { teacherWatermarkText } from '../lib/storageAccess';
import { examRankingEnabled } from '../lib/examKind';
import { isPublicExam } from '../lib/examVisibility';
import { gradeExam } from '../lib/gradeExam';
import ScreenGuard from '../components/ScreenGuard';

function ScoreRing({ correct, total, label }) {
  const safeTotal = Math.max(1, Number(total) || 1);
  const value = Math.max(0, Number(correct) || 0);
  const pct = Math.min(1, value / safeTotal);
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-44 w-44">
      <svg viewBox="0 0 128 128" className="-rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="#2ee07a"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-4xl font-black leading-none">{value}/{total}</p>
          <p className="mt-2 text-xs font-bold text-[var(--muted)]">{label}</p>
        </div>
      </div>
    </div>
  );
}

function toReviewQuestions(list = []) {
  return list.map((q, index) => {
    const options = (q.options || []).map((opt) => ({
      id: opt.id,
      text: opt.text || opt.optionText,
      isCorrect: Boolean(opt.isCorrect),
      isSelected: Boolean(opt.isSelected),
    }));
    const selected = options.find((opt) => opt.isSelected);
    const correctOpt = options.find((opt) => opt.isCorrect);
    const selectedText = q.selectedText || q.SelectedText || selected?.text || '';
    const correctText = q.correctText || q.CorrectText || correctOpt?.text || '';
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
  const { t } = useLocale();
  const queryStudentExamId = searchParams.get('studentExamId');
  const queryStudentId = searchParams.get('studentId');
  const reviewId = queryStudentExamId || submissionId;
  const [review, setReview] = useState(null);
  const [paper, setPaper] = useState([]);
  const [examMeta, setExamMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
        const answers = data?.answers || data?.result?.answers || [];
        if (reviewQuestions.length && reviewQuestions.some((q) => q.isCorrect || q.options?.some((o) => o.isSelected))) {
          setPaper(reviewQuestions);
        } else if (fallbackId) {
          const qs = await fetchQuestions(fallbackId);
          if (answers.length) {
            const graded = gradeExam(qs, answers);
            setPaper(toReviewQuestions(graded.questions));
          } else {
            setPaper(reviewQuestions.length ? reviewQuestions : toReviewQuestions(qs));
          }
        } else {
          setPaper(reviewQuestions);
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
        const extraIds = [review?.result?.studentId, review?.result?.studentExamId, reviewId];
        const split = splitExamLeaderboards(Array.from(map.values()), {
          teacherId,
          ownStudentIds: [...ownIds],
        });
        setBoards({
          own: split.own.map((row) => ({ ...row, highlight: leaderboardRowIsUser(row, user, extraIds) })),
          general: split.general.map((row) => ({ ...row, highlight: leaderboardRowIsUser(row, user, extraIds) })),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examMeta, examId, review, user, reviewId]);

  useEffect(() => {
    if (loading || !user?.id) return;
    const eid = examMeta?.id || examId;
    if (!eid) return;
    if (!studentResultsReady(examMeta, user) && !user.practice) return;
    const extraIds = [review?.result?.studentId, review?.result?.studentExamId, reviewId];
    const ranked = boards.general.find((row) => leaderboardRowIsUser(row, user, extraIds));
    const resultRow = review?.result || review || {};
    const qs = paper.length ? paper : toReviewQuestions(review?.questions || []);
    const totalCount = resultRow.totalQuestions || qs.length || 1;
    const correctCount = resultRow.correctAnswersCount ?? qs.filter((q) => q.isCorrect).length;
    const percentValue = Math.round(Number(resultRow.percent ?? resultRow.score ?? (totalCount ? (correctCount / totalCount) * 100 : 0)));
    rememberExamOutcome(user.id, eid, {
      percent: percentValue,
      rank: ranked?.rank ?? resultRow.rank ?? null,
      correct: correctCount,
      total: totalCount,
    });
  }, [loading, boards, examMeta, examId, review, paper, user, reviewId]);

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
  const total = questions.length || result?.totalQuestions || 1;
  const correctFromPaper = questions.filter((q) => q.isCorrect).length;
  const correct = Math.max(correctFromPaper, Number(result?.correctAnswersCount) || 0);
  const weightedMax = Number(result?.maxPoints ?? result?.MaxPoints) || questions.reduce((sum, q) => sum + (q.points || pointsForDifficulty(q.difficultyLevel)), 0);
  const weightedEarned = Number(result?.earnedPoints ?? result?.EarnedPoints)
    || questions.filter((q) => q.isCorrect).reduce((sum, q) => sum + (q.points || pointsForDifficulty(q.difficultyLevel)), 0);
  const scorePercentage = Math.round(
    total
      ? (correct / total) * 100
      : Number(result?.percent ?? result?.score ?? (weightedMax ? (weightedEarned / weightedMax) * 100 : 0)),
  );
  const aiWeighted = isAiExam(examMeta) || questions.some((q) => q.difficultyLevel);
  const examEnded = Boolean(user?.practice) || (examMeta ? isExamEnded(examMeta) : Boolean(review?.examEnded));
  const resultsReady = studentResultsReady(examMeta, user) || (examMeta == null && examEnded);
  const showRanking = examRankingEnabled(examMeta);
  const isStudent = user?.role === 'Student';
  const isPersonal = Boolean(result?.studentExamId || reviewId) || (isStudent && resultsReady);
  const personalQuiz = isStudent && !isPublicExam(examMeta);
  const watermarkName = teacherWatermarkText(examTeacherId(examMeta)) || (personalQuiz ? (user?.fullName || user?.email || 'ExamPulse') : '');
  const extraIds = [result?.studentId, result?.studentExamId, reviewId];
  const generalRank = boards.general.find((r) => leaderboardRowIsUser(r, user, extraIds))?.rank ?? result?.rank;
  const ownRank = isStudent ? null : boards.own.find((r) => leaderboardRowIsUser(r, user, extraIds))?.rank;
  const backTo = queryStudentId
    ? `/teacher/students/${queryStudentId}`
    : user?.role === 'Student'
      ? '/student'
      : `/teacher/exams/${result?.examId || examId}/stats`;

  return (
    <AppShell title={t('result.title')}>
      <div className={`mx-auto max-w-3xl space-y-8 ${personalQuiz || watermarkName ? 'exam-guard' : ''}`}>
        {isPersonal && resultsReady && (
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight">{t('result.complete')}</h2>
            <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
              {result.examTitle || `İmtahan #${result.examId}`}
              {showRanking && generalRank ? ` · ${t('result.place', { n: generalRank })}` : ''}
            </p>
            <div className="mt-6">
              <ScoreRing correct={correct} total={total} label={t('result.percentCorrect', { pct: Math.round((Number(correct) / Math.max(1, Number(total))) * 100) })} />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              <div className="score-stat">
                <p className="text-xl font-black text-[var(--accent)]">{scorePercentage}%</p>
                <p className="text-[11px] font-bold text-[var(--muted)]">{t('result.success')}</p>
              </div>
              <div className="score-stat">
                <p className="text-xl font-black text-[#22c55e]">{correct}</p>
                <p className="text-[11px] font-bold text-[var(--muted)]">{t('result.correct')}</p>
              </div>
              <div className="score-stat">
                <p className="text-xl font-black text-[#ef4444]">{result.wrongAnswersCount ?? Math.max(total - correct, 0)}</p>
                <p className="text-[11px] font-bold text-[var(--muted)]">{t('result.wrong')}</p>
              </div>
            </div>
            {!isStudent && showRanking ? (
              <p className="mt-4 text-sm font-medium text-[var(--muted)]">
                Öz şagirdlər: {ownRank ? `#${ownRank}` : '—'} · Ümumi: {generalRank ? `#${generalRank}` : '—'}
                {result.submittedAt ? ` · Bitirmə: ${formatDateTime(result.submittedAt)}` : ''}
              </p>
            ) : null}
            {aiWeighted && weightedMax > 0 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">
                Çətinlik balı: <span className="font-semibold text-[var(--text)]">{weightedEarned} / {weightedMax}</span>
                {' '}(asan 1 · orta 2 · çətin 3).
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {examRetakeReady(examMeta, result) && (user?.role === 'Student' || user?.practice) ? (
                <Button className="dream-change" onClick={() => navigate(`/student/exams/${result?.examId || examId}?yeniden=1`)}>
                  {t('result.retake')}
                </Button>
              ) : null}
              <Button onClick={() => document.getElementById('exam-paper')?.scrollIntoView({ behavior: 'smooth' })}>
                {t('result.review')}
              </Button>
            </div>
          </div>
        )}

        {resultsReady ? (
          <>
            {isStudent && showRanking ? (
              <>
                <DualExamRanking
                  ownRows={boards.own}
                  generalRows={boards.general}
                  generalOnly
                  generalLimit={100}
                />
                <button
                  type="button"
                  onClick={() => openLeaderboardPdf({
                    title: `${result.examTitle || 'İmtahan'} — tam siyahı`,
                    rows: boards.general,
                    highlightId: user?.id,
                  })}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--card)] py-3 text-sm font-extrabold ring-1 ring-[var(--line)]"
                >
                  <Download size={16} /> {t('result.download')}
                </button>
              </>
            ) : null}
            <div id="exam-paper">
                <h3 className="mb-4 text-lg font-bold">{t('result.paper')}</h3>
                {questions.length ? (
                  <QuestionReviewList questions={questions} />
                ) : (
                  <Card className="text-sm text-gray-500">{t('result.noQuestions')}</Card>
                )}
            </div>
            {!isStudent && showRanking ? (
              <DualExamRanking ownRows={boards.own} generalRows={boards.general} />
            ) : null}
          </>
        ) : (
          <Card className="text-center">
            <p className="text-lg font-extrabold">İmtahan təhvil verildi</p>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Nəticə avtomatik saxlanıldı. Düzgün və səhv cavablar imtahan bitəndən sonra açılacaq.
              Bitəndən sonra kabinetə daxil olub nəticənə baxa bilərsən.
            </p>
          </Card>
        )}

        <div className="flex justify-center">
          <Button onClick={() => navigate(backTo)}>Panelə qayıt</Button>
        </div>
        <ScreenGuard active={Boolean(watermarkName)} name={watermarkName} />
      </div>
    </AppShell>
  );
}
