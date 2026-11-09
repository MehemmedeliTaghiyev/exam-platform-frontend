import { describe, expect, it } from 'vitest';
import { shuffleExamPaper } from './examShuffle';

const sample = [
  {
    id: 1,
    text: 'Q1',
    correctLetter: 'A',
    options: [
      { id: 11, optionText: 'A) bir', isCorrect: true },
      { id: 12, optionText: 'B) iki', isCorrect: false },
      { id: 13, optionText: 'C) uc', isCorrect: false },
    ],
  },
  {
    id: 2,
    text: 'Q2',
    correctLetter: 'B',
    options: [
      { id: 21, optionText: 'A) x', isCorrect: false },
      { id: 22, optionText: 'B) y', isCorrect: true },
      { id: 23, optionText: 'C) z', isCorrect: false },
    ],
  },
];

describe('shuffleExamPaper', () => {
  it('is deterministic for the same seed', () => {
    const a = shuffleExamPaper(sample, 'student-7|exam-9');
    const b = shuffleExamPaper(sample, 'student-7|exam-9');
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    expect(a[0].options.map((o) => o.id)).toEqual(b[0].options.map((o) => o.id));
  });

  it('keeps the correct option marked after shuffle', () => {
    const paper = shuffleExamPaper(sample, 'mix-seed');
    paper.forEach((q) => {
      const correct = q.options.filter((o) => o.isCorrect);
      expect(correct).toHaveLength(1);
      const bodies = sample.find((row) => row.id === q.id).options
        .filter((o) => o.isCorrect)
        .map((o) => String(o.optionText).replace(/^[A-E][\)\.\-:]\s*/i, '').trim().toLowerCase());
      expect(bodies).toContain(String(correct[0].text || '').toLowerCase());
    });
  });
});
