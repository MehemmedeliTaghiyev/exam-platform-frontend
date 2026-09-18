import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { Badge, Button, Card, EmptyState, Input, Modal, Textarea } from '../components/ui';
import API from '../api/axios';
import { Ban, CheckCircle2 } from 'lucide-react';
import { createTeacherAccount, updateTeacherTrial, setStudentAccess } from '../lib/examApi';
import { errorMessage, formatDateTime, unwrapList } from '../lib/utils';

function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  userName: '',
  password: '',
  trialLocal: '',
  trialMessage: 'Free trial bitdi.',
};

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/Users', { params: { role: 'Teacher', includeDeleted: false } });
      setTeachers(unwrapList(res.data));
    } catch (err) {
      setTeachers([]);
      setError(errorMessage(err, 'Müəllimlər yüklənmədi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    const end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    setForm({ ...emptyForm, trialLocal: toLocalInput(end) });
    setEdit(null);
    setOpen(true);
  };

  const openEdit = (t) => {
    setEdit(t);
    setForm({
      firstName: t.firstName || '',
      lastName: t.lastName || '',
      email: t.email || '',
      phone: t.phone || '',
      userName: t.userName || '',
      password: '',
      trialLocal: toLocalInput(t.trialEndsAt),
      trialMessage: t.trialMessage || 'Free trial bitdi.',
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const trialEndsAt = form.trialLocal ? new Date(form.trialLocal).toISOString() : null;
      if (edit) {
        await updateTeacherTrial(edit.id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          trialEndsAt,
          trialMessage: form.trialMessage,
        });
      } else {
        await createTeacherAccount({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          userName: form.userName.trim(),
          password: form.password,
          trialEndsAt,
          trialMessage: form.trialMessage,
        });
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Saxlanılmadı.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleAccess = async (t) => {
    if (!t.id || busyId) return;
    setBusyId(t.id);
    setError('');
    try {
      const enabled = (t.isAccessEnabled ?? t.IsAccessEnabled) !== false;
      await setStudentAccess(t.id, !enabled);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Pəncərə dəyişmədi.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell title="Müəllim qeydiyyatı">
      <p className="mb-6 text-sm text-gray-500">
        Qeydə alınan müəllimin tarixi saxlanır və admin e-poçtuna məktub gedir. Hər müəllim üçün sınaq vaxtı və mesaj təyin edin — vaxt bitəndə eyni ünvana ad, soyad və əlaqə nömrəsi ilə bildiriş gəlir.
      </p>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>Müəllim qeydə al</Button>
      </div>
      {error && !open && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Yüklənir...</p>
      ) : teachers.length === 0 ? (
        <EmptyState title="Müəllim yoxdur" text="Qeydiyyat üçün düyməni basın." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
                <th className="px-5 py-3 font-medium">Ad / soyad</th>
                <th className="px-5 py-3 font-medium">Telefon</th>
                <th className="px-5 py-3 font-medium">E-poçt</th>
                <th className="px-5 py-3 font-medium">Qeydiyyat tarixi</th>
                <th className="px-5 py-3 font-medium">Sınaq bitir</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0 dark:border-slate-800">
                  <td className="px-5 py-3 font-medium">{[t.firstName, t.lastName].filter(Boolean).join(' ') || t.fullName}</td>
                  <td className="px-5 py-3 text-gray-500">{t.phone || '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{t.email}</td>
                  <td className="px-5 py-3 text-gray-500">{formatDateTime(t.createdAt)}</td>
                  <td className="px-5 py-3 text-gray-500">{t.trialEndsAt ? formatDateTime(t.trialEndsAt) : '—'}</td>
                  <td className="px-5 py-3">
                    {t.trialNotifiedAt ? (
                      <Badge>Mail göndərilib</Badge>
                    ) : t.trialEndsAt && new Date(t.trialEndsAt).getTime() <= Date.now() ? (
                      <Badge tone="danger">Vaxt bitib</Badge>
                    ) : (
                      <Badge tone="success">Sınaq aktiv</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant={(t.isAccessEnabled ?? t.IsAccessEnabled) !== false ? 'danger' : 'success'}
                        disabled={busyId === t.id}
                        onClick={() => toggleAccess(t)}
                      >
                        {(t.isAccessEnabled ?? t.IsAccessEnabled) !== false ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                        {(t.isAccessEnabled ?? t.IsAccessEnabled) !== false ? 'Pəncərəni bağla' : 'Giriş ver'}
                      </Button>
                      <Button variant="secondary" onClick={() => openEdit(t)}>Vaxt / mesaj</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} title={edit ? 'Sınaq vaxtı və mesaj' : 'Yeni müəllim'} onClose={() => !saving && setOpen(false)}>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Input label="Ad" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input label="Soyad" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <Input label="Əlaqə nömrəsi" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="E-poçt" type="email" required disabled={Boolean(edit)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {!edit && (
            <>
              <Input label="İstifadəçi adı" value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} />
              <Input label="Şifrə" type="password" required minLength={4} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </>
          )}
          <Input
            label="Sınaq bitmə vaxtı"
            type="datetime-local"
            required
            className="sm:col-span-2"
            value={form.trialLocal}
            onChange={(e) => setForm({ ...form, trialLocal: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Vaxt bitəndə gələcək mesaj"
              rows={4}
              value={form.trialMessage}
              onChange={(e) => setForm({ ...form, trialMessage: e.target.value })}
            />
          </div>
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button variant="secondary" disabled={saving} onClick={() => setOpen(false)}>Ləğv et</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saxlanılır...' : 'Saxla'}</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
