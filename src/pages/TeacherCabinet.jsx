import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import AppShell from '../components/AppShell';
import { AuthContext } from '../context/AuthContext';
import { Badge, Button, Card, EmptyState, Input, Modal, Textarea } from '../components/ui';
import { createGroup, fetchGroups, fetchStudents } from '../lib/examApi';
import { errorMessage } from '../lib/utils';

function inGroup(student, group) {
  if (!student || !group) return false;
  if (student.groupId != null && String(student.groupId) === String(group.id)) return true;
  const key = String(group.number || group.name || '').trim().toLowerCase();
  const name = String(group.name || '').trim().toLowerCase();
  const studentKey = String(student.groupName || '').trim().toLowerCase();
  return Boolean(key && studentKey && (studentKey === key || studentKey === name));
}

export default function TeacherCabinet() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [schedule, setSchedule] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [groupList, studentList] = await Promise.all([
        fetchGroups(),
        fetchStudents().catch(() => []),
      ]);
      setGroups(groupList);
      setStudents(studentList);
    } catch (err) {
      setError(errorMessage(err, 'Qruplar yüklənmədi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await createGroup({
        name: name.trim(),
        number: (number.trim() || name.trim()),
        schedule,
      });
      setName('');
      setNumber('');
      setSchedule('');
      setOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Qrup saxlanılmadı.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Müəllim kabineti">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">{user?.fullName}</p>
          <p className="mt-1 text-2xl font-bold">Qruplar və tələbələr</p>
        </div>
        <Button onClick={() => { setError(''); setOpen(true); }}>
          <Plus size={16} /> Qrup yarat
        </Button>
      </div>

      {error && !open && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Yüklənir...</p>
      ) : groups.length === 0 ? (
        <EmptyState
          title="Qrup yoxdur"
          text="Dərs cədvəli və tələbə siyahısı üçün qrup əlavə edin."
          action={<Button onClick={() => setOpen(true)}>Qrup yarat</Button>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {groups.map((g) => {
            const count = g.studentCount || students.filter((s) => inGroup(s, g)).length;
            return (
              <Card key={g.id} onClick={() => navigate(`/teacher/groups/${g.id}`)}>
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold">{g.number || g.name}</h3>
                  <Badge>{count} tələbə</Badge>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-500">
                  {g.schedule || 'Dərs cədvəli əlavə edilməyib'}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} title="Yeni qrup" onClose={() => !saving && setOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Qrup nömrəsi" value={number} onChange={(e) => setNumber(e.target.value)} required placeholder="məs. 11A" />
          <Input label="Qrup adı" value={name} onChange={(e) => setName(e.target.value)} required placeholder="məs. 11A Riyaziyyat" />
          <Textarea
            label="Dərs cədvəli"
            rows={4}
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder={'Bazar ertəsi 15:00\nÇərşənbə 17:00'}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={saving} onClick={() => setOpen(false)}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saxlanılır...' : 'Yarat'}</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
