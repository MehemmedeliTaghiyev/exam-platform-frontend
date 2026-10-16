import { useContext, useEffect, useState } from 'react';
import { Ban, CheckCircle2, RotateCcw, Trash2, Users } from 'lucide-react';
import AppShell from './AppShell';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Skeleton } from './ui';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import { errorMessage, formatDate, unwrapList } from '../lib/utils';

function normalizeAdminUser(u) {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    userName: u.userName || u.UserName,
    groupName: u.groupName || u.GroupName || '—',
    isAccessEnabled: (u.isAccessEnabled ?? u.IsAccessEnabled) !== false,
    isDeleted: Boolean(u.isDeleted),
    createdAt: u.createdAt,
    deletedAt: u.deletedAt,
  };
}

export default function AccessUsersPanel({ title, description, roles }) {
  const { user } = useContext(AuthContext);
  const teacherId = user?.id || 'me';
  const [tab, setTab] = useState(roles[0].id);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [nameQuery, setNameQuery] = useState('');
  const showGroup = tab === 'Student';

  const load = async (role = tab) => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/Users', { params: { role, includeDeleted: true } });
      const remote = unwrapList(res.data).map((row) => normalizeAdminUser(row));
      setUsers(remote);
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

  const run = async (id, action) => {
    setBusyId(id);
    setError('');
    try {
      await action();
      await load(tab);
    } catch (err) {
      setError(errorMessage(err, 'Əməliyyat alınmadı.'));
    } finally {
      setBusyId(null);
    }
  };

  const currentLabel = roles.find((r) => r.id === tab)?.label || 'İstifadəçilər';
  const q = nameQuery.trim().toLowerCase();
  const visibleUsers = users.filter((u) => {
    if (!q) return true;
    return `${u.fullName || ''}`.toLowerCase().includes(q);
  });

  const actionsFor = (u) => (
    <div className="flex flex-wrap gap-2">
      {!u.isDeleted && Number(u.id) > 0 && (
        <Button
          size="sm"
          variant={u.isAccessEnabled ? 'danger-soft' : 'success'}
          disabled={busyId === u.id}
          onClick={() => run(u.id, () => API.patch(`/Users/${u.id}/access`, { enabled: !u.isAccessEnabled }))}
        >
          {u.isAccessEnabled ? <Ban size={14} /> : <CheckCircle2 size={14} />}
          {u.isAccessEnabled ? 'Pəncərəni bağla' : 'Giriş ver'}
        </Button>
      )}
      {u.isDeleted ? (
        <Button size="sm" variant="secondary" disabled={busyId === u.id} onClick={() => run(u.id, () => API.post(`/Users/${u.id}/restore`))}>
          <RotateCcw size={14} /> Bərpa et
        </Button>
      ) : Number(u.id) > 0 ? (
        <Button size="sm" variant="text-danger" disabled={busyId === u.id} onClick={() => setPendingDelete(u)}>
          <Trash2 size={14} /> Sil
        </Button>
      ) : null}
    </div>
  );

  return (
    <AppShell title={title}>
      <p className="mb-6 text-sm text-gray-500">{description}</p>

      {roles.length > 1 && (
        <div className="mb-6 flex gap-2 rounded-xl bg-gray-50 p-1 dark:bg-slate-800">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setTab(role.id)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                tab === role.id ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-gray-500'
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="mb-4 max-w-md">
        <Input label="Ad ilə axtar" value={nameQuery} onChange={(e) => setNameQuery(e.target.value)} placeholder="Ad" />
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : users.length === 0 ? (
        <EmptyState title={`${currentLabel} yoxdur`} text="Qeydiyyatdan keçən istifadəçilər burada görünəcək." />
      ) : visibleUsers.length === 0 ? (
        <EmptyState title="Uyğun ad yoxdur" text="Axtarışı dəyişin." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
            <h3 className="flex items-center gap-2 font-bold">
              <Users size={18} /> {currentLabel}
            </h3>
          </div>
          <div className="space-y-3 p-4 min-[860px]:hidden">
            {visibleUsers.map((u) => (
              <div key={u.id} className="rounded-[16px] border border-[var(--line)] p-4">
                <p className="text-lg font-extrabold">{u.fullName}</p>
                <p className="text-sm text-[var(--muted)]">{u.email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {showGroup ? <Badge tone="accent">Qrup: {u.groupName || '—'}</Badge> : null}
                  <span className="whitespace-nowrap text-sm text-[var(--muted)]">{formatDate(u.createdAt)}</span>
                  {u.isDeleted ? <Badge>Silinib</Badge> : u.isAccessEnabled ? <Badge tone="success">Giriş açıq</Badge> : <Badge tone="danger">Pəncərə bağlı</Badge>}
                </div>
                <div className="mt-3">{actionsFor(u)}</div>
              </div>
            ))}
          </div>
          <table className="hidden w-full text-left text-sm min-[860px]:table">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
                <th className="px-5 py-3 font-medium">Ad</th>
                <th className="px-5 py-3 font-medium">E-poçt</th>
                {showGroup && <th className="px-5 py-3 font-medium">Qrup</th>}
                <th className="px-5 py-3 font-medium">Qeydiyyat</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 last:border-0 dark:border-slate-800">
                  <td className="px-5 py-3 font-medium">{u.fullName}</td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  {showGroup && (
                    <td className="px-5 py-3">
                      <Badge tone="accent">Qrup: {u.groupName || '—'}</Badge>
                    </td>
                  )}
                  <td className="px-5 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-3">
                    {u.isDeleted ? (
                      <Badge>Silinib</Badge>
                    ) : u.isAccessEnabled ? (
                      <Badge tone="success">Giriş açıq</Badge>
                    ) : (
                      <Badge tone="danger">Pəncərə bağlı</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {!u.isDeleted && Number(u.id) > 0 && (
                        <Button
                          variant={u.isAccessEnabled ? 'danger' : 'success'}
                          disabled={busyId === u.id}
                          onClick={() =>
                            run(u.id, () => API.patch(`/Users/${u.id}/access`, { enabled: !u.isAccessEnabled }))
                          }
                        >
                          {u.isAccessEnabled ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                          {u.isAccessEnabled ? 'Pəncərəni bağla' : 'Giriş ver'}
                        </Button>
                      )}
                      {u.isDeleted ? (
                        <Button
                          variant="secondary"
                          disabled={busyId === u.id}
                          onClick={() => run(u.id, () => API.post(`/Users/${u.id}/restore`))}
                        >
                          <RotateCcw size={14} /> Bərpa et
                        </Button>
                      ) : Number(u.id) > 0 ? (
                        <Button
                          variant="text-danger"
                          size="sm"
                          disabled={busyId === u.id}
                          onClick={() => setPendingDelete(u)}
                        >
                          <Trash2 size={14} /> Sil
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        text={pendingDelete ? `${pendingDelete.fullName} silinəcək.` : ''}
        note="Bu yumşaq silmədir. Qeyd sonra bərpa edilə bilər."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (target) run(target.id, () => API.delete(`/Users/${target.id}`));
        }}
      />
    </AppShell>
  );
}
