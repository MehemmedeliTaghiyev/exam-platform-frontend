/** Grade-11 math send windows. Source: Project store february-topic-schedule. Asia/Tbilisi. */

export const MATH_CALENDAR_TZ = 'Asia/Tbilisi';

export const MATH_CALENDAR = {
  grade: 11,
  from: '2026-11-08',
  to: '2027-02-28',
  intervals: [
    {
      start: '2026-11-08',
      end: '2026-11-21',
      title: 'Asan bünövrə (həftəlik sınaq)',
      difficulty: 'easy',
      send: { weekly: true, papers: ['easy', 'medium'] },
      topics: [
        'Həqiqi ədədlər',
        'Ölçmə. Statistika. Çoxluqlar. Birləşmələr və ehtimal',
        'Nisbət. Tənasüb. Faiz',
        'Sadə həndəsi fiqurlar',
        'Üçbucaqlar',
      ],
    },
    {
      start: '2026-11-22',
      end: '2026-12-05',
      title: 'Blok pəncərəsi 1 (situasiya)',
      difficulty: 'block',
      send: { weekly: false, papers: [] },
      topics: [
        'Rasional ifadələr',
        'n-ci dərəcədən kök. İrrasional ifadələr. Üstlü qüvvət',
        'Ölçmə. Statistika. Çoxluqlar. Birləşmələr və ehtimal',
      ],
    },
    {
      start: '2026-12-06',
      end: '2026-12-19',
      title: 'Orta tənlik və çevrə (həftəlik sınaq)',
      difficulty: 'medium',
      send: { weekly: true, papers: ['easy', 'medium'] },
      topics: [
        'Birdəyişənli tənliklər və məsələ həlli',
        'Çevrə və dairə',
      ],
    },
    {
      start: '2026-12-20',
      end: '2027-01-02',
      title: 'Blok pəncərəsi 2 (situasiya)',
      difficulty: 'block',
      send: { weekly: false, papers: [] },
      topics: [
        'Tənliklər sistemi və məsələ həlli',
        'Dördbucaqlılar və çoxbucaqlılar',
        'Fiqurların sahəsi',
        'Ölçmə. Statistika. Çoxluqlar. Birləşmələr və ehtimal',
      ],
    },
    {
      start: '2027-01-03',
      end: '2027-01-16',
      title: 'Orta funksiya və koordinat (həftəlik sınaq)',
      difficulty: 'medium',
      send: { weekly: true, papers: ['easy', 'medium'] },
      topics: [
        'Bərabərsizliklər',
        'Ədədi ardıcıllıqlar. Silsilələr',
        'Funksiyalar və qrafiklər',
        'Triqonometrik funksiyalar. Triqonometrik tənliklər',
        'Koordinatlar üsulu. Hərəkət. Oxşarlıq. Vektorlar',
      ],
    },
    {
      start: '2027-01-17',
      end: '2027-01-30',
      title: 'Çətin, müəllim',
      difficulty: 'hard',
      send: { weekly: false, papers: [] },
      topics: [
        'Üstlü və loqarifmik funksiyalar',
        'Üstlü və loqarifmik tənliklər və bərabərsizliklər',
      ],
    },
    {
      start: '2027-01-31',
      end: '2027-02-13',
      title: 'Qarışıq təkrar (həftəlik sınaq)',
      difficulty: 'mixed',
      send: { weekly: true, papers: ['easy', 'medium'] },
      topics: [
        'Fəzada nöqtə, düz xətt, müstəvi',
        'Çoxüzlülər, onların səthi və həcmi',
        'Fırlanma fiqurları, onların səthi və həcmi',
        'Kompleks ədədlər',
      ],
    },
    {
      start: '2027-02-14',
      end: '2027-02-28',
      title: 'Blok pəncərəsi 3 (analiz və situasiya)',
      difficulty: 'block',
      send: { weekly: false, papers: [] },
      topics: [
        'Törəmə və onun tətbiqləri',
        'Ardıcıllığın və funksiyanın limiti',
        'İbtidai funksiya və inteqral',
        'Ölçmə. Statistika. Çoxluqlar. Birləşmələr və ehtimal',
      ],
    },
  ],
};

const MONTHS_AZ = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr',
];

