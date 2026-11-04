import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { fetchExams } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import { teacherSubjectOf } from '../lib/storageCatalog';
import { examAudience, isMixedSyllabusExam, teacherSyllabusState } from '../lib/syllabus';

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
      <section>
        <h2 className="text-lg font-black">Sillabus</h2>
        <p className="mt-2 text-sm font-semibold text-white/45">Fənn qeydiyyatda seçiləndən sonra sillabus burada açılır.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-black">Sillabus · {subject}</h2>
        <p className="shrink-0 text-sm font-semibold text-white/40">{state.done} / {state.total}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-white/45">{state.done}/{state.total} mövzuda sınaq paylaşılıb</p>
      {state.current ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white/70">
          <MapPin size={15} className="text-[#9d93ff]" />
          Hazırda: <span className="font-extrabold text-white">{state.current.title}</span>
        </p>
      ) : (
        <p className="mt-3 text-sm font-semibold text-white/45">Hələ mövzu paylaşılmayıb.</p>
      )}
      <ul className="mt-4 space-y-1">
        {state.topics.map((topic) => {
          const here = state.current?.id === topic.id;
          return (
            <li key={topic.id}>
              <div
                className={`flex items-center gap-3 rounded-[18px] px-3 py-3 ${
                  here ? 'bg-[linear-gradient(90deg,#6d5efc,#7c6aff)]' : ''
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${
                    here ? 'bg-white/20 text-white' : 'text-white/35'
                  }`}
                >
                  {topic.order}
                </span>
                <p className="min-w-0 flex-1 truncate font-extrabold">{topic.title}</p>
                <span className={`shrink-0 text-xs font-extrabold ${here ? 'text-white/80' : 'text-white/35'}`}>
                  {topic.exams.length ? `${topic.exams.length} imtahan` : 'Boş'}
                </span>
              </div>
              {topic.exams.length ? (
                <ul className="mt-1 space-y-1 pl-12 text-sm">
                  {topic.exams.map((exam) => (
                    <li key={exam.id}>
                      <button
                        type="button"
                        className="text-left font-semibold text-[#9d93ff] underline"
                        onClick={() => navigate(`/teacher/exams/${exam.id}`)}
                      >
                        {exam.title}
                      </button>
                      <span className="ml-2 text-xs text-white/35">
                        {isMixedSyllabusExam(exam) || examAudience(exam) === 'students'
                          ? 'öz tələbələr'
                          : 'hamı'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      {!state.topics.length ? (
        <p className="mt-3 text-sm font-semibold text-white/40">Sillabus mövzusu yoxdur.</p>
      ) : null}
    </section>
  );
}
