import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Lock } from 'lucide-react';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import { Card, EmptyState, Skeleton } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { fetchAllPublicExams, fetchExams, fetchListedExamsForTeacher, fetchStudentHistory } from '../lib/examApi';
import { studentSubscriptions } from '../lib/groupSubscriptions';
import {
  findSyllabusTopic,
  isSyllabusSubjectOpen,
  OPEN_SYLLABUS_SUBJECT,
  resultLabel,
  studentCanSeeExam,
  syllabusExamsForTopic,
  syllabusSubjects,
  syllabusTopicsForList,
} from '../lib/syllabus';
import { canEnterExam } from '../lib/teacherAccess';
import { enteredExamIds } from '../lib/publicExams';
import { examRetakeReady, isExamEnded, isExamScheduled, resolveExamStatus, studentResultsReady } from '../lib/utils';

export default function StudentSyllabus() {
  const { topicId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const subs = studentSubscriptions(user?.id);
  const ownTeacherId = user?.teacherId ?? user?.TeacherId;
  const defaultSubject = OPEN_SYLLABUS_SUBJECT;
  const [subject, setSubject] = useState(defaultSubject);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const teacherIds = [...new Set([
          ownTeacherId,
          ...subs.map((row) => row.teacherId),
        ].filter((id) => id != null && id !== ''))];
        const [mine, pubs, hist, listed] = await Promise.all([
          fetchExams().catch(() => []),
          fetchAllPublicExams().catch(() => []),
          fetchStudentHistory(user?.id).catch(() => []),
          Promise.all(teacherIds.map((id) => fetchListedExamsForTeacher(id).catch(() => []))),
        ]);
        const merged = [...mine, ...pubs, ...listed.flat()].filter((exam, index, all) => (
          exam?.id != null && all.findIndex((row) => String(row.id) === String(exam.id)) === index
        ));
        if (!cancelled) {
          setExams(merged.filter((exam) => resolveExamStatus(exam) !== 'Draft' && studentCanSeeExam(user, exam)));
          setHistory(hist);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, ownTeacherId]);

  const attemptByExam = useMemo(() => {
    const map = new Map();
    history.forEach((item) => {
      if (item?.examId == null) return;
      const submitted = item.submittedAt || item.SubmittedAt;
      if (!submitted) return;
      map.set(String(item.examId), item);
    });
    return map;
  }, [history]);
  const entered = useMemo(() => enteredExamIds(history), [history]);

  const topics = syllabusTopicsForList(subject, exams, user);
  const topic = findSyllabusTopic(topicId);

  const openExam = (exam) => {
    if (isExamScheduled(exam) || !canEnterExam(user, exam)) return;
    if (isExamEnded(exam) || attemptByExam.has(String(exam.id))) {
      navigate(`/student/exams/${exam.id}/review`);
      return;
    }
    navigate(`/student/exams/${exam.id}`);
  };

  if (topic && !isSyllabusSubjectOpen(topic.subject)) {
    return (
      <AppShell title={topic.title}>
        <button type="button" className="syllabus-back" onClick={() => navigate('/student/syllabus')}>
          ← Sillabus
        </button>
        <div className="mt-6">
          <EmptyState
            title={`${topic.subject} hələ bağlıdır`}
            text="İndi yalnız Riyaziyyat sillabusu açıqdır. Digər fənlər tezliklə açılacaq."
          />
        </div>
      </AppShell>
    );
  }

  if (topic) {
    const list = syllabusExamsForTopic(exams, topic, user);
    return (
      <AppShell title={topic.title}>
        <button type="button" className="syllabus-back" onClick={() => navigate('/student/syllabus')}>
          ← Sillabus
        </button>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {topic.subject} · abunə qruplarınız və öz müəlliminizin sınaqları. Yaşıl: daxil olmusunuz. Qırmızı: hələ yox.
        </p>
        {loading ? <Skeleton className="mt-6 h-40" /> : null}
        {!loading && !list.length ? (
          <div className="mt-6">
            <EmptyState title="Bu mövzuda sınaq yoxdur" text="Müəllim bu başlıqda imtahan paylaşanda burada görünəcək." />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {list.map((exam) => {
              const attempt = attemptByExam.get(String(exam.id));
              const done = Boolean(attempt);
              const started = entered.has(String(exam.id));
              return (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  progress={done ? 'done' : undefined}
                  entered={started}
                  resultText={resultLabel(attempt, exam, user)}
                  teacherName={exam.teacherName}
                  actionLabel={
                    done
                      ? (studentResultsReady(exam, user) ? 'Nəticəyə bax' : 'Təhvil verildi')
                      : canEnterExam(user, exam) ? 'İmtahana başla' : 'Giriş yoxdur'
                  }
                  onOpen={isExamScheduled(exam) || !canEnterExam(user, exam) ? undefined : () => openExam(exam)}
                  onRetake={examRetakeReady(exam) && canEnterExam(user, exam) ? () => navigate(`/student/exams/${exam.id}?yeniden=1`) : undefined}
                />
              );
            })}
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell title="Sillabus">
      <p className="mb-5 text-sm text-[var(--muted)]">
        Mövzu başlığına toxunun. Abunə olduğunuz qrupların və öz müəlliminizin imtahanları orada açılır.
      </p>
      <div className="mb-5 flex flex-wrap gap-2">
        {syllabusSubjects().map((name) => {
          const open = isSyllabusSubjectOpen(name);
          return (
            <button
              key={name}
              type="button"
              disabled={!open}
              title={open ? name : 'Tezliklə açılacaq'}
              onClick={() => open && setSubject(name)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold ${
                subject === name
                  ? 'bg-[var(--accent)] text-[#3a2200]'
                  : open
                    ? 'bg-[var(--card)] text-[var(--text)] ring-1 ring-[var(--line)]'
                    : 'cursor-not-allowed bg-[var(--card)] text-[var(--muted)] ring-1 ring-[var(--line)] opacity-70'
              }`}
            >
              {!open ? <Lock size={13} strokeWidth={2.5} /> : null}
              {name}
            </button>
          );
        })}
      </div>
      {loading ? <Skeleton className="h-40" /> : (
        <div className="grid gap-3">
          {topics.map((row) => {
            const list = syllabusExamsForTopic(exams, row, user);
            const count = list.length;
            const started = list.filter((exam) => entered.has(String(exam.id))).length;
            const pending = Math.max(0, count - started);
            return (
              <Card
                key={row.id}
                className="cursor-pointer"
                onClick={() => navigate(`/student/syllabus/${encodeURIComponent(row.id)}`)}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e7f6ea] text-sm font-black text-[#1f7a3a]">
                    {row.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-[var(--text)]">{row.title}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                      {pending > 0
                        ? <span className="font-black text-[#f0b429]">+{pending}</span>
                        : count
                          ? `${started}/${count} sınağa daxil olub`
                          : 'Hələ sınaq yoxdur'}
                    </p>
                  </div>
                  {pending > 0 ? (
                    <span className="shrink-0 rounded-full bg-[#f0b429]/15 px-2.5 py-1 text-sm font-black text-[#f0b429]">
                      +{pending}
                    </span>
                  ) : (
                    <ChevronRight size={18} className="text-[var(--muted)]" />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
