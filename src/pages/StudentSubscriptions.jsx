import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bell, TrendingUp, Users } from 'lucide-react';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import { Button, Card, EmptyState, Input, Skeleton } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { fetchGroupInvite, fetchListedExamsForTeacher } from '../lib/examApi';
import {
  findCatalogGroup,
  groupSubscriberCount,
  studentSubscriptions,
  subscribeToGroup,
  trendingGroups,
  unsubscribeFromGroup,
} from '../lib/groupSubscriptions';
import { localDb } from '../lib/localDb';
import { canEnterExam } from '../lib/teacherAccess';
import { examRetakeReady, errorMessage, isExamEnded, isExamScheduled, resolveExamStatus } from '../lib/utils';

export default function StudentSubscriptions() {
  const { groupKey } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [subs, setSubs] = useState(() => studentSubscriptions(user?.id));
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [savedIds, setSavedIds] = useState([]);

  const selected = useMemo(
    () => subs.find((item) => item.key === groupKey || String(item.groupId) === String(groupKey)) || null,
    [subs, groupKey],
  );

  const refresh = () => setSubs(studentSubscriptions(user?.id));

  useEffect(() => {
    refresh();
    setSavedIds(localDb.getSavedExams(user?.id).map((exam) => String(exam.id)));
  }, [user?.id]);

  useEffect(() => {
    if (!selected?.teacherId) {
      setExams([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingExams(true);
      try {
        const list = await fetchListedExamsForTeacher(selected.teacherId);
        if (!cancelled) {
          setExams(list.filter((exam) => resolveExamStatus(exam) !== 'Draft'));
        }
      } catch {
        if (!cancelled) setExams([]);
      } finally {
        if (!cancelled) setLoadingExams(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.teacherId, selected?.key]);

  const joinByCode = async (e) => {
    e.preventDefault();
    if (!user?.id || busy) return;
    setBusy(true);
    setError('');
    const raw = code.trim();
    try {
      let group = findCatalogGroup(raw);
      if (!group) {
        const preview = await fetchGroupInvite(raw).catch(() => null);
        if (preview?.groupName || preview?.inviteCode || preview?.teacherId) {
          group = {
            groupId: preview.groupId ?? null,
            groupName: preview.groupName || 'Qrup',
            teacherName: preview.teacherName || '',
            teacherId: preview.teacherId ?? null,
            inviteCode: preview.inviteCode || raw,
          };
        }
      }
      if (!group && /^g?\d+$/i.test(raw)) {
        group = {
          groupId: Number(String(raw).replace(/^g/i, '')),
          groupName: `Qrup ${raw}`,
          inviteCode: raw.startsWith('g') || raw.startsWith('G') ? raw : `g${raw}`,
          teacherId: null,
          teacherName: '',
        };
      }
      if (!group) {
        setError('Qrup tapılmadı. Müəllimin qrup linkini və ya kodunu yoxlayın.');
        return;
      }
      const row = subscribeToGroup(user, group);
      refresh();
      setCode('');
      if (row?.key) navigate(`/student/subscriptions/${encodeURIComponent(row.key)}`);
    } catch (err) {
      setError(errorMessage(err, 'Abunə olunmadı.'));
    } finally {
      setBusy(false);
    }
  };

  const leave = (group) => {
    if (!window.confirm(`${group.groupName} abunəliyindən çıxılsın?`)) return;
    unsubscribeFromGroup(user?.id, group);
    refresh();
    if (selected && selected.key === group.key) navigate('/student/subscriptions');
  };

  const openExam = (exam) => {
    if (isExamScheduled(exam) || !canEnterExam(user, exam)) return;
    if (isExamEnded(exam)) {
      navigate(`/student/exams/${exam.id}/review`);
      return;
    }
    navigate(`/student/exams/${exam.id}`);
  };

  const trending = useMemo(
    () => trendingGroups({
      limit: 10,
      excludeKeys: subs.map((item) => item.key),
    }),
    [subs],
  );

  if (selected) {
    return (
      <AppShell title={selected.groupName || 'Qrup'}>
        <Button variant="ghost" onClick={() => navigate('/student/subscriptions')}>← Abunələr</Button>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">{selected.groupName}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {selected.teacherName || 'Müəllim'} · bu qrup üçün sınaqlar
            </p>
          </div>
          <Button variant="secondary" onClick={() => leave(selected)}>Abunəlikdən çıx</Button>
        </div>
        {loadingExams ? <Skeleton className="mt-6 h-40" /> : null}
        {!loadingExams && !exams.length ? (
          <div className="mt-6">
            <EmptyState title="Sınaq yoxdur" text="Bu qrup üçün hələ dərc edilmiş sınaq yoxdur." />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {exams.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                actionLabel={canEnterExam(user, exam) ? 'İmtahana başla' : 'Giriş yoxdur'}
                saved={savedIds.includes(String(exam.id))}
                onToggleSave={(item) => {
                  const next = localDb.toggleSavedExam(user.id, item);
                  setSavedIds(next.map((row) => String(row.id)));
                }}
                onRetake={
                  examRetakeReady(exam) && canEnterExam(user, exam)
                    ? () => navigate(`/student/exams/${exam.id}?yeniden=1`)
                    : undefined
                }
                onOpen={isExamScheduled(exam) || !canEnterExam(user, exam) ? undefined : () => openExam(exam)}
              />
            ))}
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell title="Abunələr">
      <p className="mb-5 text-sm text-[var(--muted)]">
        Bir neçə qrupa abunə ola bilərsiniz. Trending-də ən çox izləyicisi olan qrupları və müəllimi görə bilərsiniz.
      </p>

      <Card className="mb-6">
        <form onSubmit={joinByCode} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label="Qrup kodu və ya link kodu"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="məs. g12"
            />
          </div>
          <Button type="submit" disabled={busy || !code.trim()}>
            {busy ? 'Əlavə edilir...' : 'Abunə ol'}
          </Button>
        </form>
        {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
      </Card>

      <div className="mb-8">
        <p className="mb-3 flex items-center gap-2 text-sm font-extrabold">
          <TrendingUp size={16} /> Trending qruplar
        </p>
        {!trending.length ? (
          <Card>
            <p className="text-sm text-[var(--muted)]">
              Hələ açıq qrup yoxdur. Müəllimlər qrup yaradanda burada izləyici sayı ilə görünəcək.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {trending.map((group, index) => (
              <Card key={group.key}>
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff4d6] text-sm font-extrabold text-[#a87408]">
                    #{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-[var(--text)]">{group.groupName}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Müəllim: {group.teacherName || 'Naməlum'}
                      {group.teachingSubject ? ` · ${group.teachingSubject}` : ''}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1f7a3a]">
                      <Users size={14} /> {group.followers} izləyici
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-3"
                  variant="secondary"
                  onClick={() => {
                    subscribeToGroup(user, group);
                    refresh();
                  }}
                >
                  Abunə ol
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <p className="mb-3 flex items-center gap-2 text-sm font-extrabold">
        <Bell size={16} /> Mənim abunələrim
      </p>
      {!subs.length ? (
        <EmptyState
          title="Abunəlik yoxdur"
          text="Trending-dən seçin, müəllimin qrup linkini açın və ya yuxarıda kod yazın."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {subs.map((group) => (
            <Card key={group.key} className="cursor-pointer" onClick={() => navigate(`/student/subscriptions/${encodeURIComponent(group.key)}`)}>
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7f6ea] text-[#1f7a3a]">
                  <Users size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-[var(--text)]">{group.groupName}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Müəllim: {group.teacherName || 'Müəllim'}
                  </p>
                  <p className="mt-2 text-xs font-bold text-[#1f7a3a]">
                    {groupSubscriberCount(group)} izləyici · Sınaqlara bax →
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="mt-3"
                onClick={(e) => {
                  e.stopPropagation();
                  leave(group);
                }}
              >
                Abunəlikdən çıx
              </Button>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-sm">
        <Link to="/student/teachers" className="font-extrabold text-[#1f7a3a] underline">Müəllim tap</Link>
        {' '}vasitəsilə də qruplara keçə bilərsiniz.
      </p>
    </AppShell>
  );
}
