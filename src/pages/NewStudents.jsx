import { useContext, useEffect, useMemo, useState } from 'react';
import { Ban, CheckCircle2 } from 'lucide-react';
import AppShell from '../components/AppShell';
import { AuthContext } from '../context/AuthContext';
import { Button, Card, EmptyState } from '../components/ui';
import { deleteStudentAccount, fetchGroups, fetchStudents, isPendingApproval, setStudentAccess } from '../lib/examApi';
import { errorMessage, fullNameOf } from '../lib/utils';

function groupKey(group) {
  return String(group?.id ?? group?.number ?? group?.name ?? '').trim().toLowerCase();
}

function belongsToGroup(student, group) {
  if (!student || !group) return false;
  if (student.groupId != null && String(student.groupId) === String(group.id)) return true;
  const keys = [group.number, group.name].map((v) => String(v || '').trim().toLowerCase()).filter(Boolean);
  return keys.includes(String(student.groupName || '').trim().toLowerCase());
}

export default function NewStudents() {
  const { user } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [groupList, students] = await Promise.all([fetchGroups(), fetchStudents()]);
      setGroups(groupList);
      setPending(students.filter(isPendingApproval));
    } catch (err) {
      setError(errorMessage(err, 'Yeni şagirdlər yüklənmədi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const sections = useMemo(() => {
    const used = new Set();
    const listed = groups.map((g) => {
      const students = pending.filter((s) => belongsToGroup(s, g));
      students.forEach((s) => used.add(s.id));
      return { key: groupKey(g) || String(g.id), title: g.number || g.name, students };
    });
    const leftover = pending.filter((s) => !used.has(s.id));
    if (leftover.length) {
      listed.push({ key: 'other', title: 'Qrupu göstərilməyən', students: leftover });
    }
    return listed.filter((s) => s.students.length);
  }, [groups, pending]);

  const decide = async (student, allow) => {
    if (!student.id || busyId) return;
    setBusyId(student.id);
    setError('');
    try {
      if (allow) await setStudentAccess(student.id, true);
      else await deleteStudentAccount(student.id);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Əməliyyat alınmadı.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell title="Yeni şagirdlər">
      <p className="mb-6 text-sm text-gray-500">
        Qrup linkindən qeydiyyatı tamamlayan şagirdlər burada, aid olduqları qrupun altında görünür. İcazə verdikdən sonra şagird e-poçt və şifrə ilə daxil ola bilər.
      </p>
      {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Yüklənir...</p>
      ) : sections.length === 0 ? (
        <EmptyState title="Gözləyən şagird yoxdur" text="Qrup daxilindəki qeydiyyat linkini paylaşın." />
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.key}>
              <h2 className="mb-3 text-lg font-bold">{section.title}</h2>
              <div className="space-y-3">
                {section.students.map((s) => (
                  <Card key={s.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold">{fullNameOf(s)}</p>
                      <p className="text-sm text-gray-500">{s.email}</p>
                      {s.phone ? <p className="text-sm text-gray-500">{s.phone}</p> : null}
                      <p className="mt-2 text-xs text-gray-500">{s.groupName || section.title}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="success" disabled={busyId === s.id} onClick={() => decide(s, true)}>
                        <CheckCircle2 size={16} /> İcazə ver
                      </Button>
                      <Button variant="danger" disabled={busyId === s.id} onClick={() => decide(s, false)}>
                        <Ban size={16} /> İcazə vermə
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
