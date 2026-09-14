import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import { Badge, Card, EmptyState, Skeleton } from '../components/ui';
import { fetchExams } from '../lib/examApi';
import { formatDate, unwrapList } from '../lib/utils';

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const examList = await fetchExams();
      setExams(examList);
      try {
        const studentId = user?.id;
        const historyRes = await API.get(`/Submissions/history/${studentId}`);
        setHistory(unwrapList(historyRes.data));
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user]);

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
              {exams.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  actionLabel="İmtahana başla"
                  onOpen={() => navigate(`/student/exams/${exam.id}`)}
                />
              ))}
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
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-gray-400">
                      Hələ imtahan verməmisiniz.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id || item.studentExamId} className="border-b border-gray-100 last:border-0 dark:border-slate-800">
                      <td className="px-5 py-3 font-medium">{item.examTitle || `İmtahan #${item.examId}`}</td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(item.submittedAt)}</td>
                      <td className="px-5 py-3">
                        <Badge>{item.score ?? 0}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          className="text-sm font-medium text-brand-600 transition-colors duration-200 hover:text-brand-500"
                          onClick={() => navigate(`/student/exam-result/${item.id || item.studentExamId}`)}
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
