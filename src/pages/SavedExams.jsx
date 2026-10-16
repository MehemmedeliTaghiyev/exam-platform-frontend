import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import { EmptyState, Skeleton } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { fetchAllPublicExams, fetchExams } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import { isExamScheduled } from '../lib/utils';

export default function SavedExams() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const stored = localDb.getSavedExams(user?.id);
    setSaved(stored);
    setLoading(true);
    try {
      const [mine, pubs] = await Promise.all([
        fetchExams().catch(() => []),
        fetchAllPublicExams().catch(() => []),
      ]);
      const byId = new Map();
      [...mine, ...pubs, ...stored].forEach((exam) => {
        if (exam?.id == null) return;
        byId.set(String(exam.id), { ...byId.get(String(exam.id)), ...exam });
      });
      setSaved(stored.map((item) => byId.get(String(item.id)) || item));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  const toggle = (exam) => {
    setSaved(localDb.toggleSavedExam(user?.id, exam));
  };

  const openExam = (exam) => {
    if (isExamScheduled(exam)) return;
    navigate(`/student/exams/${exam.id}`);
  };

  return (
    <AppShell title="Saxlanılan imtahanlar">
      <p className="mb-6 text-sm text-[var(--muted)]">Saxladığınız imtahanlar bu cihazda qalır və buradan yenidən açıla bilər.</p>
      {loading ? (
        <Skeleton className="h-40" />
      ) : saved.length === 0 ? (
        <EmptyState title="Saxlanılan imtahan yoxdur" text="İmtahan kartında «Saxla» basın." />
      ) : (
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
          {saved.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              saved
              onToggleSave={toggle}
              actionLabel="İmtahana bax"
              onOpen={() => openExam(exam)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
