import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Percent, TrendingUp, HelpCircle } from 'lucide-react';
import AppShell from '../components/AppShell';
import ProgressChart from '../components/ProgressChart';
import { Button, Card, Skeleton, StatCard, Badge } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { fetchExam, fetchExamSubmissions, fetchQuestionDifficulty, fetchQuestions, deleteExam } from '../lib/examApi';
import { buildExamStats } from '../lib/stats';
import { errorMessage, isAiEnabled } from '../lib/utils';
import { localDb } from '../lib/localDb';
import { recordAiUsage } from '../lib/aiUsage';
import LeaderboardTable from '../components/LeaderboardTable';

export default function ExamStats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const aiOn = isAiEnabled(user) || localDb.getTeacherAi(user?.id);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [difficultyRows, setDifficultyRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const [e, q, s, d] = await Promise.all([
        fetchExam(id),
        fetchQuestions(id),
        fetchExamSubmissions(id),
        fetchQuestionDifficulty(id),
      ]);
      setExam(e);
      setQuestions(q);
      setSubmissions(s);
      setDifficultyRows(d);
      setLoading(false);
      if (aiOn && user?.id) {
        const stamp = `ai_diff_${id}_${new Date().toISOString().slice(0, 10)}`;
        if (!sessionStorage.getItem(stamp)) {
          sessionStorage.setItem(stamp, '1');
          recordAiUsage(user.id, 'difficulty');
        }
      }
    };
    run();
  }, [id]);

  const stats = useMemo(
    () => buildExamStats(exam, questions, submissions, difficultyRows),
    [exam, questions, submissions, difficultyRows],
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
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate(`/teacher/exams/${id}`)}>
            Suallar və vərəq
          </Button>
          <Button onClick={() => navigate(`/teacher/exams/${id}/review`)}>
            Sıralama cədvəli
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!window.confirm('Bu imtahanı silmək istəyirsiniz?')) return;
              try {
                await deleteExam(id);
                navigate('/teacher');
              } catch (err) {
                alert(errorMessage(err, 'İmtahan silinmədi.'));
              }
            }}
          >
            Sil
          </Button>
        </div>
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
              <h3 className="font-bold">İştirakçılar (sıralama)</h3>
              <p className="mt-1 px-0 text-sm text-gray-500">Bal, sonra bitirmə müddəti (saat:dəqiqə:saniyə)</p>
            </div>
            <LeaderboardTable rows={stats.scores} emptyText="Hələ heç kim imtahan verməyib." />
          </Card>

          <Card className="mt-6 overflow-x-auto p-0">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
              <h3 className="font-bold">Sual çətinliyi</h3>
              <p className="mt-1 text-sm text-gray-500">
                {aiOn
                  ? 'AI açıqdır: çətinlik hər sualda səhv payına görə avtomatik hesablanır.'
                  : 'AI yoxdur: bütün suallarda çətinlik eyni göstərilir.'}
              </p>
            </div>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Sual</th>
                  <th className="px-5 py-3 font-medium">İştirakçı</th>
                  <th className="px-5 py-3 font-medium">Səhv edənlər</th>
                  <th className="px-5 py-3 font-medium">Çətinlik dərəcəsi</th>
                </tr>
              </thead>
              <tbody>
                {stats.difficulty.map((q) => {
                  const share = aiOn && q.asked ? Math.round((q.wrongCount / q.asked) * 100) : 50;
                  const label = aiOn ? q.difficulty : 'Eyni';
                  return (
                  <tr key={q.id} className="border-b border-gray-100 last:border-0 dark:border-slate-800">
                    <td className="px-5 py-3">{q.index}</td>
                    <td className="px-5 py-3">{q.text}</td>
                    <td className="px-5 py-3">{q.asked}</td>
                    <td className="px-5 py-3">{aiOn ? `${q.wrongCount} nəfər` : '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-brand-600"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <span className="font-medium">{label}</span>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {aiOn && (
            <Card className="mt-6 overflow-x-auto p-0">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
                <h3 className="font-bold">Mövzu anlayışı</h3>
                <p className="mt-1 text-sm text-gray-500">Hər şagirdin bu imtahanda mövzunu nə dərəcədə mənimsədiyi</p>
              </div>
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
                    <th className="px-5 py-3 font-medium">Tələbə</th>
                    <th className="px-5 py-3 font-medium">Anlayış</th>
                    <th className="px-5 py-3 font-medium">Səviyyə</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.scores.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-gray-400">Hələ nəticə yoxdur.</td>
                    </tr>
                  ) : (
                    stats.scores.map((row) => {
                      const pct = Math.round(Number(row.percent ?? row.score ?? 0));
                      const tone = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger';
                      const level = pct >= 80 ? 'Yaxşı mənimsəyib' : pct >= 50 ? 'Orta' : 'Zəif';
                      return (
                        <tr key={row.id || row.studentExamId || row.studentId} className="border-b border-gray-100 last:border-0 dark:border-slate-800">
                          <td className="px-5 py-3 font-medium">{row.studentName || `Tələbə #${row.studentId}`}</td>
                          <td className="px-5 py-3 font-bold tabular-nums">{pct}%</td>
                          <td className="px-5 py-3"><Badge tone={tone}>{level}</Badge></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </AppShell>
  );
}
