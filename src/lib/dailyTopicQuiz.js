import { intervalContaining, tbilisiYmd } from './mathCalendar.js';
import { examIdOf, isHiddenWeeklyExam } from './weeklyMath.js';

function stamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

/**
 * Explicit day → topic quiz sends (newest first when listing).
 * Keep topic titles identical to MATH_CALENDAR interval topics.
 */
export const DAILY_TOPIC_SENDS = [
  { ymd: '2026-11-09', topic: 'Üçbucaqlar', examId: '99' },
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

function daysBetween(a, b) {
  const start = Date.parse(`${a}T12:00:00+04:00`);
  const end = Date.parse(`${b}T12:00:00+04:00`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86400000));
}

/** Pick one calendar topic for the day (rotates through the interval's topics). */
export function topicTitleForDay(ymd = tbilisiYmd()) {
  const key = String(ymd || tbilisiYmd());
  const forced = DAILY_TOPIC_SENDS.find((row) => row.ymd === key);
  if (forced?.topic) return forced.topic;
  const interval = intervalContaining(key);
  const topics = interval?.topics || [];
  if (!topics.length) return '';
  const offset = daysBetween(interval.start, key);
  return topics[offset % topics.length] || topics[0];
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

/** Today's topic quiz: explicit send, else newest exam matching that day's topic. */
export function todaysTopicQuiz(exams = [], ymd = tbilisiYmd()) {
  const key = String(ymd || tbilisiYmd());
  const topic = topicTitleForDay(key);
  const send = sendForDay(key);
  let exam = null;
  if (send?.examId) {
    exam = (exams || []).find((row) => examIdOf(row) === String(send.examId)) || null;
  }
  if (!exam && topic) {
    exam = examsMatchingTopic(exams, topic)[0] || null;
  }
  return { ymd: key, topic, exam, send };
}
