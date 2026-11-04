import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import DreamUniversityCard from '../components/DreamUniversityCard';
import ExamRow from '../components/ExamRow';
import WeeklyRanking from '../components/WeeklyRanking';
import { Button, Card, EmptyState, Skeleton } from '../components/ui';
import { fetchAllPublicExams, fetchExams, fetchStudentHistory } from '../lib/examApi';
import { localDb } from '../lib/localDb';
import { examSubject, subjectProgress } from '../lib/publicExams';
import { isExamLive, isExamScheduled, parseExamDate, resolveExamStatus } from '../lib/utils';

function examSortTime(exam) {
  return (
    parseExamDate(exam.startTime || exam.StartTime)?.getTime()
    || parseExamDate(exam.createdAt || exam.CreatedAt)?.getTime()
    || parseExamDate(exam.endTime || exam.EndTime)?.getTime()
    || 0
  );
}

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const submittedNotice = searchParams.get('teslim') === '1';
  const [exams, setExams] = useState([]);
  const [publicExams, setPublicExams] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [examList, hist, pubs] = await Promise.all([
          fetchExams(),
          fetchStudentHistory(user?.id),
          fetchAllPublicExams().catch(() => []),
        ]);
        setExams(examList.filter((e) => resolveExamStatus(e) !== 'Draft'));
        setHistory(hist);
        setPublicExams(pubs);
      } finally {
        setLoading(false);
      }
    };
    if (user) run();
  }, [user]);

  const openExam = (exam) => {
    if (isExamScheduled(exam)) return;
    const submitted = history.some((h) => {
      if (String(h.examId) !== String(exam.id)) return false;
      const status = String(h.status || h.Status || '').toLowerCase();
      if (status === 'inprogress' || status === 'in_progress') return false;
      return Boolean(h.submittedAt || h.SubmittedAt);
    });
    if (isExamLive(exam) && (!submitted || user?.practice)) {
      navigate(`/student/exams/${exam.id}`);
      return;
    }
    navigate(`/student/exams/${exam.id}/review`);
  };

  const latestExams = useMemo(
    () => [...exams].sort((a, b) => examSortTime(b) - examSortTime(a)).slice(0, 5),
    [exams],
  );

  const fenStats = useMemo(() => {
    const followed = new Set(localDb.followedTeacherIds(user?.id).map(String));
    const mine = user?.teacherId != null ? String(user.teacherId) : '';
    const joined = new Set();
    exams.forEach((exam) => joined.add(examSubject(exam)));
    publicExams.forEach((exam) => {
      const owner = String(exam.teacherId ?? exam.TeacherId ?? '');
      if (followed.has(owner) || (mine && owner === mine)) joined.add(examSubject(exam));
    });
    history.forEach((item) => {
      const exam = publicExams.find((e) => String(e.id) === String(item.examId))
        || exams.find((e) => String(e.id) === String(item.examId));
      if (exam) joined.add(examSubject(exam));
    });
    return subjectProgress(publicExams, history, Array.from(joined));
  }, [publicExams, history, exams, user?.id, user?.teacherId]);

  return (
    <AppShell title="">
      {submittedNotice ? (
        <Card className="mb-6 text-center">
          <p className="text-lg font-extrabold">İmtahan təhvil verildi</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Nəticən avtomatik saxlanıldı. Düzgün/səhv cavablar və ümumi sıralama imtahan bitəndən sonra, yenidən daxil olanda açılacaq.
          </p>
          <Button className="mt-4" variant="secondary" onClick={() => setSearchParams({})}>Bağla</Button>
        </Card>
      ) : null}

      <div className="student-home">
        <div className="student-home-primary">
      <DreamUniversityCard user={user} />

      <div className="mb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Kabinet · fənnlər</h2>
          <Button variant="secondary" onClick={() => navigate('/student/public')}>İmtahan yeri</Button>
        </div>
        {fenStats.length === 0 ? (
          <div className="rounded-[22px] bg-[#171d27] px-4 py-5 text-sm font-semibold text-white/55 ring-1 ring-white/10">
            İmtahan yerində fənnə qoşulun (açıq imtahan açın və ya müəllim izləyin). Sonra burada həmin fənnin açıq imtahanlarından neçəsinə daxil olduğunuz görünəcək.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 min-[1100px]:grid-cols-4">
            {fenStats.map((row) => {
              const pct = row.total ? Math.min(100, Math.round((row.entered / row.total) * 100)) : 0;
              return (
                <button
                  key={row.subject}
                  type="button"
                  onClick={() => navigate('/student/public')}
                  className="rounded-[22px] bg-[#171d27] px-4 py-4 text-left text-white ring-1 ring-white/10"
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/40">Fənn</p>
                  <p className="mt-1 truncate text-[15px] font-extrabold leading-tight">{row.subject}</p>
                  <p className="mt-3 text-2xl font-black tabular-nums leading-none">
                    <span className="text-[#f0b429]">{row.entered}</span><span className="text-white">/{row.total}</span>
                  </p>
                  <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-[#f0b429]" style={{ width: `${pct}%` }} />
                  </span>
                  <p className="mt-2 text-[11px] font-semibold leading-tight text-white/40">açıq imtahan tamamlandı</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="min-w-0 overflow-hidden rounded-[28px] bg-[#141a22] p-4 text-white ring-1 ring-white/10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-lg font-bold">Ən son imtahanlar</h2>
          <button
            type="button"
            onClick={() => navigate('/student/public')}
            className="shrink-0 text-xs font-extrabold text-[#9d8cff]"
          >
            Hamısı
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-[22px]" />
            <Skeleton className="h-16 rounded-[22px]" />
          </div>
        ) : latestExams.length === 0 ? (
          <EmptyState
            title="Hələ imtahan yoxdur"
            text="Açıq imtahanlar İmtahan yerində görünür. Müəlliminiz dərc edəndə ən yeniləri burada da çıxacaq."
            action={
              <Button variant="secondary" onClick={() => navigate('/student/public')}>
                İmtahan yeri
              </Button>
            }
          />
        ) : (
          <div className="exam-board-list">
            {latestExams.map((exam) => (
              <ExamRow
                key={exam.id}
                exam={exam}
                onOpen={isExamScheduled(exam) ? undefined : () => openExam(exam)}
              />
            ))}
          </div>
        )}
      </div>
        </div>
        <aside className="student-home-aside">
          <WeeklyRanking variant="student" />
        </aside>
      </div>
    </AppShell>
  );
}
