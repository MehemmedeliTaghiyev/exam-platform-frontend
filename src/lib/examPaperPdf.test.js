import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { latexToPlain } from './examPaperText.js';
import { paperCopyQuota, questionsPerPaper } from './paperQuota.js';

describe('latexToPlain', () => {
  it('renders common math without raw latex', () => {
    const out = latexToPlain('CK=3 \\sqrt{6}, \\angle BAD=60^{\\circ}');
    assert.match(out, /kok\(6\)/);
    assert.match(out, /aci/);
    assert.match(out, /60/);
    assert.match(out, /deg/);
    assert.doesNotMatch(out, /\\sqrt|\\angle|\\circ/);
  });

  it('also cleans broken latex without backslashes', () => {
    const out = latexToPlain('8 sqrt{2} olan cevre. angle C=80^{ circ}');
    assert.match(out, /kok\(2\)/);
    assert.match(out, /aci/);
    assert.match(out, /deg/);
  });

  it('strips [sekil] placeholder', () => {
    assert.equal(latexToPlain('[sekil] ABCD rombu'), 'ABCD rombu');
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

  it('Sınaq and Buraxılış request exactly 25', () => {
    assert.equal(paperCopyQuota('Sınaq', 'Orta').count, 25);
    assert.equal(paperCopyQuota('Buraxılış', 'Sadə').count, 25);
  });
});
