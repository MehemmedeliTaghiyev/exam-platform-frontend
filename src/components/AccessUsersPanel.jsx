import { useContext, useEffect, useState } from 'react';
import { Ban, MoreVertical, Search } from 'lucide-react';
import AppShell from './AppShell';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import { errorMessage, unwrapList } from '../lib/utils';
import { localDb } from '../lib/localDb';
import { isPractice, practiceAdminStudents, practiceAdminTeachers } from '../lib/practice';

function normalizeAdminUser(u) {
  return {
    id: u.id,
    fullName: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    userName: u.userName || u.UserName,
    groupName: u.groupName || u.GroupName || '—',
    isAccessEnabled: (u.isAccessEnabled ?? u.IsAccessEnabled) !== false,
    isDeleted: Boolean(u.isDeleted),
    createdAt: u.createdAt || u.CreatedAt,
    deletedAt: u.deletedAt,
  };
}

function initials(name) {
  return String(name || 'A').trim().charAt(0).toUpperCase() || 'A';
}

function shortDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const months = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function AccessUsersPanel({ title, description, descriptions, roles, canToggleAccess = true, toggleAccessRoles = null }) {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState(roles[0].id);
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({ Teacher: 0, Student: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [menuUser, setMenuUser] = useState(null);
  const [nameQuery, setNameQuery] = useState('');

  const loadRole = async (role) => {
    if (user?.practice || isPractice()) {
      return (role === 'Teacher' ? practiceAdminTeachers() : practiceAdminStudents()).map(normalizeAdminUser);
    }
    const res = await API.get('/Users', { params: { role, includeDeleted: true } });
    return unwrapList(res.data).map((row) => normalizeAdminUser(row));
  };

  const load = async (role = tab) => {
    setLoading(true);
    setError('');
    try {
      const list = await loadRole(role);
      setUsers(list);
      if (roles.length > 1) {
        const other = role === 'Teacher' ? 'Student' : 'Teacher';
        const otherList = await loadRole(other);
        setCounts({
          [role]: list.length,
          [other]: otherList.length,
        });
      } else {
        setCounts((prev) => ({ ...prev, [role]: list.length }));
      }
    } catch (err) {
      setUsers([]);
      setError(errorMessage(err, 'İstifadəçilər yüklənmədi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tab);
  }, [tab]);

  const currentLabel = roles.find((r) => r.id === tab)?.label || 'İstifadəçilər';
  const allowToggle = toggleAccessRoles ? toggleAccessRoles.includes(tab) : canToggleAccess;
  const teacherToggle = tab === 'Teacher';
  const q = nameQuery.trim().toLowerCase();
  const visibleUsers = users.filter((u) => !q || `${u.fullName || ''} ${u.email || ''}`.toLowerCase().includes(q));
  const blurb = descriptions?.[tab] || description;
  const tabCount = (id) => counts[id] ?? (id === tab ? users.length : 0);

  const setAccess = async (u) => {
    if (!u?.id || busyId) return;
    setBusyId(u.id);
    setError('');
    const next = !u.isAccessEnabled;
    try {
      if (user?.practice || isPractice()) {
        setUsers((prev) => prev.map((row) => (String(row.id) === String(u.id) ? { ...row, isAccessEnabled: next } : row)));
        setMenuUser(null);
        return;
      }
      await API.patch(`/Users/${u.id}/access`, { enabled: next });
      if (teacherToggle) localDb.setTeacherSidelined(u.id, !next);
      await load(tab);
      setMenuUser(null);
    } catch (err) {
      setError(errorMessage(err, 'Əməliyyat alınmadı.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell title={title}>
      <div className="space-y-4 pb-24">
        {blurb ? (
          <p className="rounded-[22px] bg-[#171a22] px-4 py-3 text-sm font-semibold leading-snug text-white/55 ring-1 ring-white/[0.06]">
            {blurb}
          </p>
        ) : null}

        {roles.length > 1 ? (
          <div className="flex rounded-full bg-[#171a22] p-1 ring-1 ring-white/[0.06]">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setTab(role.id)}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full text-sm font-extrabold ${
                  tab === role.id ? 'bg-[#7c6aff] text-white' : 'text-white/40'
                }`}
              >
                {role.label}
                <span className={`rounded-full px-1.5 text-[11px] ${tab === role.id ? 'bg-white/20' : 'bg-white/10'}`}>
                  {tabCount(role.id)}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <label className="flex min-h-12 items-center gap-2 rounded-full bg-[#171a22] px-4 ring-1 ring-white/[0.06]">
          <Search size={16} className="text-white/35" />
          <input
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Ad ilə axtar"
            className="h-11 w-full bg-transparent text-sm font-semibold outline-none placeholder:text-white/35"
          />
        </label>

        {error ? <p className="text-sm font-semibold text-[#ff8aa0]">{error}</p> : null}

        <div className="flex items-end justify-between">
          <p className="text-sm font-extrabold">{currentLabel}</p>
          <p className="text-sm font-semibold text-white/40">{visibleUsers.length} nəfər</p>
        </div>

        {loading ? <p className="text-sm text-white/40">Yüklənir...</p> : null}
        {!loading && !visibleUsers.length ? (
          <p className="rounded-[24px] bg-[#171a22] px-4 py-8 text-center text-sm font-semibold text-white/40">
            {users.length ? 'Uyğun ad yoxdur.' : `${currentLabel} yoxdur.`}
          </p>
        ) : null}

        <ul className="space-y-3">
          {visibleUsers.map((u) => (
            <li key={u.id} className="flex items-start gap-3 rounded-[26px] bg-[#171a22] p-4 ring-1 ring-white/[0.06]">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#7c6aff] text-lg font-black">
                {initials(u.fullName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black">{u.fullName || '—'}</p>
                <p className="truncate text-sm font-semibold text-white/40">{u.email || '—'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {tab === 'Student' ? (
                    <span className="rounded-full bg-[#7c6aff]/20 px-2.5 py-1 text-[11px] font-extrabold text-[#b4abff]">
                      Qrup: {u.groupName || '—'}
                    </span>
                  ) : null}
                  {u.isDeleted ? (
                    <span className="text-[12px] font-extrabold text-white/40">Silinib</span>
                  ) : u.isAccessEnabled ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#7dffa8]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7dffa8]" /> Giriş açıq
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#e11d48]/18 px-2.5 py-1 text-[11px] font-extrabold text-[#ff8aa0]">
                      Kənarlaşdırılıb
                    </span>
                  )}
                  {tab === 'Teacher' ? (
                    <span className="text-[12px] font-semibold text-white/35">{shortDate(u.createdAt)}</span>
                  ) : null}
                </div>
              </div>
              {allowToggle && !u.isDeleted ? (
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/40"
                  aria-label="Əməliyyatlar"
                  onClick={() => setMenuUser(u)}
                >
                  <MoreVertical size={18} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {menuUser ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Bağla" onClick={() => setMenuUser(null)} />
          <div className="relative w-full max-w-md rounded-t-[28px] bg-[#1b1e27] px-5 pb-8 pt-4 text-white shadow-[0_-12px_40px_rgba(0,0,0,0.4)] sm:mb-0 sm:rounded-[28px]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <p className="text-lg font-black">{menuUser.fullName}</p>
            <p className="text-sm font-semibold text-white/40">{menuUser.email}</p>
            <button
              type="button"
              disabled={busyId === menuUser.id}
              onClick={() => setAccess(menuUser)}
              className="mt-5 inline-flex min-h-12 w-full items-center gap-2 text-left text-base font-extrabold text-[#9d93ff]"
            >
              <Ban size={18} />
              {menuUser.isAccessEnabled ? 'Kənarlaşdır' : 'Bərpa et'}
            </button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
