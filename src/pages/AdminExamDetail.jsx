import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppShell from '../components/AppShell';
import DualExamRanking from '../components/DualExamRanking';
import { Badge, Button, Skeleton } from '../components/ui';
import { examOwnerId, fetchExam, fetchExamSubmissions, fetchOwnStudentIdsForTeacher, deleteExam } from '../lib/examApi';
import { errorMessage, formatDate } from '../lib/utils';
import { buildExamStats, splitExamLeaderboards } from '../lib/stats';

export default function AdminExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [rows, setRows] = useState([]);
  const [ownIds, setOwnIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const [e, s] = await Promise.all([fetchExam(id), fetchExamSubmissions(id)]);
      setExam(e);
      setRows(s);
      const ids = await fetchOwnStudentIdsForTeacher(examOwnerId(e)).catch(() => new Set());
      setOwnIds([...ids]);
      setLoading(false);
    };
    run();
  }, [id]);

  const stats = buildExamStats(exam, [], rows, []);
  const boards = splitExamLeaderboards(stats.scores, {
    teacherId: examOwnerId(exam),
    ownStudentIds: ownIds,
  });
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

          <DualExamRanking ownRows={boards.own} generalRows={boards.general} />
        </>
      )}
    </AppShell>
  );
}
