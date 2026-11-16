import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(String(key), String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

import { studentResultsReady } from './utils.js';
import {
  gradeExam,
  latestLocalSubmission,
  questionsHaveAnswerKeys,
  reviewCounts,
  reviewItemStatus,
} from './gradeExam.js';

const student = { id: 's1', role: 'Student' };

describe('public quiz results', () => {
  it('opens Hamı ilə / public live results immediately', () => {
    const livePublic = { title: 'Kvadrat tənliklər', isPublic: true, visibility: 'public', status: 'Live' };
    const livePrivate = { title: 'Özəl sınaq', isPublic: false, visibility: 'private', status: 'Live' };
    const finishedPrivate = { title: 'Bitmiş', isPublic: false, visibility: 'private', status: 'Finished' };
    assert.equal(studentResultsReady(livePublic, student), true);
    assert.equal(studentResultsReady({ ...livePublic, description: 'VIS:public' }, student), true);
    assert.equal(studentResultsReady(livePrivate, student), false);
    assert.equal(studentResultsReady(finishedPrivate, student), true);
    assert.equal(studentResultsReady(livePrivate, { ...student, practice: true }), true);
  });

  it('marks each item doğru / yanlış / boş and keeps the key on wrong and blank', () => {
    const paper = [
      {
        id: 1,
        text: '2+2',
        options: [
          { id: '1a', text: '3', isCorrect: false },
          { id: '1b', text: '4', isCorrect: true },
        ],
      },
      {
        id: 2,
        text: '3+3',
        options: [
          { id: '2a', text: '5', isCorrect: false },
          { id: '2b', text: '6', isCorrect: true },
        ],
      },
      {
        id: 3,
        text: '1+1',
        options: [
          { id: '3a', text: '1', isCorrect: false },
          { id: '3b', text: '2', isCorrect: true },
        ],
      },
    ];
    const graded = gradeExam(paper, [
      { questionId: 1, letter: 'B' },
      { questionId: 2, letter: 'A' },
    ]);
    assert.equal(reviewItemStatus(graded.questions[0]), 'correct');
    assert.equal(reviewItemStatus(graded.questions[1]), 'wrong');
    assert.equal(reviewItemStatus(graded.questions[2]), 'blank');
    assert.deepEqual(reviewCounts(graded.questions), {
      correct: 1,
      wrong: 1,
      blank: 1,
      total: 3,
    });
    assert.equal(questionsHaveAnswerKeys(graded.questions), true);
    assert.equal(graded.questions[0].isCorrect, true);
    assert.equal(graded.questions[0].correctText, '4');
    assert.equal(graded.questions[1].correctText, '6');
    assert.equal(graded.questions[2].correctText, '2');
    assert.equal(graded.questions[2].unanswered, true);
    const visible = graded.questions.filter((q) => reviewItemStatus(q) === 'correct' || true);
    assert.equal(visible.length, 3);
  });

  it('finds the latest local submission for the public exam', () => {
    const rows = [
      { examId: 9, studentId: 'other', answers: [] },
      { examId: 10, studentId: 's1', answers: [{ questionId: 1, letter: 'A' }], questions: [{ isCorrect: true }] },
    ];
    const hit = latestLocalSubmission(rows, 10, 's1');
    assert.equal(hit.examId, 10);
    assert.equal(questionsHaveAnswerKeys([{ options: [{ isCorrect: true }] }]), true);
    assert.equal(questionsHaveAnswerKeys([{ options: [{ isSelected: true }] }]), false);
  });
});
