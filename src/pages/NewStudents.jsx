import { useContext, useEffect, useMemo, useState } from 'react';
import { Link2, UserPlus } from 'lucide-react';
import AppShell from '../components/AppShell';
import { AuthContext } from '../context/AuthContext';
import {
  deleteStudentAccount,
  fetchExamSubmissions,
  fetchExams,
  fetchGroups,
  fetchOwnStudentIdsForTeacher,
  fetchStudents,
  groupInviteSlug,
  groupInviteUrl,
  isPendingApproval,
  setStudentAccess,
  studentBelongsToTeacher,
} from '../lib/examApi';
import { groupNeedsApproval } from '../lib/groupApproval';
import { weeklyPipelineQuizzes } from '../lib/storageAccess';
import { errorMessage, fullNameOf } from '../lib/utils';

const PRACTICE_PENDING = [
  { id: 'pend-nigar', fullName: 'Nigar Əliyeva', firstName: 'Nigar', lastName: 'Əliyeva', email: '', groupName: 'Məşq qrupu' },
  { id: 'pend-elcin', fullName: 'Elçin Hüseynov', firstName: 'Elçin', lastName: 'Hüseynov', email: '', groupName: 'Məşq qrupu' },
];

function belongsToGroup(student, group) {
  if (!student || !group) return false;
  if (student.groupId != null && String(student.groupId) === String(group.id)) return true;
  const keys = [group.number, group.name].map((v) => String(v || '').trim().toLowerCase()).filter(Boolean);
  return keys.includes(String(student.groupName || '').trim().toLowerCase());
}

function initialOf(student) {
  const name = fullNameOf(student) || '?';
  return name.trim().charAt(0).toUpperCase();
}

function examLabel(exam) {
  const title = String(exam.title || exam.Title || '').trim();
  if (title) return title;
  const subject = exam.subjectName || exam.subject || 'İmtahan';
  const kind = exam.kind || '';
  return [subject, kind].filter(Boolean).join(' · ');
}

