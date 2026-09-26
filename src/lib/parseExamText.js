import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { pointsForDifficulty } from './questionDifficulty';

try {
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
} catch {
  /* worker optional */
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const HEADER_RE = /buraxılış|sınağı|əlaqə|elaqe|mustafayev|uğuruna|sinif\s*$|^\s*faiz\s*$/i;

function itemX(it) {
  return Number(it.transform?.[4] || 0);
}
function itemY(it) {
  return Number(it.transform?.[5] || 0);
}
function itemW(it) {
  return Number(it.width || 0);
}
function itemH(it) {
  return Number(it.height || it.transform?.[0] || 11);
}

function detectSplitX(items) {
  const xs = items
    .filter((it) => /^\d{1,3}\.$/.test(String(it.str || '').trim()))
    .map((it) => Math.round(itemX(it)))
    .sort((a, b) => a - b);
  const uniq = [...new Set(xs)];
  let bestGap = 0;
  let rightStart = null;
  for (let i = 1; i < uniq.length; i += 1) {
    const gap = uniq[i] - uniq[i - 1];
    if (gap > bestGap) {
      bestGap = gap;
      rightStart = uniq[i];
    }
  }
  if (bestGap < 80 || rightStart == null) return null;
  const leftCount = xs.filter((x) => x < rightStart).length;
  const rightCount = xs.filter((x) => x >= rightStart).length;
  if (leftCount < 2 || rightCount < 2) return null;
  return rightStart - 12;
}

function clusterBands(items, yTol = 3.6) {
  const sorted = [...items].sort((a, b) => itemY(b) - itemY(a) || itemX(a) - itemX(b));
  const bands = [];
  sorted.forEach((it) => {
    const y = itemY(it);
    const last = bands[bands.length - 1];
    if (last && Math.abs(last.y - y) <= yTol) {
      last.items.push(it);
    } else {
      bands.push({ y, items: [it] });
    }
  });
  return bands;
}

function clusterText(items) {
  const sorted = [...items].sort((a, b) => itemX(a) - itemX(b));
  const groups = [];
  sorted.forEach((it) => {
    const last = groups[groups.length - 1];
    if (last && itemX(it) - (last.xMax) < 8) {
      last.items.push(it);
      last.xMax = itemX(it) + itemW(it);
    } else {
      groups.push({ items: [it], xMax: itemX(it) + itemW(it) });
    }
  });
  return groups;
}

function joinGlyphs(items) {
  const sorted = [...items].sort((a, b) => itemX(a) - itemX(b) || itemY(b) - itemY(a));
  let text = '';
  let prevEnd = null;
  sorted.forEach((it) => {
    const str = String(it.str || '');
    if (!str) return;
    const x = itemX(it);
    const w = itemW(it);
    if (/^\s+$/.test(str)) {
      if (w >= 2.2 && text && !text.endsWith(' ')) text += ' ';
      prevEnd = x + Math.max(w, 0);
      return;
    }
    if (prevEnd != null && x - prevEnd > 2.2 && text && !text.endsWith(' ')) text += ' ';
    text += str;
    prevEnd = x + w;
  });
  return text.replace(/[ \t]{2,}/g, ' ').trim();
}

function flattenFractions(items) {
  const bands = clusterBands(items, 3.2);
  if (bands.length < 3) return items;
  const out = [];
  let i = 0;
  while (i < bands.length) {
    const top = bands[i];
    const mid = bands[i + 1];
    const bot = bands[i + 2];
    const span = top && bot ? top.y - bot.y : 0;
    const threeLevels = mid && bot && span > 8 && span < 24
      && Math.abs(top.y - mid.y) > 4 && Math.abs(mid.y - bot.y) > 4;
    const mathish = (band) => {
      const t = joinGlyphs(band.items);
      if (!t || t.length > 48) return false;
      if (/[A-E]\)/.test(t) || /^\d{1,3}\s*[\.\)]/.test(t) || /tapın|olarsa|faiz/i.test(t)) return false;
      return true;
    };
    if (threeLevels && mathish(top) && mathish(bot)) {
      const midWidth = mid.items.reduce((s, it) => s + itemW(it), 0);
      const topWidth = top.items.reduce((s, it) => s + itemW(it), 0);
      if (midWidth >= topWidth * 0.35) {
        const topGroups = clusterText(top.items.filter((it) => String(it.str || '').trim()));
        const botGroups = clusterText(bot.items.filter((it) => String(it.str || '').trim()));
        const usedBot = new Set();
        topGroups.forEach((tg) => {
          const tx = itemX(tg.items[0]);
          const tEnd = tg.xMax;
          let best = -1;
          let bestDist = 40;
          botGroups.forEach((bg, idx) => {
            if (usedBot.has(idx)) return;
            const bx = itemX(bg.items[0]);
            const overlap = Math.min(tEnd, bg.xMax) - Math.max(tx, bx);
            const dist = Math.abs(tx - bx);
            if ((overlap > 0 || dist < 12) && dist < bestDist) {
              bestDist = dist;
              best = idx;
            }
          });
          if (best < 0) return;
          usedBot.add(best);
          const num = joinGlyphs(tg.items);
          const den = joinGlyphs(botGroups[best].items);
          if (!num || !den) return;
          const x = Math.min(tx, itemX(botGroups[best].items[0]));
          mid.items.push({
            str: `(${num})/(${den})`,
            width: Math.max(tEnd, botGroups[best].xMax) - x,
            height: itemH(mid.items[0] || tg.items[0]),
            transform: [itemH(mid.items[0] || tg.items[0]), 0, 0, 1, x, mid.y],
          });
        });
        out.push(...mid.items);
        i += 3;
        continue;
      }
    }
    out.push(...top.items);
    i += 1;
  }
  return out;
}

