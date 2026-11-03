import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Coins, LogOut, Plus, Trash2, Users } from 'lucide-react';
import AppShell from '../components/AppShell';
import { AuthContext } from '../context/AuthContext';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, Select, Textarea } from '../components/ui';
import {
  createGroup,
  deleteGroup,
  fetchGroups,
  fetchOwnProfile,
  fetchStudents,
  groupInviteSlug,
  groupsShareName,
  updateOwnProfile,
  DUPLICATE_GROUP_MESSAGE,
} from '../lib/examApi';
import { localDb } from '../lib/localDb';
import { PREFERENCE_OPTIONS, teacherSubjectOf } from '../lib/storageCatalog';
import { errorMessage } from '../lib/utils';
import { groupNeedsApproval } from '../lib/groupApproval';
import { groupSubscriberCount, publishGroupCatalog } from '../lib/groupSubscriptions';
import { useTeacherTokens } from '../lib/tokens';
import TokenPaymentCard from '../components/TokenPaymentCard';
import TeacherSyllabusPanel from '../components/TeacherSyllabusPanel';

function inGroup(student, group) {
  if (!student || !group) return false;
  if (student.groupId != null && String(student.groupId) === String(group.id)) return true;
  const key = String(group.number || group.name || '').trim().toLowerCase();
  const name = String(group.name || '').trim().toLowerCase();
  const studentKey = String(student.groupName || '').trim().toLowerCase();
  return Boolean(key && studentKey && (studentKey === key || studentKey === name));
}

