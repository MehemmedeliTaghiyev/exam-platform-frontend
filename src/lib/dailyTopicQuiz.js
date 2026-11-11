import { intervalContaining, latestCoveredTopicForDay, tbilisiYmd } from './mathCalendar.js';
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
export function topicTitleForDay(ymd = tbilisiYmd()) {
  return latestCoveredTopicForDay(ymd).topic || '';
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
 * Every day: calendar → topic + day slot → difficulty band → matching sınaq.
 * Quiz count for a topic = how many days that topic lasts on our calendar.
 */
export function todaysTopicQuiz(exams = [], ymd = tbilisiYmd()) {
  const key = String(ymd || tbilisiYmd());
  const covered = latestCoveredTopicForDay(key);
  const send = sendForDay(key);
  const topic = covered.topic || '';
  const series = topic ? quizCountForTopic(topic, covered.interval) : 1;
  const slot = covered.dayInTopic ?? 0;
  const band = topicQuizDifficultyAt(slot, series);
  const rows = topic
    ? annotateTopicPapers(examsMatchingTopic(exams, topic), series)
    : [];
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
    ymd: key,
    topic,
    exam,
    send,
    band,
    bandLabel: topicQuizDifficultyLabel(band),
    series,
    slot,
    interval: covered.interval || intervalContaining(key),
    topicIndex: covered.index,
  };
}