export function tbilisiYmd(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MATH_CALENDAR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date instanceof Date ? date : new Date(date));
  const pick = (type) => parts.find((p) => p.type === type)?.value;
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function intervalContaining(ymd) {
  const key = String(ymd || tbilisiYmd());
  return MATH_CALENDAR.intervals.find((row) => row.start <= key && key <= row.end) || null;
}

/** Whole days from a→b in Asia/Tbilisi calendar keys (YYYY-MM-DD). */
export function daysBetweenYmd(a, b) {
  const start = Date.parse(`${a}T12:00:00+04:00`);
  const end = Date.parse(`${b}T12:00:00+04:00`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86400000));
}

export function addDaysYmd(ymd, days) {
  const base = Date.parse(`${ymd}T12:00:00+04:00`);
  if (!Number.isFinite(base)) return String(ymd || '');
  return tbilisiYmd(new Date(base + Number(days || 0) * 86400000));
}

/** Calendar window for one topic inside an interval. */
export function topicWindow(interval, topicTitle) {
  const row = topicDurationsInInterval(interval).find((item) => item.title === topicTitle);
  if (!interval || !row) return null;
  return {
    ...row,
    startYmd: addDaysYmd(interval.start, row.startOffset),
    endYmd: addDaysYmd(interval.start, row.endOffset),
  };
}

export function topicHasEnded(interval, topicTitle, ymd = tbilisiYmd()) {
  const win = topicWindow(interval, topicTitle);
  if (!win) return false;
  return String(ymd) > win.endYmd;
}

export function intervalDaySpan(interval) {
  if (!interval?.start || !interval?.end) return 0;
  return daysBetweenYmd(interval.start, interval.end) + 1;
}

/**
 * How many calendar days (and quiz slots) each topic gets inside an interval.
 * Same pacing as latestCoveredTopicForDay — quiz count = topic duration in days.
 */
export function topicDurationsInInterval(interval) {
  const topics = interval?.topics || [];
  const total = topics.length;
  if (!interval || !total) return [];
  const span = intervalDaySpan(interval);
  return topics.map((title, index) => {
    const startOffset = Math.ceil((index * span) / total);
    const endOffset = Math.ceil(((index + 1) * span) / total) - 1;
    const days = Math.max(1, endOffset - startOffset + 1);
    return {
      title,
      index,
      days,
      startOffset,
      endOffset: startOffset + days - 1,
      intervalStart: interval.start,
    };
  });
}

export function topicDurationForTitle(topicTitle, interval) {
  const rows = topicDurationsInInterval(interval);
  const hit = rows.find((row) => row.title === topicTitle);
  return hit?.days || 0;
}

/**
 * Latest syllabus topic covered by our calendar date.
 * Topics inside the current interval are paced across that window (no wrap-back).
 * `days` = quiz count for that topic; `dayInTopic` = today's slot (0-based).
 */
export function latestCoveredTopicForDay(ymd = tbilisiYmd()) {
  const key = String(ymd || tbilisiYmd());
  if (key < MATH_CALENDAR.from) {
    return { topic: '', interval: null, index: -1, days: 0, dayInTopic: 0 };
  }
  const interval = intervalContaining(key)
    || (key > MATH_CALENDAR.to
      ? MATH_CALENDAR.intervals[MATH_CALENDAR.intervals.length - 1]
      : null);
  const topics = interval?.topics || [];
  if (!interval || !topics.length) {
    return { topic: '', interval, index: -1, days: 0, dayInTopic: 0 };
  }

  const offset = daysBetweenYmd(interval.start, key <= interval.end ? key : interval.end);
  const span = intervalDaySpan(interval);
  const index = Math.min(
    topics.length - 1,
    Math.floor((offset / Math.max(1, span)) * topics.length),
  );
  const durations = topicDurationsInInterval(interval);
  const row = durations[index];
  const dayInTopic = row
    ? Math.min(row.days - 1, Math.max(0, offset - row.startOffset))
    : 0;
  return {
    topic: topics[index] || topics[0],
    interval,
    index,
    days: row?.days || 1,
    dayInTopic,
    startOffset: row?.startOffset ?? 0,
  };
}

