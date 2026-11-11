import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  intervalContaining,
  topicDurationsInInterval,
} from './mathCalendar.js';
import {
  annotateTopicPapers,
  bankDifficultyForBand,
  nextTopicQuizDifficulty,
  quizCountForTopic,
  topicQuizBankQuota,
  topicQuizDifficultyPlan,
} from './topicQuizDifficulty.js';

describe('topic quiz difficulty plan', () => {
  it('sizes quiz count from calendar topic duration, not a fixed 5', () => {
    const interval = intervalContaining('2026-11-08');
    const rows = topicDurationsInInterval(interval);
    assert.equal(rows.reduce((sum, row) => sum + row.days, 0), 14);
    assert.equal(quizCountForTopic('Həqiqi ədədlər', interval), rows[0].days);
    assert.equal(quizCountForTopic('Üçbucaqlar', interval), rows[rows.length - 1].days);
    assert.notEqual(quizCountForTopic('Həqiqi ədədlər', interval), 5);
  });

  it('uses last 2 hard, one middle easy, rest medium for duration-sized series', () => {
    assert.deepEqual(topicQuizDifficultyPlan(5), ['orta', 'orta', 'asan', 'çətin', 'çətin']);
    assert.deepEqual(topicQuizDifficultyPlan(3), ['asan', 'çətin', 'çətin']);
    assert.deepEqual(topicQuizDifficultyPlan(2), ['çətin', 'çətin']);
    assert.deepEqual(topicQuizDifficultyPlan(1), ['orta']);
  });

  it('picks next band by existing count within that topic duration', () => {
    assert.equal(nextTopicQuizDifficulty(0, 3), 'asan');
    assert.equal(nextTopicQuizDifficulty(1, 3), 'çətin');
    assert.equal(nextTopicQuizDifficulty(2, 3), 'çətin');
    assert.equal(nextTopicQuizDifficulty(0, 2), 'çətin');
  });

  it('annotates papers with duration-based plan', () => {
    const rows = annotateTopicPapers([
      { id: 12, title: 'Üçbucaqlar · Çətin' },
      { id: 10, title: 'Üçbucaqlar' },
      { id: 11, title: 'Üçbucaqlar · Orta' },
    ], 3);
    assert.equal(rows.map((r) => String(r.exam.id)).join(','), '10,11,12');
    assert.equal(rows[0].planned, 'asan');
    assert.equal(rows[1].planned, 'çətin');
    assert.equal(rows[2].planned, 'çətin');
    assert.equal(rows[2].band, 'çətin');
  });

  it('maps series slot to a single bank difficulty (DB already split)', () => {
    assert.equal(bankDifficultyForBand('asan'), 'Sadə');
    assert.equal(bankDifficultyForBand('orta'), 'Orta');
    assert.equal(bankDifficultyForBand('çətin'), 'Çətin');
    const q = topicQuizBankQuota('Üçbucaqlar', 0, 10, 3);
    assert.equal(q.band, 'asan');
    assert.equal(q.difficultyLevel, 'Sadə');
    assert.equal(q.series, 3);
    assert.equal(topicQuizBankQuota('Üçbucaqlar', 1, 8, 3).difficultyLevel, 'Çətin');
  });
});