function practiceGuestRows(exams) {
  const weekly = weeklyPipelineQuizzes().map((quiz, index) => ({
    id: `weekly-${quiz.id || index + 1}`,
    title: quiz.title || `Həftəlik sınaq ${index + 1}`,
    count: 2,
  }));
  const own = exams.map((exam, index) => ({
    id: exam.id,
    title: examLabel(exam) || `Riyaziyyat · 11-ci sinif · Sınaq ${exams.length - index}`,
    count: 2,
  }));
  const merged = [...weekly, ...own];
  const seen = new Set();
  return merged.filter((row) => {
    const key = String(row.title || row.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function NewStudents() {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState('pending');
  const [groups, setGroups] = useState([]);
  const [pending, setPending] = useState([]);
  const [guestCount, setGuestCount] = useState(0);
  const [guestByExam, setGuestByExam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAllExams, setShowAllExams] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [groupList, students, exams, ownIds] = await Promise.all([
        fetchGroups(),
        fetchStudents(),
        fetchExams(),
        fetchOwnStudentIdsForTeacher(user?.id),
      ]);
      setGroups(groupList);
      const mine = students.filter((s) => studentBelongsToTeacher(s, user?.id, groupList));
      let waiting = mine.filter((s) => {
        if (!isPendingApproval(s)) return false;
        const openGroup = groupList.some((g) => !groupNeedsApproval(g) && belongsToGroup(s, g));
        return !openGroup;
      });
      if (user?.practice && !waiting.length) waiting = PRACTICE_PENDING;
      setPending(waiting);
      const ownExams = exams.filter((exam) => String(exam.teacherId ?? exam.TeacherId ?? user?.id) === String(user?.id));
      const lists = await Promise.all(ownExams.map((exam) => fetchExamSubmissions(exam.id).catch(() => [])));
      const guests = new Set();
      let perExam = ownExams.map((exam, index) => {
        const ids = new Set();
        (lists[index] || []).forEach((row) => {
          const sid = String(row.studentId ?? row.StudentId ?? '');
          if (!sid || ownIds.has(sid)) return;
          ids.add(sid);
          guests.add(sid);
        });
        return { id: exam.id, title: examLabel(exam), count: ids.size };
      }).filter((row) => row.count > 0);
      if (user?.practice && !guests.size) {
        perExam = practiceGuestRows(ownExams);
        setGuestCount(2);
      } else {
        setGuestCount(guests.size);
      }
      setGuestByExam(perExam);
    } catch (err) {
      setError(errorMessage(err, 'Yeni şagirdlər yüklənmədi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const shareUrl = useMemo(() => {
    const group = groups[0];
    if (!group) return '';
    return groupInviteUrl(
      groupInviteSlug(group),
      group.name || group.number || '',
      groupNeedsApproval(group),
    );
  }, [groups]);

  const decide = async (student, allow) => {
    if (!student.id || busyId) return;
    setBusyId(student.id);
    setError('');
    try {
      if (user?.practice && String(student.id).startsWith('pend-')) {
        setPending((prev) => prev.filter((row) => row.id !== student.id));
        return;
      }
      if (allow) await setStudentAccess(student.id, true);
      else await deleteStudentAccount(student.id);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Əməliyyat alınmadı.'));
    } finally {
      setBusyId(null);
    }
  };

  const decideAll = async () => {
    if (!pending.length || busyId) return;
    setBusyId('all');
    setError('');
    try {
      if (user?.practice && pending.every((row) => String(row.id).startsWith('pend-'))) {
        setPending([]);
        return;
      }
      for (const student of pending) {
        await setStudentAccess(student.id, true);
      }
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Əməliyyat alınmadı.'));
    } finally {
      setBusyId(null);
    }
  };

  const shareLink = async () => {
    if (!shareUrl) {
      setError('Paylaşılacaq qrup linki tapılmadı.');
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ExamPulse qrupu', url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setNotice('Link kopyalandı.');
    } catch {
      setNotice(shareUrl);
    }
  };

  const shownExams = showAllExams ? guestByExam : guestByExam.slice(0, 4);
  const hiddenExams = Math.max(0, guestByExam.length - 4);

  return (
    <AppShell title="Şagird">
      <div className="desk-page space-y-4 text-white">
        <div className="desk-tabs flex rounded-full bg-[#171a22] p-1 ring-1 ring-white/[0.06]">
          <button
            type="button"
            onClick={() => setTab('pending')}
            className={`min-h-11 flex-1 rounded-full px-3 text-sm font-extrabold ${
              tab === 'pending' ? 'bg-[#7c6aff] text-white' : 'text-white/40'
            }`}
          >
            Gözləyən · {pending.length}
          </button>
          <button
            type="button"
            onClick={() => setTab('guests')}
            className={`min-h-11 flex-1 rounded-full px-3 text-sm font-extrabold ${
              tab === 'guests' ? 'bg-[#7c6aff] text-white' : 'text-white/40'
            }`}
          >
            Kənar tələbə · {guestCount}
          </button>
        </div>

        {error ? <p className="text-sm font-semibold text-[#fb7185]">{error}</p> : null}
        {notice ? <p className="text-sm font-semibold text-[#b4abff]">{notice}</p> : null}

        {tab === 'pending' ? (
          <>
            <p className="text-sm font-semibold leading-relaxed text-white/50">
              Qrupa daxil olmaq istəyənlərin icazəsi buradadır. «İcazə ver» basandan sonra şagird daxil olur.
            </p>
            {loading ? <p className="text-sm text-white/40">Yüklənir...</p> : null}
            {!loading && pending.length ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white/45">{pending.length} sorğu</p>
                  <button
                    type="button"
                    disabled={Boolean(busyId)}
                    onClick={decideAll}
                    className="text-sm font-extrabold text-[#9d93ff] disabled:opacity-40"
                  >
                    Hamısına icazə ver
                  </button>
                </div>
                <ul className="grid gap-3 min-[768px]:grid-cols-2 min-[1100px]:grid-cols-3">
                  {pending.map((student) => (
                    <li key={student.id} className="rounded-[26px] bg-[#171a22] p-4 ring-1 ring-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#7c6aff] text-lg font-black">
                          {initialOf(student)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-extrabold">{fullNameOf(student)}</p>
                          <p className="mt-0.5 text-sm font-semibold text-white/45">Qrupa daxil olmaq istəyir</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          disabled={busyId === student.id || busyId === 'all'}
                          onClick={() => decide(student, true)}
                          className="min-h-12 rounded-full bg-[#7c6aff] text-sm font-extrabold disabled:opacity-40"
                        >
                          İcazə ver
                        </button>
                        <button
                          type="button"
                          disabled={busyId === student.id || busyId === 'all'}
                          onClick={() => decide(student, false)}
                          className="min-h-12 rounded-full bg-[#12141a] text-sm font-extrabold text-white/80 ring-1 ring-white/[0.06] disabled:opacity-40"
                        >
                          Rədd et
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {!loading && !pending.length ? (
              <div className="rounded-[28px] bg-[#171a22] px-5 py-10 text-center ring-1 ring-white/[0.06]">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/[0.06] text-white/45">
                  <UserPlus size={26} />
                </span>
                <p className="mt-4 text-lg font-black">Gözləyən şagird yoxdur</p>
                <p className="mt-2 text-sm font-semibold text-white/45">
                  Qrup daxilindəki qeydiyyat linkini paylaşın.
                </p>
                <button
                  type="button"
                  onClick={shareLink}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#12141a] px-5 text-sm font-extrabold ring-1 ring-white/[0.08]"
                >
                  <Link2 size={16} /> Linki paylaş
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="desk-split">
            <section className="flex items-center gap-3 rounded-[26px] bg-[#171a22] p-4 ring-1 ring-white/[0.06] min-[768px]:p-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-[#7c6aff] text-2xl font-black">
                {guestCount}
              </span>
              <div>
                <p className="text-lg font-black">Kənar tələbə</p>
                <p className="mt-1 text-sm font-semibold leading-snug text-white/50">
                  Sizin imtahanlarınızda iştirak edən, qrupunuzda olmayan tələbələr.
                </p>
              </div>
            </section>
            {loading ? <p className="text-sm text-white/40">Yüklənir...</p> : null}
            {!loading ? (
              <div>
                <div className="flex items-end justify-between gap-3">
                  <p className="text-sm font-semibold text-white/45">İmtahanlar üzrə</p>
                  <p className="text-sm font-semibold text-white/35">{guestByExam.length} imtahan</p>
                </div>
                {guestByExam.length ? (
                  <div>
                    <ul className="mt-3 grid gap-3 min-[768px]:grid-cols-2">
                      {shownExams.map((row) => (
                        <li
                          key={row.id}
                          className="flex items-center justify-between gap-3 rounded-[22px] bg-[#171a22] px-4 py-4 ring-1 ring-white/[0.06]"
                        >
                          <span className="min-w-0 truncate font-extrabold">{row.title}</span>
                          <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-extrabold text-white/55">
                            {row.count} tələbə
                          </span>
                        </li>
                      ))}
                    </ul>
                    {hiddenExams > 0 && !showAllExams ? (
                      <button
                        type="button"
                        onClick={() => setShowAllExams(true)}
                        className="mt-3 w-full rounded-full bg-[#171a22] py-3.5 text-sm font-extrabold text-[#9d93ff] ring-1 ring-white/[0.06]"
                      >
                        Daha {hiddenExams} imtahanı göstər
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-[24px] bg-[#171a22] px-4 py-8 text-center text-sm font-semibold text-white/40">
                    Kənar tələbə yoxdur.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}