export default function TeacherCabinet() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const tokens = useTeacherTokens(user);
  const [groups, setGroups] = useState([]);
  const [ask, setAsk] = useState(null);
  const askConfirm = (text, note) => new Promise((resolve) => setAsk({ text, note, resolve }));
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [schedule, setSchedule] = useState('');
  const [needsApproval, setNeedsApproval] = useState(true);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    fatherName: '',
    position: '',
    teachingSubject: '',
    phone: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [periodUser, setPeriodUser] = useState(user);
  const [subjectLocked, setSubjectLocked] = useState(true);
  const [subjectDraft, setSubjectDraft] = useState('');
  const canChangeSubject = localDb.canChangeTeacherSubject(user?.id, user?.email);

  const load = async () => {
    setLoading(true);
    try {
      const [groupList, studentList, me] = await Promise.all([
        fetchGroups(),
        fetchStudents().catch(() => []),
        fetchOwnProfile().catch(() => null),
      ]);
      setGroups(groupList);
      setStudents(studentList.filter((s) => s.isAccessEnabled !== false));
      groupList.forEach((g) => {
        publishGroupCatalog({
          id: g.id,
          groupId: g.id,
          name: g.name || g.number,
          number: g.number,
          inviteCode: groupInviteSlug(g),
          teacherId: user?.id,
          teacherName: user?.fullName || user?.email || '',
          teachingSubject: teacherSubjectOf(user) || localDb.getTeacherSubject(user?.id, user?.email) || '',
        });
      });
      if (me) {
        setPeriodUser({ ...user, ...me, role: user?.role || 'Teacher' });
        setDriveFolderUrl(me.driveFolderUrl || '');
        const subject = teacherSubjectOf(me) || localDb.getTeacherSubject(me.id || user?.id, me.email || user?.email) || '';
        setProfile({
          firstName: me.firstName || me.FirstName || '',
          lastName: me.lastName || me.LastName || '',
          fatherName: me.fatherName || me.FatherName || '',
          position: me.position || me.Position || '',
          teachingSubject: subject,
          phone: me.phone || me.Phone || '',
        });
        setSubjectDraft(subject);
        setSubjectLocked(true);
      }
    } catch (err) {
      setError(errorMessage(err, 'Qruplar yüklənmədi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  useEffect(() => {
    if (location.hash !== '#odenis') return;
    const node = document.getElementById('odenis');
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash, loading]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    const payload = {
      name: name.trim(),
      number: number.trim() || name.trim(),
      schedule,
      approvalRequired: needsApproval,
    };
    if (findLocalDuplicate(groups, payload)) {
      setError(DUPLICATE_GROUP_MESSAGE);
      setSaving(false);
      return;
    }
    try {
      const group = await createGroup(payload);
      setGroups((prev) => [group, ...prev.filter((g) => String(g.id) !== String(group.id))]);
      setName('');
      setNumber('');
      setSchedule('');
      setNeedsApproval(true);
      setOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Qrup saxlanılmadı.'));
    } finally {
      setSaving(false);
    }
  };

  const removeGroup = async (group, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (deletingId) return;
    const label = group.number || group.name || 'qrup';
    if (!(await askConfirm(`${label} silinsin?`, 'Tələbələr silinməyəcək, qrup siyahıdan çıxacaq.'))) return;
    setDeletingId(group.id);
    setError('');
    try {
      const next = await deleteGroup(group.id);
      setGroups(next);
    } catch (err) {
      setError(errorMessage(err, 'Qrup silinmədi.'));
    } finally {
      setDeletingId(null);
    }
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
    setError('');
  };

  const requestSubjectChange = async () => {
    if (!canChangeSubject) {
      setError('Fənn artıq bir dəfə dəyişilib. Daha dəyişmək mümkün deyil.');
      return;
    }
    const ok = await askConfirm(
      'Fənni dəyişmək istəyirsiniz?',
      'Fənni yalnız 1 dəfə dəyişə bilərsiniz. Dəyişdikdən sonra Anbar və qruplar yeni fənnə uyğunlaşacaq. Bu şansı istifadə etmək istədiyinizə əminsiniz?',
    );
    if (!ok) return;
    setSubjectDraft(profile.teachingSubject);
    setSubjectLocked(false);
    setProfileMsg('Fənn seçimini dəyişin və «Məlumatı saxla»ya basın. Bu son şansınızdır.');
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (profileSaving) return;
    const nextSubject = (subjectLocked ? profile.teachingSubject : subjectDraft).trim();
    const prevSubject = String(profile.teachingSubject || '').trim();
    const subjectChanged = nextSubject && nextSubject !== prevSubject;
    if (subjectChanged && !canChangeSubject) {
      setError('Fənn dəyişmək hüququnuz bitib.');
      setSubjectLocked(true);
      setSubjectDraft(prevSubject);
      return;
    }
    if (!subjectLocked && !nextSubject) {
      setError('Fənn boş ola bilməz.');
      return;
    }
    setProfileSaving(true);
    setProfileMsg('');
    setError('');
    try {
      await updateOwnProfile({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        fatherName: profile.fatherName.trim(),
        position: profile.position.trim(),
        teachingSubject: nextSubject,
        TeachingSubject: nextSubject,
        phone: profile.phone.trim(),
      });
      localDb.setTeacherSubject(user?.id, nextSubject, user?.email);
      if (subjectChanged) {
        localDb.markTeacherSubjectChangeUsed(user?.id, user?.email);
        setProfileMsg('Fənn dəyişildi. Daha fənn dəyişmək mümkün olmayacaq.');
      } else {
        setProfileMsg('Məlumat saxlanıldı.');
      }
      setProfile((prev) => ({ ...prev, teachingSubject: nextSubject }));
      setSubjectDraft(nextSubject);
      setSubjectLocked(true);
    } catch (err) {
      setError(errorMessage(err, 'Məlumat saxlanılmadı. Konum mütləqdir.'));
    } finally {
      setProfileSaving(false);
    }
  };

  const totalSubscribers = useMemo(
    () => groups.reduce((sum, g) => sum + groupSubscriberCount({
      id: g.id,
      groupId: g.id,
      name: g.name || g.number,
      inviteCode: groupInviteSlug(g),
      teacherId: user?.id,
    }), 0),
    [groups, user?.id],
  );

  const initial = String(user?.fullName || user?.email || 'M').trim().charAt(0).toUpperCase();

  return (
    <AppShell title="Müəllim kabineti">
      <ConfirmDialog
        open={Boolean(ask)}
        text={ask?.text}
        note={ask?.note}
        onCancel={() => { ask?.resolve(false); setAsk(null); }}
        onConfirm={() => { ask?.resolve(true); setAsk(null); }}
      />

      <div className="mb-6 overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--card)]">
        <div className="flex items-center gap-4 bg-[linear-gradient(135deg,#2f7a45,#1f5c34)] px-5 py-5 text-white">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/20 text-xl font-extrabold">{initial}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold">{user?.fullName || user?.email}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <Coins size={15} /> Jeton: {tokens.unlimited ? '∞' : tokens.balance}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Bell size={15} /> Abunə: {totalSubscribers}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users size={15} /> Qrup: {groups.length}
              </span>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[var(--line)] text-center">
          <div className="px-3 py-3">
            <p className="text-xs font-semibold text-[var(--muted)]">Jeton</p>
            <p className="mt-1 text-lg font-extrabold text-[var(--text)]">{tokens.unlimited ? '∞' : tokens.balance}</p>
          </div>
          <div className="px-3 py-3">
            <p className="text-xs font-semibold text-[var(--muted)]">Abunəçilər</p>
            <p className="mt-1 text-lg font-extrabold text-[var(--text)]">{totalSubscribers}</p>
          </div>
          <div className="px-3 py-3">
            <p className="text-xs font-semibold text-[var(--muted)]">Qruplar</p>
            <p className="mt-1 text-lg font-extrabold text-[var(--text)]">{groups.length}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Button
          variant="secondary"
          onClick={() => {
            logout();
            navigate(user?.practice ? '/' : '/login');
          }}
        >
          <LogOut size={16} /> Hesabdan çıx
        </Button>
      </div>
      <TokenPaymentCard user={periodUser || user} />
      <TeacherSyllabusPanel />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-[var(--muted)]">Ümumi abunə: {totalSubscribers}</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">Qruplar və tələbələr</p>
        </div>
        <Button onClick={() => { setError(''); setOpen(true); }}>
          <Plus size={16} /> Qrup yarat
        </Button>
      </div>

      <Card className="mb-8">
        <h2 className="text-lg font-bold">Şəxsi məlumatlar</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Konum (yer) hesabınızda qeyd olunmalıdır.</p>
        {driveFolderUrl ? (
          <p className="mt-3 text-sm text-gray-800 dark:text-gray-200">
            Drive qovluğu:{' '}
            <a className="font-medium text-brand-700 underline dark:text-brand-300" href={driveFolderUrl} target="_blank" rel="noreferrer">
              qovluğu aç
            </a>
          </p>
        ) : null}
        <form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Ad" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} required />
          <Input label="Soyad" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} required />
          <Input label="Konum" value={profile.position} onChange={(e) => setProfile({ ...profile, position: e.target.value })} required placeholder="məs. Bakı, Nəsimi" />
          <div className="space-y-2">
            {subjectLocked ? (
              <>
                <Input label="Fənn (qeydiyyatdan)" value={profile.teachingSubject || '—'} readOnly />
                <p className="text-xs font-semibold text-[var(--muted)]">
                  {canChangeSubject
                    ? 'Fənn qeydiyyatda seçilib. Dəyişmək üçün yalnız 1 şansınız var.'
                    : 'Fənn artıq bir dəfə dəyişilib — daha dəyişmək olmur.'}
                </p>
                {canChangeSubject ? (
                  <Button type="button" variant="secondary" onClick={requestSubjectChange}>
                    Fənni dəyiş (1 şans)
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <Select
                  label="Yeni fənn"
                  value={subjectDraft}
                  onChange={(e) => setSubjectDraft(e.target.value)}
                  required
                >
                  <option value="">Fənni seçin</option>
                  {PREFERENCE_OPTIONS.subjects.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </Select>
                <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
                  Xəbərdarlıq: bu dəyişiklik sonuncu şansınızdır. Saxladıqdan sonra fənn kilidlənəcək.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSubjectDraft(profile.teachingSubject);
                    setSubjectLocked(true);
                    setProfileMsg('');
                  }}
                >
                  Ləğv et
                </Button>
              </>
            )}
          </div>
          <Input label="Əlaqə nömrəsi" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <div className="flex items-end gap-3">
            <Button type="submit" disabled={profileSaving}>{profileSaving ? 'Saxlanılır...' : 'Məlumatı saxla'}</Button>
            {profileMsg && <p className="pb-2 text-sm text-emerald-600">{profileMsg}</p>}
          </div>
        </form>
      </Card>

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
            const subs = groupSubscriberCount({
              id: g.id,
              groupId: g.id,
              name: g.name || g.number,
              inviteCode: groupInviteSlug(g),
              teacherId: user?.id,
            });
            return (
              <Card key={g.id} onClick={() => navigate(`/teacher/groups/${g.id}`)}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold">{g.number || g.name}</h3>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge>{count} tələbə</Badge>
                    <Badge tone="brand">{subs} abunə</Badge>
                    <Badge tone={groupNeedsApproval(g) ? 'warning' : 'success'}>
                      {groupNeedsApproval(g) ? 'İcazə lazımdır' : 'İcazə lazım deyil'}
                    </Badge>
                    <Button
                      variant="ghost"
                      className="px-2 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      disabled={deletingId === g.id}
                      onClick={(e) => removeGroup(g, e)}
                    >
                      <Trash2 size={16} /> Sil
                    </Button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--muted)]">
                  {g.schedule || 'Dərs cədvəli əlavə edilməyib'}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} title="Yeni qrup" onClose={closeModal}>
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
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Şagird qeydiyyatı</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setNeedsApproval(true)}
                className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
                  needsApproval
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100'
                }`}
              >
                İcazəm lazımdır
              </button>
              <button
                type="button"
                onClick={() => setNeedsApproval(false)}
                className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
                  needsApproval
                    ? 'border-gray-300 bg-white text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100'
                    : 'border-brand-600 bg-brand-600 text-white'
                }`}
              >
                İcazə lazım deyil
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {needsApproval
                ? 'Şagird qeydiyyatdan sonra «Yeni şagirdlər»də siz «Giriş ver» basandan sonra daxil olur.'
                : 'Ümumi qrup kimi: şagird qeydiyyatdan sonra icazə gözləmədən daxil ola bilər.'}
            </p>
          </div>
          {error && <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={saving} onClick={closeModal}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saxlanılır...' : 'Yarat'}</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

function findLocalDuplicate(groups, payload) {
  return groups.some((g) => groupsShareName(g, payload));
}
