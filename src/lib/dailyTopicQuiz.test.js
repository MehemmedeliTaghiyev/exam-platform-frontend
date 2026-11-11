import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { latestCoveredTopicForDay } from './mathCalendar.js';
import {
  examsMatchingTopic,
  topicTitleForDay,
  todaysTopicQuiz,
} from './dailyTopicQuiz.js';

describe('daily topic quiz', () => {
  it('paces latest covered topic by calendar date inside the window', () => {
    assert.equal(latestCoveredTopicForDay('2026-11-08').topic, 'Həqiqi ədədlər');
    assert.equal(topicTitleForDay('2026-11-08'), 'Həqiqi ədədlər');
    assert.equal(latestCoveredTopicForDay('2026-11-21').topic, 'Üçbucaqlar');
    assert.equal(topicTitleForDay('2026-11-21'), 'Üçbucaqlar');
  });

  it('does not wrap back to earlier topics later in the same window', () => {
    const mid = latestCoveredTopicForDay('2026-11-14');
    const end = latestCoveredTopicForDay('2026-11-21');
    assert.ok(mid.index <= end.index);
    assert.equal(end.topic, 'Üçbucaqlar');
  });

  it('attaches newest matching paper for calendar topic', () => {
    const hit = todaysTopicQuiz([
      { id: 97, title: 'Həftəlik asan', kind: 'weekly' },
      { id: 101, title: 'PNG · Həqiqi ədədlər · Orta', kind: 'Sınaq' },
    ], '2026-11-08');
    assert.equal(hit.topic, 'Həqiqi ədədlər');
    assert.equal(String(hit.exam.id), '101');
  });

  it('keeps topic papers only in matching section', () => {
    const exams = [
      { id: 99, title: 'PNG · Üçbucaqlar', kind: 'weekly' },
      { id: 100, title: 'Faiz sınağı · Nisbət. Tənasüb. Faiz', kind: 'weekly' },
    ];
    assert.equal(examsMatchingTopic(exams, 'Üçbucaqlar').map((e) => String(e.id)).join(','), '99');
    assert.equal(examsMatchingTopic(exams, 'Nisbət. Tənasüb. Faiz').map((e) => String(e.id)).join(','), '100');
  });
});
