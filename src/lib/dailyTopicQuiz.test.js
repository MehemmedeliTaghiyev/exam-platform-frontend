import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_TOPIC_SENDS,
  examsMatchingTopic,
  topicTitleForDay,
  todaysTopicQuiz,
} from './dailyTopicQuiz.js';

describe('daily topic quiz', () => {
  it('binds 9 Nov 2026 to Üçbucaqlar exam 99', () => {
    assert.equal(topicTitleForDay('2026-11-09'), 'Üçbucaqlar');
    const send = DAILY_TOPIC_SENDS.find((row) => row.ymd === '2026-11-09');
    assert.equal(send?.examId, '99');
    const hit = todaysTopicQuiz([
      { id: 97, title: 'Həftəlik asan', kind: 'weekly' },
      { id: 99, title: 'PNG fiqurlu · Üçbucaqlar · Orta', kind: 'weekly' },
    ], '2026-11-09');
    assert.equal(hit.topic, 'Üçbucaqlar');
    assert.equal(String(hit.exam.id), '99');
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
