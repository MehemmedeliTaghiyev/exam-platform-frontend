import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import { Badge, Button, Card, EmptyState, Input, Modal, Select, Textarea } from '../components/ui';
import API from '../api/axios';
import { Ban, CheckCircle2 } from 'lucide-react';
import { createTeacherAccount, updateTeacherTrial, setStudentAccess } from '../lib/examApi';
import { daysUntil, errorMessage, formatDateTime, toDateInput, unwrapList } from '../lib/utils';

function todayInput() {
  return toDateInput(new Date());
}

function remainingLabel(endsAt) {
  const n = daysUntil(endsAt);
  if (n == null) return { text: '—', className: 'text-gray-400' };
  if (n >= 0) return { text: `+${n} gün`, className: 'font-semibold text-emerald-600' };
  return { text: `${n} gün`, className: 'font-semibold text-red-600' };
}

function TeacherPlanCell({ teacher, onSaved, onError }) {
  const [startDate, setStartDate] = useState(toDateInput(teacher.trialStartsAt || teacher.createdAt) || todayInput());
  const [plan, setPlan] = useState(teacher.billingPlan === 'Monthly' ? 'Monthly' : 'Trial14');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStartDate(toDateInput(teacher.trialStartsAt || teacher.createdAt) || todayInput());
    setPlan(teacher.billingPlan === 'Monthly' ? 'Monthly' : 'Trial14');
  }, [teacher.id, teacher.trialStartsAt, teacher.createdAt, teacher.billingPlan]);

  const previewEnd = useMemo(() => {
    if (!startDate) return teacher.trialEndsAt;
    const d = new Date(`${startDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return teacher.trialEndsAt;
    if (plan === 'Monthly') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 14);
    return d.toISOString();
  }, [startDate, plan, teacher.trialEndsAt]);

  const left = remainingLabel(previewEnd);

  const save = async () => {
    if (!startDate || saving) return;
    setSaving(true);
    onError('');
    try {
      const updated = await updateTeacherTrial(teacher.id, {
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        phone: teacher.phone,
        trialStartsAt: new Date(`${startDate}T12:00:00`).toISOString(),
        billingPlan: plan,
      });
      onSaved(updated);
    } catch (err) {
      onError(errorMessage(err, 'Müddət saxlanılmadı.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-w-[280px] flex-col gap-2">
      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
        <option value="Trial14">14 günlük sınaq</option>
        <option value="Monthly">Aylıq</option>
      </Select>
      <div className="flex items-center justify-between gap-2">
        <span className={left.className}>{left.text}</span>
        <Button variant="secondary" disabled={saving} onClick={save}>
          {saving ? '...' : 'Saxla'}
        </Button>
      </div>
    </div>
  );
}

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  userName: '',
  password: '',
  startDate: todayInput(),
  billingPlan: 'Trial14',
  trialMessage: 'Free trial bitdi.',
};

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [sortDir, setSortDir] = useState('desc');
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

  const sorted = useMemo(() => {
    const list = [...teachers];
    list.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime() || 0;
      const tb = new Date(b.createdAt).getTime() || 0;
      return sortDir === 'desc' ? tb - ta : ta - tb;
    });
    return list;
  }, [teachers, sortDir]);

  const openCreate = () => {
    setForm({ ...emptyForm, startDate: todayInput(), billingPlan: 'Trial14' });
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
      startDate: toDateInput(t.trialStartsAt || t.createdAt) || todayInput(),
      billingPlan: t.billingPlan === 'Monthly' ? 'Monthly' : 'Trial14',
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
      const trialStartsAt = form.startDate ? new Date(`${form.startDate}T12:00:00`).toISOString() : null;
      if (edit) {
        await updateTeacherTrial(edit.id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          trialStartsAt,
          billingPlan: form.billingPlan,
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
          trialStartsAt,
          billingPlan: form.billingPlan,
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
        Qeydiyyat vaxtı avtomatik saxlanır. Ad, soyad və nömrənin yanında başlanğıc tarixi və 14 günlük sınaq və ya aylıq paket seçin.
        Qalan günlər yaşıl, keçmiş günlər qırmızı (mənfi) göstərilir.
      </p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button variant={sortDir === 'desc' ? 'primary' : 'secondary'} onClick={() => setSortDir('desc')}>
            Yeni → köhnə
          </Button>
          <Button variant={sortDir === 'asc' ? 'primary' : 'secondary'} onClick={() => setSortDir('asc')}>
            Köhnə → yeni
          </Button>
        </div>
        <Button onClick={openCreate}>Müəllim qeydə al</Button>
      </div>
      {error && !open && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Yüklənir...</p>
      ) : sorted.length === 0 ? (
        <EmptyState title="Müəllim yoxdur" text="Qeydiyyat üçün düyməni basın." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
                <th className="px-5 py-3 font-medium">Ad</th>
                <th className="px-5 py-3 font-medium">Soyad</th>
                <th className="px-5 py-3 font-medium">Nömrə</th>
                <th className="px-5 py-3 font-medium">Qeydiyyat</th>
                <th className="px-5 py-3 font-medium">Müddət</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => {
                const left = remainingLabel(t.trialEndsAt);
                return (
                  <tr key={t.id} className="border-b border-gray-100 align-top last:border-0 dark:border-slate-800">
                    <td className="px-5 py-3 font-medium">{t.firstName || t.fullName?.split(' ')[0] || '—'}</td>
                    <td className="px-5 py-3 font-medium">{t.lastName || '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{t.phone || '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{formatDateTime(t.createdAt)}</td>
                    <td className="px-5 py-3">
                      <TeacherPlanCell
                        teacher={t}
                        onError={setError}
                        onSaved={(updated) => {
                          setTeachers((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
                        }}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={left.className}>{left.text}</span>
                        {t.trialNotifiedAt ? (
                          <Badge>Mail göndərilib</Badge>
                        ) : t.trialEndsAt && new Date(t.trialEndsAt).getTime() <= Date.now() ? (
                          <Badge tone="danger">Vaxt bitib</Badge>
                        ) : (
                          <Badge tone="success">{t.billingPlan === 'Monthly' ? 'Aylıq' : 'Sınaq'}</Badge>
                        )}
                      </div>
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
                        <Button variant="secondary" onClick={() => openEdit(t)}>Düzəliş</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} title={edit ? 'Müəllim məlumatı' : 'Yeni müəllim'} onClose={() => !saving && setOpen(false)}>
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
            label="Başlanğıc tarixi"
            type="date"
            required
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
          <Select
            label="Paket"
            value={form.billingPlan}
            onChange={(e) => setForm({ ...form, billingPlan: e.target.value })}
          >
            <option value="Trial14">14 günlük sınaq</option>
            <option value="Monthly">Aylıq</option>
          </Select>
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
