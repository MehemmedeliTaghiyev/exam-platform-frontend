import {
  parseQuestionImage,
  questionIsPipelineFullImage,
  stripImageMetaMarker,
  stripQuestionImage,
} from './questionImage.js';
import { stripStemImage } from './examPaperText.js';
import { renderLatexHtml } from './latexText.js';

/** A4 at 96dpi — matches @page size: A4 */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
/** Teacher / DİM-style: 10 questions on a paper page, then the next sheet. */
export const QUESTIONS_PER_PAGE = 10;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function optionBody(opt) {
  return String(opt?.optionText || opt?.OptionText || opt?.text || opt?.Text || '')
    .replace(/^[A-F][\)\.\-:]\s*/i, '')
    .trim();
}

export function isStubOption(opt, index) {
  const body = optionBody(opt);
  const letter = String.fromCharCode(65 + index);
  if (!body) return true;
  if (/^aç[iı]q$/i.test(body) || /^open$/i.test(body)) return true;
  if (body.toUpperCase() === letter) return true;
  if (/^[A-F]$/i.test(body)) return true;
  return false;
}

export function realOptions(q) {
  const opts = q?.options || q?.Options || [];
  return opts
    .map((o, oi) => ({ o, oi }))
    .filter(({ o, oi }) => !isStubOption(o, oi));
}

export function stemText(q) {
  return stripImageMetaMarker(
    stripQuestionImage(stripStemImage(q?.text || q?.Text || '')),
  );
}

export function answerLetter(q) {
  const raw = String(
    q?.correctAnswer
    ?? q?.CorrectAnswer
    ?? q?.correct_answer
    ?? q?.Correct_Answer
    ?? q?.answer
    ?? q?.Answer
    ?? '',
  ).trim();
  if (!raw) return '—';
  const letter = raw.match(/^[A-Ea-e]/)?.[0];
  if (letter) return letter.toUpperCase();
  return raw.slice(0, 24) || '—';
}

