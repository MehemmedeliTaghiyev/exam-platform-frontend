import {
  addDaysYmd,
  daysBetweenYmd,
  MATH_CALENDAR,
  tbilisiYmd,
} from './mathCalendar.js';

/** 0-based day index from calendar start. */
export function calendarDayIndex(ymd = tbilisiYmd()) {
  return daysBetweenYmd(MATH_CALENDAR.from, ymd);
}

/** Every 6th calendar day (1-based: 6, 12, 18…). */
export function isDay6ReviewDay(ymd = tbilisiYmd()) {
  const key = String(ymd || tbilisiYmd());
  if (key < MATH_CALENDAR.from) return false;
  return (calendarDayIndex(key) % 6) === 5;
}

export function day6CycleInfo(ymd = tbilisiYmd()) {
  const key = String(ymd || tbilisiYmd());
  const index = Math.max(0, calendarDayIndex(key));
  const cycle = Math.floor(index / 6);
  const cycleStartIndex = cycle * 6;
  const reviewIndex = cycleStartIndex + 5;
  const lookback = [];
  for (let i = 0; i < 5; i += 1) {
    lookback.push(addDaysYmd(MATH_CALENDAR.from, cycleStartIndex + i));
  }
  const reviewYmd = addDaysYmd(MATH_CALENDAR.from, reviewIndex);
  const cycleKey = `c${cycle}-${lookback[0]}_${lookback[4]}`;
  return {
    ymd: key,
    cycle,
    cycleKey,
    lookbackYmds: lookback,
    reviewYmd,
    isReviewDay: key === reviewYmd || isDay6ReviewDay(key),
    label: `5 günün təkrarı · ${lookback[0].slice(5)} – ${lookback[4].slice(5)}`,
  };
}
