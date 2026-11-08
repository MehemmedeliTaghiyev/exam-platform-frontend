import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  intervalContaining,
  lastCompletedInterval,
  lastWeeklyOnOrBefore,
  studentTopicPlace,
  tbilisiYmd,
} from './mathCalendar.js';
import {
  examPulseAudience,
  LIVE_WEEKLY_EASY_EXAM_ID,
  LIVE_WEEKLY_MEDIUM_EXAM_ID,
  REPUBLIC_NOV_2026_EXAM_ID,
  WEEKLY_SMOKE_EXAM_ID,
  republicMixedExams,
  weeklyPairForInterval,
} from './weeklyMath.js';

describe('student topic place', () => {
  it('on-time 8 Nov 2026 sits at current weekly window', () => {
    const now = new Date('2026-11-08T08:00:00+04:00');
    const { place, onTime, current } = studentTopicPlace({ createdAt: '2026-11-08' }, now);
    assert.equal(tbilisiYmd(now), '2026-11-08');
    assert.equal(current.start, '2026-11-08');
    assert.equal(place.start, '2026-11-08');
    assert.equal(place.send.weekly, true);
    assert.equal(onTime, true);
  });

  it('late joiner after interval 1 sits at last completed weekly archive', () => {
    const now = new Date('2026-11-25T08:00:00+04:00');
    const { place, onTime, current } = studentTopicPlace({ createdAt: '2026-11-25' }, now);
    assert.equal(current.start, '2026-11-22');
    assert.equal(current.send.weekly, false);
    assert.equal(onTime, false);
    assert.equal(place.start, '2026-11-08');
    assert.equal(place.send.weekly, true);
  });
});

describe('weekly vs mixed routing', () => {
  it('binds live weekly 97 asan and 98 orta, never 94 or 96', () => {
    const interval = intervalContaining('2026-11-08');
    const pair = weeklyPairForInterval(interval, [
      { id: 94, title: 'Respublika sınağı · Noyabr 2026', kind: 'Sınaq' },
      { id: 96, title: 'smoke', kind: 'Sınaq' },
      { id: 97, title: 'Həftəlik asan', kind: 'Sınaq' },
      { id: 98, title: 'Həftəlik orta', kind: 'Sınaq' },
    ]);
    assert.equal(String(pair.easy.id), LIVE_WEEKLY_EASY_EXAM_ID);
    assert.equal(String(pair.medium.id), LIVE_WEEKLY_MEDIUM_EXAM_ID);
    assert.equal(examPulseAudience({ id: 94, title: 'Respublika sınağı · Noyabr 2026', kind: 'Sınaq' }), 'mixed');
    assert.equal(examPulseAudience({ id: 96, title: 'smoke', kind: 'Sınaq' }), 'hidden');
    assert.equal(examPulseAudience({ id: 97, kind: 'Sınaq' }), 'weekly');
    assert.equal(examPulseAudience({ id: 98, kind: 'Sınaq' }), 'weekly');
    assert.notEqual(String(pair.easy.id), REPUBLIC_NOV_2026_EXAM_ID);
    assert.notEqual(String(pair.medium.id), WEEKLY_SMOKE_EXAM_ID);
    const empty = weeklyPairForInterval(interval, []);
    assert.equal(empty.easy, null);
    assert.equal(empty.medium, null);
    const mixed = republicMixedExams([
      { id: 94, title: 'Respublika sınağı · Noyabr 2026', kind: 'Sınaq' },
      { id: 96, title: 'Noyabr 2026 həftəlik', kind: 'Sınaq' },
      { id: 97, title: 'Həftəlik asan', kind: 'Sınaq' },
      { id: 98, title: 'Həftəlik orta', kind: 'Sınaq' },
    ]);
    assert.equal(mixed.map((exam) => String(exam.id)).join(','), REPUBLIC_NOV_2026_EXAM_ID);
  });

  it('kind map: Sınaq weekly, Buraxılış/Respublika mixed, Blok specialty', () => {
    assert.equal(examPulseAudience({ id: 1, kind: 'Sınaq', title: 'Həftəlik' }), 'weekly');
    assert.equal(examPulseAudience({ id: 2, kind: 'Buraxılış', title: 'Buraxılış' }), 'mixed');
    assert.equal(examPulseAudience({ id: 3, kind: 'Respublika', title: 'Respublika' }), 'mixed');
    assert.equal(examPulseAudience({ id: 4, kind: 'Blok', title: 'Blok' }), 'specialty');
  });

  it('walks back from a blok window to the last weekly send', () => {
    const blok = intervalContaining('2026-11-22');
    assert.equal(blok.send.weekly, false);
    assert.equal(lastWeeklyOnOrBefore(blok).start, '2026-11-08');
    assert.equal(lastCompletedInterval('2026-11-22').start, '2026-11-08');
  });
});