export function formatPaperDate(d = new Date()) {
  try {
    return d.toLocaleDateString('az-AZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function questionFigureUrl(q, preferFigures = true) {
  const pipelineMeta = questionIsPipelineFullImage(q);
  if (!preferFigures && !pipelineMeta) return '';
  return q?.imageUrl || q?.ImageUrl || parseQuestionImage(q) || '';
}

export function isFullImageQuestion(stem, opts) {
  if (opts.length > 0) return false;
  const s = String(stem || '').trim();
  if (!s) return true;
  if (/^(\[sekil\]|\[şəkil\]|\[figure\]|sekil|şəkil)$/i.test(s)) return true;
  if (s.length <= 12 && /sekil|şəkil|figure|img/i.test(s)) return true;
  return false;
}

/**
 * Pack question blocks onto pages: 10 per A4, then the next sheet.
 * Still page-breaks earlier if a block cannot fit the remaining height.
 */
export function packBlocksOntoPages(heights, {
  pageHeight = Number.POSITIVE_INFINITY,
  reservedTop = 0,
  reservedBottom = 0,
  maxPerPage = QUESTIONS_PER_PAGE,
} = {}) {
  const usable = Math.max(1, Number(pageHeight) - reservedTop - reservedBottom);
  const cap = Math.max(1, Math.round(Number(maxPerPage) || QUESTIONS_PER_PAGE));
  const pages = [];
  let current = [];
  let used = 0;
  (heights || []).forEach((raw, index) => {
    const h = Math.max(1, Number(raw) || 1);
    const full = current.length >= cap || (current.length > 0 && used + h > usable);
    if (full) {
      pages.push({ indices: current, used });
      current = [];
      used = 0;
    }
    current.push(index);
    used += h;
  });
  if (current.length) pages.push({ indices: current, used });
  return pages.length ? pages : [{ indices: [], used: 0 }];
}

export const PAPER_CSS = `
@page { size: A4; margin: 10mm 12mm 12mm; }
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #111;
}
.ep-paper-flow, .ep-paper-page {
  font-family: "Times New Roman", Times, "Noto Serif", "Liberation Serif", serif;
  font-size: 13px;
  line-height: 1.32;
  color: #111;
  background: #fff;
}
.ep-paper-page {
  width: ${A4_WIDTH_PX}px;
  height: ${A4_HEIGHT_PX}px;
  padding: 26px 34px 40px;
  position: relative;
  overflow: hidden;
}
.ep-head {
  border-bottom: 1.5px solid #111;
  padding-bottom: 5px;
  margin-bottom: 8px;
}
.ep-head-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 9.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #333;
}
.ep-head-title {
  font-size: 13.5px;
  font-weight: 700;
  margin: 3px 0 1px;
  line-height: 1.22;
}
.ep-head-meta { font-size: 11px; color: #222; }
.ep-body { min-height: 0; }
.ep-q {
  break-inside: avoid;
  page-break-inside: avoid;
  margin: 0 0 11px;
}
.ep-q-row {
  display: flex;
  gap: 6px;
  align-items: flex-start;
}
.ep-q-n { font-weight: 700; min-width: 1.55em; flex: 0 0 auto; }
.ep-q-stem { flex: 1 1 auto; min-width: 0; }
.ep-q-stem .katex { font-size: 1.03em; }
.ep-q-stem .katex-display { margin: 0.12em 0; }
.ep-opts {
  display: flex;
  flex-wrap: wrap;
  gap: 0 16px;
  padding: 1px 0 0 1.55em;
  align-items: baseline;
}
.ep-opts.stack { flex-direction: column; gap: 0; }
.ep-opt {
  display: inline-flex;
  gap: 4px;
  align-items: baseline;
  min-width: 0;
}
.ep-opt-l { font-weight: 700; }
.ep-fig {
  display: block;
  max-width: 78%;
  max-height: 170px;
  margin: 3px 0 2px 1.55em;
  object-fit: contain;
}
.ep-fig.full {
  max-width: 92%;
  max-height: 640px;
  margin-left: 0;
}
.ep-foot {
  position: absolute;
  left: 34px;
  right: 34px;
  bottom: 14px;
  font-size: 9px;
  color: #444;
  border-top: 0.6px solid #bbb;
  padding-top: 3px;
  display: flex;
  justify-content: space-between;
}
.ep-key {
  break-inside: auto;
  margin-top: 6px;
  border-top: 1px solid #111;
  padding-top: 6px;
}
.ep-key h2 { font-size: 12px; margin: 0 0 5px; }
.ep-key-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1px 8px;
  font-size: 11px;
}
.ep-key-note { font-size: 9px; color: #555; margin-top: 5px; }
@media print {
  .ep-print-host { width: auto; }
  .ep-paper-page {
    width: auto;
    height: auto;
    min-height: 0;
    padding: 0;
    overflow: visible;
    page-break-after: always;
    break-after: page;
  }
  .ep-paper-page:last-child { page-break-after: auto; break-after: auto; }
  .ep-q { break-inside: avoid; page-break-inside: avoid; }
  .ep-head { break-after: avoid; }
  .ep-foot { position: static; margin-top: 12px; }
  .ep-screen-only { display: none !important; }
}
`;

export function paperHeaderHtml({
  title,
  meta,
  date,
  count,
  page,
  total,
  continued = false,
} = {}) {
  const heading = renderLatexHtml(title) || escapeHtml(title || 'ExamPulse');
  const metaLine = [date, count ? `${count} sual` : '', meta].filter(Boolean).join(' · ');
  const pageBit = page && total ? `${page} / ${total}` : '';
  return `<header class="ep-head">
    <div class="ep-head-row">
      <span>ExamPulse · müəllim vərəqi</span>
      <span>${escapeHtml(pageBit)}${continued ? ' · davam' : ''}</span>
    </div>
    <div class="ep-head-title">${heading}</div>
    <div class="ep-head-meta">${escapeHtml(metaLine)}</div>
  </header>`;
}

export function questionBlockHtml(q, index, { preferFigures = true } = {}) {
  const n = index + 1;
  const stem = stemText(q);
  const opts = realOptions(q);
  const url = questionFigureUrl(q, preferFigures);
  const pipelineFull = Boolean(url) && questionIsPipelineFullImage(q);
  const fullImage = pipelineFull || (Boolean(url) && isFullImageQuestion(stem, opts));
  const longOpts = opts.some(({ o }) => optionBody(o).length > 22);
  const optClass = longOpts ? 'ep-opts stack' : 'ep-opts';
  const optHtml = opts.length
    ? `<div class="${optClass}">${opts.map(({ o, oi }) => {
      const letter = String.fromCharCode(65 + oi);
      return `<span class="ep-opt"><span class="ep-opt-l">${letter})</span><span class="ep-latex">${renderLatexHtml(optionBody(o))}</span></span>`;
    }).join('')}</div>`
    : '';
  const fig = url
    ? `<img class="ep-fig${fullImage ? ' full' : ''}" src="${escapeHtml(url)}" alt="" />`
    : '';
  if (fullImage && url) {
    return `<article class="ep-q" data-q="${n}"><div class="ep-q-row"><span class="ep-q-n">${n}.</span><div class="ep-q-stem">${fig}</div></div></article>`;
  }
  return `<article class="ep-q" data-q="${n}">
    <div class="ep-q-row">
      <span class="ep-q-n">${n}.</span>
      <div class="ep-q-stem ep-latex">${renderLatexHtml(stem) || escapeHtml(stem || '...')}</div>
    </div>
    ${fig}
    ${optHtml}
  </article>`;
}

export function answerKeyHtml(questions = []) {
  if (!questions.length) return '';
  const cells = questions.map((q, i) => (
    `<span>${i + 1}. ${escapeHtml(answerLetter(q))}</span>`
  )).join('');
  return `<section class="ep-key">
    <h2>Cavablar (müəllim)</h2>
    <div class="ep-key-grid">${cells}</div>
    <p class="ep-key-note">Şəkilli suallarda cavab şəkildə / bankda saxlanılır.</p>
  </section>`;
}

export function examPaperBodyHtml(questions = [], options = {}) {
  const preferFigures = options.preferFigures !== false;
  const blocks = (questions || []).map((q, i) => questionBlockHtml(q, i, { preferFigures }));
  const key = options.includeAnswerKey === false ? '' : answerKeyHtml(questions);
  return `${blocks.join('\n')}${key}`;
}

function footerHtml(page, total) {
  return `<footer class="ep-foot"><span>ExamPulse</span><span>Səhifə ${page} / ${total}</span></footer>`;
}

/** Split questions into paper pages of 10 (last page may be shorter). */
export function questionPageChunks(questions = [], size = QUESTIONS_PER_PAGE) {
  const qs = questions || [];
  const cap = Math.max(1, Math.round(Number(size) || QUESTIONS_PER_PAGE));
  const chunks = [];
  for (let i = 0; i < qs.length; i += cap) {
    chunks.push({ start: i, items: qs.slice(i, i + cap) });
  }
  return chunks.length ? chunks : [{ start: 0, items: [] }];
}

export function examPaperDocumentHtml(questions = [], title = 'Sınaq', options = {}) {
  const qs = questions || [];
  const count = qs.length;
  const date = formatPaperDate(options.date);
  const preferFigures = options.preferFigures !== false;
  const includeKey = options.includeAnswerKey !== false;
  const katexHref = options.katexCssHref
    || 'https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css';
  const chunks = questionPageChunks(qs, QUESTIONS_PER_PAGE);
  const lastShort = chunks[chunks.length - 1].items.length < QUESTIONS_PER_PAGE;
  const extraKeyPage = includeKey && !lastShort;
  const total = chunks.length + (extraKeyPage ? 1 : 0);
  const meta = options.meta || '';
  const pages = chunks.map((chunk, pageIndex) => {
    const qHtml = chunk.items.map((q, j) => (
      questionBlockHtml(q, chunk.start + j, { preferFigures })
    )).join('\n');
    const showKey = includeKey && lastShort && pageIndex === chunks.length - 1;
    return `<div class="ep-paper-page">
      ${paperHeaderHtml({
        title,
        meta,
        date,
        count,
        page: pageIndex + 1,
        total,
        continued: pageIndex > 0,
      })}
      <div class="ep-body">${qHtml}${showKey ? answerKeyHtml(qs) : ''}</div>
      ${footerHtml(pageIndex + 1, total)}
    </div>`;
  });
  if (extraKeyPage) {
    pages.push(`<div class="ep-paper-page">
      ${paperHeaderHtml({
        title, meta, date, count, page: total, total, continued: true,
      })}
      <div class="ep-body">${answerKeyHtml(qs)}</div>
      ${footerHtml(total, total)}
    </div>`);
  }
  return `<!DOCTYPE html>
<html lang="az">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title || 'ExamPulse')}</title>
  <link rel="stylesheet" href="${escapeHtml(katexHref)}" />
  <style>${PAPER_CSS}</style>
</head>
<body>
  ${pages.join('\n')}
</body>
</html>`;
}
