import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
  Search,
  Unlock,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import BrandLogo from '../components/BrandLogo';
import ExamCard from '../components/ExamCard';
import { EmptyState, Skeleton } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { fetchListedExamsForTeacher, fetchMarketplaceTeachers } from '../lib/examApi';
import { examVisibility } from '../lib/examVisibility';
import { localDb } from '../lib/localDb';
import { canEnterExam } from '../lib/teacherAccess';
import { filterSortTeachers, uniqueRegions, uniqueTeacherSubjects } from '../lib/teacherMarketplace';
import { examRetakeReady, isExamEnded, isExamScheduled } from '../lib/utils';

const SORTS = [
  {
    id: 'rank',
    label: 'Həftəlik + orta (standart)',
    hint: 'Bu həftə keçirilən imtahan sayı, sonra orta nəticə',
  },
  { id: 'weekly', label: 'İmtahan sayı' },
  { id: 'avg', label: 'Orta nəticə' },
];

function FilterSheet({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55" />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-[var(--card)] px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-3 text-[var(--text)] shadow-[0_-16px_40px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <p className="mb-1 text-[17px] font-extrabold">{title}</p>
        {children}
      </div>
    </div>
  );
}

function SheetRow({ active, children, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[68px] w-full items-start justify-between gap-3 border-b border-[var(--line)] py-3 text-left last:border-0"
    >
      <span>
        <span className={`block text-[16px] font-extrabold ${active ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
          {children}
        </span>
        {hint ? <span className="mt-0.5 block text-[13px] font-semibold text-[var(--muted)]">{hint}</span> : null}
      </span>
      {active ? <Check size={18} className="mt-1 shrink-0 text-[var(--accent)]" /> : null}
    </button>
  );
}

function FilterField({ label, value, onClick, accent = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[72px] flex-col justify-center rounded-[18px] px-4 text-left ${
        accent ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/40' : 'card-vector bg-[var(--card)] ring-1 ring-[var(--line)]'
      }`}
    >
      <span className={`text-[11px] font-bold ${accent ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>{label}</span>
      <span className="mt-0.5 flex items-center justify-between gap-2 text-[15px] font-extrabold">
        <span className="min-w-0 truncate">{value}</span>
        <ChevronDown size={16} className="shrink-0 opacity-50" />
      </span>
    </button>
  );
}

function initialOf(name) {
  return String(name || 'M').trim().charAt(0).toUpperCase() || 'M';
}

function TeacherRow({ teacher, followed, onOpen }) {
  const subject = (teacher.subjects || [])[0];
  const avg = teacher.avgScore ? `${Math.round(teacher.avgScore)}%` : '—';
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card-vector w-full rounded-[22px] bg-[var(--card)] p-4 text-left ring-1 ring-[var(--line)] transition active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[15px] font-black text-[var(--accent)]">
          {initialOf(teacher.fullName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-extrabold">{teacher.fullName}</span>
          <span className="mt-0.5 block truncate text-[13px] font-semibold text-[var(--muted)]">
            {teacher.position || 'Bölgə yoxdur'}
            {subject ? ` · ${subject}` : ''}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-[var(--muted)]" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <span className="rounded-[16px] bg-[var(--bg)] px-3 py-2.5">
          <span className="block text-[11px] font-bold text-[var(--muted)]">Bu həftə</span>
          <span className="mt-0.5 block text-[16px] font-black">
            {teacher.weeklyExamCount} imtahan
          </span>
        </span>
        <span className="rounded-[16px] bg-[var(--bg)] px-3 py-2.5">
          <span className="block text-[11px] font-bold text-[var(--muted)]">Orta nəticə</span>
          <span className="mt-0.5 block text-[16px] font-black">{avg}</span>
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {teacher.hasPublic ? (
          <span className="rounded-full bg-[#2ee07a]/15 px-2.5 py-1 text-[11px] font-extrabold text-[var(--success-text)]">
            Açıq imtahanlar
          </span>
        ) : null}
        {teacher.hasPrivate ? (
          <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--accent)]">
            Özəl imtahanlar
          </span>
        ) : null}
        {followed ? (
          <span className="rounded-full bg-[var(--bg)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--muted)]">
            İzlənilir
          </span>
        ) : null}
      </div>
    </button>
  );
}

export default function BrowseTeachers({ embedded = false }) {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [exams, setExams] = useState([]);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('all');
  const [subject, setSubject] = useState('all');
  const [sortBy, setSortBy] = useState('rank');
  const [dir, setDir] = useState('desc');
  const [sheet, setSheet] = useState('');
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState([]);
  const followed = user?.id ? localDb.followedTeacherIds(user.id) : [];
  const listPath = embedded ? '/student/teachers' : '/teachers';

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchMarketplaceTeachers();
      setTeachers(list);
      if (id) {
        if (user?.role === 'Student' && user.id) localDb.followTeacher(user.id, id);
        setExams(await fetchListedExamsForTeacher(id));
      } else {
        setExams([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id, id]);

  useEffect(() => {
    setSavedIds(localDb.getSavedExams(user?.id).map((exam) => String(exam.id)));
  }, [user?.id]);

  const filtered = useMemo(
    () => filterSortTeachers(teachers, { query, region, subject, sortBy, dir }),
    [teachers, query, region, subject, sortBy, dir],
  );
  const regions = useMemo(() => uniqueRegions(teachers), [teachers]);
  const subjects = useMemo(() => uniqueTeacherSubjects(teachers), [teachers]);
  const selected = teachers.find((t) => String(t.id) === String(id));
  const filteredOn = query.trim() || region !== 'all' || subject !== 'all';
  const sortMeta = SORTS.find((row) => row.id === sortBy) || SORTS[0];

  const clearFilters = () => {
    setQuery('');
    setRegion('all');
    setSubject('all');
    setSortBy('rank');
    setDir('desc');
    setSheet('');
  };

  const openExam = (exam) => {
    if (isExamScheduled(exam)) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!canEnterExam(user, exam)) return;
    if (user?.role === 'Student' || user?.practice) {
      if (isExamEnded(exam)) {
        navigate(`/student/exams/${exam.id}/review`);
        return;
      }
      navigate(`/student/exams/${exam.id}`);
      return;
    }
    navigate('/login');
  };

  const list = (
    <div className="pb-24">
      <h1 className="text-[clamp(1.4rem,5vw,2rem)] font-black tracking-tight">Müəllim tap</h1>
      <p className="mt-1 text-[15px] font-semibold text-[var(--muted)]">
        Müəllimləri bölgə və fənnə görə süzün.
      </p>

      <div className="card-vector mt-5 space-y-2.5 rounded-[18px] bg-[var(--card)] px-4 py-3.5 text-[13px] font-semibold leading-snug ring-1 ring-[var(--line)]">
        <p className="flex items-start gap-2.5">
          <Unlock size={15} className="mt-0.5 shrink-0 text-[var(--success-text)]" />
          <span>Açıq imtahanlar pulsuzdur.</span>
        </p>
        <p className="flex items-start gap-2.5 text-[var(--muted)]">
          <Lock size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
          <span>Özəl imtahanlar yalnız o müəllimin şagirdləri üçündür — tələbə ödəniş etmir.</span>
        </p>
      </div>

      <div className="relative mt-4">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ad, bölgə, fənn..."
          className="h-14 w-full rounded-[18px] bg-[var(--card)] pl-12 pr-4 text-[15px] font-semibold text-[var(--text)] outline-none ring-1 ring-[var(--line)] placeholder:text-[var(--muted)] focus:ring-[var(--accent)]/50"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <FilterField
          label="Bölgə"
          value={region === 'all' ? 'Hamısı' : region}
          accent={region !== 'all'}
          onClick={() => setSheet('region')}
        />
        <FilterField
          label="Fənn"
          value={subject === 'all' ? 'Hamısı' : subject}
          accent={subject !== 'all'}
          onClick={() => setSheet('subject')}
        />
        <FilterField
          label="Sıralama"
          value={sortBy === 'rank' ? 'Həftəlik + orta' : sortMeta.label}
          onClick={() => setSheet('sort')}
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDir('desc')}
            className={`flex min-h-[72px] items-center justify-center gap-1.5 rounded-[18px] text-[13px] font-extrabold ${
              dir === 'desc' ? 'bg-[var(--accent)] text-[#2a2208]' : 'card-vector bg-[var(--card)] text-[var(--muted)] ring-1 ring-[var(--line)]'
            }`}
          >
            <ArrowDown size={15} /> Azalan
          </button>
          <button
            type="button"
            onClick={() => setDir('asc')}
            className={`flex min-h-[72px] items-center justify-center gap-1.5 rounded-[18px] text-[13px] font-extrabold ${
              dir === 'asc' ? 'bg-[var(--accent)] text-[#2a2208]' : 'card-vector bg-[var(--card)] text-[var(--muted)] ring-1 ring-[var(--line)]'
            }`}
          >
            <ArrowUp size={15} /> Artan
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[14px] font-extrabold text-[var(--muted)]">
          {loading ? 'Yüklənir...' : `${filtered.length} müəllim`}
        </p>
        {filteredOn ? (
          <button type="button" onClick={clearFilters} className="text-[14px] font-extrabold text-[var(--accent)]">
            Təmizlə
          </button>
        ) : null}
      </div>

      {loading ? <Skeleton className="mt-4 h-40 rounded-[22px]" /> : null}

      {!loading && !filtered.length ? (
        <div className="card-vector mt-4 rounded-[22px] bg-[var(--card)] px-6 py-12 text-center ring-1 ring-[var(--line)]">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--bg)] text-[var(--muted)]">
            <Search size={22} />
          </span>
          <p className="mt-4 text-[18px] font-black">Müəllim tapılmadı</p>
          <p className="mt-1 text-[14px] font-semibold text-[var(--muted)]">Başqa bölgə və ya fənn seçin.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--accent)] px-6 text-sm font-extrabold text-[#2a2208]"
          >
            Filtrləri təmizlə
          </button>
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 min-[768px]:grid-cols-2">
        {filtered.map((teacher) => (
          <TeacherRow
            key={teacher.id}
            teacher={teacher}
            followed={followed.includes(String(teacher.id))}
            onOpen={() => navigate(`${listPath}/${teacher.id}`)}
          />
        ))}
      </div>

      <FilterSheet title="Bölgə" open={sheet === 'region'} onClose={() => setSheet('')}>
        <SheetRow
          active={region === 'all'}
          onClick={() => {
            setRegion('all');
            setSheet('');
          }}
        >
          Hamısı
        </SheetRow>
        {regions.map((name) => (
          <SheetRow
            key={name}
            active={region === name}
            onClick={() => {
              setRegion(name);
              setSheet('');
            }}
          >
            {name}
          </SheetRow>
        ))}
      </FilterSheet>
      <FilterSheet title="Fənn" open={sheet === 'subject'} onClose={() => setSheet('')}>
        <SheetRow
          active={subject === 'all'}
          onClick={() => {
            setSubject('all');
            setSheet('');
          }}
        >
          Hamısı
        </SheetRow>
        {subjects.map((name) => (
          <SheetRow
            key={name}
            active={subject === name}
            onClick={() => {
              setSubject(name);
              setSheet('');
            }}
          >
            {name}
          </SheetRow>
        ))}
      </FilterSheet>
      <FilterSheet title="Sıralama" open={sheet === 'sort'} onClose={() => setSheet('')}>
        {SORTS.map((row) => (
          <SheetRow
            key={row.id}
            active={sortBy === row.id}
            hint={row.hint}
            onClick={() => {
              setSortBy(row.id);
              setSheet('');
            }}
          >
            {row.label}
          </SheetRow>
        ))}
      </FilterSheet>
    </div>
  );

  const detail = (
    <div>
      <button
        type="button"
        onClick={() => navigate(listPath)}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-[var(--muted)]"
      >
        <ArrowLeft size={16} /> Müəllim tap
      </button>
      <div className="card-vector mt-4 flex items-center gap-3 rounded-[22px] bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[16px] font-black text-[var(--accent)]">
          {initialOf(selected?.fullName)}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-black">{selected?.fullName || 'Müəllim'}</h2>
          <p className="mt-0.5 text-sm font-semibold text-[var(--muted)]">
            {selected?.position || 'Bölgə göstərilməyib'}
            {selected?.subjects?.length ? ` · ${selected.subjects.join(', ')}` : ''}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="card-vector rounded-[16px] bg-[var(--card)] px-3 py-3 ring-1 ring-[var(--line)]">
          <p className="text-[11px] font-bold text-[var(--muted)]">Bu həftə</p>
          <p className="mt-0.5 text-[16px] font-black">{selected?.weeklyExamCount ?? 0} imtahan</p>
        </div>
        <div className="card-vector rounded-[16px] bg-[var(--card)] px-3 py-3 ring-1 ring-[var(--line)]">
          <p className="text-[11px] font-bold text-[var(--muted)]">Orta nəticə</p>
          <p className="mt-0.5 text-[16px] font-black">
            {selected?.avgScore ? `${Math.round(selected.avgScore)}%` : '—'}
          </p>
        </div>
      </div>
      {loading ? <Skeleton className="mt-6 h-40 rounded-[22px]" /> : null}
      {!loading && !exams.length ? (
        <EmptyState title="İmtahan yoxdur" text="Bu müəllim hələ dərc edilmiş imtahan qoymayıb." />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {exams.map((exam) => {
            const locked = examVisibility(exam) === 'private' && !canEnterExam(user, exam);
            return (
              <ExamCard
                key={exam.id}
                exam={exam}
                locked={locked}
                actionLabel={
                  locked
                    ? 'Yalnız öz şagirdləri'
                    : (user?.role === 'Student' || user?.practice ? 'İmtahana başla' : 'Daxil olub bax')
                }
                saved={savedIds.includes(String(exam.id))}
                onToggleSave={user?.role === 'Student' || user?.practice ? (item) => {
                  const next = localDb.toggleSavedExam(user.id, item);
                  setSavedIds(next.map((row) => String(row.id)));
                } : undefined}
                onRetake={
                  (user?.role === 'Student' || user?.practice) && examRetakeReady(exam) && canEnterExam(user, exam)
                    ? () => navigate(`/student/exams/${exam.id}?yeniden=1`)
                    : undefined
                }
                onOpen={isExamScheduled(exam) || locked ? undefined : () => openExam(exam)}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  const body = id ? detail : list;

  if (embedded) {
    return <AppShell title={id ? 'Müəllimin imtahanları' : ''}>{body}</AppShell>;
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <div className="mx-auto max-w-[520px] px-4 pb-16 pt-3 min-[768px]:max-w-[720px] min-[1100px]:max-w-[960px]">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            aria-label="Geri"
            onClick={() => {
              if (id) navigate(listPath);
              else if (window.history.length > 1) navigate(-1);
              else navigate('/');
            }}
            className="grid h-11 w-11 place-items-center rounded-full bg-[#171a22] text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <BrandLogo size={34} nameClassName="text-white" />
        </div>
        {body}
      </div>
    </div>
  );
}
