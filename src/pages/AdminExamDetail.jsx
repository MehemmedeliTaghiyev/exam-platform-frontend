import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppShell from '../components/AppShell';
import LeaderboardTable from '../components/LeaderboardTable';
import { Badge, Button, Card, Skeleton } from '../components/ui';
import { fetchExam, fetchExamSubmissions, deleteExam } from '../lib/examApi';
import { errorMessage, formatDate } from '../lib/utils';
import { buildExamStats } from '../lib/stats';

export default function AdminExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const [e, s] = await Promise.all([fetchExam(id), fetchExamSubmissions(id)]);
      setExam(e);
      setRows(s);
      setLoading(false);
    };
    run();
  }, [id]);

  const stats = buildExamStats(exam, [], rows, []);
  const teacherName = exam?.teacherName || exam?.TeacherName || '—';

  return (
    <AppShell title="İmtahan nəticələri">
      <Button variant="ghost" onClick={() => navigate('/admin')}>
        <ArrowLeft size={16} /> Admin panel
      </Button>

      {loading ? (
        <Skeleton className="mt-6 h-64" />
      ) : (
        <>
          <div className="mt-6 mb-6">
            <h2 className="text-2xl font-bold">{exam?.title || `İmtahan #${id}`}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Fənn: {exam?.subjectName || '—'} · Status: {exam?.status || '—'} · Tarix: {formatDate(exam?.createdAt || exam?.startTime)}
            </p>
            <p className="mt-2 text-sm font-medium">
              İmtahanı keçirən müəllim: <span className="text-brand-700 dark:text-brand-300">{teacherName}</span>
            </p>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone="brand">{stats.participants} iştirakçı</Badge>
            <Badge>Orta uğur {stats.avg}%</Badge>
            <Button
              variant="danger"
              onClick={async () => {
                if (!window.confirm('Bu imtahanı silmək istəyirsiniz?')) return;
                try {
                  await deleteExam(id);
                  navigate('/admin');
                } catch (err) {
                  alert(errorMessage(err, 'İmtahan silinmədi.'));
                }
              }}
            >
              İmtahanı sil
            </Button>
          </div>

          <Card className="overflow-x-auto p-0">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
              <h3 className="font-bold">İştirak edən tələbələrin nəticə cədvəli</h3>
            </div>
            <LeaderboardTable rows={stats.scores} />
          </Card>
        </>
      )}
    </AppShell>
  );
}
