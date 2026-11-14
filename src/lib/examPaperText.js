import { fixCorruptedEncoding } from './universalMath.js';

/** Strip embedded image marker / HTML img for plain PDF text. */
export function stripStemImage(text) {
  let raw = String(text || '');
  if (raw.startsWith('__IMG__')) {
    const end = raw.indexOf('__', 7);
    if (end >= 0) raw = raw.slice(end + 2).replace(/^\n/, '');
  }
  return raw.replace(/<img[^>]*>/gi, '').trim();
}

/** Mojibake + şablon → PDF/UI üçün oxunaqlı plain (unicode). */
function normalizeBankPlain(raw) {
  let text = fixCorruptedEncoding(stripStemImage(raw));

  // şəkil placeholder — []→() qabağı
  text = text
    .replace(/\[şəkil\]|\[sekil\]|\[şekil\]|\[figure\]/gi, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '');

  // fixCorruptedEncoding LaTeX-yönlü tokenlər buraxır → unicode
  text = text
    .replace(/\^\{\\circ\}/g, '°')
    .replace(/\^\\circ/g, '°')
    .replace(/\\times\s*/g, '×')
    .replace(/\\div\s*/g, '÷')
    .replace(/\\pm\s*/g, '±')
    .replace(/\\leq\s*/g, '≤')
    .replace(/\\geq\s*/g, '≥')
    .replace(/\\neq\s*/g, '≠')
    .replace(/\\infty(?![A-Za-z])/g, '∞')
    .replace(/\\pi(?![A-Za-z])/g, 'π')
    .replace(/\\angle\s*/g, '∠ ')
    .replace(/\\triangle\s*/g, '△ ')
    .replace(/\\parallel\s*/g, '∥ ')
    .replace(/\\perp\s*/g, '⊥ ')
    .replace(/\\cdot\s*/g, '·');

  // \sqrt / √ formalarını unicode plain-ə — []→() qabağı (indeks qorunsun)
  text = applyUntilStable(text, (t) => {
    let next = t.replace(/\\sqrt\[([^[\]]+)\]\{([^{}]*)\}/g, '√[$1]($2)');
    next = next.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');
    next = replaceBalancedRootParens(next, '\\sqrt');
    next = replaceBalancedRootParens(next, '√');
    return next;
  });

  // kok / sqrt / kəsr — []→() QABAĞI (əks halda sqrt[5][…] → sqrt(5)(…))
  text = text.replace(/\bskok\b/gi, 'kok').replace(/\bkök\b/gi, 'kok');
  text = applyUntilStable(text, (t) => {
    let next = replacePlainRoots(t);
    next = next.replace(/\[([^[\]]+)\]\/\[([^[\]]+)\]/g, '($1)/($2)');
    return next;
  });

  // qüvvət: ^2 / ^{2} → ² (WinAnsi)
  text = text
    .replace(/\^\{2\}/g, '²')
    .replace(/\^\{3\}/g, '³')
    .replace(/\^\{1\}/g, '¹')
    .replace(/\^\{0\}/g, '⁰')
    .replace(/\^2(?![0-9])/g, '²')
    .replace(/\^3(?![0-9])/g, '³')
    .replace(/\^1(?![0-9])/g, '¹')
    .replace(/\^0(?![0-9])/g, '⁰');

  // n-ci kök indeksi √[n] → []→() onu (n) etməsin
  text = text.replace(/√\[([^[\]]+)\]/g, '§ROOTIDX§$1§');
  // A]…E] seçim etiketləri
  text = text.replace(/(^|\n)\s*([A-E])\]/g, '$1§OPT§$2§');

  // [-25]-dir → -25-dir
  text = text.replace(/\[-(\d+(?:[.,]\d+)?)\](?=-|\b)/g, '-$1');

  // qalan [2x+y] → (2x+y)
  text = applyUntilStable(text, (t) => t.replace(/\[([^[\]]+)\]/g, '($1)'));
  text = text.replace(/§ROOTIDX§([^§]+)§/g, '√[$1]');
  text = text.replace(/§OPT§([A-E])§/g, '$1]');
  return text;
}

function applyUntilStable(text, fn, max = 16) {
  let cur = text;
  for (let i = 0; i < max; i += 1) {
    const next = fn(cur);
    if (next === cur) return cur;
    cur = next;
  }
  return cur;
}

