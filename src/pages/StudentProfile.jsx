import { useContext, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import AppShell from '../components/AppShell';
import ProgressChart from '../components/ProgressChart';
import { Badge, Button, Card } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { localDb } from '../lib/localDb';
import { formatDate, fullNameOf } from '../lib/utils';

export default function StudentProfile() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const teacherId = user?.id || 'me';
  const student = localDb.getStudents(teacherId).find((s) => s.id === id);
  const group = localDb.getGroups(teacherId).find((g) => g.id === student?.groupId);
  const results = useMemo(
    () =>
      localDb
        .getSubmissions()
        .filter((s) => String(s.studentId) === String(id) || s.studentName === fullNameOf(student)),
    [id, student],
  );

  if (!student) {
    return (
      <AppShell title="Tələbə">
        <p>Tələbə tapılmadı.</p>
      </AppShell>
    );
  }

  const points = results.map((r) => r.percent || 0);

  return (
    <AppShell title={fullNameOf(student)}>
      <Button variant="ghost" onClick={() => navigate(`/teacher/groups/${student.groupId}`)}>
        <ArrowLeft size={16} /> Qrupa qayıt
      </Button>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <div className="h-40 overflow-hidden rounded-2xl bg-gray-100 dark:bg-slate-800">
            {student.photo ? (
              <img src={student.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-3xl font-bold text-gray-300">
                {(student.firstName || '?')[0]}
              </div>
            )}
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-gray-400">Qrup</dt>
              <dd className="font-medium">{group?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Doğum tarixi</dt>
              <dd className="font-medium">{formatDate(student.birthDate)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Müqavilə</dt>
              <dd className="font-medium">
                {formatDate(student.contractStart)} — {formatDate(student.contractEnd)}
              </dd>
            </div>
          </dl>
          {student.contractPhoto && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-gray-400">Müqavilə sənədi</p>
              <img src={student.contractPhoto} alt="Müqavilə" className="rounded-xl border border-gray-200 dark:border-slate-700" />
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="font-bold">İnkişaf qrafiki</h3>
            <ProgressChart points={points.length ? points : [0]} />
          </Card>
          <Card className="border-dashed border-brand-200 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-950/20">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 text-brand-600" size={18} />
              <div>
                <p className="font-semibold">Proqnozlaşdırma</p>
                <p className="mt-1 text-sm text-gray-500">
                  Gələcək funksiya: əvvəlki tələbələrin nəticələrinə əsasən bu tələbənin növbəti imtahandakı ehtimal olunan nəticəsi göstəriləcək.
                </p>
              </div>
            </div>
          </Card>
          <Card className="overflow-x-auto p-0">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
              <h3 className="font-bold">İmtahan nəticələri</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">İmtahan</th>
                  <th className="px-5 py-3 font-medium">Tarix</th>
                  <th className="px-5 py-3 font-medium">Nəticə</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0 dark:border-slate-800">
                    <td className="px-5 py-3">{r.examTitle || r.examId}</td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(r.submittedAt)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={(r.percent || 0) >= 50 ? 'success' : 'danger'}>{r.percent || 0}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
