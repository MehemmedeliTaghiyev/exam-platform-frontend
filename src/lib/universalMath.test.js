import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  fixCorruptedEncoding,
  fixExponents,
  fixFractions,
  fixIntervalsAndSets,
  fixRoots,
  convertRemainingBrackets,
  protectOptionPrefixes,
  restoreOptionPrefixes,
  universalMathParser,
  wrapMathExpressions,
} from './universalMath.js';
import { renderLatexHtml } from './latexText.js';

function mathCore(out) {
  return String(out).replace(/\$/g, '');
}

describe('1. Protect Option Prefixes', () => {
  it('does not alter A] B] C] D] E] at line starts', () => {
    const raw = 'A] [2x + y]^2\nB] [-25]\nC] value';
    const out = universalMathParser(raw);
    assert.match(out, /(?:^|[^$])A]/m);
    assert.match(out, /(?:^|\n)B]/);
    assert.match(out, /(?:^|\n)C]/);
    assert.doesNotMatch(out, /\$A\]/);
    assert.doesNotMatch(out, /^A\)/m);
    const protected_ = protectOptionPrefixes(raw);
    assert.match(protected_, /§OPT§A§OPT§/);
    assert.equal(restoreOptionPrefixes(protected_), raw);
  });
});

describe('2. Fix Corrupted Encoding Superscripts', () => {
  it('maps ´† ´‡ â » â • â · and standard symbols', () => {
    assert.equal(fixCorruptedEncoding('4x´†'), '4x^2');
    assert.equal(fixCorruptedEncoding('a´‡'), 'a^3');
    assert.equal(fixCorruptedEncoding('câ •'), 'c^5');
    assert.equal(fixCorruptedEncoding('bâ ·'), 'b^7');
    assert.equal(fixCorruptedEncoding('zâ ·'), 'z^7');
    assert.match(fixCorruptedEncoding('8axâ »´†y´‡'), /8ax\^{-2}y\^3/);
    assert.match(fixCorruptedEncoding('90Â°'), /\^\\circ/);
    assert.match(fixCorruptedEncoding('2Ã—3'), /\\times/);
    assert.match(fixCorruptedEncoding('8Ã·2'), /\\div/);
    assert.match(fixCorruptedEncoding('aâ‰¤b'), /\\leq/);
    assert.match(fixCorruptedEncoding('aâ‰¥b'), /\\geq/);
    assert.match(fixCorruptedEncoding('aâ‰ b'), /\\neq/);
  });

  it('parser output for combined negative power mojibake', () => {
    const out = mathCore(universalMathParser('8axâ »´†y´‡'));
    assert.match(out, /8ax\^{-2}y\^\{3\}/);
  });
});

describe('3. Fix Intervals & Set Symbols', () => {
  it('converts ain[1;+infty] to in-interval with +infty paren', () => {
    const step = fixIntervalsAndSets('ain[1;+infty]');
    assert.match(step, /\\in/);
    assert.match(step, /\[1; \+\\infty\)/);
    const out = mathCore(universalMathParser('ain[1;+infty]'));
    assert.match(out, /a\s*\\in\s*\[1; \+\\infty\)/);
  });

  it('converts in[0;+infty]', () => {
    const out = mathCore(universalMathParser('x in[0;+infty]'));
    assert.match(out, /\\in\s*\[0; \+\\infty\)/);
  });
});

