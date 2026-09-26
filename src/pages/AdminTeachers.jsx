import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import { Badge, Button, Card, EmptyState, Input, Modal, Select, Textarea } from '../components/ui';
import API from '../api/axios';
import { Ban, CheckCircle2, Sparkles } from 'lucide-react';
import { createTeacherAccount, setTeacherAiEnabled, setStudentAccess, updateTeacherTrial } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import { AI_FEATURES, eventsFromTeacher, filterEventsByRange, groupUsageByDate, totalsByFeature } from '../lib/aiUsage';
import {
  computeAccessEnd,
  errorMessage,
  formatDate,
  formatDateTime,
  isAiEnabled,
  remainingUsageLabel,
  teacherPlanOf,
  teacherTrialDaysOf,
  toDateInput,
  unwrapList,
} from '../lib/utils';

function todayInput() {
  return toDateInput(new Date());
}

function endsFor(teacher, startDate, plan, days) {
  return computeAccessEnd(startDate || teacher.trialStartsAt || teacher.createdAt, plan, days)
    || teacher.trialEndsAt
    || teacher.TrialEndsAt;
}

function TeacherPlanCell({ teacher, onSaved, onError }) {
  const [startDate, setStartDate] = useState(toDateInput(teacher.trialStartsAt || teacher.createdAt) || todayInput());
  const [plan, setPlan] = useState(teacherPlanOf(teacher));
  const [trialDays, setTrialDays] = useState(teacherTrialDaysOf(teacher));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStartDate(toDateInput(teacher.trialStartsAt || teacher.createdAt) || todayInput());
    setPlan(teacherPlanOf(teacher));
    setTrialDays(teacherTrialDaysOf(teacher));
  }, [teacher.id, teacher.trialStartsAt, teacher.createdAt, teacher.billingPlan, teacher.trialDays]);

  const previewEnd = useMemo(
    () => endsFor(teacher, startDate, plan, trialDays),
    [teacher, startDate, plan, trialDays],
  );
  const left = remainingUsageLabel(previewEnd);

  const save = async () => {
    if (!startDate || saving) return;
    setSaving(true);
    onError('');
    try {
      const trialStartsAt = new Date(`${startDate}T12:00:00`).toISOString();
      const days = plan === 'Monthly' ? 30 : Math.max(1, Number(trialDays) || 14);
      const trialEndsAt = computeAccessEnd(trialStartsAt, plan, days);
      const updated = await updateTeacherTrial(teacher.id, {
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        phone: teacher.phone,
        trialStartsAt,
        trialEndsAt,
        billingPlan: plan === 'Monthly' ? 'Monthly' : 'Trial14',
        trialDays: days,
      });
      onSaved({ ...teacher, ...updated, billingPlan: plan === 'Monthly' ? 'Monthly' : 'Trial14', trialDays: days, trialStartsAt, trialEndsAt });
    } catch (err) {
      onError(errorMessage(err, 'Müddət saxlanılmadı.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-w-[260px] flex-col gap-2">
      <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
        <option value="FreeTrial">Free-trial</option>
        <option value="Monthly">Aylıq (30 gün)</option>
      </Select>
      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      {plan === 'FreeTrial' && (
        <Input
          type="number"
          min={1}
          max={365}
          value={trialDays}
          onChange={(e) => setTrialDays(e.target.value)}
          placeholder="gün sayı"
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs ${left.className}`}>{left.text}</span>
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
  billingPlan: 'FreeTrial',
  trialDays: 14,
  trialMessage: 'Free trial bitdi.',
  aiEnabled: false,
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
  const [usageFrom, setUsageFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return toDateInput(d);
  });
  const [usageTo, setUsageTo] = useState(() => toDateInput(new Date()));
  const [usageTeacher, setUsageTeacher] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/Users', { params: { role: 'Teacher', includeDeleted: false } });
      const list = unwrapList(res.data).map((t) => ({
        ...t,
        aiEnabled: isAiEnabled(t) || localDb.getTeacherAi(t.id),
      }));
      setTeachers(list);
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
    setForm({ ...emptyForm, startDate: todayInput() });
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
      billingPlan: teacherPlanOf(t),
      trialDays: teacherTrialDaysOf(t),
      trialMessage: t.trialMessage || 'Free trial bitdi.',
      aiEnabled: isAiEnabled(t) || localDb.getTeacherAi(t.id),
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
      const plan = form.billingPlan === 'Monthly' ? 'Monthly' : 'FreeTrial';
      const days = plan === 'Monthly' ? 30 : Math.max(1, Number(form.trialDays) || 14);
      const trialEndsAt = computeAccessEnd(trialStartsAt, plan, days);
      const billingPlan = plan === 'Monthly' ? 'Monthly' : 'Trial14';
      if (edit) {
        await updateTeacherTrial(edit.id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          trialStartsAt,
          trialEndsAt,
          billingPlan,
          trialDays: days,
          trialMessage: form.trialMessage,
          aiEnabled: form.aiEnabled === true,
        });
        localDb.setTeacherAi(edit.id, form.aiEnabled === true);
      } else {
        const created = await createTeacherAccount({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          userName: form.userName.trim(),
          password: form.password,
          trialStartsAt,
          trialEndsAt,
          billingPlan,
          trialDays: days,
          trialMessage: form.trialMessage,
          aiEnabled: form.aiEnabled === true,
        });
        if (created?.id) localDb.setTeacherAi(created.id, form.aiEnabled === true);
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

  const toggleAi = async (t) => {
    if (!t.id || busyId) return;
    setBusyId(`ai-${t.id}`);
    setError('');
    const next = !(isAiEnabled(t) || localDb.getTeacherAi(t.id));
    try {
      await setTeacherAiEnabled(t.id, next);
      setTeachers((prev) => prev.map((row) => (String(row.id) === String(t.id) ? { ...row, aiEnabled: next, AiEnabled: next } : row)));
    } catch (err) {
      setError(errorMessage(err, 'AI statusu dəyişmədi.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell title="Müəllim qeydiyyatı">
      <p className="mb-6 text-sm text-gray-500">
        Hər sətirdə əvvəl pəncərə, sonra istifadə müddəti (free-trial günü siz yazırsınız; aylıq həmişə 30 gündür),
        yanında AI düyməsi. AI açıq olan müəllim kabinetində avtomatik imtahan və PDF-dən sual çıxara bilir.
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
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <Input label="AI istifadə (başlanğıc)" type="date" value={usageFrom} onChange={(e) => setUsageFrom(e.target.value)} />
        <Input label="AI istifadə (son)" type="date" value={usageTo} onChange={(e) => setUsageTo(e.target.value)} />
        <p className="pb-2 text-xs text-gray-500">Saylar seçilən tarix aralığına görədir.</p>
      </div>
      {error && !open && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Yüklənir...</p>
      ) : sorted.length === 0 ? (
        <EmptyState title="Müəllim yoxdur" text="Qeydiyyat üçün düyməni basın." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[1320px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
                <th className="px-5 py-3 font-medium">Ad</th>
                <th className="px-5 py-3 font-medium">Soyad</th>
                <th className="px-5 py-3 font-medium">Nömrə</th>
                <th className="px-5 py-3 font-medium">Pəncərə</th>
                <th className="px-5 py-3 font-medium">İstifadə müddəti</th>
                <th className="px-5 py-3 font-medium">AI</th>
                <th className="px-5 py-3 font-medium">AI istifadəsi (tarixə görə)</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => {
                const accessOn = (t.isAccessEnabled ?? t.IsAccessEnabled) !== false;
                const aiOn = isAiEnabled(t) || localDb.getTeacherAi(t.id);
                const plan = teacherPlanOf(t);
                const end = endsFor(t, toDateInput(t.trialStartsAt || t.createdAt), plan, teacherTrialDaysOf(t));
                const left = remainingUsageLabel(t.trialEndsAt || end);
                const events = filterEventsByRange(eventsFromTeacher(t), usageFrom, usageTo);
                const totals = totalsByFeature(events);
                return (
                  <tr key={t.id} className="border-b border-gray-100 align-top last:border-0 dark:border-slate-800">
                    <td className="px-5 py-3 font-medium">{t.firstName || t.fullName?.split(' ')[0] || '—'}</td>
                    <td className="px-5 py-3 font-medium">{t.lastName || '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{t.phone || '—'}</td>
                    <td className="px-5 py-3">
                      <Button
                        variant={accessOn ? 'danger' : 'success'}
                        disabled={busyId === t.id}
                        onClick={() => toggleAccess(t)}
                      >
                        {accessOn ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                        {accessOn ? 'Bağla' : 'Aç'}
                      </Button>
                    </td>
                    <td className="px-5 py-3">
                      <TeacherPlanCell
                        teacher={t}
                        onError={setError}
                        onSaved={(updated) => {
                          setTeachers((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
                        }}
                      />
                      <p className="mt-1 text-xs text-gray-400">{formatDateTime(t.createdAt)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Button
                        variant={aiOn ? 'success' : 'secondary'}
                        disabled={busyId === `ai-${t.id}`}
                        onClick={() => toggleAi(t)}
                      >
                        <Sparkles size={14} />
                        {aiOn ? 'AI aktiv' : 'AI yoxdur'}
                      </Button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="min-w-[180px] space-y-1 text-xs">
                        {AI_FEATURES.map((f) => (
                          <p key={f.key} className="flex justify-between gap-3">
                            <span className="text-gray-500">{f.label}</span>
                            <span className="font-bold tabular-nums">{totals[f.key] || 0}</span>
                          </p>
                        ))}
                        <Button variant="secondary" className="mt-2 w-full py-1.5 text-xs" onClick={() => setUsageTeacher(t)}>
                          Günbəgün
                        </Button>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <span className={left.className}>{left.text}</span>
                        {t.trialNotifiedAt ? (
                          <Badge>Mail göndərilib</Badge>
                        ) : (t.trialEndsAt || end) && new Date(t.trialEndsAt || end).getTime() <= Date.now() ? (
                          <Badge tone="danger">Vaxt bitib</Badge>
                        ) : (
                          <Badge tone="success">{plan === 'Monthly' ? 'Aylıq' : 'Free-trial'}</Badge>
                        )}
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

      <Modal open={open} title={edit ? 'Müəllim məlumatı' : 'Yeni müəllim'} onClose={() => !saving && setOpen(false)} className="max-w-2xl">
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
            label="İstifadə növü"
            value={form.billingPlan}
            onChange={(e) => setForm({ ...form, billingPlan: e.target.value })}
          >
            <option value="FreeTrial">Free-trial</option>
            <option value="Monthly">Aylıq (30 gün)</option>
          </Select>
          {form.billingPlan !== 'Monthly' && (
            <Input
              label="Free-trial gün sayı"
              type="number"
              min={1}
              max={365}
              required
              value={form.trialDays}
              onChange={(e) => setForm({ ...form, trialDays: e.target.value })}
            />
          )}
          <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-3 text-sm dark:border-slate-700">
            <input
              type="checkbox"
              checked={form.aiEnabled === true}
              onChange={(e) => setForm({ ...form, aiEnabled: e.target.checked })}
            />
            <span>
              <span className="font-medium">AI aktiv</span>
              <span className="mt-0.5 block text-gray-500">Kabinetdə avtomatik imtahan və PDF oxuma</span>
            </span>
          </label>
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

      <Modal
        open={Boolean(usageTeacher)}
        title={usageTeacher ? `AI istifadəsi · ${usageTeacher.firstName || ''} ${usageTeacher.lastName || ''}`.trim() : 'AI istifadəsi'}
        onClose={() => setUsageTeacher(null)}
        className="max-w-2xl"
      >
        {usageTeacher && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              {formatDate(usageFrom)} — {formatDate(usageTo)}
            </p>
            {(() => {
              const days = groupUsageByDate(filterEventsByRange(eventsFromTeacher(usageTeacher), usageFrom, usageTo));
              if (!days.length) {
                return <p className="text-sm text-gray-400">Bu tarix aralığında istifadə yoxdur.</p>;
              }
              return days.map((row) => (
                <div key={row.day} className="rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-700">
                  <p className="mb-2 font-bold">{formatDate(row.day)}</p>
                  <div className="space-y-1 text-sm">
                    {AI_FEATURES.map((f) => (
                      <p key={f.key} className="flex justify-between">
                        <span className="text-gray-500">{f.label}</span>
                        <span className="font-semibold tabular-nums">{row.counts[f.key] || 0}</span>
                      </p>
                    ))}
                    <p className="flex justify-between border-t border-gray-100 pt-1 dark:border-slate-800">
                      <span>Cəmi</span>
                      <span className="font-bold tabular-nums">{row.total}</span>
                    </p>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
