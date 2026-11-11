import { difficultyLabel, normalizeDifficulty } from './questionDifficulty.js';
import { topicDurationForTitle, topicDurationsInInterval } from './mathCalendar.js';

/** Fallback only when calendar duration is unknown. Prefer topicDurationForTitle. */
export const TOPIC_QUIZ_SERIES_FALLBACK = 1;

/** QuestionBank difficulty labels (DB artıq mövzu + çətinliyə görə bölünüb). */
export const BANK_DIFFICULTY = {
  asan: 'Sadə',
  orta: 'Orta',
  çətin: 'Çətin',
};

export function bankDifficultyForBand(band) {
  const key = normalizeDifficulty(band) || 'orta';
  return BANK_DIFFICULTY[key] || BANK_DIFFICULTY.orta;
}

/** Quiz count for a topic = calendar days it lasts in its interval. */
export function quizCountForTopic(topicTitle, interval) {
  const days = topicDurationForTitle(topicTitle, interval);
  return Math.max(1, days || TOPIC_QUIZ_SERIES_FALLBACK);
}

/**
 * @param {number} count — mövzunun davam etdiyi gün sayı (= quiz sayı)
 * @returns {Array<'asan'|'orta'|'çətin'>}
 */
export function topicQuizDifficultyPlan(count) {
  const n = Math.max(0, Math.round(Number(count) || 0));
  if (n <= 0) return [];
  const plan = Array.from({ length: n }, () => 'orta');
  if (n === 1) return plan;

  plan[n - 1] = 'çətin';
  if (n >= 2) plan[n - 2] = 'çətin';

  const mid = Math.floor((n - 1) / 2);
  if (plan[mid] !== 'çətin') {
    plan[mid] = 'asan';
  } else {
    for (let i = mid - 1; i >= 0; i -= 1) {
      if (plan[i] !== 'çətin') {
        plan[i] = 'asan';
        break;
      }
    }
  }
  return plan;
}

export function topicQuizDifficultyAt(index, count) {
  const plan = topicQuizDifficultyPlan(count);
  if (!plan.length) return 'orta';
  if (index < 0) return plan[0];
  if (index >= plan.length) return plan[plan.length - 1];
  return plan[index];
}

/** Next paper band when `existingCount` quizzes already exist for the topic. */
export function nextTopicQuizDifficulty(existingCount = 0, series) {
  const n = Math.max(0, Math.round(Number(existingCount) || 0));
  const total = Math.max(1, Math.round(Number(series) || TOPIC_QUIZ_SERIES_FALLBACK));
  if (n >= total) return topicQuizDifficultyAt(total - 1, total);
  return topicQuizDifficultyAt(n, total);
}

export function topicQuizDifficultyLabel(level) {
  return difficultyLabel(level) || difficultyLabel('orta');
}

/**
 * One paper = one bank band. Questions already tagged by topic + difficulty in DB.
 * `series` = mövzunun gün sayı.
 */
export function topicQuizBankQuota(topicTitle, slotIndex = 0, questionCount = 10, series) {
  const total = Math.max(1, Math.round(Number(series) || TOPIC_QUIZ_SERIES_FALLBACK));
  const band = topicQuizDifficultyAt(slotIndex, total);
  const count = Math.max(1, Math.round(Number(questionCount) || 10));
  const mix = { asan: 0, orta: 0, çətin: 0 };
  if (band === 'asan') mix.asan = count;
  else if (band === 'çətin') mix.çətin = count;
  else mix.orta = count;
  return {
    topics: String(topicTitle || '').trim(),
    difficultyLevel: bankDifficultyForBand(band),
    band,
    mix,
    series: total,
  };
}

/** Read band from title/description markers (Asan / Orta / Çətin). */
export function examTopicBand(exam) {
  const blob = `${exam?.title || exam?.Title || ''} ${exam?.description || exam?.Description || ''} ${exam?.weeklyBand || exam?.band || ''}`;
  const direct = normalizeDifficulty(exam?.difficultyLevel || exam?.DifficultyLevel || exam?.level);
  if (direct) return direct;
  const lower = blob.toLocaleLowerCase('az');
  if (/çətin|\bcetin\b|\bhard\b/.test(lower)) return 'çətin';
  if (/\basan\b|\beasy\b|sadə|\bsade\b/.test(lower)) return 'asan';
  if (/\borta\b|\bmedium\b/.test(lower)) return 'orta';
  return '';
}

/**
 * Oldest → newest papers with planned band.
 * `series` = calendar days for that topic (quiz count).
 */
export function annotateTopicPapers(papers = [], series) {
  const total = Math.max(
    1,
    Math.round(Number(series) || papers?.length || TOPIC_QUIZ_SERIES_FALLBACK),
  );
  const plan = topicQuizDifficultyPlan(total);
  const ordered = [...(papers || [])].sort((a, b) => {
    const idA = Number(a?.id ?? a?.Id ?? 0);
    const idB = Number(b?.id ?? b?.Id ?? 0);
    if (Number.isFinite(idA) && Number.isFinite(idB) && idA !== idB) return idA - idB;
    const ta = new Date(a?.createdAt || a?.CreatedAt || a?.startTime || a?.StartTime || 0).getTime();
    const tb = new Date(b?.createdAt || b?.CreatedAt || b?.startTime || b?.StartTime || 0).getTime();
    return ta - tb;
  });

  return ordered.map((exam, index) => {
    const planned = plan[Math.min(index, plan.length - 1)] || 'orta';
    const marked = examTopicBand(exam);
    return {
      exam,
      index,
      band: marked || planned,
      planned,
      bandLabel: topicQuizDifficultyLabel(marked || planned),
      series: total,
    };
  });
}

/** Convenience: durations map for an interval (title → days). */
export function quizCountsByTopic(interval) {
  const map = new Map();
  topicDurationsInInterval(interval).forEach((row) => {
    map.set(row.title, row.days);
  });
  return map;
}

/** Average % across submitted attempts for this topic's papers. */
export function topicAveragePercent(history = [], papers = []) {
  const ids = new Set((papers || []).map((exam) => String(exam?.id ?? exam?.Id ?? '')).filter(Boolean));
  if (!ids.size) return null;
  const scores = (history || [])
    .filter((row) => {
      const examId = String(row?.examId ?? row?.ExamId ?? '');
      if (!ids.has(examId)) return false;
      const status = String(row?.status || row?.Status || '').toLowerCase();
      if (status === 'inprogress' || status === 'in_progress') return false;
      if (!(row?.submittedAt || row?.SubmittedAt)) return false;
      const pct = Number(row?.percent ?? row?.Percent ?? row?.score ?? row?.Score);
      return Number.isFinite(pct);
    })
    .map((row) => Number(row.percent ?? row.Percent ?? row.score ?? row.Score));
  if (!scores.length) return null;
  return Math.round(scores.reduce((sum, n) => sum + n, 0) / scores.length);
}
