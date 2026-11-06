import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import ExamProgressCard from '../components/ExamProgressCard';
import { Button } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { fetchAllPublicExams, fetchExams, fetchStudentHistory } from '../lib/examApi';
import { buildExamProgress } from '../lib/examProgress';

export default function StudentProgress() {
  const { user } = useContext(AuthContext);
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const subject = searchParams.get('subject') || 'all';
  const [exams, setExams] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [mine, pubs, hist] = await Promise.all([
        fetchExams().catch(() => []),
        fetchAllPublicExams().catch(() => []),
        fetchStudentHistory(user?.id).catch(() => []),
      ]);
      if (cancelled) return;
      const merged = [...mine, ...pubs].filter((exam, index, all) => (
        exam?.id != null && all.findIndex((row) => String(row.id) === String(exam.id)) === index
      ));
      setExams(merged);
      setHistory(hist);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const allRows = useMemo(() => buildExamProgress(history, exams), [history, exams]);
  const subjects = useMemo(
    () => [...new Set(allRows.map((row) => row.subject).filter(Boolean))],
    [allRows],
  );
  const rows = useMemo(
    () => (subject === 'all' ? allRows : allRows.filter((row) => row.subject === subject)),
    [allRows, subject],
  );

  useEffect(() => {
    if (!rows.length) {
      setSelectedId('');
      return;
    }
    if (!rows.some((row) => String(row.id) === String(selectedId))) {
      setSelectedId(String(rows[rows.length - 1].id));
    }
  }, [rows, selectedId]);

  return (
    <AppShell title="">
      <div className="mx-auto max-w-xl">
        <Button variant="ghost" onClick={() => navigate('/student')}>← {t('progress.back')}</Button>
        <h1 className="mt-3 text-2xl font-black">{t('progress.title')}</h1>
        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{t('progress.lead')}</p>

        {subjects.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${subject === 'all' ? 'bg-[var(--accent)] text-[#3a2200]' : 'bg-[var(--card)] text-[var(--muted)] ring-1 ring-[var(--line)]'}`}
              onClick={() => setSearchParams({})}
            >
              {t('progress.all')}
            </button>
            {subjects.map((name) => (
              <button
                key={name}
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${subject === name ? 'bg-[var(--accent)] text-[#3a2200]' : 'bg-[var(--card)] text-[var(--muted)] ring-1 ring-[var(--line)]'}`}
                onClick={() => setSearchParams({ subject: name })}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="card-vector mt-5 rounded-[24px] ring-1 ring-[var(--line)]">
          <ExamProgressCard
            rows={rows}
            selectedId={selectedId}
            onSelect={setSelectedId}
            emptyText={t('progress.empty')}
          />
        </div>
      </div>
    </AppShell>
  );
}
