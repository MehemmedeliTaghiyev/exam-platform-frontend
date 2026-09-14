import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Percent, TrendingUp, HelpCircle } from 'lucide-react';
import AppShell from '../components/AppShell';
import ProgressChart from '../components/ProgressChart';
import { Badge, Button, Card, Skeleton, StatCard } from '../components/ui';
import { fetchExam, fetchExamSubmissions, fetchQuestions } from '../lib/examApi';
import { buildExamStats } from '../lib/stats';
import { formatDate } from '../lib/utils';

export default function ExamStats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const [e, q, s] = await Promise.all([
        fetchExam(id),
        fetchQuestions(id),
        fetchExamSubmissions(id),
      ]);
      setExam(e);
      setQuestions(q);
      setSubmissions(s);
      setLoading(false);
    };
    run();
  }, [id]);

  const stats = useMemo(
    () => buildExamStats(exam, questions, submissions),
    [exam, questions, submissions],
  );

  return (
    <AppShell title="İmtahan statistikası">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/teacher')}>
            <ArrowLeft size={16} /> Geri
          </Button>
          <div>
            <h2 className="text-xl font-bold">{exam?.title || `İmtahan #${id}`}</h2>
            <p className="text-sm text-gray-500">{exam?.subjectName}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/teacher/exams/${id}`)}>
          Suallar və vərəq
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="İştirakçılar" value={stats.participants} />
            <StatCard icon={Percent} label="Orta uğur" value={`${stats.avg}%`} />
            <StatCard icon={TrendingUp} label="Müvəffəqiyyət" value={`${stats.passRate}%`} hint="50% və yüksək" />
            <StatCard icon={HelpCircle} label="Sual sayı" value={questions.length} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <h3 className="mb-2 font-bold">İnkişaf qrafiki</h3>
              <p className="mb-4 text-sm text-gray-500">İştirakçıların uğur faizi zaman sırası ilə</p>
              <ProgressChart points={stats.trend.length ? stats.trend : [0]} />
            </Card>
            <Card>
              <h3 className="mb-3 font-bold">Yekun analiz</h3>
              <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">{stats.analysis}</p>
            </Card>
          </div>

          <Card className="mt-6 overflow-x-auto p-0">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
              <h3 className="font-bold">Bütün nəticələr</h3>
            </div>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">Tələbə</th>
                  <th className="px-5 py-3 font-medium">Tarix</th>
                  <th className="px-5 py-3 font-medium">Bal</th>
                  <th className="px-5 py-3 font-medium">Uğur</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.scores.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-gray-400">
                      Hələ heç kim imtahan verməyib.
                    </td>
                  </tr>
                ) : (
                  stats.scores.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 last:border-0 dark:border-slate-800">
                      <td className="px-5 py-3 font-medium">{row.studentName}</td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(row.submittedAt)}</td>
                      <td className="px-5 py-3">{row.score ?? row.correctAnswersCount ?? 0}</td>
                      <td className="px-5 py-3">{row.percent}%</td>
                      <td className="px-5 py-3">
                        <Badge tone={row.percent >= 50 ? 'success' : 'danger'}>
                          {row.percent >= 50 ? 'Keçdi' : 'Kəsildi'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          <Card className="mt-6 overflow-x-auto p-0">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
              <h3 className="font-bold">Sual çətinliyi</h3>
            </div>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Sual</th>
                  <th className="px-5 py-3 font-medium">Cavab sayı</th>
                  <th className="px-5 py-3 font-medium">Çətinlik</th>
                </tr>
              </thead>
              <tbody>
                {stats.difficulty.map((q) => (
                  <tr key={q.id} className="border-b border-gray-100 last:border-0 dark:border-slate-800">
                    <td className="px-5 py-3">{q.index}</td>
                    <td className="px-5 py-3">{q.text}</td>
                    <td className="px-5 py-3">{q.asked}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-brand-600"
                            style={{ width: `${q.difficulty}%` }}
                          />
                        </div>
                        <span className="font-medium">{q.difficulty}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </AppShell>
  );
}
