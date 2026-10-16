import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, GraduationCap, UserCheck, Trash2 } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Badge, Card, ConfirmDialog, Input, Skeleton, StatCard } from '../components/ui';
import { deleteExam, fetchExams } from '../lib/examApi';
import { AuthContext } from '../context/AuthContext';
import { errorMessage, formatDate } from '../lib/utils';
import API from '../api/axios';
import { unwrapList } from '../lib/utils';

function isActiveStudent(u) {
  if (u.isDeleted) return false;
  const enabled = u.isAccessEnabled ?? u.IsAccessEnabled;
  return enabled !== false;
}

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingExam, setPendingExam] = useState(null);
  const [nameQuery, setNameQuery] = useState('');

  useEffect(() => {
    const run = async () => {
      const examList = await fetchExams();
      setExams(examList);
      try {
        const [teacherRes, studentRes] = await Promise.all([
          API.get('/Users', { params: { role: 'Teacher', includeDeleted: false } }),
          API.get('/Users', { params: { role: 'Student', includeDeleted: false } }),
        ]);
        setTeachers(unwrapList(teacherRes.data));
        setStudents(unwrapList(studentRes.data));
      } catch {
        setTeachers([]);
        setStudents([]);
      }
      setLoading(false);
    };
    run();
  }, []);

  const activeStudents = students.filter(isActiveStudent);
  const activeTeachers = teachers.filter((t) => (t.isAccessEnabled ?? t.IsAccessEnabled) !== false);
  const q = nameQuery.trim().toLowerCase();
  const visibleExams = exams.filter((exam) => {
    if (!q) return true;
    return `${exam.title || ''} ${exam.teacherName || exam.TeacherName || ''} ${exam.subjectName || ''}`.toLowerCase().includes(q);
  });

  const handleDelete = async (exam) => {
    try {
      await deleteExam(exam.id);
      setExams((prev) => prev.filter((e) => String(e.id) !== String(exam.id)));
    } catch (err) {
      alert(errorMessage(err, 'İmtahan silinmədi.'));
    }
  };

  const statusLabel = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'finished' || s === '3') return 'Bitib';
    if (s === 'live' || s === '2') return 'Canlı';
    if (s === 'scheduled' || s === '1') return 'Planlanıb';
    if (s === 'draft' || s === '0') return 'Qaralama';
    return status || 'Aktiv';
  };

  return (
    <AppShell title="Admin paneli">
      <ConfirmDialog
        open={Boolean(pendingExam)}
        text={pendingExam ? `“${pendingExam.title}” imtahanı silinəcək.` : ''}
        onCancel={() => setPendingExam(null)}
        onConfirm={() => {
          const exam = pendingExam;
          setPendingExam(null);
          if (exam) handleDelete(exam);
        }}
      />
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
            <StatCard icon={BookOpen} label="İmtahanlar" value={exams.length} />
            <StatCard icon={GraduationCap} label="Müəllimlər" value={activeTeachers.length} />
            <StatCard icon={UserCheck} label="Aktiv tələbələr" value={activeStudents.length} />
            <StatCard icon={Users} label="Bütün tələbələr" value={students.length} />
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Aktiv tələbə: silinməyib və girişi açıqdır. Rolunuz: {user?.fullName ? `${user.fullName} · ` : ''}Admin
          </p>

          <div className="mt-8 max-w-md">
            <Input label="İmtahan axtar" value={nameQuery} onChange={(e) => setNameQuery(e.target.value)} placeholder="Ad, müəllim və ya fənn" />
          </div>
          <Card className="mt-4 overflow-x-auto p-0">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
              <h3 className="font-bold">Bütün imtahanlar</h3>
            </div>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">Ad</th>
                  <th className="px-5 py-3 font-medium">Müəllim</th>
                  <th className="px-5 py-3 font-medium">Fənn</th>
                  <th className="px-5 py-3 font-medium">Tarix</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {visibleExams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    onClick={() => navigate(`/admin/exams/${exam.id}`)}
                  >
                    <td className="px-5 py-3 font-medium">{exam.title}</td>
                    <td className="px-5 py-3">{exam.teacherName || exam.TeacherName || '—'}</td>
                    <td className="px-5 py-3">{exam.subjectName || '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(exam.createdAt)}</td>
                    <td className="px-5 py-3">
                      <Badge tone="brand">{statusLabel(exam.status)}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingExam(exam);
                        }}
                      >
                        <Trash2 size={14} /> Sil
                      </button>
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
