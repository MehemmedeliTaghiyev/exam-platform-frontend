/**
 * Plain / şablon / mojibake riyaziyyat → KaTeX LaTeX ($...$).
 *
 * Sıra (sabit):
 * 1) option prefix qoru (A]…E])
 * 2) mojibake encoding
 * 3) interval / ∈
 * 4) kök (kok / sqrt)
 * 5) qüvvət + kəsr qüvvət
 * 6) kəsr (iç-içə, mixed, frac…)
 * 7) qalan [] → ()
 * 8) $...$ wrap
 */

const OPTION_TOKEN = '§OPT§';
const INTERVAL_TOKEN = '§INTERVAL§';
const SQRT_IDX_TOKEN = '§SQRTIDX§';
const FRAC_REVIEW_TOKEN = '§FRAC_REVIEW§';

function applyUntilStable(text, fn, max = 24) {
  let cur = String(text || '');
  for (let i = 0; i < max; i += 1) {
    const next = fn(cur);
    if (next === cur) return cur;
    cur = next;
  }
  return cur;
}

/** 1) Sətir əvvəlindəki A]…E] seçim etiketlərini qoru. */
export function protectOptionPrefixes(text) {
  return String(text || '').replace(/(^|\n)\s*([A-E])\]/g, (_, lead, letter) => (
    `${lead}${OPTION_TOKEN}${letter}${OPTION_TOKEN}`
  ));
}

export function restoreOptionPrefixes(text) {
  return String(text || '').replace(new RegExp(`${OPTION_TOKEN}([A-E])${OPTION_TOKEN}`, 'g'), '$1]');
}

/**
 * 2) UTF-8 → Latin-1/Windows mojibake və oxşar zibilləri təmizlə.
 */
export function fixCorruptedEncoding(text) {
  if (!text) return '';

  const corruptedMap = [
    // Qüvvət (mojibake → ^n) — əvvəl mənfi indeks, sonra rəqəmlər
    { regex: /â\s*»|â»/g, replace: '^-' },
    { regex: /´†|Â²|²/g, replace: '^2' },
    { regex: /´‡|Â³|³/g, replace: '^3' },
    { regex: /Â¹|¹/g, replace: '^1' },
    { regex: /â\s*´|â´|⁴/g, replace: '^4' },
    { regex: /â\s*•|â•|â\s*µ|âµ|⁵/g, replace: '^5' },
    { regex: /â\s*¶|â¶|⁶/g, replace: '^6' },
    { regex: /â\s*·|â·|⁷/g, replace: '^7' },
    { regex: /â\s*¸|â¸|⁸/g, replace: '^8' },
    { regex: /â\s*¹|â¹|⁹/g, replace: '^9' },
    { regex: /â\s*°|â°|⁰/g, replace: '^0' },

    // Digər unicode qüvvət/indeks (təmiz UTF-8)
    { regex: /⁰/g, replace: '^0' },
    { regex: /⁴/g, replace: '^4' },
    { regex: /⁵/g, replace: '^5' },
    { regex: /⁶/g, replace: '^6' },
    { regex: /⁷/g, replace: '^7' },
    { regex: /⁸/g, replace: '^8' },
    { regex: /⁹/g, replace: '^9' },
    { regex: /⁺/g, replace: '^+' },
    { regex: /⁻/g, replace: '^-' },

    // Həndəsi / riyazi
    { regex: /Â°|°/g, replace: '^\\circ' },
    { regex: /Ã—|×/g, replace: '\\times ' },
    { regex: /Ã·|÷/g, replace: '\\div ' },
    { regex: /Â±|±/g, replace: '\\pm ' },
    { regex: /â‰¤|≤/g, replace: '\\leq ' },
    { regex: /â‰¥|≥/g, replace: '\\geq ' },
    { regex: /â‰ |â‰\s*|≠/g, replace: '\\neq ' },
    { regex: /âˆš|√/g, replace: '\\sqrt' },
    { regex: /âˆž|∞/g, replace: '\\infty' },
    { regex: /Ï€|π/g, replace: '\\pi' },
    { regex: /âˆ |âˆ\s*|∠/g, replace: '\\angle ' },
    { regex: /â–³|△/g, replace: '\\triangle ' },
    { regex: /âˆ¥|∥/g, replace: '\\parallel ' },
    { regex: /âŠ¥|⊥/g, replace: '\\perp ' },
    { regex: /âˆ’|–|—/g, replace: '-' },

    // AZ hərfləri mojibake
    { regex: /É™|Ã¦/g, replace: 'ə' },
    { regex: /Ä°/g, replace: 'İ' },
    { regex: /Ä±/g, replace: 'ı' },
    { regex: /ÅŸ/g, replace: 'ş' },
    { regex: /Åž/g, replace: 'Ş' },
    { regex: /ÄŸ/g, replace: 'ğ' },
    { regex: /Äž/g, replace: 'Ğ' },
    { regex: /Ã¼/g, replace: 'ü' },
    { regex: /Ãœ/g, replace: 'Ü' },
    { regex: /Ã¶/g, replace: 'ö' },
    { regex: /Ã–/g, replace: 'Ö' },
    { regex: /Ã§/g, replace: 'ç' },
    { regex: /Ã‡/g, replace: 'Ç' },
  ];

  let cleaned = String(text);
  corruptedMap.forEach((item) => {
    cleaned = cleaned.replace(item.regex, item.replace);
  });

  // â »´† → ^{-2} (^- sonra ^2 birləşsin)
  cleaned = cleaned.replace(/\^-\^([0-9]+)/g, '^{-$1}');
  cleaned = cleaned.replace(/\^-\^\{([0-9]+)\}/g, '^{-$1}');
  return cleaned;
}