function readBracketArg(text, openPos) {
  if (text[openPos] !== '[') return null;
  let depth = 0;
  for (let i = openPos; i < text.length; i += 1) {
    if (text[i] === '[') depth += 1;
    else if (text[i] === ']') {
      depth -= 1;
      if (depth === 0) return { inner: text.slice(openPos + 1, i), end: i + 1 };
    }
  }
  return null;
}

/** kok/sqrt[n][expr] və kok[expr] — balanslı [], tək-arg yalnız [ ardı yoxdursa. */
function replacePlainRoots(text) {
  const lower = text.toLowerCase();
  let i = 0;
  let out = '';
  while (i < text.length) {
    const kokAt = lower.indexOf('kok', i);
    const sqrtAt = lower.indexOf('sqrt', i);
    let at = -1;
    let kind = '';
    if (kokAt >= 0 && (sqrtAt < 0 || kokAt <= sqrtAt)) {
      at = kokAt;
      kind = 'kok';
    } else if (sqrtAt >= 0) {
      at = sqrtAt;
      kind = 'sqrt';
    }
    if (at < 0) {
      out += text.slice(i);
      break;
    }
    if (at > 0 && /[\\A-Za-z]/.test(text[at - 1])) {
      out += text.slice(i, at + 1);
      i = at + 1;
      continue;
    }
    out += text.slice(i, at);
    const after = at + kind.length;
    if (text[after] === '(') {
      let depth = 0;
      let end = -1;
      for (let j = after; j < text.length; j += 1) {
        if (text[j] === '(') depth += 1;
        else if (text[j] === ')') {
          depth -= 1;
          if (depth === 0) {
            end = j;
            break;
          }
        }
      }
      if (end >= 0) {
        out += `√(${text.slice(after + 1, end)})`;
        i = end + 1;
        continue;
      }
    }
    if (text[after] !== '[') {
      out += text.slice(at, after);
      i = after;
      continue;
    }
    const first = readBracketArg(text, after);
    if (!first) {
      out += text.slice(at, after);
      i = after;
      continue;
    }
    if (text[first.end] === '[') {
      const second = readBracketArg(text, first.end);
      if (second) {
        let expr = second.inner;
        const powM = text.slice(second.end).match(/^\^(\{\d+\}|\d+)/);
        if (powM && /[+\-*/]/.test(expr)) {
          out += `√[${first.inner}]((${expr})${powM[0]})`;
          i = second.end + powM[0].length;
        } else if (powM) {
          out += `√[${first.inner}](${expr}${powM[0]})`;
          i = second.end + powM[0].length;
        } else {
          out += `√[${first.inner}](${expr})`;
          i = second.end;
        }
        continue;
      }
    }
    // tək arg — növbəti [ yoxdursa (yuxarıda yoxlandı)
    out += `√(${first.inner})`;
    i = first.end;
  }
  return out;
}

/** \sqrt(...) / √(...) — balanslı mötərizə (iç-içə kök). */
function replaceBalancedRootParens(text, cmd) {
  const needle = cmd;
  let i = 0;
  let out = '';
  while (i < text.length) {
    const idx = text.indexOf(needle, i);
    if (idx < 0) {
      out += text.slice(i);
      break;
    }
    const after = idx + needle.length;
    let bracket = null;
    let pos = after;
    if (text[pos] === '[') {
      const close = text.indexOf(']', pos);
      if (close < 0) {
        out += text.slice(i, after);
        i = after;
        continue;
      }
      bracket = text.slice(pos + 1, close);
      pos = close + 1;
    }
    if (text[pos] !== '(') {
      out += text.slice(i, after);
      i = after;
      continue;
    }
    let depth = 0;
    let end = -1;
    for (let j = pos; j < text.length; j += 1) {
      if (text[j] === '(') depth += 1;
      else if (text[j] === ')') {
        depth -= 1;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end < 0) {
      out += text.slice(i, after);
      i = after;
      continue;
    }
    const inner = text.slice(pos + 1, end);
    out += text.slice(i, idx);
    out += bracket != null ? `√[${bracket}](${inner})` : `√(${inner})`;
    i = end + 1;
  }
  return out;
}

/** Read one {...} argument starting at pos (pos points at '{'). */
function readBraceArg(text, pos) {
  if (text[pos] !== '{') return null;
  let depth = 0;
  for (let i = pos; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return { arg: text.slice(pos + 1, i), end: i + 1 };
      }
    }
  }
  return null;
}

/**
 * Replace \\cmd{...}{...} with nested-brace support.
 * optionalBracket: also allow \\sqrt[n]{x}
 */
