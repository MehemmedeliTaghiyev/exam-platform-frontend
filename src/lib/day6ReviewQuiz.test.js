import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MATH_CALENDAR } from './mathCalendar.js';
import {
  calendarDayIndex,
  day6CycleInfo,
  isDay6ReviewDay,
} from './day6Calendar.js';
import { topicAveragePercent } from './topicQuizDifficulty.js';

describe('day6 review cycle', () => {
  it('marks every 6th calendar day from MATH_CALENDAR.from', () => {
    assert.equal(MATH_CALENDAR.from, '2026-11-08');
    assert.equal(calendarDayIndex('2026-11-08'), 0);
    assert.equal(isDay6ReviewDay('2026-11-08'), false);
    assert.equal(isDay6ReviewDay('2026-11-13'), true);
    assert.equal(isDay6ReviewDay('2026-11-14'), false);
    assert.equal(isDay6ReviewDay('2026-11-19'), true);
  });

  it('looks back over the previous 5 days of the cycle', () => {
    const info = day6CycleInfo('2026-11-13');
    assert.equal(info.isReviewDay, true);
    assert.deepEqual(info.lookbackYmds, [
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
    ]);
  });
});

describe('topic average percent', () => {
  it('averages submitted percents for topic papers', () => {
    const avg = topicAveragePercent(
      [
        { examId: 1, percent: 80, submittedAt: '2026-11-10' },
        { examId: 2, percent: 60, submittedAt: '2026-11-11' },
        { examId: 3, percent: 90, status: 'InProgress' },
      ],
      [{ id: 1 }, { id: 2 }, { id: 3 }],
    );
    assert.equal(avg, 70);
  });
});