/** Balanslı [...] oxu; tapılmazsa null. */
function readBalanced(text, openPos, openCh = '[', closeCh = ']') {
  if (text[openPos] !== openCh) return null;
  let depth = 0;
  for (let i = openPos; i < text.length; i += 1) {
    if (text[i] === openCh) depth += 1;
    else if (text[i] === closeCh) {
      depth -= 1;
      if (depth === 0) {
        return { inner: text.slice(openPos + 1, i), end: i + 1 };
      }
    }
  }
  return null;
}

/** 3) ain[1;+infty] / in[...;+infty] → \in [1; +\infty) */
export function fixIntervalsAndSets(text) {
  let cur = String(text || '');
  cur = cur.replace(/\binfty\b/gi, '\\infty');
  cur = cur.replace(/\+\\infty/g, '+\\infty');

  // a in[...] / ain[...] / in[...]
  cur = cur.replace(
    /\b([A-Za-z])?\s*in\s*\[([^[\]]*?;[^[\]]*?)\]/gi,
    (_, letter, body) => {
      let interval = String(body).replace(/\s+/g, '');
      interval = interval.replace(/\+?\\infty/gi, '+\\infty');
      interval = interval.replace(/\+infty/gi, '+\\infty');
      // sağ uc +∞ → yarım-açıq )
      const openLeft = '[';
      let openRight = ']';
      let core = interval;
      if (/\+\\infty\s*$/i.test(core)) {
        openRight = ')';
        core = core.replace(/\+\\infty\s*$/i, '+\\infty');
      }
      core = core.replace(/;/g, '; ');
      const masked = `${INTERVAL_TOKEN}${openLeft}${core}${openRight}${INTERVAL_TOKEN}`;
      const lead = letter ? `${letter} ` : '';
      return `${lead}\\in ${masked}`;
    },
  );
  return cur;
}

function restoreIntervals(text) {
  return String(text || '').replace(new RegExp(`${INTERVAL_TOKEN}([\\s\\S]*?)${INTERVAL_TOKEN}`, 'g'), '$1');
}

