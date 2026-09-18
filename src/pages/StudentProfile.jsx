import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Percent, UserX } from 'lucide-react';
import AppShell from '../components/AppShell';
import ProgressChart from '../components/ProgressChart';
import LeaderboardTable from '../components/LeaderboardTable';
import { Badge, Button, Card, Skeleton, StatCard } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { localDb } from '../lib/localDb';
import {
  fetchExamSubmissions,
  fetchExams,
  fetchStudentHistoryById,
  fetchUsersByRole,
} from '../lib/examApi';
import { formatDate, formatDateTime, fullNameOf, parseExamDate, resolveExamStatus } from '../lib/utils';

function examSortDate(exam) {
  return (
    parseExamDate(exam.startTime || exam.StartTime)?.getTime()
    || parseExamDate(exam.createdAt || exam.CreatedAt)?.getTime()
    || parseExamDate(exam.endTime || exam.EndTime)?.getTime()
    || 0
  );
}

function scoreOf(row) {
  const value = Number(row?.percent ?? row?.score ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export default function StudentProfile() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const teacherId = user?.id || 'me';
  const localStudent = useMemo(
    () => localDb.getStudents(teacherId).find((s) => String(s.id) === String(id)),
    [id, teacherId],
  );
  const group = localDb.getGroups(teacherId).find((g) => g.id === localStudent?.groupId);

  const [student, setStudent] = useState(localStudent || null);
  const [exams, setExams] = useState([]);
  const [history, setHistory] = useState([]);
  const [classmates, setClassmates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [examList, hist, users] = await Promise.all([
          fetchExams(),
          fetchStudentHistoryById(id).catch(() => []),
          fetchUsersByRole('Student').catch(() => []),
        ]);
        const published = examList.filter((e) => resolveExamStatus(e) !== 'Draft');
        setExams(published);
        setHistory(hist);

        const apiUser = users.find((u) => String(u.id ?? u.Id) === String(id));
        const mergedStudent = {
          ...(localStudent || {}),
          ...(apiUser || {}),
          id: apiUser?.id ?? apiUser?.Id ?? localStudent?.id ?? id,
          fullName: apiUser?.fullName || apiUser?.FullName || fullNameOf(localStudent),
          email: apiUser?.email || localStudent?.email,
          userName: apiUser?.userName || apiUser?.UserName || localStudent?.userName,
          groupName: apiUser?.groupName || apiUser?.GroupName || localStudent?.groupName || group?.name,
        };
        setStudent(mergedStudent);

        const groupKey = String(mergedStudent.groupName || group?.name || group?.number || '').trim().toLowerCase();
        const localClassmates = localDb
          .getStudents(teacherId)
          .filter((s) => String(s.groupId) === String(localStudent?.groupId) || String(s.groupName || '').toLowerCase() === groupKey);

        const apiClassmates = users.filter((u) => {
          const g = String(u.groupName || u.GroupName || '').trim().toLowerCase();
          return groupKey && g === groupKey;
        });

        const byId = new Map();
        [...localClassmates, ...apiClassmates.map((u) => ({
          id: u.id ?? u.Id,
          fullName: u.fullName || u.FullName,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          groupName: u.groupName || u.GroupName,
        }))].forEach((s) => {
          const key = String(s.id);
          if (!byId.has(key)) byId.set(key, s);
        });
        if (!byId.has(String(mergedStudent.id))) byId.set(String(mergedStudent.id), mergedStudent);

        const peerList = Array.from(byId.values());
        const submissionsByExam = await Promise.all(
          published.map((exam) => fetchExamSubmissions(exam.id).catch(() => [])),
        );
        const allSubs = submissionsByExam.flat();
        const ranked = peerList
          .map((peer) => {
            const rows = allSubs.filter((s) => String(s.studentId) === String(peer.id));
            const avg = rows.length
              ? Math.round(rows.reduce((sum, row) => sum + scoreOf(row), 0) / rows.length)
              : 0;
            return {
              id: peer.id,
              studentId: peer.id,
              studentName: fullNameOf(peer) || peer.fullName || peer.email,
              percent: avg,
              score: avg,
              correctAnswersCount: rows.reduce((sum, row) => sum + (row.correctAnswersCount || 0), 0),
              totalQuestions: rows.reduce((sum, row) => sum + (row.totalQuestions || 0), 0),
              submittedAt: rows
                .map((row) => row.submittedAt)
                .filter(Boolean)
                .sort((a, b) => new Date(b) - new Date(a))[0],
              durationSeconds: null,
              attended: rows.length,
            };
          })
          .sort((a, b) => b.percent - a.percent || String(a.studentName).localeCompare(String(b.studentName)))
          .map((row, index) => ({
            ...row,
            rank: index + 1,
            highlight: String(row.studentId) === String(id),
          }));
        setClassmates(ranked);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id, teacherId, localStudent, group?.name, group?.number]);

  const rows = useMemo(() => {
    const byExam = new Map();
    history.forEach((h) => {
      byExam.set(String(h.examId), h);
    });
    return exams
      .map((exam) => {
        const submission = byExam.get(String(exam.id));
        return {
          examId: exam.id,
          title: exam.title || exam.subjectName,
          date: examSortDate(exam),
          startTime: exam.startTime,
          attended: Boolean(submission),
          percent: submission ? scoreOf(submission) : null,
          studentExamId: submission?.studentExamId || submission?.id,
          status: resolveExamStatus(exam),
        };
      })
      .sort((a, b) => b.date - a.date);
  }, [exams, history]);

  const attended = rows.filter((r) => r.attended);
  const missed = rows.filter((r) => !r.attended);
  const avg = attended.length
    ? Math.round(attended.reduce((sum, r) => sum + (r.percent || 0), 0) / attended.length)
    : 0;
  const chartPoints = attended
    .slice()
    .sort((a, b) => a.date - b.date)
    .map((r) => r.percent || 0);

  const openExam = (row) => {
    const params = new URLSearchParams({ studentId: String(id) });
    if (row.studentExamId) params.set('studentExamId', String(row.studentExamId));
    navigate(`/teacher/exams/${row.examId}/review?${params.toString()}`);
  };

  if (loading) {
    return (
      <AppShell title="Tələbə">
        <Skeleton className="h-64" />
      </AppShell>
    );
  }

  if (!student) {
    return (
      <AppShell title="Tələbə">
        <p>Tələbə tapılmadı.</p>
      </AppShell>
    );
  }

  const backGroup = student.groupId || localStudent?.groupId;

  return (
    <AppShell title={fullNameOf(student) || student.fullName || 'Tələbə'}>
      <Button variant="ghost" onClick={() => navigate(backGroup ? `/teacher/groups/${backGroup}` : '/teacher/cabinet')}>
        <ArrowLeft size={16} /> Qrupa qayıt
      </Button>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <div className="h-40 overflow-hidden rounded-2xl bg-gray-100 dark:bg-slate-800">
            {student.photo ? (
              <img src={student.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-3xl font-bold text-gray-300">
                {(student.firstName || student.fullName || '?')[0]}
              </div>
            )}
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-gray-400">Qrup</dt>
              <dd className="font-medium">{student.groupName || group?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400">E-poçt</dt>
              <dd className="font-medium">{student.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400">İstifadəçi adı</dt>
              <dd className="font-medium">{student.userName || '—'}</dd>
            </div>
            {student.birthDate && (
              <div>
                <dt className="text-gray-400">Doğum tarixi</dt>
                <dd className="font-medium">{formatDate(student.birthDate)}</dd>
              </div>
            )}
          </dl>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={BookOpen} label="Daxil olduğu" value={attended.length} hint={`Cəmi ${rows.length} imtahan`} />
            <StatCard icon={UserX} label="Daxil olmadığı" value={missed.length} />
            <StatCard icon={Percent} label="Orta bal" value={`${avg}%`} hint={attended.length ? `${attended.length} imtahan üzrə` : 'Hələ nəticə yoxdur'} />
          </div>

          <Card>
            <h3 className="font-bold">İnkişaf qrafiki</h3>
            <ProgressChart points={chartPoints.length ? chartPoints : [0]} />
          </Card>

          <Card className="overflow-x-auto p-0">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
              <h3 className="font-bold">Bütün imtahanlar</h3>
              <p className="mt-1 text-sm text-gray-500">Ən yenidən ən köhnəyə. Sətirə klik edərək bitmiş imtahan interfeysini açın.</p>
            </div>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">İmtahan</th>
                  <th className="px-5 py-3 font-medium">Tarix</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Nəticə</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-gray-400">
                      Hələ imtahan yoxdur.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.examId}
                      className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                      onClick={() => openExam(row)}
                    >
                      <td className="px-5 py-3 font-medium">{row.title}</td>
                      <td className="px-5 py-3 text-gray-500">{row.startTime ? formatDateTime(row.startTime) : '—'}</td>
                      <td className="px-5 py-3">
                        {row.attended ? (
                          <Badge tone="success">Daxil olub</Badge>
                        ) : (
                          <Badge tone="danger">Daxil olmayıb</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {row.attended ? (
                          <Badge tone={(row.percent || 0) >= 50 ? 'success' : 'danger'}>{Math.round(row.percent || 0)}%</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          <Card className="p-0">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
              <h3 className="font-bold">Qrup sıralaması (orta nəticə)</h3>
              <p className="mt-1 text-sm text-gray-500">Eyni qrupdakı tələbələr orta bala görə sıralanır.</p>
            </div>
            <LeaderboardTable
              rows={classmates}
              emptyText="Bu qrupda hələ müqayisə üçün nəticə yoxdur."
            />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
