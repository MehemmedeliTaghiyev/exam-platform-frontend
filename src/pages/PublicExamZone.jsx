import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import PublicNav from '../components/PublicNav';
import { Button, EmptyState, Skeleton } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { fetchAllPublicExams } from '../lib/examApi';
import { filterPublicExams, groupBySubject, uniqueSubjects } from '../lib/publicExams';
import { isExamScheduled } from '../lib/utils';

export default function PublicExamZone({ embedded = false }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateMode, setDateMode] = useState('all');
  const [pickDate, setPickDate] = useState('');
  const [subject, setSubject] = useState('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchAllPublicExams();
        if (!cancelled) setExams(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.practice]);

  const subjects = useMemo(() => uniqueSubjects(exams), [exams]);
  const filtered = useMemo(
    () => filterPublicExams(exams, { dateMode, pickDate, subject }),
    [exams, dateMode, pickDate, subject],
  );
  const grouped = useMemo(() => groupBySubject(filtered), [filtered]);

  const openExam = (exam) => {
    if (isExamScheduled(exam)) return;
    if (user?.role === 'Student' || user?.practice) {
      navigate(`/student/exams/${exam.id}`);
      return;
    }
    navigate('/login');
  };

  const filters = (
    <div className="mb-6 space-y-4">
      <p className="text-sm text-gray-500 dark:text-indigo-100/70">
        Müəllimlərin açıq dərc etdiyi imtahanlar fənnə və tarixə görə burada görünür. Bu gün, dünən və ya seçdiyiniz günü süzgəcdən keçirin.
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          ['all', 'Hamısı'],
          ['today', 'Bu gün'],
          ['yesterday', 'Dünən'],
          ['pick', 'Tarix seç'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setDateMode(id)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
              dateMode === id
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-slate-900 dark:text-gray-300 dark:ring-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
        {dateMode === 'pick' ? (
          <input
            type="date"
            value={pickDate}
            onChange={(e) => setPickDate(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubject('all')}
          className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
            subject === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-slate-900 dark:text-gray-300 dark:ring-slate-700'
          }`}
        >
          Bütün fənlər
        </button>
        {subjects.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setSubject(name)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
              subject === name
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-slate-900 dark:text-gray-300 dark:ring-slate-700'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );

  const body = loading ? (
    <div className="grid gap-4 sm:grid-cols-2">
      <Skeleton className="h-44" />
      <Skeleton className="h-44" />
    </div>
  ) : !filtered.length ? (
    <EmptyState
      title="Bu süzgəcdə açıq imtahan yoxdur"
      text="Başqa gün və ya fənn seçin. Müəllim açıq dərc edəndə imtahan burada görünür."
    />
  ) : (
    <div className="space-y-10">
      {grouped.map(([name, list]) => (
        <section key={name}>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">{name}</h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                showTimes
                teacherName={exam.teacherName}
                actionLabel={user?.role === 'Student' || user?.practice ? 'İmtahana bax' : 'Daxil olub bax'}
                onOpen={isExamScheduled(exam) ? undefined : () => openExam(exam)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );

  if (embedded) {
    return (
      <AppShell title="Ümumi zona">
        {filters}
        {body}
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <PublicNav darkOnNavy />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-black">Açıq imtahanlar</h1>
        <div className="mt-6 [&_p]:text-indigo-100/75">
          {filters}
          {body}
          {user ? (
            <Button variant="secondary" className="mt-8" onClick={() => navigate('/student')}>
              Kabinetə qayıt
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