/**
 * 4) kok / sqrt kökləri.
 * sqrt[n][expr], kok[n][expr], kok[expr] (iç-içə [] dəstəyi).
 */
export function fixRoots(text) {
  let cur = String(text || '');
  cur = cur.replace(/\bskok\b/gi, 'kok');
  cur = cur.replace(/\bkök\b/gi, 'kok');

  // unicode / encoding-dən gələn \sqrt(...) → LaTeX
  cur = normalizeSqrtCommands(cur);

  cur = applyUntilStable(cur, (input) => {
    let t = input;
    let i = 0;
    let out = '';
    const lower = t.toLowerCase();
    while (i < t.length) {
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
        out += t.slice(i);
        break;
      }
      // \sqrt / əvvəlki hərfə bitişik əmri keç
      if (at > 0 && /[\\A-Za-z]/.test(t[at - 1])) {
        out += t.slice(i, at + 1);
        i = at + 1;
        continue;
      }
      out += t.slice(i, at);
      const afterWord = at + kind.length;
      if (t[afterWord] !== '[') {
        out += t.slice(at, afterWord);
        i = afterWord;
        continue;
      }
      const first = readBalanced(t, afterWord);
      if (!first) {
        out += t.slice(at, afterWord);
        i = afterWord;
        continue;
      }
      if (t[first.end] === '[') {
        const second = readBalanced(t, first.end);
        if (second) {
          // n-ci kök; expr ətrafında mürəkkəb qüvvət varsa qrupla
          let expr = second.inner;
          // sqrt[3][a-1]^2 → \sqrt[3]{(a-1)^2}
          const power = t.slice(second.end).match(/^\^(\{[^}]+\}|[0-9]+|-[0-9]+)/);
          if (power && /[+\-*/^=]/.test(expr)) {
            expr = `(${expr})${power[0]}`;
            out += `\\sqrt[${first.inner}]{${expr}}`;
            i = second.end + power[0].length;
          } else if (power) {
            out += `\\sqrt[${first.inner}]{${expr}${power[0]}}`;
            i = second.end + power[0].length;
          } else {
            out += `\\sqrt[${first.inner}]{${expr}}`;
            i = second.end;
          }
          continue;
        }
      }
      // tək arg: kok[expr] — içdəki kəsr/qüvvəti əvvəl düzəlt
      let expr = first.inner;
      expr = fixExponents(expr);
      expr = fixFractions(expr);
      expr = convertRemainingBrackets(expr);
      out += `\\sqrt{${expr}}`;
      i = first.end;
    }
    return out;
  });

  // indeksi []→() qabağı qoru
  cur = cur.replace(/\\sqrt\[([^\]]+)\]/g, `${SQRT_IDX_TOKEN}$1§`);
  return cur;
}

function restoreSqrtIndex(text) {
  return String(text || '').replace(new RegExp(`${SQRT_IDX_TOKEN}([^§]+)§`, 'g'), '\\sqrt[$1]');
}

/** Balanslı \sqrt(...) / \sqrt[n](...) → \sqrt{...} */
function replaceBalancedSqrtToLatex(text) {
  const needle = '\\sqrt';
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
    out += bracket != null ? `\\sqrt[${bracket}]{${inner}}` : `\\sqrt{${inner}}`;
    i = end + 1;
  }
  return out;
}

function normalizeSqrtCommands(text) {
  return applyUntilStable(text, (cur) => {
    let next = replaceBalancedSqrtToLatex(cur);
    next = next.replace(/\\sqrt([A-Za-z0-9]+)/g, '\\sqrt{$1}');
    return next;
  });
}

/**
 * 5) Qüvvət: [base]^-[n]/[d], [base]^[n]/[d], çoxhədlili eksponent.
 */
