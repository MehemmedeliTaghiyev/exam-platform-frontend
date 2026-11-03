import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, GraduationCap, UserCheck, Trash2 } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Badge, Card, ConfirmDialog, Skeleton, StatCard } from '../components/ui';
import ExamSearchBar from '../components/ExamSearchBar';
import { examMatchesSearch } from '../lib/publicExams';
import { deleteExam, fetchExams, fetchGroupsForTeacher } from '../lib/examApi';
import { AuthContext } from '../context/AuthContext';
import { errorMessage, formatDate } from '../lib/utils';
import API from '../api/axios';
import { unwrapList } from '../lib/utils';
import {
  difficultyLabelAz,
  monthlyDifficulty,
  patchRepublicWinner,
  republicMonthTitle,
  republicResults,
  republicWinners,
  setMonthlyDifficulty,
  winnerSlotsFor,
} from '../lib/republicExam';
import { Button } from '../components/ui';

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
  const [dateQuery, setDateQuery] = useState('');
  const [teacherGroups, setTeacherGroups] = useState({});
  const [monthLevel, setMonthLevel] = useState(() => monthlyDifficulty());

  useEffect(() => {
    const run = async () => {
      const examList = await fetchExams();
      setExams(examList);
      try {
        const [teacherRes, studentRes] = await Promise.all([
          API.get('/Users', { params: { role: 'Teacher', includeDeleted: false } }),
          API.get('/Users', { params: { role: 'Student', includeDeleted: false } }),
        ]);
        const teacherList = unwrapList(teacherRes.data);
        setTeachers(teacherList);
        setStudents(unwrapList(studentRes.data));
        const groupMap = {};
        await Promise.all(teacherList.map(async (teacher) => {
          const id = teacher.id ?? teacher.Id;
          if (!id) return;
          try {
            groupMap[id] = await fetchGroupsForTeacher(id);
          } catch {
            groupMap[id] = [];
          }
        }));
        setTeacherGroups(groupMap);
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
  const visibleExams = exams.filter((exam) => examMatchesSearch(exam, { name: nameQuery, date: dateQuery }));

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

          <Card className="mt-8 overflow-x-auto p-0">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
              <h3 className="font-bold">Müəllim qrupları və tələbələr (baza)</h3>
            </div>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">Müəllim</th>
                  <th className="px-5 py-3 font-medium">Qruplar</th>
                  <th className="px-5 py-3 font-medium">Tələbə</th>
                </tr>
              </thead>
              <tbody>
                {activeTeachers.map((teacher) => {
                  const id = teacher.id ?? teacher.Id;
                  const groups = teacherGroups[id] || [];
                  const count = students.filter((s) => String(s.teacherId ?? s.TeacherId ?? '') === String(id)).length;
                  return (
                    <tr key={id} className="border-b border-gray-100 last:border-0 dark:border-slate-800">
                      <td className="px-5 py-3 font-medium">{teacher.fullName || teacher.FullName || teacher.email}</td>
                      <td className="px-5 py-3">
                        {groups.length
                          ? groups.map((g) => g.name || g.number).join(', ')
                          : '—'}
                        <span className="ml-2 text-xs text-gray-400">({groups.length})</span>
                      </td>
                      <td className="px-5 py-3">{count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card className="mt-8 space-y-3">
            <h3 className="font-bold">{republicMonthTitle()} — çətinlik</h3>
            <p className="text-sm text-[var(--muted)]">
              Ay sonu qarışıq sınağın çətinliyini siz seçirsiniz. İndi: {difficultyLabelAz(monthLevel)}.
            </p>
            <div className="flex flex-wrap gap-2">
              {['asan', 'orta', 'çətin'].map((level) => (
                <Button
                  key={level}
                  variant={monthLevel === level ? 'primary' : 'secondary'}
                  onClick={() => setMonthLevel(setMonthlyDifficulty(level))}
                >
                  {difficultyLabelAz(level)}
                </Button>
              ))}
            </div>
          </Card>

          <Card className="mt-8 space-y-3">
            <h3 className="font-bold">{republicMonthTitle()} qalibləri</h3>
            <p className="text-sm text-[var(--muted)]">
              Yer sayı iştirakçıya görədir: {winnerSlotsFor(republicResults().length) || 0}. Şəkil ana səhifədə müəllim adı ilə görünür. Kuponla 2 ₼ geri qaytarılır.
            </p>
            {republicWinners().map((row) => (
              <div key={row.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] px-3 py-2">
                <p className="text-sm font-bold">
                  {row.fullName} · {row.percent}% · {row.teacherName || 'Müəllim yoxdur'}
                  {row.teachingSubject ? ` (${row.teachingSubject})` : ''}
                </p>
                <label className="text-xs font-semibold">
                  Şəkil
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 block text-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => patchRepublicWinner(row.month, { ...row, photo: String(reader.result || '') });
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            ))}
          </Card>

          <div className="mt-8">
            <ExamSearchBar name={nameQuery} date={dateQuery} onName={setNameQuery} onDate={setDateQuery} />
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