function replaceLatexCmd(text, cmd, arity, replacer, { optionalBracket = false } = {}) {
  const needle = `\\${cmd}`;
  let i = 0;
  let out = '';
  while (i < text.length) {
    const idx = text.indexOf(needle, i);
    if (idx < 0) {
      out += text.slice(i);
      break;
    }
    const afterCmd = idx + needle.length;
    if (/[A-Za-z]/.test(text[afterCmd] || '')) {
      out += text.slice(i, afterCmd);
      i = afterCmd;
      continue;
    }
    out += text.slice(i, idx);
    let pos = afterCmd;
    let bracket = null;
    if (optionalBracket) {
      while (text[pos] === ' ') pos += 1;
      if (text[pos] === '[') {
        const close = text.indexOf(']', pos);
        if (close < 0) {
          out += needle;
          i = afterCmd;
          continue;
        }
        bracket = text.slice(pos + 1, close);
        pos = close + 1;
      }
    }
    const args = [];
    let ok = true;
    for (let a = 0; a < arity; a += 1) {
      while (text[pos] === ' ') pos += 1;
      const got = readBraceArg(text, pos);
      if (!got) {
        ok = false;
        break;
      }
      args.push(got.arg);
      pos = got.end;
    }
    if (!ok) {
      // bütün əmri keç — əks halda \sqrt + sqrt → √(sqrt) pozulması
      out += needle;
      i = afterCmd;
      continue;
    }
    out += optionalBracket ? replacer(bracket, ...args) : replacer(...args);
    i = pos;
  }
  return out;
}

function unwrapTextCmds(text) {
  const cmds = [
    'mathrm', 'operatorname', 'text', 'textbf', 'textit', 'mathbf',
    'mathbb', 'mathcal', 'mathfrak', 'mathsf', 'mathtt',
    'boldsymbol', 'underline', 'overline', 'hat', 'bar', 'vec', 'dot', 'tilde',
  ];
  return cmds.reduce((cur, cmd) => replaceLatexCmd(cur, cmd, 1, (a) => a), text);
}