export function fixExponents(text) {
  let cur = String(text || '');

  // [base]^-[num]/[den] → (base)^{-\frac{num}{den}}
  cur = applyUntilStable(cur, (t) => t.replace(
    /\[([^[\]]+)\]\^-\[([^[\]]+)\]\/\[([^[\]]+)\]/g,
    '($1)^{-\\frac{$2}{$3}}',
  ));
  // [base]^[num]/[den]
  cur = applyUntilStable(cur, (t) => t.replace(
    /\[([^[\]]+)\]\^\[([^[\]]+)\]\/\[([^[\]]+)\]/g,
    '($1)^{\\frac{$2}{$3}}',
  ));

  // ^[n] / _[n]
  cur = cur.replace(/\^\[([^[\]]+)\]/g, '^{$1}');
  cur = cur.replace(/_\[([^[\]]+)\]/g, '_{$1}');

  // x^k^2-6k+11+27 → x^{k^2-6k+11}+27  (bare ^digit-dən ƏVVƏL)
  cur = cur.replace(
    /\^([A-Za-z]\^[0-9]+(?:[+\-][0-9A-Za-z]+(?:\^[0-9]+)?)*)(\+[0-9]+)(?![0-9A-Za-z^])/g,
    '^{$1}$2',
  );

  cur = cur.replace(/\^\\circ/g, '^{\\circ}');
  // yalnız tək qüvvət rəqəmi / işarə — `2-6` kimi ifadəni udmasın
  cur = cur.replace(/\^([0-9]+)/g, '^{$1}');
  cur = cur.replace(/\^([+\-])(?![0-9])/g, '^{$1}');
  cur = cur.replace(/_([0-9]+)/g, '_{$1}');
  // ^{-2} artıq qruplanıbsa toxunma; ^-{n} → ^{-n}
  cur = cur.replace(/\^-\{([0-9]+)\}/g, '^{-$1}');
  cur = cur.replace(/\^-([0-9]+)/g, '^{-$1}');
  return cur;
}

/** Balanslı [num]/[den] → \frac{num}{den} (iç-içə [[...]]). */
function replaceBalancedBracketFractions(text) {
  let i = 0;
  let out = '';
  let changed = false;
  while (i < text.length) {
    if (text[i] === '[') {
      const num = readBalanced(text, i);
      if (num && text[num.end] === '/' && text[num.end + 1] === '[') {
        const den = readBalanced(text, num.end + 1);
        if (den) {
          out += `\\frac{${num.inner}}{${den.inner}}`;
          i = den.end;
          changed = true;
          continue;
        }
      }
    }
    out += text[i];
    i += 1;
  }
  return changed ? out : text;
}

/**
 * 6) Kəsrlər: iç-içə [a]/[b], mixed 1[a]/[b], frac… şablonları.
 * `earlyBareFrac` — eksponent qruplaşmasından əvvəl xam frac5^8-178* üçün.
 */
