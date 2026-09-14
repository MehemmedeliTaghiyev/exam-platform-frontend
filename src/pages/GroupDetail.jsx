import { useContext, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import AppShell from '../components/AppShell';
import { AuthContext } from '../context/AuthContext';
import { Button, Card, EmptyState, Input, Modal } from '../components/ui';
import { localDb } from '../lib/localDb';
import { formatDate, fullNameOf, uid } from '../lib/utils';

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const teacherId = user?.id || 'me';
  const group = localDb.getGroups(teacherId).find((g) => g.id === id);
  const [students, setStudents] = useState(() =>
    localDb.getStudents(teacherId).filter((s) => s.groupId === id),
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    fatherName: '',
    birthDate: '',
    contractStart: '',
    contractEnd: '',
    photo: '',
    contractPhoto: '',
  });

  const all = useMemo(() => localDb.getStudents(teacherId), [students, teacherId]);

  const onFile = (key) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, [key]: reader.result }));
    reader.readAsDataURL(file);
  };

  const addStudent = (e) => {
    e.preventDefault();
    const student = { ...form, id: uid('stu'), groupId: id };
    const nextAll = [student, ...all];
    localDb.saveStudents(teacherId, nextAll);
    setStudents(nextAll.filter((s) => s.groupId === id));
    setOpen(false);
    setForm({
      firstName: '',
      lastName: '',
      fatherName: '',
      birthDate: '',
      contractStart: '',
      contractEnd: '',
      photo: '',
      contractPhoto: '',
    });
  };

  if (!group) {
    return (
      <AppShell title="Qrup">
        <p>Qrup tapılmadı.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={group.name}>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/teacher/cabinet')}>
            <ArrowLeft size={16} /> Kabinet
          </Button>
          <p className="mt-4 whitespace-pre-wrap text-sm text-gray-500">{group.schedule}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Tələbə əlavə et
        </Button>
      </div>

      {students.length === 0 ? (
        <EmptyState title="Tələbə yoxdur" text="Bu qrupa tələbə əlavə edin." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => (
            <Card key={s.id} onClick={() => navigate(`/teacher/students/${s.id}`)} className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-2xl bg-brand-50">
                {s.photo ? (
                  <img src={s.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-bold text-brand-600">
                    {(s.firstName || '?')[0]}
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold">{fullNameOf(s)}</p>
                <p className="text-xs text-gray-500">Doğum: {formatDate(s.birthDate)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} title="Yeni tələbə" onClose={() => setOpen(false)}>
        <form onSubmit={addStudent} className="grid gap-4 sm:grid-cols-2">
          <Input label="Ad" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input label="Soyad" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <Input label="Ata adı" value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} />
          <Input label="Doğum tarixi" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          <Input label="Müqavilə başlanğıcı" type="date" value={form.contractStart} onChange={(e) => setForm({ ...form, contractStart: e.target.value })} />
          <Input label="Müqavilə sonu" type="date" value={form.contractEnd} onChange={(e) => setForm({ ...form, contractEnd: e.target.value })} />
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-gray-600 dark:text-gray-300">Şəkil</span>
            <input type="file" accept="image/*" onChange={onFile('photo')} />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-gray-600 dark:text-gray-300">Müqavilə şəkli</span>
            <input type="file" accept="image/*" onChange={onFile('contractPhoto')} />
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Ləğv et</Button>
            <Button type="submit">Saxla</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