function extractColumnText(items) {
  const flattened = flattenFractions(items);
  return clusterBands(flattened, 4)
    .map((band) => joinGlyphs(band.items))
    .filter(Boolean)
    .filter((line) => !HEADER_RE.test(line) && !/^əlaqə|^ə laq/i.test(line))
    .filter((line) => !/^[\d\s]+$/.test(line));
}

export async function extractPdfText(file) {
  const buf = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const raw = (content.items || []).filter((it) => {
      const y = itemY(it);
      return y > 88 && y < viewport.height - 36;
    });
    const splitX = detectSplitX(raw);
    const columns = splitX
      ? [raw.filter((it) => itemX(it) < splitX), raw.filter((it) => itemX(it) >= splitX)]
      : [raw];
    const pageLines = [];
    columns.forEach((col) => {
      if (!col.length) return;
      pageLines.push(...extractColumnText(col));
    });
    if (pageLines.length) pages.push(pageLines.join('\n'));
  }
  return pages.join('\n');
}

function glueWrappedLines(text) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const out = [];
  lines.forEach((line) => {
    const prev = out[out.length - 1];
    if (!prev) {
      out.push(line);
      return;
    }
    const optionLine = /^[A-E]\)/.test(line);
    const numbered = /^\d{1,3}\s*[\.\)]/.test(line);
    const prevHasOptions = /(?:^|\s)[A-E]\)\s/.test(prev);
    if (!optionLine && !numbered && !/[.?!:]$/.test(prev) && !prevHasOptions) {
      out[out.length - 1] = `${prev} ${line}`;
      return;
    }
    out.push(line);
  });
  return out.join('\n');
}

function splitQuestionBlocks(raw) {
  const text = glueWrappedLines(String(raw || '').replace(/\r/g, '\n'));
  const parts = text.split(/(?=(?:^|\n)\s*\d{1,3}\s*[\.\)])/);
  return parts.map((p) => p.trim()).filter((p) => /^\d{1,3}\s*[\.\)]/.test(p));
}

