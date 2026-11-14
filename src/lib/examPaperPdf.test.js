import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { latexToPlain } from './examPaperText.js';
import { paperCopyQuota, questionsPerPaper } from './paperQuota.js';

describe('latexToPlain', () => {
  it('renders common math without raw latex', () => {
    const out = latexToPlain('CK=3 \\sqrt{6}, \\angle BAD=60^{\\circ}');
    assert.match(out, /√\(6\)/);
    assert.match(out, /∠|bucaq/);
    assert.match(out, /60/);
    assert.match(out, /°|deg/);
    assert.doesNotMatch(out, /\\sqrt|\\angle|\\circ|\baci\b/);
  });

  it('fixes mojibake squared brackets for PDF', () => {
    const out = latexToPlain('[2x + y]´† + 8[2x + y] + 18 ifadesinin en kicik qiymetini tapin.');
    assert.match(out, /\(2x \+ y\)²/);
    assert.match(out, /8\(2x \+ y\)/);
    assert.doesNotMatch(out, /´†/);
    assert.doesNotMatch(out, /\[[^\]]+\]/);
  });

  it('also cleans broken latex without backslashes', () => {
    const out = latexToPlain('8 sqrt{2} olan cevre. angle C=80^{ circ}');
    assert.match(out, /√\(2\)/);
    assert.match(out, /bucaq/);
    assert.match(out, /°|deg/);
  });

  it('strips [sekil] placeholder', () => {
    assert.equal(latexToPlain('[sekil] ABCD rombu'), 'ABCD rombu');
  });

  it('keeps readable fractions powers and products', () => {
    const out = latexToPlain('\\dfrac{1}{2} + x^{2} = 3\\times4, a_{n}');
    assert.match(out, /\(1\)\/\(2\)/);
    assert.match(out, /x²/);
    assert.match(out, /×|\*/);
    assert.match(out, /aₙ|a_n/);
    assert.doesNotMatch(out, /dfrac|times|frac|\$/);
  });

  it('renders textbook-style powers without dollar or caret', () => {
    const out = latexToPlain('$[x^2+10x+29]^2+17$ ifadəsinin ən kiçik qiymətini tapın.');
    assert.match(out, /\(x²/);
    assert.match(out, /\)²/);
    assert.doesNotMatch(out, /\$|\^2/);
  });

  it('handles nested frac', () => {
    const out = latexToPlain('\\frac{1}{\\frac{2}{3}}');
    assert.match(out, /\(1\)\/\(\(2\)\/\(3\)\)/);
  });

  it('handles nested sqrt and double-escaped frac', () => {
    const nested = latexToPlain('\\sqrt{x^{2}+mx+17}');
    assert.match(nested, /√\(x² \+ mx \+ 17\)/);
    const doubled = latexToPlain('\\\\frac{1}{2} \\\\times 3');
    assert.match(doubled, /\(1\)\/\(2\)/);
    assert.match(doubled, /×|\*/);
    assert.doesNotMatch(doubled, /frac|times/);
  });

  it('keeps unicode bank roots without √(sqrt) corruption', () => {
    const sq = latexToPlain('3 √(43) - 9 √(5)');
    assert.match(sq, /3 √\(43\)/);
    assert.match(sq, /9 √\(5\)/);
    assert.doesNotMatch(sq, /√\(sqrt\)|\\sqrt|\bsqrt\b/);

    const nth = latexToPlain('√[3](b³) ≥ √[6](b⁶)');
    assert.match(nth, /√\[3\]\(b³\)/);
    assert.match(nth, /√\[6\]\(b⁶\)/);
    assert.doesNotMatch(nth, /√\(sqrt\)|√\(3\)\(b/);

    const nested = latexToPlain('√(47 + √(7-√(9)))');
    assert.equal(nested, '√(47 + √(7-√(9)))');
  });

  it('keeps az suffix on hyphen', () => {
    const out = latexToPlain('b-nin hansı qiymətlərində √[3](b³)');
    assert.match(out, /\bb-nin\b/);
    assert.doesNotMatch(out, /b - nin/);
  });
});

describe('questionsPerPaper', () => {
  it('uses 25 for Sınaq and Buraxılış, 30 for Blok', () => {
    assert.equal(questionsPerPaper('Sınaq'), 25);
    assert.equal(questionsPerPaper('Buraxılış'), 25);
    assert.equal(questionsPerPaper('Blok'), 30);
  });

  it('Blok quota ends with 3 situation', () => {
    const q = paperCopyQuota('Blok', 'Orta');
    assert.equal(q.mcqCount, 22);
    assert.equal(q.writtenCount, 5);
    assert.equal(q.situationCount, 3);
    assert.equal(q.mcqCount + q.writtenCount + q.situationCount, 30);
  });

  it('Sınaq count 25; Buraxılış uses official slot mix', () => {
    assert.equal(paperCopyQuota('Sınaq', 'Orta').count, 25);
    const b = paperCopyQuota('Buraxılış', 'Sadə', '11');
    assert.equal(b.mcqCount + b.openCodedCount + b.writtenCount, 25);
  });
});