export function weeklyIntervals() {
  return MATH_CALENDAR.intervals.filter((row) => row.send?.weekly);
}

export function lastCompletedInterval(ymd) {
  const key = String(ymd || tbilisiYmd());
  const done = MATH_CALENDAR.intervals.filter((row) => row.end < key);
  return done[done.length - 1] || null;
}

export function lastWeeklyOnOrBefore(interval) {
  if (!interval) return null;
  if (interval.send?.weekly) return interval;
  const idx = MATH_CALENDAR.intervals.findIndex((row) => row.start === interval.start);
  for (let i = idx; i >= 0; i -= 1) {
    if (MATH_CALENDAR.intervals[i].send?.weekly) return MATH_CALENDAR.intervals[i];
  }
  return interval;
}

function joinYmd(user) {
  const raw = user?.contractStart || user?.ContractStart
    || user?.createdAt || user?.CreatedAt
    || user?.registeredAt || user?.joinDate;
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return tbilisiYmd(date);
}

/**
 * On-time students sit at the current calendar window.
 * Late joiners (joined after at least one interval had already ended) sit at the
 * last completed interval as of join — weekly papers come from the last weekly
 * send in that chain (archived), never a newly generated cumulative paper.
 */
export function studentTopicPlace(user, now = new Date()) {
  const today = tbilisiYmd(now);
  const current = intervalContaining(today);
  const joined = joinYmd(user);
  const completedAtJoin = joined ? lastCompletedInterval(joined) : null;
  const late = Boolean(completedAtJoin);

  if (late) {
    return {
      current,
      place: lastWeeklyOnOrBefore(completedAtJoin) || completedAtJoin,
      onTime: false,
      today,
    };
  }

  const place = current?.send?.weekly
    ? current
    : lastWeeklyOnOrBefore(lastCompletedInterval(today) || current) || current;

  return { current, place, onTime: true, today };
}

export function findIntervalByStart(start) {
  return MATH_CALENDAR.intervals.find((row) => row.start === String(start || '')) || null;
}

export function formatIntervalRange(interval) {
  if (!interval?.start || !interval?.end) return '';
  const a = interval.start.split('-').map(Number);
  const b = interval.end.split('-').map(Number);
  const sameMonth = a[0] === b[0] && a[1] === b[1];
  const sameYear = a[0] === b[0];
  if (sameMonth) return `${a[2]}–${b[2]} ${MONTHS_AZ[a[1] - 1]} ${a[0]}`;
  if (sameYear) return `${a[2]} ${MONTHS_AZ[a[1] - 1]} – ${b[2]} ${MONTHS_AZ[b[1] - 1]} ${a[0]}`;
  return `${a[2]} ${MONTHS_AZ[a[1] - 1]} ${a[0]} – ${b[2]} ${MONTHS_AZ[b[1] - 1]} ${b[0]}`;
}

export function calendarTopicId(title) {
  return `riyaziyyat__${String(title || '')
    .toLocaleLowerCase('az')
    .replace(/[^a-z0-9əöüğçışı\- ]/gi, '')
    .trim()
    .replace(/\s+/g, '-')}`;
}

export function topicsForInterval(interval) {
  if (!interval) return [];
  return (interval.topics || []).map((title, index) => ({
    id: `${calendarTopicId(title)}__${interval.start}`,
    subject: 'Riyaziyyat',
    title,
    order: index + 1,
    intervalStart: interval.start,
    weekly: Boolean(interval.send?.weekly),
  }));
}

export function allCalendarTopics() {
  let order = 0;
  return MATH_CALENDAR.intervals.flatMap((interval) => (
    topicsForInterval(interval).map((topic) => ({
      ...topic,
      order: ++order,
      interval,
    }))
  ));
}

export function findCalendarTopic(id) {
  let raw = String(id || '');
  try { raw = decodeURIComponent(raw); } catch { /* keep */ }
  const all = allCalendarTopics();
  const exact = all.find((topic) => topic.id === raw);
  if (exact) return { topic: exact, interval: exact.interval };
  const legacy = all.find((topic) => calendarTopicId(topic.title) === raw);
  if (legacy) return { topic: legacy, interval: legacy.interval };
  return { topic: null, interval: null };
}
