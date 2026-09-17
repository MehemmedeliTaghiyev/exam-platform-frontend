import { useContext, useEffect, useState } from 'react';
import { Users, BookOpen, GraduationCap, Shield } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Badge, Card, Skeleton, StatCard } from '../components/ui';
import { fetchExams } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import { AuthContext } from '../context/AuthContext';
import { formatDate } from '../lib/utils';
import API from '../api/axios';
import { unwrapList } from '../lib/utils';

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [exams, setExams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const examList = await fetchExams();
      setExams(examList);
      try {
        const [teachers, students] = await Promise.all([
          API.get('/Users', { params: { role: 'Teacher', includeDeleted: false } }),
          API.get('/Users', { params: { role: 'Student', includeDeleted: false } }),
        ]);
        setUsers([...unwrapList(teachers.data), ...unwrapList(students.data)]);
      } catch {
        setUsers([]);
      }
      setLoading(false);
    };
    run();
  }, []);

  const groups = localDb.getGroups(user?.id || 'me');

  return (
    <AppShell title="Admin paneli">
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
            <StatCard icon={Users} label="İstifadəçilər" value={users.length || '—'} />
            <StatCard icon={GraduationCap} label="Qruplar" value={groups.length} />
            <StatCard icon={Shield} label="Rolunuz" value="Admin" />
          </div>

          <Card className="mt-8 overflow-x-auto p-0">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
              <h3 className="font-bold">Bütün imtahanlar</h3>
            </div>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">Ad</th>
                  <th className="px-5 py-3 font-medium">Fənn</th>
                  <th className="px-5 py-3 font-medium">Tarix</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id} className="border-b border-gray-100 last:border-0 dark:border-slate-800">
                    <td className="px-5 py-3 font-medium">{exam.title}</td>
                    <td className="px-5 py-3">{exam.subjectName || '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(exam.createdAt)}</td>
                    <td className="px-5 py-3">
                      <Badge tone="brand">{exam.status || 'Aktiv'}</Badge>
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
