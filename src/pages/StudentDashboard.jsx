import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import { Badge, Card, EmptyState, Skeleton } from '../components/ui';
import { fetchExams, fetchStudentHistory } from '../lib/examApi';
import { formatDate, isExamEnded, isExamLive, isExamScheduled, resolveExamStatus } from '../lib/utils';

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [examList, hist] = await Promise.all([
          fetchExams(),
          fetchStudentHistory(user?.id),
        ]);
        setExams(examList.filter((e) => resolveExamStatus(e) !== 'Draft'));
        setHistory(hist);
      } finally {
        setLoading(false);
      }
    };
    if (user) run();
  }, [user]);

  const openExam = (exam) => {
    if (isExamScheduled(exam)) return;
    const done = history.some((h) => String(h.examId) === String(exam.id));
    if (isExamLive(exam) && !done) {
      navigate(`/student/exams/${exam.id}`);
      return;
    }
    navigate(`/student/exams/${exam.id}/review`);
  };

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

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : (
        <>
          <h2 className="mb-4 text-lg font-bold">Mövcud imtahanlar</h2>
          {exams.length === 0 ? (
            <EmptyState title="Aktiv imtahan yoxdur" text="Müəllim imtahan yaratdıqda burada görünəcək." />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {exams.map((exam) => {
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
