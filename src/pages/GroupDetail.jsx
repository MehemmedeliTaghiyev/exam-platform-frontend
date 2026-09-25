import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react';
import AppShell from '../components/AppShell';
import { AuthContext } from '../context/AuthContext';
import { Button, Card, EmptyState, Input, Modal, Badge } from '../components/ui';
import { createStudentAccount, deleteGroup, deleteStudentAccount, fetchGroup, fetchStudents, setStudentAccess, updateStudentProfile } from '../lib/examApi';
import { formatDate, fullNameOf, errorMessage } from '../lib/utils';

const emptyForm = {
  firstName: '',
  lastName: '',
  fatherName: '',
  email: '',
  userName: '',
  password: '',
  birthDate: '',
  contractStart: '',
  contractEnd: '',
  photo: '',
  contractPhoto: '',
  closeAccess: false,
};

function belongsToGroup(student, group) {
  if (!student || !group) return false;
  if (student.groupId != null && String(student.groupId) === String(group.id)) return true;
  const keys = [group.number, group.name].map((v) => String(v || '').trim().toLowerCase()).filter(Boolean);
  const studentKey = String(student.groupName || '').trim().toLowerCase();
  return keys.includes(studentKey);
}

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [removingId, setRemovingId] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', fatherName: '' });

  const groupLabel = group?.number || group?.name || '';

  const load = async () => {
    setLoading(true);
    try {
      const [g, list] = await Promise.all([fetchGroup(id), fetchStudents()]);
      setGroup(g);
      setAll(list);
      setStudents(list.filter((s) => belongsToGroup(s, g)));
    } catch (err) {
      setGroup(null);
      setError(errorMessage(err, 'Qrup yüklənmədi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id, user?.id]);

  const onFile = (key) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Şəkil 2 MB-dan kiçik olmalıdır.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, [key]: reader.result }));
    reader.readAsDataURL(file);
  };

  const addStudent = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      const email = form.email.trim().toLowerCase();
      const userName = form.userName.trim().toLowerCase();
      const duplicate = all.find(
        (s) =>
          (s.email && s.email.toLowerCase() === email) ||
          (s.userName && s.userName.toLowerCase() === userName),
      );
      if (duplicate) {
        setError('Bu tələbə artıq əlavə olunub. Təkrarlananı qrupdan silə bilərsiniz.');
        setSaving(false);
        return;
      }
      const fullName = [form.firstName, form.lastName, form.fatherName].filter(Boolean).join(' ').trim();
      await createStudentAccount({
        fullName,
        firstName: form.firstName,
        lastName: form.lastName,
        fatherName: form.fatherName,
        email: form.email.trim(),
        userName: form.userName.trim(),
        password: form.password,
        groupName: groupLabel,
        groupId: Number(id) || undefined,
        birthDate: form.birthDate || null,
        contractStart: form.contractStart || null,
        contractEnd: form.contractEnd || null,
        photo: form.photo || null,
        contractPhoto: form.contractPhoto || null,
        closeAccess: form.closeAccess,
      });
      setOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Tələbə saxlanılmadı. E-poçt və istifadəçi adı unikal olmalıdır.'));
    } finally {
      setSaving(false);
    }
  };

  const removeStudent = async (student, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (removingId) return;
    if (!window.confirm(`${fullNameOf(student)} qrupdan silinsin? Bu əməliyyat bir dəfəlikdir.`)) return;
    setRemovingId(student.id);
    setError('');
    try {
      if (Number(student.id) > 0) {
        await deleteStudentAccount(student.id);
      }
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Tələbə silinmədi.'));
    } finally {
      setRemovingId(null);
    }
  };

  const openEdit = (student, e) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    setEditing(student);
    setEditForm({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      fatherName: student.fatherName || '',
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing || saving) return;
    setError('');
    setSaving(true);
    try {
      await updateStudentProfile(editing.id, editForm);
      setEditing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Ad soyad saxlanılmadı.'));
    } finally {
      setSaving(false);
    }
  };

  const removeGroup = async () => {
    if (deletingGroup || saving) return;
    const label = groupLabel || 'qrup';
    if (!window.confirm(`${label} silinsin? Tələbələr silinməyəcək, qrup siyahıdan çıxacaq.`)) return;
    setDeletingGroup(true);
    setError('');
    try {
      await deleteGroup(id);
      navigate('/teacher/cabinet');
    } catch (err) {
      setError(errorMessage(err, 'Qrup silinmədi.'));
      setDeletingGroup(false);
    }
  };

  const toggleAccess = async (student, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!Number(student.id)) return;
    setRemovingId(student.id);
    setError('');
    try {
      const enabled = student.isAccessEnabled !== false;
      await setStudentAccess(student.id, !enabled);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Giriş hüququ dəyişmədi.'));
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <AppShell title="Qrup">
        <p className="text-sm text-gray-500">Yüklənir...</p>
      </AppShell>
    );
  }

  if (!group) {
    return (
      <AppShell title="Qrup">
        <p>{error || 'Qrup tapılmadı.'}</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={`${groupLabel}${group.name && group.number && group.name !== group.number ? ` · ${group.name}` : ''}`}>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/teacher/cabinet')}>
            <ArrowLeft size={16} /> Kabinet
          </Button>
          <p className="mt-4 whitespace-pre-wrap text-sm text-gray-500">{group.schedule}</p>
          {error && !open && !editing && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            disabled={deletingGroup}
            onClick={removeGroup}
          >
            <Trash2 size={16} /> Qrupu sil
          </Button>
          <Button onClick={() => { setError(''); setOpen(true); }}>
            <Plus size={16} /> Tələbə əlavə et
          </Button>
        </div>
      </div>

      {students.length === 0 ? (
        <EmptyState title="Tələbə yoxdur" text="Bu qrupa tələbə əlavə edin." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => (
            <Card key={s.id} className="flex flex-col gap-3">
              <div
                className="flex cursor-pointer items-center gap-4"
                onClick={() => navigate(`/teacher/students/${s.id}`)}
              >
                <div className="h-14 w-14 overflow-hidden rounded-2xl bg-brand-50">
                  {s.photo ? (
                    <img src={s.photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-bold text-brand-600">
                      {(s.firstName || s.fullName || '?')[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{fullNameOf(s)}</p>
                  <p className="text-xs text-gray-500">Qrup: {s.groupName || groupLabel}</p>
                  <p className="text-xs text-gray-500">Doğum: {formatDate(s.birthDate)}</p>
                  {s.isAccessEnabled === false ? (
                    <Badge tone="danger">Pəncərə bağlı</Badge>
                  ) : (
                    <Badge tone="success">Giriş açıq</Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {Number(s.id) > 0 && (
                  <Button variant="secondary" disabled={removingId === s.id || saving} onClick={(e) => openEdit(s, e)}>
                    <Pencil size={14} /> Düzəliş
                  </Button>
                )}
                {Number(s.id) > 0 && (
                  <Button
                    variant={s.isAccessEnabled === false ? 'success' : 'danger'}
                    disabled={removingId === s.id}
                    onClick={(e) => toggleAccess(s, e)}
                  >
                    {s.isAccessEnabled === false ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                    {s.isAccessEnabled === false ? 'Giriş ver' : 'Pəncərəni bağla'}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  disabled={removingId === s.id}
                  onClick={(e) => removeStudent(s, e)}
                >
                  <Trash2 size={16} /> Sil
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} title="Yeni tələbə" onClose={() => !saving && setOpen(false)}>
        <form onSubmit={addStudent} className="grid gap-4 sm:grid-cols-2">
          <Input label="Ad" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input label="Soyad" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <Input label="Ata adı" value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} />
          <Input label="E-poçt" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="İstifadəçi adı" required value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} />
          <Input label="Şifrə" type="password" required minLength={4} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input label="Doğum tarixi" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          <Input label="Müqavilə başlanğıcı" type="date" value={form.contractStart} onChange={(e) => setForm({ ...form, contractStart: e.target.value })} />
          <Input label="Müqavilə sonu" type="date" value={form.contractEnd} onChange={(e) => setForm({ ...form, contractEnd: e.target.value })} />
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-gray-600 dark:text-gray-300">Şəkil</span>
            <input
              type="file"
              accept="image/*"
              onChange={onFile('photo')}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 dark:border-slate-700"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-gray-600 dark:text-gray-300">Müqavilə şəkli</span>
            <input
              type="file"
              accept="image/*"
              onChange={onFile('contractPhoto')}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 dark:border-slate-700"
            />
          </label>
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          <label className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-gray-200 px-3 py-3 text-sm dark:border-slate-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.closeAccess}
              onChange={(e) => setForm({ ...form, closeAccess: e.target.checked })}
            />
            <span>
              <span className="font-medium">Pəncərəni bağla</span>
              <span className="mt-0.5 block text-gray-500">İşarələsəniz, bu tələbə daxil ola bilməyəcək. Sonra qrupdan və ya giriş hüquqlarından aça bilərsiniz.</span>
            </span>
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button variant="secondary" disabled={saving} onClick={() => setOpen(false)}>Ləğv et</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saxlanılır...' : 'Saxla'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(editing)} title="Şəxsi məlumatlar" onClose={() => !saving && setEditing(null)}>
        <form onSubmit={saveEdit} className="grid gap-4">
          <Input
            label="Ad"
            required
            value={editForm.firstName}
            onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
          />
          <Input
            label="Soyad"
            required
            value={editForm.lastName}
            onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
          />
          <Input
            label="Ata adı"
            value={editForm.fatherName}
            onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={saving} onClick={() => setEditing(null)}>Ləğv et</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saxlanılır...' : 'Saxla'}</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
