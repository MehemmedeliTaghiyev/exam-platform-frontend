import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { fetchExams } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import { teacherSubjectOf } from '../lib/storageCatalog';
import { examAudience, isMixedSyllabusExam, teacherSyllabusState } from '../lib/syllabus';
import { Badge, Card, EmptyState } from './ui';

export default function TeacherSyllabusPanel() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const subject = teacherSubjectOf(user) || localDb.getTeacherSubject(user?.id, user?.email);
  const [exams, setExams] = useState([]);

  useEffect(() => {
    fetchExams().then(setExams).catch(() => setExams([]));
  }, [user?.id]);

  const mine = useMemo(
    () => exams.filter((exam) => String(exam.teacherId ?? exam.TeacherId ?? user?.id) === String(user?.id)),
    [exams, user?.id],
  );
  const state = useMemo(() => teacherSyllabusState(mine, subject), [mine, subject]);

  if (!subject) {
    return (
      <Card className="mb-8">
        <h2 className="text-lg font-bold">Sillabus</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Fənn qeydiyyatda seçiləndən sonra sillabus burada açılır.</p>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Sillabus · {subject}</h2>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1f7a3a]">
            <MapPin size={15} />
            {state.current ? `Hazırda: ${state.current.title}` : 'Hələ mövzu paylaşılmayıb'}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">{state.done}/{state.total} mövzuda sınaq paylaşılıb</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {state.topics.map((topic) => {
          const here = state.current?.id === topic.id;
          return (
            <div
              key={topic.id}
              className={`rounded-2xl border px-4 py-3 ${here ? 'border-[#2f7a45] bg-[#eef8f1] dark:bg-[#163022]' : 'border-[var(--line)]'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-extrabold">{topic.order}. {topic.title}</p>
                <Badge tone={topic.exams.length ? 'success' : 'neutral'}>
                  {topic.exams.length ? `${topic.exams.length} imtahan` : 'Boş'}
                </Badge>
              </div>
              {topic.exams.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {topic.exams.map((exam) => (
                    <li key={exam.id}>
                      <button
                        type="button"
                        className="text-left font-semibold text-[#1f7a3a] underline"
                        onClick={() => navigate(`/teacher/exams/${exam.id}`)}
                      >
                        {exam.title}
                      </button>
                      <span className="ml-2 text-xs text-[var(--muted)]">
                        {isMixedSyllabusExam(exam) || examAudience(exam) === 'students'
                          ? 'öz tələbələr'
                          : 'hamı'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
      {!state.topics.length ? <EmptyState title="Sillabus yoxdur" text="" /> : null}
    </Card>
  );
}