export function fixFractions(text, { earlyBareFrac = false } = {}) {
  let cur = String(text || '');
  const reviewFlags = [];

  // frac5^8-178*[25^2+1]+5 → \frac{5^8-1}{78\cdot(...)+5}
  cur = cur.replace(
    /\bfrac([0-9A-Za-z\\{}]+(?:\^[0-9A-Za-z+\-\\{}]+)*)-1(\d+)\s*\*\s*\[([^[\]]+)\]([+\-][0-9]+)?/gi,
    (_, left, denStart, bracket, tail = '') => {
      const num = `${left}-1`;
      const den = `${denStart}\\cdot(${bracket})${tail || ''}`;
      return `\\frac{${num}}{${den}}`;
    },
  );

  if (earlyBareFrac) return cur;

  // frac[num]/[den]REST → \frac{\frac{num}{den}}{REST}
  cur = cur.replace(
    /\bfrac\[([^[\]]+)\]\/\[([^[\]]+)\]([\s\S]*?)(?=$|\n|[.?!]|\s+[a-zəöüğışç]{4,})/gi,
    (_, num, den, restRaw) => {
      let rest = String(restRaw || '').trim();
      if (!rest) return `\\frac{${num}}{${den}}`;
      // [[a]/[b]]^-1 → \left(\frac{a}{b}\right)^{-1}
      rest = rest.replace(
        /\[\[([^[\]]+)\]\/\[([^[\]]+)\]\]\^(?:\{([^{}]+)\}|(-?\d+))/g,
        (_, a, b, braced, bare) => `\\left(\\frac{${a}}{${b}}\\right)^{${braced || bare}}`,
      );
      rest = rest.replace(
        /\[([^[\]]+)\]\/\[([^[\]]+)\]\^(?:\{([^{}]+)\}|(-?\d+))/g,
        (_, a, b, braced, bare) => `\\left(\\frac{${a}}{${b}}\\right)^{${braced || bare}}`,
      );
      rest = rest.replace(
        /\[([^[\]]+)\]\/\[([^[\]]+)\]/g,
        '\\frac{$1}{$2}',
      );
      // [\frac{a}{b}]^{-1} (kəsr artıq çevrilibsə)
      rest = rest.replace(
        /\[(\\frac\{[^}]+\}\{[^}]+\})\](\^\{[^}]+\})/g,
        '\\left($1\\right)$2',
      );
      rest = rest.replace(/(?<![{\\])\^(-?\d+)(?!\})/g, '^{$1}');
      rest = rest.replace(/\((\\frac\{[^}]+\}\{[^}]+\})\)(\^\{[^}]+\})/g, '\\left($1\\right)$2');
      return `\\frac{\\frac{${num}}{${den}}}{${rest}}`;
    },
  );

  // qalan xam frac… — birmənalı deyilsə işarələ
  cur = cur.replace(/\bfrac(?![\[{\\])/g, () => {
    reviewFlags.push('frac');
    return FRAC_REVIEW_TOKEN;
  });

  // mixed: 1[21]/[29] → 1\frac{21}{29}
  cur = applyUntilStable(cur, (t) => t.replace(
    /(\d)\[([^[\]]+)\]\/\[([^[\]]+)\]/g,
    '$1\\frac{$2}{$3}',
  ));

  // iç-içə / balanslı [num]/[den] (nested [[...]] dəstəyi)
  cur = applyUntilStable(cur, (t) => replaceBalancedBracketFractions(t));
  cur = applyUntilStable(cur, (t) => t.replace(/\(([^()]+)\)\/\(([^()]+)\)/g, '\\frac{$1}{$2}'));

  // (\frac{a}{b})^{-n} → \left(...\right)  (ümumi, frac REST-dən kənar da)
  cur = cur.replace(/\((\\frac\{[^}]+\}\{[^}]+\})\)(\^\{[^}]+\})/g, '\\left($1\\right)$2');
  cur = cur.replace(/(\d)\\cdot\s*\(/g, '$1\\cdot(');

  // * → \cdot (kəsr ətrafı)
  cur = cur.replace(/\\cdot\s*/g, '\\cdot ');
  cur = cur.replace(/(?<=\d)\s*\*\s*(?=[(\d\\])/g, '\\cdot ');

  if (typeof globalThis !== 'undefined') {
    globalThis.__FRAC_REVIEW__ = reviewFlags;
  }
  return cur;
}

/**
 * 7) Qalan cəbri [] → (); tək mənfi ədəd [-25]-dir → -25-dir.
 */
export function convertRemainingBrackets(text) {
  let cur = String(text || '');

  // [-25]-dir / [-3] → -25-dir / -3
  cur = cur.replace(/\[-(\d+(?:[.,]\d+)?)\](?=-\w|\b)/g, '-$1');
  cur = cur.replace(/\[-(\d+(?:[.,]\d+)?)\]/g, '-$1');

  cur = applyUntilStable(cur, (t) => t.replace(/\[([^[\]]+)\]/g, '($1)'));
  return cur;
}

const AZ_WORD = /^[a-zA-ZəöüğışçƏÖÜĞİŞÇıİ]+$/u;
const UNIT = /^(sm|mm|km|kq|q|m|cm|dəq|san|ni|nın|nin|nu|nü|yə|ya|dir|dır|dur|dür)$/i;

function looksMathy(chunk) {
  const t = String(chunk || '').trim();
  if (!t) return false;
  if (/^\d+\.?$/.test(t)) return false;
  if (t.includes(OPTION_TOKEN) || t.includes(INTERVAL_TOKEN) || t.includes(FRAC_REVIEW_TOKEN)) {
    return false;
  }
  if (AZ_WORD.test(t) && t.length > 1) return false;
  if (UNIT.test(t)) return false;
  if (/^-[a-zəöüğışçıİ]+$/iu.test(t)) return false;
  if (/^-[a-zəöüğışçıİ]+(?:\s+[a-zəöüğışçıİ]+)+$/iu.test(t)) return false;
  if (/^[A-Za-z][A-Za-z0-9]*-[a-zəöüğışçıİ]+$/iu.test(t)) return false;
  // AZ cümlə parçaları
  if (/^(ifadesinin|olarsa|uygunlugu|mueyyen|edin|tapin|tapın|en|kicik|qiymetini|doğrudur|beraber|bərabər)$/iu.test(t)) {
    return false;
  }
  return /[0-9=+\-^\\(){}]|\\[a-zA-Z]|[A-Z]{1,4}/.test(t);
}

/**
 * 8) Mətn içindəki düsturları $...$ ilə əhatələ.
 */
export function wrapMathExpressions(str) {
  let text = String(str || '');

  text = text.replace(
    /\\angle\s*([A-Za-z]{1,8})\s*(-[a-zəöüğışçıİ]+)?/g,
    (_, name, suf = '') => `$\\angle ${name}$${suf || ''}`,
  );
  text = text.replace(
    /\\triangle\s*([A-Za-z]{1,8})\s*(-[a-zəöüğışçıİ]+)?/g,
    (_, name, suf = '') => `$\\triangle ${name}$${suf || ''}`,
  );

  const parts = text.split(/(\$[^$]+\$)/);
  text = parts.map((part) => {
    if (!part || part.startsWith('$')) return part;
    const tokens = part.split(/(\s+)/);
    const out = [];
    let mathRun = [];
    const flushMath = () => {
      if (!mathRun.length) return;
      const trailing = [];
      while (mathRun.length && /^\s+$/.test(mathRun[mathRun.length - 1])) {
        trailing.unshift(mathRun.pop());
      }
      const leading = [];
      while (mathRun.length && /^\s+$/.test(mathRun[0])) {
        leading.push(mathRun.shift());
      }
      const joined = mathRun.join('').trim();
      out.push(...leading);
      if (joined) out.push(`$${joined}$`);
      out.push(...trailing);
      mathRun = [];
    };
    for (const token of tokens) {
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        if (mathRun.length) mathRun.push(token);
        else out.push(token);
        continue;
      }
      if (token.includes(OPTION_TOKEN) || token.includes(FRAC_REVIEW_TOKEN)) {
        flushMath();
        out.push(token);
        continue;
      }
      if (/^[a-zəöüğışçıİ]{4,}$/iu.test(token)) {
        flushMath();
        out.push(token);
        continue;
      }
      if (!looksMathy(token) || /^\d+\.$/.test(token)) {
        flushMath();
        out.push(token);
        continue;
      }
      mathRun.push(token);
    }
    flushMath();
    return out.join('');
  }).join('');

  text = text.replace(/\$\s*\$/g, ' ');
  return text;
}

