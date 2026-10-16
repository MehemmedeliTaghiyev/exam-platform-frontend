import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import { EmptyState, Skeleton } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { fetchAllPublicExams, fetchExams } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import { examRetakeReady, isExamEnded, isExamScheduled } from '../lib/utils';
import { examMatchesSearch } from '../lib/publicExams';
import ExamSearchBar from '../components/ExamSearchBar';

export default function SavedExams() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameQuery, setNameQuery] = useState('');
  const [dateQuery, setDateQuery] = useState('');

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
    if (isExamEnded(exam)) {
      navigate(`/student/exams/${exam.id}/review`);
      return;
    }
    navigate(`/student/exams/${exam.id}`);
  };

  const retakeExam = (exam) => {
    if (!examRetakeReady(exam)) return;
    navigate(`/student/exams/${exam.id}?yeniden=1`);
  };

  const visible = saved.filter((exam) => examMatchesSearch(exam, { name: nameQuery, date: dateQuery }));

  return (
    <AppShell title="Saxlanılan imtahanlar">
      <p className="mb-6 text-sm text-[var(--muted)]">Saxladığınız imtahanlar bu cihazda qalır və buradan yenidən açıla bilər.</p>
      <ExamSearchBar name={nameQuery} date={dateQuery} onName={setNameQuery} onDate={setDateQuery} />
      {loading ? (
        <Skeleton className="h-40" />
      ) : saved.length === 0 ? (
        <EmptyState title="Saxlanılan imtahan yoxdur" text="İmtahan kartında «Saxla» basın." />
      ) : visible.length === 0 ? (
        <EmptyState title="Uyğun imtahan yoxdur" text="Adı və ya tarixi dəyişin." />
      ) : (
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
          {visible.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              saved
              onToggleSave={toggle}
              onRetake={examRetakeReady(exam) ? retakeExam : undefined}
              actionLabel={isExamEnded(exam) ? 'Nəticələrə bax' : 'İmtahana bax'}
              onOpen={() => openExam(exam)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