function parseOptions(block) {
  const options = [];
  const re = /(?:^|\n|\s)([A-E])\)\s*(.*?)(?=(?:\s+[A-E]\)\s*)|$)/gi;
  let match = re.exec(block);
  while (match) {
    const letter = match[1].toUpperCase();
    const text = match[2]
      .replace(/(?:düzgün\s*cavab|duzgun\s*cavab|doğru\s*cavab|dogru\s*cavab|cavab|correct|answer)\s*[:\-–]?\s*[A-Ea-e]\b.*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (LETTERS.includes(letter) && text) options.push({ letter, text });
    match = re.exec(block);
  }
  const unique = [];
  LETTERS.forEach((letter) => {
    const found = options.find((o) => o.letter === letter);
    if (found) unique.push(found);
  });
  return unique;
}

function detectCorrectLetter(block) {
  const match = String(block || '').match(
    /(?:düzgün\s*cavab|duzgun\s*cavab|doğru\s*cavab|dogru\s*cavab|cavab|correct|answer)\s*[:\-–]?\s*([A-Ea-e])\b/i,
  );
  return match ? match[1].toUpperCase() : null;
}

function stemFromBlock(block, optionCount) {
  let stem = block.replace(/^\d{1,3}\s*[\.\)]\s*/, '');
  const firstOpt = stem.search(/(?:^|\n|\s)[A-E]\)\s/);
  if (firstOpt >= 0) stem = stem.slice(0, firstOpt);
  stem = stem
    .replace(/(?:düzgün\s*cavab|duzgun\s*cavab|doğru\s*cavab|dogru\s*cavab|cavab|correct|answer)\s*[:\-–]?\s*[A-Ea-e]\b.*/i, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
  if (!stem && optionCount) return 'Sual';
  return stem;
}

function emptyLetterOptions(correctLetter) {
  return LETTERS.map((letter) => ({ letter, text: letter, isCorrect: letter === correctLetter }));
}

export function parseQuestionsFromText(raw) {
  const blocks = splitQuestionBlocks(raw);
  const questions = [];
  blocks.forEach((block) => {
    const options = parseOptions(block);
    const text = stemFromBlock(block, options.length);
    if (!text) return;
    const marked = detectCorrectLetter(block);
    if (options.length < 2) {
      questions.push({
        text,
        options: emptyLetterOptions('OPEN'),
        correctLetter: marked && LETTERS.includes(marked) ? marked : 'OPEN',
        correctText: '',
        difficultyLevel: 'orta',
      });
      return;
    }
    const fallback = options[0].letter;
    const correctLetter = marked && LETTERS.includes(marked) ? marked : fallback;
    questions.push({
      text,
      options: LETTERS.map((letter) => {
        const found = options.find((o) => o.letter === letter);
        return { letter, text: found?.text || letter, isCorrect: letter === correctLetter };
      }),
      correctLetter,
      difficultyLevel: 'orta',
    });
  });
  return questions;
}

export function isStrongExamParse(questions) {
  if (!Array.isArray(questions) || questions.length < 5) return false;
  const realOptions = questions.filter((q) => (
    (q.options || []).filter((o) => LETTERS.includes(o.letter) && o.text && o.text !== o.letter).length >= 4
  )).length;
  const open = questions.filter((q) => q.correctLetter === 'OPEN').length;
  return realOptions + open >= Math.min(questions.length, 5);
}

function optionBody(text, letter) {
  const value = String(text || '').trim();
  if (!value) return '';
  if (/^[A-E]$/i.test(value)) return '';
  if (value.toUpperCase() === String(letter || '').toUpperCase()) return '';
  return value.replace(/^[A-E][\)\.\-]\s*/i, '').trim();
}

