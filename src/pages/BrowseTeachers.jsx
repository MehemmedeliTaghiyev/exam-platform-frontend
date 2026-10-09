import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import AccessPaymentModal from '../components/AccessPaymentModal';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import PublicNav from '../components/PublicNav';
import { Button, Card, EmptyState, Input, Select, Skeleton } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { fetchListedExamsForTeacher, fetchMarketplaceTeachers } from '../lib/examApi';
import { examVisibility } from '../lib/examVisibility';
import { localDb } from '../lib/localDb';
import { canEnterExam, examTeacherId } from '../lib/teacherAccess';
import { filterSortTeachers, uniqueRegions, uniqueTeacherSubjects } from '../lib/teacherMarketplace';
import { isExamScheduled } from '../lib/utils';

export default function BrowseTeachers({ embedded = false }) {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [exams, setExams] = useState([]);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('all');
  const [subject, setSubject] = useState('all');
  const [sortBy, setSortBy] = useState('rank');
  const [dir, setDir] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [payExam, setPayExam] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
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
    if (searchParams.get('pay') === '1' && exams.length) {
      setPayExam(exams.find((e) => examVisibility(e) === 'private') || exams[0]);
      setPayOpen(true);
      searchParams.delete('pay');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, exams, setSearchParams]);

  const filtered = useMemo(
    () => filterSortTeachers(teachers, { query, region, subject, sortBy, dir }),
    [teachers, query, region, subject, sortBy, dir],
  );
  const regions = useMemo(() => uniqueRegions(teachers), [teachers]);
  const subjects = useMemo(() => uniqueTeacherSubjects(teachers), [teachers]);
  const selected = teachers.find((t) => String(t.id) === String(id));

  const openExam = (exam) => {
    if (isExamScheduled(exam)) return;
    if (!canEnterExam(user, exam)) {
      setPayExam(exam);
      setPayOpen(true);
      return;
    }
    if (user?.role === 'Student' || user?.practice) {
      navigate(`/student/exams/${exam.id}`);
      return;
    }
    navigate('/login');
  };

  const afterPaid = () => {
    setPayOpen(false);
    if (payExam && (user?.role === 'Student' || user?.practice) && canEnterExam(user, payExam)) {
      navigate(`/student/exams/${payExam.id}`);
    }
  };

  const chip = (active) =>
    `rounded-xl px-3 py-1.5 text-sm font-medium ${
      active
        ? 'bg-brand-600 text-white'
        : 'bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-slate-900 dark:text-gray-300 dark:ring-slate-700'
    }`;

  const filters = (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Input label="Axtar" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ad, bölgə, fənn..." />
      <Select label="Bölgə" value={region} onChange={(e) => setRegion(e.target.value)}>
        <option value="all">Hamısı</option>
        {regions.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </Select>
      <Select label="Fənn" value={subject} onChange={(e) => setSubject(e.target.value)}>
        <option value="all">Hamısı</option>
        {subjects.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </Select>
      <Select label="Sıralama" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
        <option value="rank">Həftəlik + orta (standart)</option>
        <option value="weekly">Həftəlik imtahan sayı</option>
        <option value="avg">Orta nəticə</option>
        <option value="region">Bölgə</option>
        <option value="subject">Fənn</option>
        <option value="name">Ad</option>
      </Select>
      <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
        <button type="button" className={chip(dir === 'desc')} onClick={() => setDir('desc')}>DESC</button>
        <button type="button" className={chip(dir === 'asc')} onClick={() => setDir('asc')}>ASC</button>
        <p className="text-xs text-gray-500">Standart: bu həftə keçirilən imtahan sayı, sonra orta nəticə.</p>
      </div>
    </div>
  );

  const detail = (
    <>
      <Button variant="ghost" onClick={() => navigate(listPath)}>← Müəllim tap</Button>
      <h2 className="mt-4 text-xl font-bold">{selected?.fullName || 'Müəllim'}</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-indigo-100/70">
        {selected?.position || 'Bölgə göstərilməyib'}
        {selected?.subjects?.length ? ` · ${selected.subjects.join(', ')}` : ''}
        {' · '}bu həftə {selected?.weeklyExamCount ?? 0} imtahan
        {selected?.avgScore ? ` · orta ${Math.round(selected.avgScore)}%` : ''}
      </p>
      {loading ? <Skeleton className="mt-6 h-40" /> : null}
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
                    ? 'Ödənişlə aç'
                    : (user?.role === 'Student' || user?.practice ? 'İmtahana başla' : 'Daxil olub bax')
                }
                onOpen={isExamScheduled(exam) ? undefined : () => openExam(exam)}
              />
            );
          })}
        </div>
      )}
    </>
  );

  const list = (
    <>
      <p className="mb-4 text-sm text-gray-500 dark:text-indigo-100/70">
        Müəllimləri bölgə və fənnə görə süzün. Sıra standart olaraq həftəlik imtahan sayı və orta nəticəyə görədir.
        Özəl imtahanlar kilidli görünür — giriş ödənişlidir; yüksək nəticə şəxsi endirim bileti qazandırır.
      </p>
      {filters}
      {loading ? <Skeleton className="mt-6 h-40" /> : null}
      {!loading && !filtered.length ? (
        <EmptyState title="Müəllim tapılmadı" text="Başqa bölgə və ya fənn seçin." />
      ) : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {filtered.map((t) => (
          <Card key={t.id} onClick={() => navigate(`${listPath}/${t.id}`)} className="cursor-pointer">
            <p className="font-bold">{t.fullName}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin size={14} /> {t.position || 'Bölgə yoxdur'}
            </p>
            {t.subjects?.length ? (
              <p className="mt-1 text-xs text-brand-600">{t.subjects.join(' · ')}</p>
            ) : null}
            <p className="mt-3 text-xs text-gray-500">
              Bu həftə {t.weeklyExamCount} imtahan · orta nəticə {t.avgScore ? `${Math.round(t.avgScore)}%` : '—'}
            </p>
            {followed.includes(String(t.id)) ? (
              <p className="mt-2 text-xs font-medium text-emerald-700">İzlənilir</p>
            ) : (
              <p className="mt-2 text-xs text-brand-600">İmtahanlara bax →</p>
            )}
          </Card>
        ))}
      </div>
    </>
  );

  const body = id ? detail : list;
  const modal = (
    <AccessPaymentModal
      open={payOpen}
      onClose={() => setPayOpen(false)}
      user={user}
      teacher={selected || teachers.find((t) => String(t.id) === examTeacherId(payExam))}
      exam={payExam}
      onPaid={afterPaid}
      onNeedLogin={() => navigate('/login')}
    />
  );

  if (embedded) {
    return (
      <AppShell title={id ? 'Müəllimin imtahanları' : 'Müəllim tap'}>
        {body}
        {modal}
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <PublicNav darkOnNavy />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-black">{id ? 'Müəllimin imtahanları' : 'Müəllim tap'}</h1>
        <div className="mt-6 [&_p]:text-indigo-100/75">{body}</div>
        {user ? (
          <Button variant="secondary" className="mt-8" onClick={() => navigate('/student')}>
            Kabinetə qayıt
          </Button>
        ) : null}
      </div>
      {modal}
    </div>
  );
}