/**
 * Bazadan gələn plain / şablon / mojibake mətni KaTeX LaTeX-ə çevir.
 */
export function universalMathParser(rawText) {
  if (!rawText) return '';
  let text = String(rawText);

  const alreadyLatex = /\$|\\\(|\\\[|\\begin\{|\\frac\{|\\sqrt\{/.test(text);

  // 1) option prefix
  text = protectOptionPrefixes(text);

  // 2) encoding
  text = fixCorruptedEncoding(text);

  // Yunan / şablon
  text = text
    .replace(/α/g, '\\alpha ')
    .replace(/β/g, '\\beta ')
    .replace(/γ/g, '\\gamma ')
    .replace(/δ/g, '\\delta ')
    .replace(/θ/g, '\\theta ')
    .replace(/λ/g, '\\lambda ')
    .replace(/μ/g, '\\mu ')
    .replace(/φ|ϕ/g, '\\phi ')
    .replace(/ω/g, '\\omega ')
    .replace(/·/g, '\\cdot ');

  const simpleReplacements = [
    { regex: /\bbucaq\s+/gi, replace: '\\angle ' },
    { regex: /\baci\s+/gi, replace: '\\angle ' },
    { regex: /\^\s*deg\b/gi, replace: '^\\circ' },
    { regex: /\bpi\b/gi, replace: '\\pi' },
    { regex: /\binf\b|\bsonsuzluq\b|\bsonsuz\b/gi, replace: '\\infty' },
    { regex: /<=/g, replace: '\\leq ' },
    { regex: />=/g, replace: '\\geq ' },
    { regex: /!=/g, replace: '\\neq ' },
    { regex: /\+-/g, replace: '\\pm ' },
    { regex: /\bparallel\b/gi, replace: '\\parallel ' },
    { regex: /\bperp\b|\bperpendikulyar\b/gi, replace: '\\perp ' },
    { regex: /\büçbucaq\s+|\bucbucaq\s+/gi, replace: '\\triangle ' },
    { regex: /\bvektor\[([^[\]]+)\]/gi, replace: '\\vec{$1}' },
  ];
  simpleReplacements.forEach((item) => {
    text = text.replace(item.regex, item.replace);
  });

  // 3) interval
  text = fixIntervalsAndSets(text);

  // 6a) xam frac5^8-178* — eksponent udmazdan əvvəl
  text = fixFractions(text, { earlyBareFrac: true });

  // 5) qüvvət (kəsr qüvvətdən əvvəl, amma [a]/[b] hələ qalır)
  text = fixExponents(text);

  // 4) kök (içindəki [a]/[b] də düzəlir)
  text = fixRoots(text);

  // 6) kəsr
  text = fixFractions(text);

  text = text.replace(/\blog\[([^[\]]+)\]\[([^[\]]+)\]/gi, '\\log_{$1}{$2}');
  text = text.replace(/\b(sin|cos|tan|tg|ctg|arcsin|arccos|arctan|arctg|arcctg|ln|lg|lim)\b/gi, '\\$1');

  // 7) qalan []
  text = convertRemainingBrackets(text);
  text = text.replace(/\((\\frac\{[^}]+\}\{[^}]+\})\)(\^\{[^}]+\})/g, '\\left($1\\right)$2');
  text = restoreSqrtIndex(text);
  text = restoreIntervals(text);
  text = normalizeSqrtCommands(text);

  // 8) wrap
  if (!alreadyLatex && !/\$[^$]+\$/.test(text)) {
    text = wrapMathExpressions(text);
  } else if (!text.includes('$') && /\\[a-zA-Z]/.test(text)) {
    text = wrapMathExpressions(text);
  }

  text = restoreOptionPrefixes(text);
  text = text.replace(/\s{2,}/g, ' ').trim();
  return text;
}

export function needsMathRender(value) {
  const t = String(value || '');
  if (!t) return false;
  return /\$|\\\(|\\\[|\\frac|\\sqrt|\\angle|\\pi|\\circ|√|∠|°|π|[⁰¹²³⁴⁵⁶⁷⁸⁹]|´†|Â°|Â²|kok\[|\baci\s|\bbucaq\s|\^\s*deg|\[[^\]]+\]\/\[|\[\s*[0-9A-Za-z]|ain\[|\bin\[/.test(t);
}