export function normalizeGeneratedQuestions(list) {
  return (Array.isArray(list) ? list : []).map((q) => {
    const incoming = q.options || [];
    const options = LETTERS.map((letter, idx) => {
      const found = incoming.find((o) => String(o.letter || '').toUpperCase() === letter) || incoming[idx];
      return {
        letter,
        text: optionBody(found?.text || found?.optionText, letter),
        isCorrect: false,
      };
    });
    const marked = String(q.correctLetter || '').toUpperCase();
    const fromFlag = incoming.find((o) => o.isCorrect);
    const flagLetter = String(fromFlag?.letter || '').toUpperCase();
    let correctLetter = 'A';
    if (marked === 'OPEN') correctLetter = 'OPEN';
    else if (LETTERS.includes(marked)) correctLetter = marked;
    else if (LETTERS.includes(flagLetter)) correctLetter = flagLetter;
    return {
      ...q,
      text: String(q.text || '').trim(),
      options: options.map((o) => ({ ...o, isCorrect: o.letter === correctLetter })),
      correctLetter,
      difficultyLevel: q.difficultyLevel || 'orta',
    };
  }).filter((q) => q.text);
}

export function hasRealChoiceOptions(questions) {
  const list = Array.isArray(questions) ? questions : [];
  if (!list.length) return false;
  const ok = list.filter((q) => {
    if (q.correctLetter === 'OPEN') return String(q.text || '').length > 8;
    const real = (q.options || []).filter((o) => optionBody(o.text || o.optionText, o.letter)).length;
    return real >= 4;
  }).length;
  return ok >= Math.max(1, Math.ceil(list.length * 0.8));
}

export function questionsFromBrief({ topic, count, easy = 0, medium = 0, hard = 0 }) {
  const total = Math.max(1, Number(count) || 10);
  const mix = [];
  const e = Math.max(0, Number(easy) || 0);
  const m = Math.max(0, Number(medium) || 0);
  const h = Math.max(0, Number(hard) || 0);
  const specified = e + m + h;
  if (specified >= total) {
    mix.push(...Array(e).fill('asan'), ...Array(m).fill('orta'), ...Array(h).fill('çətin'));
  } else {
    mix.push(...Array(e).fill('asan'), ...Array(m).fill('orta'), ...Array(h).fill('çətin'));
    while (mix.length < total) mix.push('orta');
  }
  const title = String(topic || 'Mövzu').trim() || 'Mövzu';
  return mix.slice(0, total).map((level, index) => ({
    text: `${title}. ${index + 1}-ci sual (${level})`,
    options: [
      { letter: 'A', text: 'A variantı', isCorrect: true },
      { letter: 'B', text: 'B variantı', isCorrect: false },
      { letter: 'C', text: 'C variantı', isCorrect: false },
      { letter: 'D', text: 'D variantı', isCorrect: false },
      { letter: 'E', text: 'E variantı', isCorrect: false },
      { letter: 'OPEN', text: 'Açıq', isCorrect: false },
    ],
    correctLetter: 'A',
    difficultyLevel: level,
  }));
}

export function toAddQuestionPayload(q) {
  const fromFlags = (q.options || []).find((o) => o.isCorrect)?.letter;
  const correctLetter = String(q.correctLetter || fromFlags || 'A').toUpperCase();
  const options = LETTERS.map((letter) => {
    const found = (q.options || []).find((o) => String(o.letter || '').toUpperCase() === letter);
    return {
      optionText: String(found?.text || letter).trim() || letter,
      isCorrect: correctLetter === letter,
    };
  });
  options.push({
    optionText: 'Açıq',
    isCorrect: correctLetter === 'OPEN',
  });
  return {
    text: q.text,
    points: pointsForDifficulty(q.difficultyLevel),
    type: 'SingleChoice',
    inputKind: 'Choice',
    difficultyLevel: q.difficultyLevel || 'orta',
    options,
    correctText: correctLetter === 'OPEN' ? String(q.correctText || '').trim() || null : null,
  };
}