/** Common LaTeX → readable plain text for Helvetica PDF (keeps real parentheses). */
export function latexToPlain(raw) {
  let text = normalizeBankPlain(raw);

  // JSON/CSV double-escaped commands: \\frac → \frac
  text = applyUntilStable(text, (t) => t.replace(/\\{2,}(?=[A-Za-z])/g, '\\'));

  text = text
    .replace(/\[şəkil\]|\[sekil\]|\[şekil\]|\[figure\]/gi, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi, ' ')
    .replace(/\\begin\{[^}]+\}/g, ' ')
    .replace(/\\end\{[^}]+\}/g, ' ')
    .replace(/\$\$([\s\S]*?)\$\$/g, ' $1 ')
    .replace(/\$([^$]+)\$/g, ' $1 ')
    .replace(/\\\(([\s\S]*?)\\\)/g, ' $1 ')
    .replace(/\\\[([\s\S]*?)\\\]/g, ' $1 ');

  text = applyUntilStable(text, unwrapTextCmds);

  // Degrees before generic ^
  text = text
    .replace(/\^\{\\circ\}/g, '°')
    .replace(/\^\{\s*circ\s*\}/g, '°')
    .replace(/\^\{\s*0\s*\}/g, '°') // 120^{0} → 120°
    .replace(/\^\\circ/g, '°')
    .replace(/\^0(?![0-9])/g, '°')
    .replace(/\\circ(?![A-Za-z])/g, '°')
    .replace(/\\degree(?![A-Za-z])/g, '°');

  // Roots with nested braces: \sqrt{x^{2}+1} → √(...)
  text = applyUntilStable(text, (t) => {
    let next = replaceLatexCmd(t, 'sqrt', 1, (bracket, a) => (
      bracket ? `√[${bracket}](${a})` : `√(${a})`
    ), { optionalBracket: true });
    next = replaceBalancedRootParens(next, '\\sqrt');
    next = next
      .replace(/\\sqrt\s*([A-Za-z0-9]+)/g, '√($1)')
      // broken "sqrt{...}" without backslash (not \sqrt)
      .replace(/(?<![\\A-Za-z])sqrt\{([^{}]+)\}/g, '√($1)')
      .replace(/(?<![\\A-Za-z])sqrt\s*([A-Za-z0-9]+)/g, '√($1)')
      // legacy plain forms from older conversion (also 2kök(3) glued)
      .replace(/skök\s*\(/gi, '√(')
      .replace(/skok\s*\(/gi, '√(')
      .replace(/kök\s*\(/gi, '√(')
      .replace(/kok\s*\(/gi, '√(');
    return next;
  });

  // Fractions with nested braces
  text = applyUntilStable(text, (t) => {
    let next = t;
    for (const cmd of ['dfrac', 'tfrac', 'frac']) {
      next = replaceLatexCmd(next, cmd, 2, (a, b) => `(${a})/(${b})`);
    }
    // broken "frac{a}{b}" without backslash — do not touch leftover \frac
    next = next.replace(/(?<![\\A-Za-z])(?:d|t)?frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
    return next;
  });

  // Superscripts / subscripts → unicode (x², not x^2)
  const SUP = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    n: 'ⁿ', i: 'ⁱ',
  };
  const SUB = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ',
  };
  const toScript = (raw, map) => {
    const s = String(raw || '').trim();
    if (!s) return '';
    let out = '';
    for (const ch of s) {
      if (map[ch] == null) return null;
      out += map[ch];
    }
    return out;
  };
  text = applyUntilStable(text, (t) => t
    .replace(/\^\{([^{}]+)\}/g, (_, e) => {
      const u = toScript(e, SUP);
      if (u != null) return u;
      const s = String(e).trim();
      return s.length <= 1 ? `^${s}` : `^(${s})`;
    })
    .replace(/_\{([^{}]+)\}/g, (_, e) => {
      const u = toScript(e, SUB);
      if (u != null) return u;
      const s = String(e).trim();
      return s.length <= 1 ? `_${s}` : `_(${s})`;
    }));
  text = text
    .replace(/\^([0-9+\-=()n])/g, (_, ch) => SUP[ch] || `^${ch}`)
    .replace(/_([0-9+\-=()aex])/g, (_, ch) => SUB[ch] || `_${ch}`)
    // log_28 → log₂8 if already converted; else space
    .replace(/(_[A-Za-z0-9])(?=[0-9])/g, '$1 ');

  // Relations / operators — oxunaqlı AZ/ASCII (PDF + UI)
  text = text
    .replace(/\\angle\s*/g, 'bucaq ')
    .replace(/\bangle\s+/gi, 'bucaq ')
    .replace(/\baci\s+/gi, 'bucaq ') // köhnə kobud əvəz
    .replace(/\\triangle(?![A-Za-z])/g, 'üçbucaq ')
    .replace(/\bucbucaq\b/gi, 'üçbucaq')
    .replace(/\\parallel(?![A-Za-z])/g, ' parallel ')
    .replace(/\\perp(?![A-Za-z])/g, ' perpendikulyar ')
    .replace(/\\cong(?![A-Za-z])/g, ' kongruent ')
    .replace(/\\sim(?![A-Za-z])/g, '~')
    .replace(/\\cdot(?![A-Za-z])/g, '·')
    .replace(/\\times(?![A-Za-z])/g, '×')
    .replace(/\\div(?![A-Za-z])/g, '/')
    .replace(/\\pm(?![A-Za-z])/g, '±')
    .replace(/\\mp(?![A-Za-z])/g, '∓')
    .replace(/\\leq(?![A-Za-z])|\\le(?![A-Za-z])/g, '≤')
    .replace(/\\geq(?![A-Za-z])|\\ge(?![A-Za-z])/g, '≥')
    .replace(/\\neq(?![A-Za-z])|\\ne(?![A-Za-z])/g, '≠')
    .replace(/\\approx(?![A-Za-z])/g, '≈')
    .replace(/\\equiv(?![A-Za-z])/g, '≡')
    .replace(/\\infty(?![A-Za-z])/g, '∞')
    .replace(/\\propto(?![A-Za-z])/g, '~')
    .replace(/\\cup(?![A-Za-z])/g, '∪')
    .replace(/\\cap(?![A-Za-z])/g, '∩')
    .replace(/\\subset(?![A-Za-z])/g, '⊂')
    .replace(/\\subseteq(?![A-Za-z])/g, '⊆')
    .replace(/\\supset(?![A-Za-z])/g, '⊃')
    .replace(/\\supseteq(?![A-Za-z])/g, '⊇')
    // After \mathbb{R}→R, leftover is \inR — allow uppercase after command.
    .replace(/\\in(?![a-z])/g, '∈')
    .replace(/\\notin(?![a-z])/g, '∉')
    .replace(/\\to(?![A-Za-z])|\\rightarrow(?![A-Za-z])/g, '->')
    .replace(/\\leftarrow(?![A-Za-z])/g, '<-')
    .replace(/\\Rightarrow(?![A-Za-z])/g, '=>')
    .replace(/\\Leftrightarrow(?![A-Za-z])|\\iff(?![A-Za-z])/g, '<=>')
    .replace(/\\ldots(?![A-Za-z])|\\dots(?![A-Za-z])|\\cdots(?![A-Za-z])/g, '...')
    .replace(/\\sin(?![A-Za-z])/g, 'sin')
    .replace(/\\cos(?![A-Za-z])/g, 'cos')
    .replace(/\\tan(?![A-Za-z])/g, 'tan')
    .replace(/\\cot(?![A-Za-z])/g, 'cot')
    .replace(/\\log(?![A-Za-z])/g, 'log')
    .replace(/\\ln(?![A-Za-z])/g, 'ln')
    .replace(/\\lg(?![A-Za-z])/g, 'lg')
    .replace(/\\exp(?![A-Za-z])/g, 'exp')
    .replace(/\\min(?![A-Za-z])/g, 'min')
    .replace(/\\max(?![A-Za-z])/g, 'max')
    .replace(/\\%/g, '%')
    .replace(/\\&/g, '&')
    .replace(/\\_/g, '_')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}');

  const greek = [
    ['alpha', 'a'], ['beta', 'b'], ['gamma', 'g'], ['delta', 'd'],
    ['epsilon', 'e'], ['varepsilon', 'e'], ['zeta', 'z'], ['eta', 'h'],
    ['theta', 'th'], ['vartheta', 'th'], ['iota', 'i'], ['kappa', 'k'],
    ['lambda', 'l'], ['mu', 'm'], ['nu', 'n'], ['xi', 'x'],
    ['pi', 'pi'], ['rho', 'r'], ['sigma', 's'], ['tau', 't'],
    ['phi', 'f'], ['varphi', 'f'], ['chi', 'ch'], ['psi', 'ps'],
    ['omega', 'w'],
    ['Gamma', 'G'], ['Delta', 'D'], ['Theta', 'Th'], ['Lambda', 'L'],
    ['Xi', 'X'], ['Pi', 'Pi'], ['Sigma', 'S'], ['Phi', 'F'],
    ['Psi', 'Ps'], ['Omega', 'W'],
  ];
  greek.forEach(([name, rep]) => {
    text = text.replace(new RegExp(`\\\\${name}(?![A-Za-z])`, 'g'), rep);
  });
  // \pi → π (also 6pi → 6π; digit is a word char so \b alone fails)
  text = text.replace(/(\d)pi\b/g, '$1π').replace(/\bpi\b/g, 'π');

  text = text
    .replace(/\\left\s*/g, '')
    .replace(/\\right\s*/g, '')
    .replace(/\\big+|\\Big+|\\bigg+|\\Bigg+/g, '')
    .replace(/\\,|\\;|\\:|\\!/g, ' ')
    .replace(/\\quad(?![A-Za-z])|\\qquad(?![A-Za-z])/g, ' ')
    .replace(/\\ /g, ' ')
    .replace(/\\\\/g, ' ')
    .replace(/\\([A-Za-z]+)/g, '$1')
    .replace(/[{}]/g, '')
    // leftover math delimiters (Sonnet sometimes left $...$)
    .replace(/\$+/g, '')
    .replace(/(\d)\s*\*\s*/g, '$1*')
    .replace(/\s*\*\s*/g, '*')
    .replace(/\s*\/\s*/g, '/')
    // textbook spacing: [x² + 10x + 29]² + 17 — amma b-nin / ACB-ni şəkilçisinə toxunma
    .replace(/([A-Za-z0-9²³⁰¹⁴-⁹π√\)\]])\s*([+×·±])\s*(?=[A-Za-z0-9])/g, '$1 $2 ')
    .replace(/([A-Za-z0-9²³⁰¹⁴-⁹π√\)\]])\s*-\s*(?=[A-Za-z0-9])/g, (full, left, offset, src) => {
      const after = src.slice(offset + full.length);
      // mənfi ədəd: "qiymeti -25" (minusdan sonra boşluq yox)
      if (/^\d/.test(after)) return `${left} -`;
      // AZ şəkilçi: b-nin
      if (/^[a-zəıöüğçş]/iu.test(after)) return `${left}-`;
      return `${left} - `;
    })
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?)\]])/g, '$1')
    .replace(/([([])\s+/g, '$1')
    // "$X$-ni" → "X-ni"
    .replace(/([A-Za-z0-9°)\]|])\s+-(?=[a-zəıöüğçş])/gi, '$1-')
    .trim();

  return text;
}
