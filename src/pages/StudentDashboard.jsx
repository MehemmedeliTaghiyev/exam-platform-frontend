import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import WeeklyRanking from '../components/WeeklyRanking';
import { Badge, Button, Card, EmptyState, Skeleton } from '../components/ui';
import { fetchAllPublicExams, fetchExams, fetchStudentHistory } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import { examSubject, subjectProgress } from '../lib/publicExams';
import { formatDate, isExamEnded, isExamLive, isExamScheduled, parseExamDate, resolveExamStatus } from '../lib/utils';

function examSortTime(exam) {
  return (
    parseExamDate(exam.startTime || exam.StartTime)?.getTime()
    || parseExamDate(exam.createdAt || exam.CreatedAt)?.getTime()
    || parseExamDate(exam.endTime || exam.EndTime)?.getTime()
    || 0
  );
}

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [publicExams, setPublicExams] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllExams, setShowAllExams] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [examList, hist, pubs] = await Promise.all([
          fetchExams(),
          fetchStudentHistory(user?.id),
          fetchAllPublicExams().catch(() => []),
        ]);
        setExams(examList.filter((e) => resolveExamStatus(e) !== 'Draft'));
        setHistory(hist);
        setPublicExams(pubs);
      } finally {
        setLoading(false);
      }
    };
    if (user) run();
  }, [user]);

  const openExam = (exam) => {
    if (isExamScheduled(exam)) return;
    const submitted = history.some((h) => {
      if (String(h.examId) !== String(exam.id)) return false;
      const status = String(h.status || h.Status || '').toLowerCase();
      if (status === 'inprogress' || status === 'in_progress') return false;
      return Boolean(h.submittedAt || h.SubmittedAt);
    });
    if (isExamLive(exam) && (!submitted || user?.practice)) {
      navigate(`/student/exams/${exam.id}`);
      return;
    }
    navigate(`/student/exams/${exam.id}/review`);
  };

  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => examSortTime(b) - examSortTime(a)),
    [exams],
  );
  const visibleExams = showAllExams ? sortedExams : sortedExams.slice(0, 3);
  const hiddenExamCount = Math.max(0, sortedExams.length - visibleExams.length);

  const fenStats = useMemo(() => {
    const followed = new Set(localDb.followedTeacherIds(user?.id).map(String));
    const mine = user?.teacherId != null ? String(user.teacherId) : '';
    const joined = new Set();
    exams.forEach((exam) => joined.add(examSubject(exam)));
    publicExams.forEach((exam) => {
      const owner = String(exam.teacherId ?? exam.TeacherId ?? '');
      if (followed.has(owner) || (mine && owner === mine)) joined.add(examSubject(exam));
    });
    history.forEach((item) => {
      const exam = publicExams.find((e) => String(e.id) === String(item.examId))
        || exams.find((e) => String(e.id) === String(item.examId));
      if (exam) joined.add(examSubject(exam));
    });
    return subjectProgress(publicExams, history, Array.from(joined));
  }, [publicExams, history, exams, user?.id, user?.teacherId]);

  const historyRows = (() => {
    const byExam = new Map();
    history.forEach((item) => {
      if (item?.examId != null) byExam.set(String(item.examId), item);
    });
    const rows = exams.filter(isExamEnded).map((exam) => {
      const item = byExam.get(String(exam.id));
      return {
        examId: exam.id,
        examTitle: exam.title || item?.examTitle,
        submittedAt: item?.submittedAt || exam.endTime,
        percent: item?.percent,
        correctAnswersCount: item?.correctAnswersCount,
        totalQuestions: item?.totalQuestions || exam.totalQuestions,
        studentExamId: item?.studentExamId || item?.id,
        participated: Boolean(item),
      };
    });
    history.forEach((item) => {
      if (!rows.some((row) => String(row.examId) === String(item.examId))) {
        rows.push({
          ...item,
          participated: true,
          examTitle: item.examTitle || `İmtahan #${item.examId}`,
        });
      }
    });
    return rows.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  })();

  return (
    <AppShell title="Tələbə paneli">
      <p className="mb-8 text-sm text-gray-500">Xoş gəldiniz, {user?.fullName || 'Tələbə'}</p>

      <WeeklyRanking variant="student" />

      <div className="mb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Kabinet · fənnlər</h2>
          <Button variant="secondary" onClick={() => navigate('/student/public')}>Ümumi zona</Button>
        </div>
        {fenStats.length === 0 ? (
          <Card className="text-sm text-gray-500">
            Ümumi zonada fənnə qoşulun (açıq imtahan açın və ya müəllim izləyin). Sonra burada həmin fənnin açıq imtahanlarından neçəsinə daxil olduğunuz görünəcək.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {fenStats.map((row) => (
              <Card key={row.subject}>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Fənn</p>
                <p className="mt-1 font-bold">{row.subject}</p>
                <p className="mt-3 text-2xl font-black text-brand-600">
                  {row.entered} / {row.total}
                </p>
                <p className="mt-1 text-sm text-gray-500">açıq imtahana daxil olub</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : (
        <>
          <h2 className="mb-4 text-lg font-bold">Mövcud imtahanlar</h2>
          {exams.length === 0 ? (
            <EmptyState
              title="Aktiv imtahan yoxdur"
              text={
                user?.teacherId
                  ? 'Müəlliminiz imtahan dərc edəndə burada görünəcək.'
                  : 'Repetitorunuz varsa onunla əlaqə saxlayın. Yoxdursa bölgələrdəki müəllimlərin açıq imtahanlarına baxın.'
              }
              action={
                user?.practice ? null : (
                  <Button variant="secondary" onClick={() => navigate('/student/teachers')}>
                    Müəllimlərə bax
                  </Button>
                )
              }
            />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visibleExams.map((exam) => {
                  const done = history.some((h) => String(h.examId) === String(exam.id));
                  const live = isExamLive(exam);
                  const ended = isExamEnded(exam);
                  return (
                    <ExamCard
                      key={exam.id}
                      exam={exam}
                      actionLabel={
                        live && !done
                          ? 'İmtahana başla'
                          : live && done
                            ? 'Cavablarıma bax'
                            : ended
                              ? 'Nəticələrə bax'
                              : 'Gözləyin'
                      }
                      onOpen={isExamScheduled(exam) ? undefined : () => openExam(exam)}
                    />
                  );
                })}
              </div>
              {hiddenExamCount > 0 && (
                <div className="mt-5 flex justify-center">
                  <Button variant="secondary" onClick={() => setShowAllExams(true)}>
                    Bütün imtahanları yüklə
                  </Button>
                </div>
              )}
            </>
          )}

          <h2 className="mb-4 mt-12 text-lg font-bold">İmtahan tarixçəm</h2>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">İmtahan</th>
                  <th className="px-5 py-3 font-medium">Tarix</th>
                  <th className="px-5 py-3 font-medium">Bal</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {historyRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-gray-400">
                      Bitmiş imtahan yoxdur.
                    </td>
                  </tr>
                ) : (
                  historyRows.map((item) => (
                    <tr key={item.studentExamId || item.examId} className="border-b border-gray-100 last:border-0 dark:border-slate-800">
                      <td className="px-5 py-3 font-medium">{item.examTitle || `İmtahan #${item.examId}`}</td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(item.submittedAt)}</td>
                      <td className="px-5 py-3">
                        {item.participated && item.percent != null ? (
                          <Badge tone={Number(item.percent) >= 50 ? 'success' : 'danger'}>
                            {Math.round(Number(item.percent))}%
                            {item.correctAnswersCount != null && item.totalQuestions
                              ? ` · ${item.correctAnswersCount}/${item.totalQuestions}`
                              : ''}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">İştirak yoxdur</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          className="text-sm font-medium text-brand-600 transition-colors duration-200 hover:text-brand-500"
                          onClick={() => navigate(`/student/exams/${item.examId}/review`)}
                        >
                          Nəticə
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </AppShell>
  );
}
