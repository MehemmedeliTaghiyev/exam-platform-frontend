import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, Lock } from 'lucide-react';
import AppShell from '../components/AppShell';
import ExamCard from '../components/ExamCard';
import { Card, EmptyState, Skeleton } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { fetchAllPublicExams, fetchExam, fetchExams, fetchListedExamsForTeacher, fetchStudentHistory } from '../lib/examApi';
import { studentSubscriptions } from '../lib/groupSubscriptions';
import {
  findSyllabusTopic,
  isSyllabusSubjectOpen,
  OPEN_SYLLABUS_SUBJECT,
  resultLabel,
  examSyllabusTopics,
  studentCanSeeExam,
  syllabusExamsForTopic,
  syllabusSubjects,
  syllabusTopicsForList,
} from '../lib/syllabus';
import {
  allCalendarTopics,
  findCalendarTopic,
  findIntervalByStart,
  formatIntervalRange,
  MATH_CALENDAR,
  studentTopicPlace,
  tbilisiYmd,
  topicHasEnded,
} from '../lib/mathCalendar';
import { DAILY_TOPIC_SENDS, topicTitleForDay } from '../lib/dailyTopicQuiz';
import { annotateTopicPapers, quizCountForTopic, topicAveragePercent } from '../lib/topicQuizDifficulty';
import {
  archiveWeeklyWindows,
  examIdOf,
  isStudentWeeklyExam,
  LIVE_WEEKLY_EASY_EXAM_ID,
  LIVE_WEEKLY_MEDIUM_EXAM_ID,
  republicMixedExams,
  WEEKLY_SMOKE_EXAM_ID,
  weeklyPairForInterval,
} from '../lib/weeklyMath';
import { canEnterExam, formatManat } from '../lib/teacherAccess';
import { enteredExamIds } from '../lib/publicExams';
import { examRetakeReady, isExamEnded, isExamScheduled, resolveExamStatus, studentResultsReady } from '../lib/utils';
import {
  buyWeeklyPass,
  WEEKLY_PASS_PRICE,
  weeklyPassActive,
  weeklyPassRemainingMs,
} from '../lib/weeklyDownloadPass';
import { useStudentWallet } from '../lib/studentWallet';

function PaperGrid({ papers, attemptByExam, entered, user, openExam, navigate, annotate = false, series }) {
  const list = papers.filter(Boolean);
  if (!list.length) {
    return (
      <div className="mt-4">
        <EmptyState title="Hələ sınaq yoxdur" text="Bu mövzuya sınaq düşəndə burada açılacaq." />
      </div>
    );
  }
  const rows = annotate
    ? annotateTopicPapers(list, series)
    : list.map((exam) => ({ exam, bandLabel: '' }));
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {rows.map((row) => {
        const exam = row.exam;
        const attempt = attemptByExam.get(String(exam.id));
        const done = Boolean(attempt);
        const started = entered.has(String(exam.id));
        return (
          <ExamCard
            key={exam.id}
            exam={exam}
            progress={done ? 'done' : undefined}
            entered={started}
            resultText={[row.bandLabel, resultLabel(attempt, exam, user)].filter(Boolean).join(' · ')}
            teacherName={exam.teacherName}
            actionLabel={
              done
                ? (studentResultsReady(exam, user) ? 'Nəticəyə bax' : 'Təhvil verildi')
                : canEnterExam(user, exam) ? 'İmtahana başla' : 'Giriş yoxdur'
            }
            onOpen={isExamScheduled(exam) || !canEnterExam(user, exam) ? undefined : () => openExam(exam)}
            onRetake={examRetakeReady(exam, attempt) && canEnterExam(user, exam) ? () => navigate(`/student/exams/${exam.id}?yeniden=1`) : undefined}
          />
        );
      })}
    </div>
  );
}

