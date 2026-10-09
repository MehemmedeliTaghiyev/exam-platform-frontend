import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import AppShell from '../components/AppShell';
import { AuthContext } from '../context/AuthContext';
import { Badge, Button, Card, EmptyState, Input, Modal, Textarea } from '../components/ui';
import {
  createGroup,
  deleteGroup,
  fetchGroups,
  fetchOwnProfile,
  fetchStudents,
  groupsShareName,
  updateOwnProfile,
  DUPLICATE_GROUP_MESSAGE,
} from '../lib/examApi';
import { errorMessage } from '../lib/utils';
import AccessPeriodBanner from '../components/AccessPeriodBanner';

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
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [schedule, setSchedule] = useState('');
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    fatherName: '',
    position: '',
    phone: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [periodUser, setPeriodUser] = useState(user);

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
      if (me) {
        setPeriodUser({ ...user, ...me, role: user?.role || 'Teacher' });
        setDriveFolderUrl(me.driveFolderUrl || '');
        setProfile({
          firstName: me.firstName || me.FirstName || '',
          lastName: me.lastName || me.LastName || '',
          fatherName: me.fatherName || me.FatherName || '',
          position: me.position || me.Position || '',
          phone: me.phone || me.Phone || '',
        });
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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    const payload = {
      name: name.trim(),
      number: number.trim() || name.trim(),
      schedule,
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
    if (!window.confirm(`${label} silinsin? Tələbələr silinməyəcək, qrup siyahıdan çıxacaq.`)) return;
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

  const saveProfile = async (e) => {
    e.preventDefault();
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileMsg('');
    setError('');
    try {
      await updateOwnProfile({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        fatherName: profile.fatherName.trim(),
        position: profile.position.trim(),
        phone: profile.phone.trim(),
      });
      setProfileMsg('Məlumat saxlanıldı.');
    } catch (err) {
      setError(errorMessage(err, 'Məlumat saxlanılmadı. Konum mütləqdir.'));
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <AppShell title="Müəllim kabineti">
      <AccessPeriodBanner user={periodUser || user} />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">{user?.fullName}</p>
          <p className="mt-1 text-2xl font-bold">Qruplar və tələbələr</p>
        </div>
        <Button onClick={() => { setError(''); setOpen(true); }}>
          <Plus size={16} /> Qrup yarat
        </Button>
      </div>

      <Card className="mb-8">
        <h2 className="text-lg font-bold">Şəxsi məlumatlar</h2>
        <p className="mt-1 text-sm text-gray-500">Konum (yer) hesabınızda qeyd olunmalıdır.</p>
        {driveFolderUrl ? (
          <p className="mt-3 text-sm">
            Drive qovluğu:{' '}
            <a className="font-medium text-brand-600 underline" href={driveFolderUrl} target="_blank" rel="noreferrer">
              qovluğu aç
            </a>
          </p>
        ) : (
          <p className="mt-3 text-sm text-amber-700">Drive qovluğu hələ admin tərəfindən bağlanmayıb.</p>
        )}
        <form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Ad" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} required />
          <Input label="Soyad" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} required />
          <Input label="Konum" value={profile.position} onChange={(e) => setProfile({ ...profile, position: e.target.value })} required placeholder="məs. Bakı, Nəsimi" />
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
            return (
              <Card key={g.id} onClick={() => navigate(`/teacher/groups/${g.id}`)}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold">{g.number || g.name}</h3>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge>{count} tələbə</Badge>
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
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-500">
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
