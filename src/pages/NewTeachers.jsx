import { useEffect, useState } from 'react';
import { Ban, CheckCircle2 } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Badge, Button, Card, EmptyState } from '../components/ui';
import API from '../api/axios';
import { deleteStudentAccount, isPendingApproval, setStudentAccess, updateTeacherTrial } from '../lib/examApi';
import { computeAccessEnd, DEFAULT_TEACHER_TRIAL_DAYS, errorMessage, formatDate, unwrapList } from '../lib/utils';

export default function NewTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/Users', { params: { role: 'Teacher', includeDeleted: false } });
      setTeachers(unwrapList(res.data).filter(isPendingApproval));
    } catch (err) {
      setTeachers([]);
      setError(errorMessage(err, 'Yeni müəllimlər yüklənmədi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openTeacher = async (teacher) => {
    await setStudentAccess(teacher.id, true);
    const trialStartsAt = new Date().toISOString();
    await updateTeacherTrial(teacher.id, {
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      phone: teacher.phone,
      trialStartsAt,
      trialEndsAt: computeAccessEnd(trialStartsAt, 'FreeTrial', DEFAULT_TEACHER_TRIAL_DAYS),
      billingPlan: 'FreeTrial',
      trialDays: DEFAULT_TEACHER_TRIAL_DAYS,
      trialMessage: `${DEFAULT_TEACHER_TRIAL_DAYS} günlük sınaq müddəti başladı.`,
    }).catch(() => {});
  };

  const decide = async (teacher, allow) => {
    if (!teacher.id || busyId) return;
    setBusyId(teacher.id);
    setError('');
    try {
      if (allow) await openTeacher(teacher);
      else await deleteStudentAccount(teacher.id);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Əməliyyat alınmadı.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell title="Yeni müəllimlər">
      <p className="mb-6 text-sm text-gray-500">
        Qeydiyyat 20 günlük sınaq açmalıdır. Exam API hələ «admin təsdiqi» qaytarırsa, burada bir dəfə açın — sınaq avtomatik yazılır.
      </p>
      {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Yüklənir...</p>
      ) : teachers.length === 0 ? (
        <EmptyState title="Gözləyən müəllim yoxdur" text="Qeydiyyat səhifəsindən gələn müraciətlər burada görünəcək." />
      ) : (
        <div className="space-y-3">
          {teachers.length > 1 ? (
            <Button
              className="mb-2"
              disabled={Boolean(busyId)}
              onClick={async () => {
                setBusyId('all');
                setError('');
                try {
                  for (const t of teachers) {
                    if (t.id) await openTeacher(t);
                  }
                } catch (err) {
                  setError(errorMessage(err, 'Əməliyyat alınmadı.'));
                } finally {
                  setBusyId(null);
                  await load();
                }
              }}
            >
              Hamısını qəbul et (20 gün sınaq)
            </Button>
          ) : null}
          {teachers.map((t) => (
            <Card key={t.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">{t.fullName || `${t.firstName || ''} ${t.lastName || ''}`.trim()}</p>
                <p className="text-sm text-gray-500">{t.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>{t.position || 'Konum qeyd olunmayıb'}</Badge>
                  {t.phone ? <Badge tone="brand">{t.phone}</Badge> : null}
                  <span className="text-xs text-gray-400">{formatDate(t.createdAt)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="success" disabled={busyId === t.id} onClick={() => decide(t, true)}>
                  <CheckCircle2 size={16} /> Qəbul et
                </Button>
                <Button variant="danger" disabled={busyId === t.id} onClick={() => decide(t, false)}>
                  <Ban size={16} /> Rədd et
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
