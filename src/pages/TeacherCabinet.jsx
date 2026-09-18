import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import AppShell from '../components/AppShell';
import { AuthContext } from '../context/AuthContext';
import { Badge, Button, Card, EmptyState, Input, Modal, Textarea } from '../components/ui';
import { localDb } from '../lib/localDb';
import { uid } from '../lib/utils';

export default function TeacherCabinet() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const teacherId = user?.id || 'me';
  const [groups, setGroups] = useState(() => localDb.getGroups(teacherId));
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [schedule, setSchedule] = useState('');

  const students = useMemo(() => localDb.getStudents(teacherId), [groups, teacherId]);

  const createGroup = (e) => {
    e.preventDefault();
    const group = {
      id: uid('grp'),
      name: name.trim(),
      number: (number.trim() || name.trim()),
      schedule,
      createdAt: new Date().toISOString(),
    };
    const next = [group, ...groups];
    localDb.saveGroups(teacherId, next);
    setGroups(next);
    setName('');
    setNumber('');
    setSchedule('');
    setOpen(false);
  };

  return (
    <AppShell title="Müəllim kabineti">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">{user?.fullName}</p>
          <p className="mt-1 text-2xl font-bold">Qruplar və tələbələr</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Qrup yarat
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="Qrup yoxdur"
          text="Dərs cədvəli və tələbə siyahısı üçün qrup əlavə edin."
          action={<Button onClick={() => setOpen(true)}>Qrup yarat</Button>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {groups.map((g) => {
            const count = students.filter((s) => s.groupId === g.id).length;
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

      <Modal open={open} title="Yeni qrup" onClose={() => setOpen(false)}>
        <form onSubmit={createGroup} className="space-y-4">
          <Input label="Qrup nömrəsi" value={number} onChange={(e) => setNumber(e.target.value)} required placeholder="məs. 11A" />
          <Input label="Qrup adı" value={name} onChange={(e) => setName(e.target.value)} required placeholder="məs. 11A Riyaziyyat" />
          <Textarea
            label="Dərs cədvəli"
            rows={4}
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder={'Bazar ertəsi 15:00\nÇərşənbə 17:00'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Ləğv et
            </Button>
            <Button type="submit">Yarat</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
