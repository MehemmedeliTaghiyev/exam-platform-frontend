import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { latexToPlain } from './examPaperText.js';
import {
  examPaperBodyHtml,
  examPaperDocumentHtml,
  FIGURES_PER_PAGE,
  packBlocksOntoPages,
  questionPageChunks,
  QUESTIONS_PER_PAGE,
} from './examPaperLayout.js';
import { buildExamPaperPdf, openExamPaperPrint } from './examPaperPdf.js';
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

function samplePaper(n = 25) {
  return Array.from({ length: n }, (_, i) => ({
    text: `${i + 1 === 2 ? 'İfadəni sadələşdirin: $\\sqrt{(1-\\sqrt{5})^2}$' : `Sual ${i + 1}. $x^{${(i % 5) + 1}}$ və $\\dfrac{1}{${i + 2}}$`}`,
    options: [
      { optionText: 'A) $2$' },
      { optionText: 'B) $-3$' },
      { optionText: 'C) $1$' },
      { optionText: 'D) $-1$' },
      { optionText: 'E) $3$' },
    ],
    correctAnswer: 'C',
  }));
}

describe('packBlocksOntoPages', () => {
  it('puts 10 questions per page, then the next sheet', () => {
    assert.equal(QUESTIONS_PER_PAGE, 10);
    const heights = Array(25).fill(36);
    const pages = packBlocksOntoPages(heights, { pageHeight: 720, reservedTop: 80 });
    const total = pages.reduce((n, p) => n + p.indices.length, 0);
    assert.equal(total, 25);
    assert.equal(pages[0].indices.length, 10);
    assert.equal(pages[1].indices.length, 10);
    assert.equal(pages[2].indices.length, 5);
    assert.deepEqual(pages.flatMap((p) => p.indices), [...Array(25).keys()]);
  });

  it('never drops overflow questions', () => {
    const heights = Array(25).fill(200);
    const pages = packBlocksOntoPages(heights, { pageHeight: 500, reservedTop: 60 });
    assert.equal(pages.reduce((n, p) => n + p.indices.length, 0), 25);
    assert.ok(pages[0].indices.length <= 10);
    assert.ok(pages.length >= 3);
  });

  it('caps şəkil at 10 per page even when questions fit', () => {
    assert.equal(FIGURES_PER_PAGE, 10);
    const heights = Array(12).fill(8);
    const figureFlags = Array(12).fill(true);
    const pages = packBlocksOntoPages(heights, {
      pageHeight: 720,
      reservedTop: 40,
      figureFlags,
    });
    assert.equal(pages.reduce((n, p) => n + p.indices.length, 0), 12);
    assert.equal(pages[0].indices.length, 10);
    assert.equal(pages[0].figures, 10);
    assert.equal(pages[1].indices.length, 2);
    assert.equal(pages[1].figures, 2);
  });
});

describe('questionPageChunks', () => {
  it('splits figured questions so a page never has more than 10 şəkil', () => {
    const qs = Array.from({ length: 12 }, (_, i) => ({
      text: `Şəkil sual ${i + 1}`,
      imageUrl: `https://example.test/fig-${i + 1}.png`,
      options: [{ optionText: 'A) 1' }],
    }));
    const chunks = questionPageChunks(qs);
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].items.length, 10);
    assert.equal(chunks[1].items.length, 2);
  });
});

describe('exam paper html', () => {
  it('emits every question with KaTeX, not a 9-item slice', () => {
    const html = examPaperBodyHtml(samplePaper(25));
    assert.equal((html.match(/class="ep-q"/g) || []).length, 25);
    assert.match(html, /data-q="25"/);
    assert.match(html, /katex/);
    assert.doesNotMatch(html, /\$\\sqrt|\$x\^/);
  });

  it('student sheet omits Cavablar by default', () => {
    const html = examPaperDocumentHtml(samplePaper(25), 'Test');
    assert.doesNotMatch(html, /Cavablar \(müəllim\)|<section class="ep-key">/);
    const withKey = examPaperDocumentHtml(samplePaper(25), 'Test', { includeAnswerKey: true });
    assert.match(withKey, /Cavablar \(müəllim\)/);
  });

  it('first paper page has questions 1–10 only', () => {
    const html = examPaperDocumentHtml(samplePaper(25), 'Test');
    const pages = html.split('class="ep-paper-page"');
    assert.ok(pages.length >= 4);
    assert.match(pages[1], /data-q="1"/);
    assert.match(pages[1], /data-q="10"/);
    assert.doesNotMatch(pages[1], /data-q="11"/);
    assert.match(pages[2], /data-q="11"/);
  });

  it('student header is imtahan vərəqi, not müəllim vərəqi', () => {
    const html = examPaperDocumentHtml(samplePaper(25), 'Riyaziyyat · Sınaq · Həqiqi ədədlər');
    assert.match(html, /imtahan vərəqi/);
    assert.doesNotMatch(html, /müəllim vərəqi/);
  });

  it('embeds figure images, not extracted figure text', () => {
    const html = examPaperDocumentHtml([{
      text: '3,7 ədədinə uyğun nöqtə',
      imageUrl: 'https://cdn.example/number-line.png',
      options: [
        { optionText: 'A) D və E' },
        { optionText: 'B) E və F' },
      ],
    }], 'Həqiqi ədədlər');
    assert.match(html, /<img class="ep-fig" src="https:\/\/cdn.example\/number-line.png"/);
    assert.doesNotMatch(html, /extracted|figure text|\[sekil\]/i);
  });
});

describe('buildExamPaperPdf', () => {
  it('writes all 25 questions across 10-per-page sheets', async () => {
    const blob = await buildExamPaperPdf(samplePaper(25), 'Riyaziyyat · Sınaq · n-ci dərəcədən kök', {
      preferFigures: true,
      meta: 'Sınaq · 11 · n-ci dərəcədən kök',
    });
    const raw = Buffer.from(await blob.arrayBuffer()).toString('latin1');
    assert.match(raw, /%PDF-1\./);
    assert.match(raw, /25\. Sual 25/);
    assert.match(raw, /1\. Sual 1/);
    assert.doesNotMatch(raw, /Cavablar/);
    assert.match(raw, /imtahan vereqi/);
    assert.doesNotMatch(raw, /muellim vereqi/);
    const pageCount = (raw.match(/\/Type \/Page /g) || []).length;
    assert.ok(pageCount >= 3);
    assert.equal(pageCount, 3);
  });

  it('overflows long questions onto the next A4 instead of clipping', async () => {
    const long = Array.from({ length: 25 }, (_, i) => ({
      text: `Sual ${i + 1}. ${'uzun ifadə '.repeat(28)}$\\sqrt{${i + 1}}$`,
      options: [
        { optionText: 'A) $2$' },
        { optionText: 'B) $-3$' },
        { optionText: 'C) $1$' },
        { optionText: 'D) $-1$' },
        { optionText: 'E) $3$' },
      ],
      correctAnswer: 'C',
    }));
    const blob = await buildExamPaperPdf(long, 'Uzun sınaq');
    const raw = Buffer.from(await blob.arrayBuffer()).toString('latin1');
    const pageCount = (raw.match(/\/Type \/Page /g) || []).length;
    assert.ok(pageCount >= 2);
    assert.match(raw, /25\. Sual 25/);
  });

  it('does not open a print window in Node', () => {
    assert.equal(openExamPaperPrint(samplePaper(25), 'Həqiqi ədədlər'), false);
  });
});