export default function StudentSyllabus() {
  const { topicId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const subs = studentSubscriptions(user?.id);
  const ownTeacherId = user?.teacherId ?? user?.TeacherId;
  const defaultSubject = OPEN_SYLLABUS_SUBJECT;
  const [subject, setSubject] = useState(defaultSubject);
  const placement = useMemo(() => studentTopicPlace(user), [user]);
  const dayQuizTopic = useMemo(() => topicTitleForDay(tbilisiYmd()), []);
  const windowStart = searchParams.get('pencere') || placement.place?.start;
  const viewed = findIntervalByStart(windowStart) || placement.place;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const teacherIds = [...new Set([
          ownTeacherId,
          ...subs.map((row) => row.teacherId),
        ].filter((id) => id != null && id !== ''))];
        const dailyIds = [...new Set(DAILY_TOPIC_SENDS.map((row) => row.examId).filter(Boolean))];
        const [mine, pubs, hist, listed, easy, medium, ...dailyExams] = await Promise.all([
          fetchExams().catch(() => []),
          fetchAllPublicExams().catch(() => []),
          fetchStudentHistory(user?.id).catch(() => []),
          Promise.all(teacherIds.map((id) => fetchListedExamsForTeacher(id).catch(() => []))),
          fetchExam(LIVE_WEEKLY_EASY_EXAM_ID).catch(() => null),
          fetchExam(LIVE_WEEKLY_MEDIUM_EXAM_ID).catch(() => null),
          ...dailyIds.map((id) => fetchExam(id).catch(() => null)),
        ]);
        const merged = [...mine, ...pubs, ...listed.flat(), easy, medium, ...dailyExams].filter((exam, index, all) => (
          exam?.id != null && all.findIndex((row) => String(row.id) === String(exam.id)) === index
        ));
        if (!cancelled) {
          setExams(merged.filter((exam) => (
            String(exam.id) !== WEEKLY_SMOKE_EXAM_ID
            && resolveExamStatus(exam) !== 'Draft'
            && studentCanSeeExam(user, exam)
          )));
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

  const pair = useMemo(() => weeklyPairForInterval(viewed, exams), [viewed, exams]);
  const currentPair = useMemo(
    () => weeklyPairForInterval(placement.current, exams),
    [placement.current, exams],
  );
  const mixed = useMemo(() => republicMixedExams(exams), [exams]);
  const archives = useMemo(() => archiveWeeklyWindows(placement.today), [placement.today]);
  const mathTopics = useMemo(() => allCalendarTopics(), []);
  const calendarHit = findCalendarTopic(topicId);

  const papersForTopic = (topic) => {
    // Only papers tagged for this topic — not the whole weekly pair.
    const matched = (exams || []).filter((exam) => {
      if (!studentCanSeeExam(user, exam)) return false;
      if (examIdOf(exam) === WEEKLY_SMOKE_EXAM_ID) return false;
      if (examIdOf(exam) === LIVE_WEEKLY_EASY_EXAM_ID || examIdOf(exam) === LIVE_WEEKLY_MEDIUM_EXAM_ID) {
        return false; // asan/orta kağız yalnız «Həftəlik sınaq» blokunda
      }
      return examSyllabusTopics(exam).some((row) => row.title === topic.title);
    });
    const seen = new Set();
    return matched
      .filter((exam) => {
        const id = String(exam.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .sort((a, b) => Number(examIdOf(b) || 0) - Number(examIdOf(a) || 0));
  };

  const wallet = useStudentWallet(user);
  const [passBusy, setPassBusy] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const passOn = weeklyPassActive(user);
  const passLeft = weeklyPassRemainingMs(user);

  const openExam = (exam) => {
    if (isExamScheduled(exam)) return;
    if (isStudentWeeklyExam(exam) && !weeklyPassActive(user)) {
      setPassMsg(`Həftəlik sınaqlar üçün ${formatManat(WEEKLY_PASS_PRICE)} ödəniş lazımdır (7 gün).`);
      return;
    }
    if (!canEnterExam(user, exam)) return;
    if (isExamEnded(exam) || attemptByExam.has(String(exam.id))) {
      navigate(`/student/exams/${exam.id}/review`);
      return;
    }
    navigate(`/student/exams/${exam.id}`);
  };

  const unlockWeekly = async () => {
    if (passBusy || passOn) return;
    setPassBusy(true);
    setPassMsg('');
    try {
      buyWeeklyPass(user);
      setPassMsg('Həftəlik sınaqlar 7 gün açıqdır.');
    } catch (err) {
      if (err?.code === 'BALANS_YOX') {
        setPassMsg(`Balans çatmır. ${formatManat(WEEKLY_PASS_PRICE)} lazımdır — cüzdana keç.`);
        navigate('/student/wallet');
      } else {
        setPassMsg('Ödəniş alınmadı. Yenidən cəhd edin.');
      }
    } finally {
      setPassBusy(false);
    }
  };

  const openWindow = (start) => {
    const next = new URLSearchParams(searchParams);
    if (!start || start === placement.place?.start) next.delete('pencere');
    else next.set('pencere', start);
    setSearchParams(next);
    navigate({ pathname: '/student/syllabus', search: next.toString() ? `?${next}` : '' });
  };

  if (topicId && calendarHit.topic) {
    const windowPair = weeklyPairForInterval(calendarHit.interval, exams);
    const topicPapers = papersForTopic(calendarHit.topic);
    return (
      <AppShell title={calendarHit.topic.title}>
        <button type="button" className="syllabus-back" onClick={() => navigate('/student/syllabus')}>
          ← Sillabus
        </button>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {formatIntervalRange(calendarHit.interval)}
          {calendarHit.interval?.send?.weekly
            ? ' · bu bölməyə aid mövzu sınaqları; həftəlik asan/orta yuxarıdakı «Həftəlik sınaq»dadır.'
            : ' · blok / situasiya pəncərəsi.'}
          {windowPair.archived ? ' Bu pəncərə arxivdir.' : ''}
        </p>
        {loading ? <Skeleton className="mt-6 h-40" /> : (
          <PaperGrid
            papers={topicPapers}
            attemptByExam={attemptByExam}
            entered={entered}
            user={user}
            openExam={openExam}
            navigate={navigate}
            annotate
            series={quizCountForTopic(calendarHit.topic.title, calendarHit.interval)}
          />
        )}
      </AppShell>
    );
  }

  if (topicId) {
    const topic = findSyllabusTopic(topicId);
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
      const list = syllabusExamsForTopic(exams, topic, user).filter((exam) => !isStudentWeeklyExam(exam));
      return (
        <AppShell title={topic.title}>
          <button type="button" className="syllabus-back" onClick={() => navigate('/student/syllabus')}>
            ← Sillabus
          </button>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {topic.subject} · abunə qruplarınız və öz müəlliminizin sınaqları.
          </p>
          {loading ? <Skeleton className="mt-6 h-40" /> : null}
          {!loading && !list.length ? (
            <div className="mt-6">
              <EmptyState title="Bu mövzuda sınaq yoxdur" text="Müəllim bu başlıqda imtahan paylaşanda burada görünəcək." />
            </div>
          ) : (
            <PaperGrid papers={list} attemptByExam={attemptByExam} entered={entered} user={user} openExam={openExam} navigate={navigate} annotate />
          )}
        </AppShell>
      );
    }
  }

  const otherTopics = subject !== OPEN_SYLLABUS_SUBJECT
    ? syllabusTopicsForList(subject, exams, user)
    : [];

  return (
    <AppShell title="Sillabus">
      <p className="mb-5 text-sm text-[var(--muted)]">
        Bütün mövzular buradadır. Gündəlik mövzu sınağı yalnız öz bölməsinə düşür. Həftəlik asan/orta ayrıca «Həftəlik sınaq»dadır; qarışıq sınaq Respublikadadır.
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

      {subject === OPEN_SYLLABUS_SUBJECT ? (
        loading ? <Skeleton className="h-40" /> : (
          <div className="space-y-8">
            <section>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">Həftəlik sınaq</p>
              <h2 className="mt-1 text-lg font-black">{viewed?.title || 'Cari pəncərə'}</h2>
              <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                {formatIntervalRange(viewed)}
                {placement.onTime ? ' · vaxtında: cari pəncərə' : ' · mövzu yeri: son bitən interval (arxiv kağız)'}
                {pair.archived ? ' · arxiv' : ''}
              </p>
              <div className="mt-3 rounded-[20px] bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
                {passOn ? (
                  <p className="text-sm font-extrabold text-[#22c55e]">
                    Açılıb · {Math.max(1, Math.ceil(passLeft / 86400000))} gün qalıb
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-extrabold">Həftəlik sınaqlar üçün {formatManat(WEEKLY_PASS_PRICE)} / 7 gün</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                      Ödəniş olmayanda giriş avtomatik bağlanır. Balans: {formatManat(wallet.balance)}
                    </p>
                    <button
                      type="button"
                      disabled={passBusy}
                      onClick={unlockWeekly}
                      className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffb84a,#f5a623)] text-sm font-extrabold text-[#3a2200] disabled:opacity-50"
                    >
                      {passBusy ? '...' : `Ödə və aç — ${formatManat(WEEKLY_PASS_PRICE)}`}
                    </button>
                  </>
                )}
                {passMsg ? <p className="mt-2 text-xs font-semibold text-[var(--muted)]">{passMsg}</p> : null}
              </div>
              {!viewed?.send?.weekly ? (
                <p className="mt-3 text-sm font-semibold text-[var(--muted)]">
                  Bu pəncərədə həftəlik sınaq göndərilmir. Əvvəlki həftənin asan və orta kağızı arxivdə qalır.
                </p>
              ) : null}
              <PaperGrid
                papers={[pair.easy, pair.medium]}
                attemptByExam={attemptByExam}
                entered={entered}
                user={user}
                openExam={openExam}
                navigate={navigate}
              />
              {placement.current?.send?.weekly
                && placement.place?.start !== placement.current.start
                && (currentPair.easy || currentPair.medium) ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-extrabold">Bu həftə (hamı üçün eyni)</h3>
                    <PaperGrid
                      papers={[currentPair.easy, currentPair.medium]}
                      attemptByExam={attemptByExam}
                      entered={entered}
                      user={user}
                      openExam={openExam}
                      navigate={navigate}
                    />
                  </div>
                ) : null}
            </section>

            <section>
              <h2 className="text-lg font-black">Mövzular</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Tariximizə görə mövzu neçə gün davam edirsə, o qədər sınaq olur (son 2 çətin, ortada 1 asan, qalan orta).
              </p>
              <div className="mt-3 space-y-8">
                {MATH_CALENDAR.intervals.map((interval) => {
                  const rows = mathTopics.filter((row) => row.intervalStart === interval.start);
                  const current = placement.current?.start === interval.start;
                  return (
                    <div key={interval.start}>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                        {formatIntervalRange(interval)}
                        {current ? ' · indi' : ''}
                      </p>
                      <div className="mt-3 grid gap-3">
                        {rows.map((row) => {
                          const papers = papersForTopic(row);
                          const started = papers.filter((exam) => entered.has(String(exam.id))).length;
                          const pending = Math.max(0, papers.length - started);
                          const onTopic = current
                            && dayQuizTopic
                            && row.title === dayQuizTopic;
                          const ended = topicHasEnded(interval, row.title, placement.today);
                          const avg = ended ? topicAveragePercent(history, papers) : null;
                          return (
                            <Card
                              key={row.id}
                              className={`cursor-pointer ${onTopic ? 'ring-2 ring-[var(--accent)]' : ''}`}
                              onClick={() => navigate(`/student/syllabus/${encodeURIComponent(row.id)}`)}
                            >
                              <div className="flex items-center gap-3">
                                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e7f6ea] text-sm font-black text-[#1f7a3a]">
                                  {row.order}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-extrabold text-[var(--text)]">
                                    {row.title}
                                    {onTopic ? ' · bu gün' : ''}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                                    {papers.length
                                      ? `${started}/${papers.length} sınağa daxil olub`
                                      : 'Hələ sınaq yoxdur'}
                                    {ended && avg != null ? ` · orta ${avg}%` : ended ? ' · mövzu bitib' : ''}
                                  </p>
                                </div>
                                {ended && avg != null ? (
                                  <span className="shrink-0 rounded-full bg-[#e7f6ea] px-2.5 py-1 text-sm font-black text-[#1f7a3a]">
                                    {avg}%
                                  </span>
                                ) : pending > 0 ? (
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
                    </div>
                  );
                })}
              </div>
            </section>

            {archives.length ? (
              <section>
                <h2 className="text-lg font-black">Arxiv həftələr</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Gec qoşulanlar köhnə həftənin hazır kağızını açır. Yeni sual yığılmır.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {archives.map((row) => (
                    <button
                      key={row.start}
                      type="button"
                      onClick={() => openWindow(row.start)}
                      className={`rounded-full px-3 py-1.5 text-sm font-extrabold ${
                        viewed?.start === row.start
                          ? 'bg-[linear-gradient(135deg,#5b4cf5,#7c5cff)] text-white'
                          : 'border border-[var(--line)] text-[var(--muted)]'
                      }`}
                    >
                      {formatIntervalRange(row)}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="text-lg font-black">Respublika · qarışıq</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                İndiyə qədər keçilən mövzuların qarışığı yalnız Respublika sınağındadır. Həftəlik kağız ümumi olmur.
              </p>
              <Card className="mt-3 cursor-pointer" onClick={() => navigate('/student/republic')}>
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">Respublika sınağı</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Ay sonu qarışıq sınaq</p>
                  </div>
                  <ChevronRight size={18} className="text-[var(--muted)]" />
                </div>
              </Card>
              {mixed.length ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {mixed.map((exam) => {
                    const attempt = attemptByExam.get(String(exam.id));
                    return (
                      <ExamCard
                        key={exam.id}
                        exam={exam}
                        progress={attempt ? 'done' : undefined}
                        entered={entered.has(String(exam.id))}
                        resultText={resultLabel(attempt, exam, user)}
                        teacherName={exam.teacherName}
                        actionLabel={attempt ? 'Nəticəyə bax' : 'Respublika'}
                        onOpen={() => navigate('/student/republic')}
                      />
                    );
                  })}
                </div>
              ) : null}
            </section>
          </div>
        )
      ) : (
        loading ? <Skeleton className="h-40" /> : (
          <div className="grid gap-3">
            {otherTopics.map((row) => {
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
        )
      )}
    </AppShell>
  );
}
