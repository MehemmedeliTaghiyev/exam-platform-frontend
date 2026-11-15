import {
  daysBetweenYmd,
  intervalContaining,
  intervalTopicsForGrade,
  latestCoveredTopicForDay,
  MATH_CALENDAR,
  tbilisiYmd,
} from './mathCalendar.js';
import {
  annotateTopicPapers,
  quizCountForTopic,
  topicQuizDifficultyAt,
  topicQuizDifficultyLabel,
} from './topicQuizDifficulty.js';
import { examIdOf, isHiddenWeeklyExam } from './weeklyMath.js';

function stamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

/**
 * Optional day → published exam id for that calendar topic.
 * Topic always comes from MATH_CALENDAR date pacing.
 */
export const DAILY_TOPIC_SENDS = [
  { ymd: '2026-11-09', examId: '99' },
];

function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('az')
    .replace(/\s+/g, ' ')
    .trim();
}

function examBlob(exam) {
  return normalize(`${exam?.title || exam?.Title || ''} ${exam?.description || exam?.Description || ''}`);
}

/** Latest covered topic for the day — our calendar date only. */
export function topicTitleForDay(ymd = tbilisiYmd(), grade = MATH_CALENDAR.grade) {
  return latestCoveredTopicForDay(ymd, grade).topic || '';
}

export function sendForDay(ymd = tbilisiYmd()) {
  const key = String(ymd || tbilisiYmd());
  return DAILY_TOPIC_SENDS.find((row) => row.ymd === key) || null;
}

export function examSortNewest(a, b) {
  const idDiff = Number(examIdOf(b) || 0) - Number(examIdOf(a) || 0);
  if (Number.isFinite(idDiff) && idDiff !== 0) return idDiff;
  const ta = stamp(a?.createdAt || a?.CreatedAt || a?.startTime || a?.StartTime);
  const tb = stamp(b?.createdAt || b?.CreatedAt || b?.startTime || b?.StartTime);
  return tb - ta;
}

export function examMatchesTopicTitle(exam, topicTitle) {
  const title = normalize(topicTitle);
  if (!title) return false;
  return examBlob(exam).includes(title);
}

export function examsMatchingTopic(exams, topicTitle) {
  return (exams || [])
    .filter((exam) => {
      if (!exam || isHiddenWeeklyExam(exam)) return false;
      return examMatchesTopicTitle(exam, topicTitle);
    })
    .sort(examSortNewest);
}

/**
 * All syllabus topics covered from calendar start through `ymd`
 * (completed intervals + current topic and earlier ones in the active window).
 */
export function coveredTopicsThrough(ymd = tbilisiYmd(), grade = MATH_CALENDAR.grade) {
  const key = String(ymd || tbilisiYmd());
  if (key < MATH_CALENDAR.from) return [];

  const out = [];
  const current = latestCoveredTopicForDay(key, grade);
  for (const interval of MATH_CALENDAR.intervals) {
    if (interval.start > key) break;
    const topics = intervalTopicsForGrade(interval, grade);
    if (!topics.length) continue;

    if (interval.end < key) {
      topics.forEach((topic, index) => {
        out.push({
          topic,
          interval,
          index,
          series: quizCountForTopic(topic, interval, grade),
          current: false,
        });
      });
      continue;
    }

    // Active interval: include topics up to and including today's covered index.
    const maxIndex = current.interval?.start === interval.start
      ? Math.max(0, current.index)
      : topics.length - 1;
    topics.slice(0, maxIndex + 1).forEach((topic, index) => {
      out.push({
        topic,
        interval,
        index,
        series: quizCountForTopic(topic, interval, grade),
        current: index === maxIndex && current.interval?.start === interval.start,
      });
    });
  }
  return out;
}

/**
 * One prior topic for today's review quiz (rotates through earlier covered topics).
 */
export function reviewTopicForDay(ymd = tbilisiYmd(), grade = MATH_CALENDAR.grade) {
  const key = String(ymd || tbilisiYmd());
  const covered = coveredTopicsThrough(key, grade);
  const priors = covered.filter((row) => !row.current);
  if (!priors.length) return null;

  const offset = daysBetweenYmd(MATH_CALENDAR.from, key);
  const pick = priors[offset % priors.length];
  const series = pick.series || 1;
  const slot = offset % series;
  return {
    ymd: key,
    topic: pick.topic,
    interval: pick.interval,
    topicIndex: pick.index,
    series,
    slot,
    band: topicQuizDifficultyAt(slot, series),
    bandLabel: topicQuizDifficultyLabel(topicQuizDifficultyAt(slot, series)),
  };
}

function quizForTopic(exams, topic, interval, slot, series, ymd) {
  const band = topicQuizDifficultyAt(slot, series);
  const rows = topic
    ? annotateTopicPapers(examsMatchingTopic(exams, topic), series)
    : [];
  const send = sendForDay(ymd);
  let exam = null;

  if (send?.examId) {
    const hit = (exams || []).find((row) => examIdOf(row) === String(send.examId)) || null;
    if (hit && (!topic || examMatchesTopicTitle(hit, topic))) exam = hit;
  }
  if (!exam && rows.length) {
    exam = rows.find((row) => row.index === slot)?.exam
      || rows.find((row) => row.planned === band)?.exam
      || rows[Math.min(slot, rows.length - 1)]?.exam
      || null;
  }

  return {
    ymd,
    topic,
    exam,
    send,
    band,
    bandLabel: topicQuizDifficultyLabel(band),
    series,
    slot,
    interval: interval || intervalContaining(ymd),
  };
}

/**
 * Every day: calendar → topic + day slot → difficulty band → matching sınaq.
 * Quiz count for a topic = how many days that topic lasts on our calendar.
 */
export function todaysTopicQuiz(exams = [], ymd = tbilisiYmd(), grade = MATH_CALENDAR.grade) {
  const key = String(ymd || tbilisiYmd());
  const covered = latestCoveredTopicForDay(key, grade);
  const topic = covered.topic || '';
  const series = topic ? quizCountForTopic(topic, covered.interval, grade) : 1;
  const slot = covered.dayInTopic ?? 0;
  return {
    ...quizForTopic(exams, topic, covered.interval, slot, series, key),
    topicIndex: covered.index,
  };
}

/**
 * Primary = latest covered topic; review = one earlier covered topic (rotating).
 * Personal papers fill in when no published exam exists.
 */
export function dailyTopicQuizPlan(exams = [], ymd = tbilisiYmd(), grade = MATH_CALENDAR.grade) {
  const key = String(ymd || tbilisiYmd());
  const primary = todaysTopicQuiz(exams, key, grade);
  const reviewMeta = reviewTopicForDay(key, grade);
  const review = reviewMeta
    ? {
      ...quizForTopic(
        exams,
        reviewMeta.topic,
        reviewMeta.interval,
        reviewMeta.slot,
        reviewMeta.series,
        key,
      ),
      topicIndex: reviewMeta.topicIndex,
      role: 'review',
    }
    : null;
  return {
    ymd: key,
    primary: { ...primary, role: 'primary' },
    review,
    covered: coveredTopicsThrough(key, grade),
  };
}