describe('4. Fix Roots (kok and sqrt)', () => {
  it('sqrt[n][expr] and trailing power', () => {
    const out = mathCore(universalMathParser('sqrt[3][a-1]^2'));
    assert.match(out, /\\sqrt\[3\]\{\(a-1\)\^\{2\}\}/);
  });

  it('kok[n][expr] and kok[expr] nested brackets', () => {
    assert.match(mathCore(universalMathParser('kok[3][8]')), /\\sqrt\[3\]\{8\}/);
    const nested = mathCore(universalMathParser('kok[[x^2 + 3]/[[x-3]^3]]'));
    assert.match(nested, /\\sqrt\{/);
    assert.match(nested, /\\frac\{x\^\{2\} \+ 3\}\{\(x-3\)\^\{3\}\}/);
  });

  it('fixRoots helper', () => {
    assert.match(fixRoots('sqrt[3][a-1]^2'), /§SQRTIDX§3§|\\sqrt\[3\]/);
    assert.match(fixRoots('kok[expr]'), /\\sqrt\{expr\}/);
  });
});

describe('5. Fix Exponents with Fractions & Multi-term', () => {
  it('negative and positive fractional exponents on bracket base', () => {
    assert.match(
      mathCore(universalMathParser('[a-1]^-[1]/[3]')),
      /\(a-1\)\^{-\{\\frac\{1\}\{3\}\}|\(a-1\)\^{-\\frac\{1\}\{3\}}/,
    );
    assert.match(
      mathCore(universalMathParser('[a-1]^[2]/[3]')),
      /\(a-1\)\^\{\\frac\{2\}\{3\}\}/,
    );
  });

  it('groups multi-character exponents', () => {
    const step = fixExponents('x^k^2-6k+11+27');
    assert.match(step, /x\^\{k\^\{?2\}?-6k\+11\}\+27/);
    const out = mathCore(universalMathParser('x^k^2-6k+11+27'));
    assert.match(out, /x\^\{k\^\{2\}-6k\+11\}\+27/);
  });
});

describe('6. Fix Fractions (Nested & Mixed & frac)', () => {
  it('innermost [num]/[den] and mixed fractions', () => {
    assert.match(mathCore(universalMathParser('[2]/[3]')), /\\frac\{2\}\{3\}/);
    assert.match(mathCore(universalMathParser('1[21]/[29]')), /1\\frac\{21\}\{29\}/);
  });

  it('malformed frac with nested inverse', () => {
    const raw = 'frac[2x]/[1-x]1-[[1-x]/[2x]]^-1';
    const out = mathCore(universalMathParser(raw));
    assert.match(out, /\\frac\{\\frac\{2x\}\{1-x\}\}/);
    assert.match(out, /\\left\(\\frac\{1-x\}\{2x\}\\right\)\^\{-1\}/);
  });

  it('malformed frac5^8-178* split', () => {
    const raw = 'frac5^8-178*[25^2+1]+5';
    const out = mathCore(universalMathParser(raw));
    assert.match(out, /\\frac\{5\^\{8\}-1\}\{78\\cdot\s*\(25\^\{2\}\+1\)\+5\}/);
  });

  it('fixFractions flags ambiguous bare frac', () => {
    globalThis.__FRAC_REVIEW__ = [];
    const out = fixFractions('frac???zzz');
    assert.match(out, /§FRAC_REVIEW§/);
    assert.ok((globalThis.__FRAC_REVIEW__ || []).length >= 1);
  });
});

describe('7. Convert Remaining Square Brackets', () => {
  it('algebraic brackets to parentheses; strips singleton negatives', () => {
    assert.match(mathCore(universalMathParser('[2x + y]^2')), /\(2x \+ y\)\^\{2\}/);
    assert.match(convertRemainingBrackets('[-25]-dir'), /-25-dir/);
    assert.match(mathCore(universalMathParser('cavab [-25]-dir')), /-25-dir/);
  });
});

describe('8. Auto-wrap Math Expressions', () => {
  it('wraps math but keeps az phrase plain', () => {
    const out = universalMathParser(
      '[2x + y]´† + 8[2x + y] + 18 ifadesinin en kicik qiymetini tapin.',
    );
    assert.match(out, /\$/);
    assert.match(out, /ifadesinin en kicik qiymetini tapin/);
    assert.doesNotMatch(out, /\$ifadesinin/);
    assert.doesNotMatch(out, /´†/);
  });

  it('wrapMathExpressions keeps olarsa / uygunlugu mueyyen edin', () => {
    const wrapped = wrapMathExpressions('x=2 olarsa uygunlugu mueyyen edin');
    assert.match(wrapped, /olarsa/);
    assert.match(wrapped, /uygunlugu mueyyen edin/);
    assert.doesNotMatch(wrapped, /\$olarsa\$/);
  });
});

describe('regression: prior bank paths', () => {
  it('converts nested kok and fraction templates', () => {
    const out = universalMathParser('BC=[4kok[6]]/[3], aci BAD=60^ deg');
    assert.match(out, /\\frac/);
    assert.match(out, /\\sqrt/);
    assert.match(out, /\\angle/);
    assert.match(out, /\\circ/);
  });

  it('converts unicode bank plain', () => {
    const out = universalMathParser('AD = DO olarsa, ∠ ACB-ni tapın. 6π və 60°');
    assert.match(out, /\\angle/);
    assert.match(out, /\\pi/);
    assert.match(out, /\\circ/);
  });

  it('converts unicode root', () => {
    const out = universalMathParser('√(3) və √[3](8)');
    assert.match(out, /\\sqrt\{3\}/);
    assert.match(out, /\\sqrt\[3\]\{8\}/);
  });

  it('does not wrap whole az sentence as one math block', () => {
    const out = universalMathParser(
      'b-nin hansı qiymətlərində √[3](b³) ≥ √[6](b⁶) bərabərsizliyi doğrudur?',
    );
    assert.match(out, /\\sqrt\[3\]\{b\^\{3\}\}/);
    assert.match(out, /\\sqrt\[6\]\{b\^\{6\}\}/);
    assert.match(out, /bərabərsizliyi/);
    assert.match(out, /\bb-nin\b/);
    assert.doesNotMatch(out, /\$b-nin\$/);
    assert.doesNotMatch(out, /doğrudur\?\$$/);
  });
});

describe('renderLatexHtml', () => {
  it('emits katex html for unicode angle', () => {
    const html = renderLatexHtml('∠ ABE=∠ EBC olarsa');
    assert.match(html, /katex/);
    assert.match(html, /katex-html/);
  });

  it('keeps az suffix outside angle math', () => {
    const prepared = universalMathParser('∠ ACB-ni tapın');
    assert.match(prepared, /\$\\angle ACB\$-ni/);
  });

  it('keeps plain az words without katex crash', () => {
    const html = renderLatexHtml('Şəkildə verilənlərə əsasən, x-in qiymətini tapın.');
    assert.ok(html.length > 10);
  });
});
