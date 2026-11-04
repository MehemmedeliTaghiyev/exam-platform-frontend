import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import { Button, Input, Modal, Select, Textarea } from '../components/ui';
import API from '../api/axios';
import { Ban, Calendar, ChevronDown, Plus, Search } from 'lucide-react';
import { createTeacherAccount, setStudentAccess, updateTeacherTrial } from '../lib/examApi';
import { isPractice, practiceAdminTeachers } from '../lib/practice';
import { displayTrialMessage, driveFolderOpenUrl, teacherDriveFolderUrl } from '../lib/driveLinks';
import { createTeacherDriveFolder, teacherFolderName } from '../lib/teacherDrive';
import { localDb } from '../lib/localDb';
import {
  computeAccessEnd,
  errorMessage,
  formatDateTime,
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

function initials(teacher) {
  const first = String(teacher.firstName || teacher.fullName || 'M').trim()[0] || 'M';
  return first.toUpperCase();
}

function displayName(teacher) {
  const name = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim();
  return name || teacher.fullName || 'Müəllim';
}

function Chip({ tone = 'neutral', children }) {
  const cls = tone === 'ok'
    ? 'bg-[#1f6a3a]/25 text-[#7dffa8]'
    : tone === 'warn'
      ? 'bg-[#7c6aff]/20 text-[#b4abff]'
      : tone === 'bad'
        ? 'bg-[#e11d48]/18 text-[#ff8aa0]'
        : 'bg-white/8 text-white/55';
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${cls}`}>{children}</span>;
}

function TeacherPlanFields({ teacher, onSaved, onError }) {
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
      const days = plan === 'Monthly' ? 30 : Math.max(1, Number(trialDays) || 20);
      const trialEndsAt = computeAccessEnd(trialStartsAt, plan, days);
      const patch = { billingPlan: plan === 'Monthly' ? 'Monthly' : 'Trial14', trialDays: days, trialStartsAt, trialEndsAt };
      if (isPractice()) {
        onSaved({ ...teacher, ...patch });
        return;
      }
      const updated = await updateTeacherTrial(teacher.id, {
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        phone: teacher.phone,
        trialStartsAt,
        trialEndsAt,
        billingPlan: patch.billingPlan,
        trialDays: days,
        trialMessage: teacher.trialMessage,
        driveFolderUrl: teacher.driveFolderUrl,
      });
      onSaved({ ...teacher, ...updated, ...patch });
    } catch (err) {
      onError(errorMessage(err, 'Müddət saxlanılmadı.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-white/35">İstifadə müddəti</p>
      <label className="block text-xs font-bold text-white/40">
        Növ
        <select
          className="mt-1 h-12 w-full rounded-2xl bg-[#12141a] px-3 text-sm font-extrabold text-white outline-none ring-1 ring-white/10"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
        >
          <option value="FreeTrial">Free-trial</option>
          <option value="Monthly">Aylıq (30 gün)</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-bold text-white/40">
          Başlanğıc
          <span className="relative mt-1 block">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-12 w-full rounded-2xl bg-[#12141a] px-3 pr-8 text-sm font-extrabold text-white outline-none ring-1 ring-white/10"
            />
            <Calendar size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
          </span>
        </label>
        {plan === 'FreeTrial' ? (
          <label className="text-xs font-bold text-white/40">
            Müddət (gün)
            <input
              type="number"
              min={1}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="mt-1 h-12 w-full rounded-2xl bg-[#12141a] px-3 text-sm font-extrabold text-white outline-none ring-1 ring-white/10"
            />
          </label>
        ) : (
          <label className="text-xs font-bold text-white/40">
            Müddət
            <p className="mt-1 grid h-12 place-items-center rounded-2xl bg-[#12141a] text-sm font-extrabold ring-1 ring-white/10">30 gün</p>
          </label>
        )}
      </div>
      <div className="flex items-center justify-between text-xs font-extrabold">
        <span className="text-[#7dffa8]">{left.text}</span>
        <span className="text-white/30">{formatDateTime(previewEnd)}</span>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#7c6aff] text-sm font-extrabold disabled:opacity-50"
      >
        {saving ? 'Saxlanılır...' : 'Saxla'}
      </button>
    </div>
  );
}

function DriveFolderFields({ teacher, onSaved, onError }) {
  const [url, setUrl] = useState(teacher.driveFolderUrl || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUrl(teacher.driveFolderUrl || '');
  }, [teacher.id, teacher.driveFolderUrl]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    onError('');
    try {
      const folder = driveFolderOpenUrl(url);
      if (isPractice()) {
        onSaved({ ...teacher, driveFolderUrl: folder });
        return;
      }
      await updateTeacherTrial(teacher.id, {
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        phone: teacher.phone,
        trialStartsAt: teacher.trialStartsAt,
        trialEndsAt: teacher.trialEndsAt,
        billingPlan: teacher.billingPlan,
        trialDays: teacher.trialDays,
        trialMessage: teacher.trialMessage,
        driveFolderUrl: folder,
      });
      localDb.setTeacherDriveFolder(teacher.id, folder);
      onSaved({ ...teacher, driveFolderUrl: folder });
    } catch (err) {
      onError(errorMessage(err, 'Qovluq linki saxlanılmadı.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-white/35">Drive qovluğu</p>
      <p className="text-xs font-bold text-white/40">Drive qovluğunun linki</p>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://drive.google.com/drive/folders/..."
        className="h-12 w-full rounded-2xl bg-[#12141a] px-3 text-sm font-semibold text-white outline-none ring-1 ring-white/10 placeholder:text-white/25"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setUrl('')}
          className="min-h-12 rounded-full bg-white/[0.06] text-sm font-extrabold"
        >
          Təmizlə
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="min-h-12 rounded-full bg-[#5b4fd6] text-sm font-extrabold disabled:opacity-50"
        >
          {saving ? '...' : 'Saxla'}
        </button>
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
  driveFolderUrl: '',
};

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [sortDir, setSortDir] = useState('desc');
  const [nameQuery, setNameQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [pendingBan, setPendingBan] = useState(null);

  const patchTeacher = (updated) => {
    setTeachers((prev) => prev.map((row) => (String(row.id) === String(updated.id) ? { ...row, ...updated } : row)));
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      if (isPractice()) {
        setTeachers(practiceAdminTeachers());
        setLoading(false);
        return;
      }
      const res = await API.get('/Users', { params: { role: 'Teacher', includeDeleted: false } });
      const list = unwrapList(res.data).map((t) => ({
        ...t,
        driveFolderUrl: teacherDriveFolderUrl(t) || localDb.getTeacherDriveFolder(t.id),
        trialMessage: displayTrialMessage(t.trialMessage || t.TrialMessage),
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
    const q = nameQuery.trim().toLowerCase();
    const list = teachers.filter((t) => {
      if (!q) return true;
      const name = `${t.fullName || ''} ${t.firstName || ''} ${t.lastName || ''} ${t.email || ''}`.toLowerCase();
      return name.includes(q);
    });
    list.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime() || 0;
      const tb = new Date(b.createdAt).getTime() || 0;
      return sortDir === 'desc' ? tb - ta : ta - tb;
    });
    return list;
  }, [teachers, sortDir, nameQuery]);

  const openCreate = () => {
    setForm({ ...emptyForm, startDate: todayInput() });
    setEdit(null);
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
      let driveFolderUrl = form.driveFolderUrl.trim();
      let driveNote = '';
      if (!driveFolderUrl && !isPractice()) {
        try {
          const folder = await createTeacherDriveFolder(teacherFolderName(form));
          driveFolderUrl = folder?.url || '';
        } catch (err) {
          driveNote = errorMessage(err, 'Drive qovluğu yaranmadı. Hesab saxlanıldı.');
        }
      }
      if (isPractice()) {
        const row = {
          id: edit?.id || `practice-teacher-${Date.now()}`,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          trialStartsAt,
          trialEndsAt,
          billingPlan,
          trialDays: days,
          trialMessage: form.trialMessage,
          aiEnabled: form.aiEnabled === true,
          driveFolderUrl,
          isAccessEnabled: true,
          createdAt: edit?.createdAt || new Date().toISOString(),
          role: 'Teacher',
        };
        setTeachers((prev) => (edit ? prev.map((item) => (String(item.id) === String(edit.id) ? { ...item, ...row } : item)) : [row, ...prev]));
        setOpen(false);
        return;
      }
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
          driveFolderUrl,
        });
        localDb.setTeacherAi(edit.id, form.aiEnabled === true);
        localDb.setTeacherDriveFolder(edit.id, driveFolderUrl);
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
          driveFolderUrl,
        });
        if (created?.id) {
          localDb.setTeacherAi(created.id, form.aiEnabled === true);
          localDb.setTeacherDriveFolder(created.id, driveFolderUrl);
        }
      }
      setOpen(false);
      if (driveNote) setError(driveNote);
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
    const enabled = (t.isAccessEnabled ?? t.IsAccessEnabled) !== false;
    try {
      if (isPractice()) {
        patchTeacher({ ...t, isAccessEnabled: !enabled });
        return;
      }
      await setStudentAccess(t.id, !enabled);
      localDb.setTeacherSidelined(t.id, enabled);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Müəllim statusu dəyişmədi.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell title="Müəllim qeydiyyatı">
      {pendingBan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/55" aria-label="Ləğv et" onClick={() => setPendingBan(null)} />
          <div className="relative w-full max-w-sm rounded-[28px] bg-[#171a22] p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.08]">
            <h3 className="text-xl font-black">Müəllimi kənarlaşdırırsınız?</h3>
            <p className="mt-3 text-sm font-semibold leading-snug text-white/70">
              <span className="font-extrabold text-white">{displayName(pendingBan)}</span> hesaba daxil ola bilməyəcək.
              Drive qovluğu və istifadə müddəti qalır.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPendingBan(null)} className="min-h-12 rounded-full bg-white/[0.08] text-sm font-extrabold">
                Ləğv et
              </button>
              <button
                type="button"
                onClick={() => {
                  const row = pendingBan;
                  setPendingBan(null);
                  if (row) toggleAccess(row);
                }}
                className="min-h-12 rounded-full bg-[#e11d48] text-sm font-extrabold"
              >
                Kənarlaşdır
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4 pb-24">
        <p className="rounded-[22px] bg-[#171a22] px-4 py-3 text-sm font-semibold leading-snug text-white/55 ring-1 ring-white/[0.06]">
          Qeydiyyat avtomatik açılır. İstəmədiyiniz müəllimi kənarlaşdıra bilərsiniz — o zaman hesab daxil ola bilməz. Drive qovluğu və istifadə müddəti burada qalır.
        </p>

        <label className="flex min-h-12 items-center gap-2 rounded-full bg-[#171a22] px-4 ring-1 ring-white/[0.06]">
          <Search size={16} className="text-white/35" />
          <input
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Müəllimin adı"
            className="h-11 w-full bg-transparent text-sm font-semibold outline-none placeholder:text-white/35"
          />
        </label>

        <div className="flex rounded-full bg-[#171a22] p-1 ring-1 ring-white/[0.06]">
          <button
            type="button"
            onClick={() => setSortDir('desc')}
            className={`min-h-10 flex-1 rounded-full text-sm font-extrabold ${sortDir === 'desc' ? 'bg-[#7c6aff] text-white' : 'text-white/40'}`}
          >
            Yeni → köhnə
          </button>
          <button
            type="button"
            onClick={() => setSortDir('asc')}
            className={`min-h-10 flex-1 rounded-full text-sm font-extrabold ${sortDir === 'asc' ? 'bg-[#7c6aff] text-white' : 'text-white/40'}`}
          >
            Köhnə → yeni
          </button>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#7c6aff] text-sm font-extrabold"
        >
          <Plus size={16} /> Müəllim qeydə al
        </button>

        {error && !open ? <p className="text-sm font-semibold text-[#ff8aa0]">{error}</p> : null}

        <div className="flex items-end justify-between">
          <p className="text-sm font-extrabold">Müəllimlər</p>
          <p className="text-sm font-semibold text-white/40">{sorted.length} nəfər</p>
        </div>

        {loading ? <p className="text-sm text-white/40">Yüklənir...</p> : null}
        {!loading && !sorted.length ? (
          <p className="rounded-[24px] bg-[#171a22] px-4 py-8 text-center text-sm font-semibold text-white/40">Müəllim yoxdur.</p>
        ) : null}

        <ul className="space-y-3">
          {sorted.map((t) => {
            const accessOn = (t.isAccessEnabled ?? t.IsAccessEnabled) !== false;
            const plan = teacherPlanOf(t);
            const end = endsFor(t, toDateInput(t.trialStartsAt || t.createdAt), plan, teacherTrialDaysOf(t));
            const left = remainingUsageLabel(t.trialEndsAt || end);
            const openCard = String(expandedId) === String(t.id);
            const shortLeft = left.days != null && left.days > 0 ? `${left.days} gün qalıb` : left.text;
            return (
              <li key={t.id} className="overflow-hidden rounded-[26px] bg-[#171a22] p-4 ring-1 ring-white/[0.06]">
                <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => setExpandedId(openCard ? null : t.id)}>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#7c6aff] text-lg font-black">
                    {initials(t)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-black">{displayName(t)}</p>
                    <p className="text-sm font-semibold text-white/40">Nömrə: {t.phone || '—'}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {accessOn ? <Chip tone="ok">Aktiv</Chip> : <Chip tone="bad">Kənarlaşdırılıb</Chip>}
                      <Chip tone="warn">{plan === 'Monthly' ? 'Aylıq' : 'Free-trial'}</Chip>
                      {accessOn ? <Chip tone="ok">{shortLeft}</Chip> : null}
                    </div>
                  </div>
                  <ChevronDown size={18} className={`mt-1 text-white/35 transition ${openCard ? 'rotate-180' : ''}`} />
                </button>

                {openCard ? (
                  <div className="mt-4 space-y-4 border-t border-white/[0.06] pt-4">
                    <TeacherPlanFields teacher={t} onError={setError} onSaved={patchTeacher} />
                    <DriveFolderFields teacher={t} onError={setError} onSaved={patchTeacher} />
                    {accessOn ? (
                      <button
                        type="button"
                        disabled={busyId === t.id}
                        onClick={() => setPendingBan(t)}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full ring-1 ring-[#e11d48]/50 text-sm font-extrabold text-[#ff8aa0]"
                      >
                        <Ban size={16} /> Kənarlaşdır
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === t.id}
                        onClick={() => toggleAccess(t)}
                        className="min-h-12 w-full rounded-full bg-[#7c6aff] text-sm font-extrabold"
                      >
                        Bərpa et
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setExpandedId(t.id)} className="min-h-11 rounded-full bg-white/[0.06] text-sm font-extrabold">
                      Düzəliş
                    </button>
                    {accessOn ? (
                      <button
                        type="button"
                        onClick={() => setPendingBan(t)}
                        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full ring-1 ring-[#e11d48]/50 text-sm font-extrabold text-[#ff8aa0]"
                      >
                        <Ban size={14} /> Kənarlaşdır
                      </button>
                    ) : (
                      <button type="button" onClick={() => toggleAccess(t)} className="min-h-11 rounded-full bg-[#7c6aff] text-sm font-extrabold">
                        Bərpa et
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

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
          <Input label="Başlanğıc tarixi" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Select label="İstifadə növü" value={form.billingPlan} onChange={(e) => setForm({ ...form, billingPlan: e.target.value })}>
            <option value="FreeTrial">Free-trial</option>
            <option value="Monthly">Aylıq (30 gün)</option>
          </Select>
          {form.billingPlan !== 'Monthly' && (
            <Input label="Free-trial gün sayı" type="number" min={1} max={365} required value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} />
          )}
          <div className="sm:col-span-2">
            <Input
              label="Google Drive qovluq linki"
              value={form.driveFolderUrl}
              onChange={(e) => setForm({ ...form, driveFolderUrl: e.target.value })}
              placeholder="https://drive.google.com/drive/folders/..."
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Vaxt bitəndə gələcək mesaj" rows={4} value={form.trialMessage} onChange={(e) => setForm({ ...form, trialMessage: e.target.value })} />
          </div>
          {error && <p className="sm:col-span-2 text-sm text-[#ff8aa0]">{error}</p>}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button variant="secondary" disabled={saving} onClick={() => setOpen(false)}>Ləğv et</Button>
            <Button type="submit" disabled={saving} className="!bg-[#7c6aff] !bg-none">{saving ? 'Saxlanılır...' : 'Saxla'}</Button>
          </div>
        </form>
      </Modal>

    </AppShell>
  );
}
