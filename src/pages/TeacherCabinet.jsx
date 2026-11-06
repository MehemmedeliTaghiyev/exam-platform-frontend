import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Club, Lock, LogOut, Moon, Plus, Trash2, UserPlus } from 'lucide-react';
import AppShell from '../components/AppShell';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LanguageSwitch, useLocale } from '../context/LocaleContext';
import { Button, ConfirmDialog, Input, Modal, Select, Textarea } from '../components/ui';
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
  const { dark, toggle } = useTheme();
  const { t } = useLocale();
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
  const [tab, setTab] = useState(location.hash === '#odenis' ? 'profile' : 'groups');
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
    setTab('profile');
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

      <div className="desk-page space-y-4 text-white">
      <section className="rounded-[28px] bg-[#171a22] p-4 ring-1 ring-white/[0.06] min-[768px]:flex min-[768px]:items-center min-[768px]:justify-between min-[768px]:gap-6 min-[768px]:p-6">
        <div className="flex items-center gap-3 min-[768px]:min-w-0">
          <span className="grid h-14 w-14 place-items-center rounded-full text-lg font-black text-[#9d93ff] ring-2 ring-[#7c6aff] min-[768px]:h-16 min-[768px]:w-16 min-[768px]:text-xl">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-black min-[768px]:text-2xl">{user?.fullName || user?.email}</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-white/45">
              {[profile.teachingSubject, profile.position].filter(Boolean).join(' · ') || 'Müəllim'}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/[0.08] rounded-[18px] bg-[#12141a] py-3 text-center min-[768px]:mt-0 min-[768px]:min-w-[320px] min-[768px]:max-w-md min-[768px]:flex-1">
          <div className="px-2">
            <p className="text-[11px] font-semibold text-white/40">Jeton</p>
            <p className="mt-1 inline-flex items-center gap-1 text-lg font-black tabular-nums text-[#f0b429]">
              <Club size={14} fill="currentColor" /> {tokens.unlimited ? '∞' : tokens.balance}
            </p>
          </div>
          <div className="px-2">
            <p className="text-[11px] font-semibold text-white/40">Abunəçilər</p>
            <p className="mt-1 text-lg font-black tabular-nums">{totalSubscribers}</p>
          </div>
          <div className="px-2">
            <p className="text-[11px] font-semibold text-white/40">Qruplar</p>
            <p className="mt-1 text-lg font-black tabular-nums">{groups.length}</p>
          </div>
        </div>
      </section>

      <div className="desk-tabs flex rounded-full bg-[#171a22] p-1 ring-1 ring-white/[0.06]">
        {[
          ['syllabus', 'Sillabus'],
          ['groups', 'Qruplar'],
          ['profile', 'Məlumatlar'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`min-h-11 flex-1 rounded-full px-2 text-sm font-extrabold ${
              tab === id ? 'bg-[#7c6aff] text-white' : 'text-white/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'syllabus' ? <TeacherSyllabusPanel /> : null}

      {tab === 'groups' ? (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Qruplar və tələbələr</h2>
            <span className="rounded-full bg-[#171a22] px-3 py-1 text-xs font-extrabold text-white/50 ring-1 ring-white/[0.06]">
              Ümumi abunə: {totalSubscribers}
            </span>
          </div>
          {groups.length === 0 ? (
            <div className="rounded-[28px] bg-[#171a22] px-5 py-10 text-center ring-1 ring-white/[0.06]">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/[0.06] text-white/45">
                <UserPlus size={26} />
              </span>
              <p className="mt-4 text-lg font-black">Qrup yoxdur</p>
              <p className="mt-2 text-sm font-semibold text-white/45">
                Dərs cədvəli və tələbə siyahısı üçün qrup əlavə edin.
              </p>
              <button
                type="button"
                onClick={() => { setError(''); setOpen(true); }}
                className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-[#7c6aff] px-8 text-sm font-extrabold"
              >
                Qrup yarat
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => { setError(''); setOpen(true); }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#7c6aff] px-4 text-sm font-extrabold"
              >
                <Plus size={16} /> Qrup yarat
              </button>
              <div className="grid gap-3 min-[768px]:grid-cols-2 min-[1100px]:grid-cols-3">
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
                  <article
                    key={g.id}
                    onClick={() => navigate(`/teacher/groups/${g.id}`)}
                    className="cursor-pointer rounded-[24px] bg-[#171a22] p-4 ring-1 ring-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-black">{g.number || g.name}</h3>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-full text-[#fb7185]"
                        disabled={deletingId === g.id}
                        onClick={(e) => removeGroup(g, e)}
                        aria-label="Sil"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-white/45">
                      {count} tələbə · {subs} abunə · {groupNeedsApproval(g) ? 'İcazə lazımdır' : 'İcazəsiz'}
                    </p>
                  </article>
                );
              })}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {tab === 'profile' ? (
        <section className="desk-split">
          <div>
          <TokenPaymentCard user={periodUser || user} />
          <button
            type="button"
            onClick={toggle}
            className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-[18px] bg-[#171a22] px-4 text-left ring-1 ring-white/8"
          >
            <Moon size={18} className="text-[#9d8cff]" />
            <span className="flex-1 font-extrabold">{dark ? t('common.darkTheme') : t('common.lightTheme')}</span>
            <span className={`relative h-7 w-12 rounded-full ${dark ? 'bg-[#6d5efc]' : 'bg-white/20'}`}>
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${dark ? 'right-0.5' : 'left-0.5'}`} />
            </span>
          </button>
          <div className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-[18px] bg-[#171a22] px-4 ring-1 ring-white/8">
            <span className="flex-1 font-extrabold">{t('account.language')}</span>
            <LanguageSwitch />
          </div>
          </div>
          <div>
          <h2 className="text-lg font-black">Şəxsi məlumatlar</h2>
          <p className="mt-1 text-sm font-semibold text-white/45">Konum (yer) hesabınızda qeyd olunmalıdır.</p>
          {driveFolderUrl ? (
            <p className="mt-3 text-sm">
              Drive qovluğu:{' '}
              <a className="font-extrabold text-[#9d93ff] underline" href={driveFolderUrl} target="_blank" rel="noreferrer">
                qovluğu aç
              </a>
            </p>
          ) : null}
          <form onSubmit={saveProfile} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Ad" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} required className="border-white/5 bg-[#12141a]" />
              <Input label="Soyad" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} required className="border-white/5 bg-[#12141a]" />
            </div>
            <Input label="Konum" value={profile.position} onChange={(e) => setProfile({ ...profile, position: e.target.value })} required placeholder="məs. Bakı, Nəsimi" className="border-white/5 bg-[#12141a]" />
            <div className="space-y-2">
              {subjectLocked ? (
                <>
                  <p className="text-sm font-semibold">Fənn</p>
                  <div className="flex h-[52px] items-center gap-2 rounded-[14px] border border-white/5 bg-[#12141a] px-3.5">
                    <Lock size={15} className="shrink-0 text-white/35" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{profile.teachingSubject || '—'}</span>
                    <span className="shrink-0 text-xs font-semibold text-white/35">qeydiyyatdan</span>
                  </div>
                  <p className="text-xs font-semibold text-white/40">
                    {canChangeSubject
                      ? 'Qeydiyyatda seçilib. Dəyişmək üçün yalnız 1 şansınız var.'
                      : 'Fənn artıq bir dəfə dəyişilib — daha dəyişmək olmur.'}
                  </p>
                  {canChangeSubject ? (
                    <button
                      type="button"
                      onClick={requestSubjectChange}
                      className="min-h-11 rounded-full bg-[#171a22] px-4 text-sm font-extrabold ring-1 ring-white/10"
                    >
                      Fənni dəyiş (1 şans)
                    </button>
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
                  <p className="rounded-xl bg-[#f0b429]/12 px-3 py-2 text-xs font-bold text-[#f0b429]">
                    Xəbərdarlıq: bu dəyişiklik sonuncu şansınızdır. Saxladıqdan sonra fənn kilidlənəcək.
                  </p>
                  <button
                    type="button"
                    className="text-sm font-extrabold text-white/50"
                    onClick={() => {
                      setSubjectDraft(profile.teachingSubject);
                      setSubjectLocked(true);
                      setProfileMsg('');
                    }}
                  >
                    Ləğv et
                  </button>
                </>
              )}
            </div>
            <Input label="Əlaqə nömrəsi" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+994 …" className="border-white/5 bg-[#12141a]" />
            <button
              type="submit"
              disabled={profileSaving}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#7c6aff] text-sm font-extrabold disabled:opacity-50 min-[768px]:w-auto min-[768px]:px-8"
            >
              {profileSaving ? 'Saxlanılır...' : 'Məlumatı saxla'}
            </button>
            {profileMsg ? <p className="text-sm font-semibold text-[#b4abff]">{profileMsg}</p> : null}
          </form>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate(user?.practice ? '/' : '/login');
            }}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-extrabold text-[#fb7185] ring-1 ring-[#fb7185]/50"
          >
            <LogOut size={16} /> Hesabdan çıx
          </button>
          </div>
        </section>
      ) : null}

      {error && !open ? <p className="text-sm font-semibold text-[#fb7185]">{error}</p> : null}
      {loading ? <p className="text-sm text-white/40">Yüklənir...</p> : null}

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
            <p className="mb-2 text-sm font-medium text-white/70">Şagird qeydiyyatı</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setNeedsApproval(true)}
                className={`rounded-full px-3 py-2.5 text-left text-sm font-extrabold ${
                  needsApproval ? 'bg-[#7c6aff] text-white' : 'bg-[#12141a] text-white/50'
                }`}
              >
                İcazəm lazımdır
              </button>
              <button
                type="button"
                onClick={() => setNeedsApproval(false)}
                className={`rounded-full px-3 py-2.5 text-left text-sm font-extrabold ${
                  needsApproval ? 'bg-[#12141a] text-white/50' : 'bg-[#7c6aff] text-white'
                }`}
              >
                İcazə lazım deyil
              </button>
            </div>
            <p className="mt-2 text-xs text-white/40">
              {needsApproval
                ? 'Şagird qeydiyyatdan sonra «Yeni şagirdlər»də siz «Giriş ver» basandan sonra daxil olur.'
                : 'Ümumi qrup kimi: şagird qeydiyyatdan sonra icazə gözləmədən daxil ola bilər.'}
            </p>
          </div>
          {error ? <p className="text-sm font-semibold text-[#fb7185]">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={saving} onClick={closeModal}>
              Ləğv et
            </Button>
            <Button type="submit" className="!bg-[#7c6aff] !bg-none" disabled={saving}>{saving ? 'Saxlanılır...' : 'Yarat'}</Button>
          </div>
        </form>
      </Modal>
      </div>
    </AppShell>
  );
}

function findLocalDuplicate(groups, payload) {
  return groups.some((g) => groupsShareName(g, payload));
}
