const MONTHS_AZ = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr',
];

export function startOfWeek(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function weekKey(date) {
  const start = startOfWeek(date);
  return start ? toKey(start) : '';
}

export function previousWeekStart(now = new Date()) {
  const current = startOfWeek(now);
  return current ? addDays(current, -7) : null;
}

export function toKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatWeekLabel(weekStart) {
  const start = new Date(weekStart);
  if (Number.isNaN(start.getTime())) return '';
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS_AZ[end.getMonth()]}`;
  }
  return `${start.getDate()} ${MONTHS_AZ[start.getMonth()]} – ${end.getDate()} ${MONTHS_AZ[end.getMonth()]}`;
}

export function scoreOf(row) {
  const value = Number(row?.percent ?? row?.score ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function examMoment(exam, submission) {
  return (
    exam?.startTime
    || exam?.StartTime
    || exam?.endTime
    || exam?.EndTime
    || submission?.submittedAt
    || submission?.SubmittedAt
    || exam?.createdAt
  );
}

function studentIdOf(row) {
  return row?.studentId ?? row?.StudentId ?? row?.userId ?? row?.UserId;
}

export function buildWeeklyBoards({ exams = [], submissions = [], students = [], groupKey = '' } = {}) {
  const examById = new Map(exams.map((exam) => [String(exam.id), exam]));
  const studentById = new Map(
    students.filter(Boolean).map((s) => [String(s.id), s]),
  );
  const wantedGroup = String(groupKey || '').trim().toLowerCase();

  const byWeek = new Map();

  submissions.forEach((raw) => {
    const sid = studentIdOf(raw);
    if (sid == null) return;
    const peer = studentById.get(String(sid));
    if (wantedGroup) {
      const peerGroup = String(peer?.groupName || raw.groupName || '').trim().toLowerCase();
      if (peerGroup && peerGroup !== wantedGroup) return;
      if (!peerGroup && peer) return;
    }
    const exam = examById.get(String(raw.examId ?? raw.ExamId));
    const when = examMoment(exam, raw);
    const start = startOfWeek(when);
    if (!start) return;
    const key = toKey(start);
    if (!byWeek.has(key)) {
      byWeek.set(key, { start, byStudent: new Map() });
    }
    const bucket = byWeek.get(key).byStudent;
    const id = String(sid);
    const prev = bucket.get(id) || { scores: [], studentId: sid, peer };
    prev.scores.push(scoreOf(raw));
    if (!prev.peer && peer) prev.peer = peer;
    if (!prev.name) {
      prev.name = raw.studentName || raw.fullName || peer?.fullName || peer?.email;
    }
    bucket.set(id, prev);
  });

  const weeks = Array.from(byWeek.entries())
    .map(([key, week]) => {
      const rows = Array.from(week.byStudent.values())
        .map((entry) => {
          const avg = Math.round(
            entry.scores.reduce((sum, n) => sum + n, 0) / (entry.scores.length || 1),
          );
          return {
            studentId: entry.studentId,
            studentName: entry.name || entry.peer?.fullName || `Tələbə #${entry.studentId}`,
            percent: avg,
            examCount: entry.scores.length,
            groupName: entry.peer?.groupName || '',
          };
        })
        .sort((a, b) => b.percent - a.percent || b.examCount - a.examCount || String(a.studentName).localeCompare(String(b.studentName)))
        .map((row, index) => ({ ...row, rank: index + 1 }));
      return {
        key,
        start: week.start,
        end: addDays(week.start, 6),
        label: formatWeekLabel(week.start),
        rows,
        champion: rows[0] || null,
      };
    })
    .sort((a, b) => b.start - a.start);

  const rankedByKey = new Map(weeks.map((w) => [w.key, w]));
  weeks.forEach((week) => {
    const prevKey = toKey(addDays(week.start, -7));
    const prev = rankedByKey.get(prevKey);
    week.rows = week.rows.map((row) => {
      const before = prev?.rows.find((p) => String(p.studentId) === String(row.studentId));
      const rankChange = before ? before.rank - row.rank : null;
      return { ...row, previousRank: before?.rank ?? null, rankChange, isNew: !before };
    });
    if (week.champion) {
      week.champion = week.rows[0];
    }
  });

  const prevStart = previousWeekStart();
  const previousKey = prevStart ? toKey(prevStart) : '';
  const previousWeek = rankedByKey.get(previousKey) || null;

  return { weeks, previousWeek, previousKey };
}

export function monthWeeks(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  let cursor = startOfWeek(first);
  const weeks = [];
  for (let i = 0; i < 6; i += 1) {
    const start = new Date(cursor);
    weeks.push({
      key: toKey(start),
      start,
      days: Array.from({ length: 7 }, (_, idx) => addDays(start, idx)),
    });
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export const WEEKDAY_SHORT = ['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'];
export const MONTHS_TITLE = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];
