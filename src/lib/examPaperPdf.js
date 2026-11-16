import {
  answerLetter,
  examPaperDocumentHtml,
  extraGapLines,
  FIGURES_PER_PAGE,
  formatPaperDate,
  isFullImageQuestion,
  optionBody,
  packBlocksOntoPages,
  QUESTIONS_PER_PAGE,
  questionFigureUrl,
  realOptions,
  stemText,
} from './examPaperLayout.js';
import { questionIsPipelineFullImage } from './questionImage.js';
import { latexToPlain } from './examPaperText.js';
import { collectKatexCssText, showHtmlPaperOverlay } from './pdfOverlay.js';
import { isNativeApp } from './runtime.js';

export { latexToPlain } from './examPaperText.js';
export {
  extraGapLines,
  packBlocksOntoPages,
  QUESTIONS_PER_PAGE,
  FIGURES_PER_PAGE,
} from './examPaperLayout.js';

/** Marker kept through Helvetica sanitize → drawn with Symbol font as √ */
const SQRT_MARK = '\x01';

/** AZ + unicode math → WinAnsi Helvetica. √ → SQRT_MARK (Symbol font). */
function pdfLatin(text) {
  return String(text || '')
    .replace(/ə/g, 'e').replace(/Ə/g, 'E')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/skok\s*\(/gi, `${SQRT_MARK}(`)
    .replace(/skök\s*\(/gi, `${SQRT_MARK}(`)
    .replace(/kok\s*\(/gi, `${SQRT_MARK}(`)
    .replace(/kök\s*\(/gi, `${SQRT_MARK}(`)
    .replace(/√/g, SQRT_MARK)
    .replace(/∠/g, 'bucaq ')
    .replace(/π/g, 'pi')
    .replace(/∞/g, 'sonsuz')
    .replace(/∈/g, ' in ')
    .replace(/∉/g, ' notin ')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/⇒/g, '=>')
    .replace(/⇔/g, '<=>')
    .replace(/△/g, 'ucbucaq')
    .replace(/∪/g, 'U')
    .replace(/∩/g, 'n')
    .replace(/⊂/g, 'alt')
    .replace(/⊆/g, 'alt=')
    .replace(/⊃/g, 'ust')
    .replace(/⊇/g, 'ust=')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=')
    .replace(/≈/g, '~')
    .replace(/≡/g, '=')
    .replace(/\bbucaq\b/g, 'bucaq')
    .replace(/\baci\b/g, 'bucaq')
    .replace(/´†/g, '²')
    .replace(/´‡/g, '³')
    .replace(/Â²/g, '²')
    .replace(/Â³/g, '³')
    .replace(/Â°/g, '°')
    .replace(/¹/g, '^1').replace(/⁰/g, '^0').replace(/⁴/g, '^4')
    .replace(/⁵/g, '^5').replace(/⁶/g, '^6').replace(/⁷/g, '^7')
    .replace(/⁸/g, '^8').replace(/⁹/g, '^9').replace(/ⁿ/g, '^n')
    .replace(/₀/g, '_0').replace(/₁/g, '_1').replace(/₂/g, '_2')
    .replace(/₃/g, '_3').replace(/₄/g, '_4').replace(/₅/g, '_5')
    .replace(/₆/g, '_6').replace(/₇/g, '_7').replace(/₈/g, '_8')
    .replace(/₉/g, '_9')
    .replace(/[^\x01\x20-\x7E\xB0\xB1\xB2\xB3\xB7\xD7\xF7]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pdfEscape(text) {
  let out = '';
  for (let i = 0; i < String(text || '').length; i += 1) {
    const ch = text[i];
    const c = text.charCodeAt(i);
    if (ch === '\\') out += '\\\\';
    else if (ch === '(') out += '\\(';
    else if (ch === ')') out += '\\)';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\n') out += '\\n';
    else if (c === 0x01) out += ch;
    else if (c > 127) out += `\\${c.toString(8).padStart(3, '0')}`;
    else out += ch;
  }
  return out;
}

function pdfSafe(text) {
  return pdfLatin(text);
}

function wrapLines(text, width = 92) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      if (line) lines.push(line);
      if (word.length > width) {
        for (let i = 0; i < word.length; i += width) lines.push(word.slice(i, i + width));
        line = '';
      } else line = word;
    } else line = next;
  });
  if (line) lines.push(line);
  return lines;
}

function optionTextLines(q) {
  const real = realOptions(q);
  if (!real.length) return [];
  const parts = real.map(({ o, oi }) => {
    const letter = String.fromCharCode(65 + oi);
    return `${letter}) ${pdfSafe(latexToPlain(optionBody(o)))}`;
  });
  const joined = parts.join('    ');
  if (joined.length <= 88) return [`   ${joined}`];
  return parts.map((p) => `   ${p}`);
}

function canvasToJpegBytes(canvas, quality = 0.9) {
  const b64 = canvas.toDataURL('image/jpeg', quality).split(',')[1] || '';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function drawToJpeg(img, maxW, maxH, quality = 0.9) {
  const scale = Math.min(1, maxW / Math.max(1, img.width), maxH / Math.max(1, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { bytes: canvasToJpegBytes(canvas, quality), width: w, height: h };
}

async function loadImageElement(url) {
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (res.ok) {
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = obj;
        });
        return img;
      } finally {
        URL.revokeObjectURL(obj);
      }
    }
  } catch {
    /* Image() fallback */
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  return img;
}

async function loadJpeg(url, { fullQuestion = false } = {}) {
  if (!url || typeof document === 'undefined') return null;
  try {
    const img = await loadImageElement(url);
    const maxW = fullQuestion ? 520 : 460;
    const maxH = fullQuestion ? 640 : 280;
    const quality = fullQuestion ? 0.92 : 0.88;
    return drawToJpeg(img, maxW, maxH, quality);
  } catch {
    return null;
  }
}

function enc(s) {
  return new TextEncoder().encode(s);
}

function join(parts) {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  parts.forEach((p) => {
    out.set(p, o);
    o += p.length;
  });
  return out;
}

const PAGE_TOP = 812;
const LINE_H = 12;
const MARGIN_X = 40;
const FOOTER_Y = 28;
const PAGE_CONTENT_LINES = Math.floor((PAGE_TOP - FOOTER_Y - 8) / LINE_H);

function pdfLineOps(safeLine, { moveFirst = false } = {}) {
  const parts = String(safeLine || '').split(SQRT_MARK);
  const ops = [];
  if (moveFirst) ops.push(`0 -${LINE_H} Td`);
  if (parts.length === 1) {
    ops.push(`(${pdfEscape(parts[0])}) Tj`);
    return ops;
  }
  parts.forEach((chunk, i) => {
    if (i > 0) ops.push('/F2 10 Tf (\\326) Tj /F1 10 Tf');
    if (chunk) ops.push(`(${pdfEscape(chunk)}) Tj`);
  });
  return ops;
}

function assemblePdf(pages) {
  const objs = [];
  const push = (raw) => {
    objs.push(raw);
    return objs.length;
  };
  const fontId = push({
    type: 'text',
    body: '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>',
  });
  const symbolFontId = push({ type: 'text', body: '<< /Type /Font /Subtype /Type1 /BaseFont /Symbol >>' });
  const pageRefs = [];
  const totalPages = pages.length;

  pages.forEach((page, pageIndex) => {
    if (page.jpeg) {
      const imgId = push({
        type: 'image',
        width: page.jpeg.width,
        height: page.jpeg.height,
        bytes: page.jpeg.bytes,
      });
      const stream = `q 595 0 0 842 0 0 cm /Im0 Do Q`;
      const contentId = push({ type: 'stream', body: stream });
      const pageId = push({
        type: 'page',
        contentId,
        fontId,
        symbolFontId,
        xobj: `/Im0 ${imgId} 0 R`,
      });
      pageRefs.push(pageId);
      return;
    }

    const imgIds = (page.images || []).map((img) => {
      const id = push({
        type: 'image',
        width: img.width,
        height: img.height,
        bytes: img.bytes,
      });
      return { id, img };
    });
    const ops = [`BT /F1 10 Tf ${MARGIN_X} ${PAGE_TOP} Td`];
    (page.lines || []).forEach((line, idx) => {
      const safe = pdfLatin(line);
      ops.push(...pdfLineOps(safe, { moveFirst: idx > 0 }));
    });
    ops.push('ET');
    const footer = pdfEscape(`Sehife ${pageIndex + 1} / ${totalPages}`);
    ops.push(`BT /F1 8 Tf ${MARGIN_X} ${FOOTER_Y} Td (${footer}) Tj ET`);
    imgIds.forEach(({ img }, n) => {
      const maxW = img.fullImage ? 500 : 320;
      const maxH = img.fullImage ? 620 : 180;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const top = Math.max(50, PAGE_TOP - (img.anchor || 1) * LINE_H - 2);
      ops.push(`q ${w} 0 0 ${h} ${MARGIN_X} ${top - h} cm /Im${n} Do Q`);
    });
    const contentId = push({ type: 'stream', body: ops.join('\n') });
    const xobj = imgIds.map(({ id }, n) => `/Im${n} ${id} 0 R`).join(' ');
    const pageId = push({
      type: 'page',
      contentId,
      fontId,
      symbolFontId,
      xobj,
    });
    pageRefs.push(pageId);
  });

  const pagesId = push({ type: 'pages', kids: pageRefs });
  const catalogId = push({ type: 'catalog', pagesId });
  const parts = [enc('%PDF-1.4\n')];
  const offsets = [0];
  let size = parts[0].length;
  const writeObj = (num, bytes) => {
    offsets[num] = size;
    parts.push(bytes);
    size += bytes.length;
  };

  objs.forEach((obj, i) => {
    const num = i + 1;
    if (obj.type === 'image') {
      const head = enc(`${num} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${obj.width} /Height ${obj.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${obj.bytes.length} >>\nstream\n`);
      const tail = enc('\nendstream\nendobj\n');
      writeObj(num, join([head, obj.bytes, tail]));
      return;
    }
    if (obj.type === 'stream') {
      const body = obj.body;
      writeObj(num, enc(`${num} 0 obj\n<< /Length ${enc(body).length} >>\nstream\n${body}\nendstream\nendobj\n`));
      return;
    }
    if (obj.type === 'page') {
      writeObj(num, enc(`${num} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${obj.contentId} 0 R /Resources << /Font << /F1 ${obj.fontId} 0 R /F2 ${obj.symbolFontId} 0 R >> ${obj.xobj ? `/XObject << ${obj.xobj} >>` : ''} >> >>\nendobj\n`));
      return;
    }
    if (obj.type === 'pages') {
      const kids = obj.kids.map((id) => `${id} 0 R`).join(' ');
      writeObj(num, enc(`${num} 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${obj.kids.length} >>\nendobj\n`));
      return;
    }
    if (obj.type === 'catalog') {
      writeObj(num, enc(`${num} 0 obj\n<< /Type /Catalog /Pages ${obj.pagesId} 0 R >>\nendobj\n`));
      return;
    }
    writeObj(num, enc(`${num} 0 obj\n${obj.body}\nendobj\n`));
  });

  const xrefStart = size;
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i += 1) {
    xref += `${String(offsets[i] || 0).padStart(10, '0')} 00000 n \n`;
  }
  parts.push(enc(`${xref}trailer << /Size ${objs.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`));
  return new Blob([join(parts)], { type: 'application/pdf' });
}

async function textQuestionBlock(q, index, preferFigures) {
  const stem = pdfSafe(latexToPlain(stemText(q)));
  const opts = optionTextLines(q);
  const url = questionFigureUrl(q, preferFigures);
  const pipelineFull = Boolean(url) && questionIsPipelineFullImage(q);
  const fullImage = pipelineFull || (Boolean(url) && isFullImageQuestion(stem, opts));
  const image = url ? await loadJpeg(url, { fullQuestion: fullImage }) : null;
  const lines = [];
  if (fullImage && image) {
    lines.push(`${index + 1}.`);
    const imgLines = Math.max(8, Math.ceil((image.height + 12) / LINE_H));
    for (let s = 0; s < imgLines; s += 1) lines.push('');
  } else {
    wrapLines(`${index + 1}. ${stem || (image ? '' : '...')}`, 92).forEach((ln) => lines.push(ln));
    if (image) {
      const imgLines = Math.max(4, Math.ceil((image.height + 10) / LINE_H));
      for (let s = 0; s < imgLines; s += 1) lines.push('');
    }
    opts.forEach((row) => wrapLines(row, 92).forEach((ln) => lines.push(ln)));
  }
  return { lines, image, imageAfter: 1, fullImage };
}

function headerLines(title, metaLine, continued = false) {
  const heading = pdfSafe(latexToPlain(title)).slice(0, 90) || 'ExamPulse';
  return [
    `ExamPulse — imtahan vereqi${continued ? '  (davam)' : ''}`,
    heading,
    metaLine,
  ];
}

async function buildTextExamPaperPdf(questions = [], title = 'Sinag', options = {}) {
  const preferFigures = options.preferFigures !== false;
  const includeAnswerKey = options.includeAnswerKey === true;
  const count = (questions || []).length;
  const metaBits = [
    formatPaperDate(),
    count ? `${count} sual` : '',
    options.meta ? pdfSafe(String(options.meta)).slice(0, 70) : '',
  ].filter(Boolean);
  const metaLine = metaBits.join('  |  ');
  const blocks = [];

  for (let i = 0; i < (questions || []).length; i += 1) {
    blocks.push(await textQuestionBlock(questions[i], i, preferFigures));
  }
  if (!blocks.length) blocks.push({ lines: ['Suallar yoxdur.'], image: null, imageAfter: 0 });

  let keyBlock = null;
  if (includeAnswerKey && count) {
    const keyLines = ['Cavablar (muellim)'];
    let row = '';
    questions.forEach((q, idx) => {
      const cell = `${String(idx + 1).padStart(2, ' ')}.${pdfSafe(answerLetter(q))}`;
      row = row ? `${row}   ${cell}` : cell;
      if ((idx + 1) % 5 === 0) {
        keyLines.push(row);
        row = '';
      }
    });
    if (row) keyLines.push(row);
    keyLines.push('Sekilli suallarda cavab sekilde / bankda saxlanilir.');
    keyBlock = { lines: keyLines, image: null, imageAfter: 0, isKey: true };
  }

  const headerH = headerLines(title, metaLine).length;
  const heights = blocks.map((b) => b.lines.length);
  const figureFlags = blocks.map((b) => Boolean(b.image));
  const packed = packBlocksOntoPages(heights, {
    pageHeight: PAGE_CONTENT_LINES,
    reservedTop: headerH,
    maxPerPage: QUESTIONS_PER_PAGE,
    figureFlags,
    maxFiguresPerPage: FIGURES_PER_PAGE,
  });

  const pages = packed.map((pack, pageIndex) => {
    const continued = pageIndex > 0;
    const lines = [...headerLines(title, metaLine, continued), ''];
    const images = [];
    const leftover = Math.max(0, PAGE_CONTENT_LINES - (headerH + 1) - pack.used);
    const gaps = extraGapLines(leftover, pack.indices.length);
    pack.indices.forEach((bi, j) => {
      const block = blocks[bi];
      const startLine = lines.length;
      block.lines.forEach((ln) => lines.push(ln));
      if (block.image) {
        images.push({
          ...block.image,
          anchor: startLine + (block.imageAfter || 1),
          fullImage: Boolean(block.fullImage),
        });
      }
      const blank = gaps[j] || 0;
      for (let s = 0; s < blank; s += 1) lines.push('');
    });
    return { lines, images, used: pack.used };
  });

  if (keyBlock) {
    const last = pages[pages.length - 1];
    const room = PAGE_CONTENT_LINES - headerH - (last?.used || 0);
    if (last && keyBlock.lines.length <= room) {
      last.lines.push('');
      keyBlock.lines.forEach((ln) => last.lines.push(ln));
    } else {
      pages.push({
        lines: [...headerLines(title, metaLine, true), '', ...keyBlock.lines],
        images: [],
      });
    }
  }

  return assemblePdf(pages);
}

/**
 * Open the DİM sheet in the same window (srcdoc overlay).
 * Blob tabs + auto-print() look blank after await (popup blocker / iOS).
 * Native apps return false so the caller can fall back to buildExamPaperPdf.
 */
export function openExamPaperPrint(questions = [], title = 'Sinag', options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (isNativeApp()) return false;
  const html = examPaperDocumentHtml(questions, title, {
    preferFigures: options.preferFigures !== false,
    includeAnswerKey: options.includeAnswerKey === true,
    meta: options.meta || '',
    katexCssText: options.katexCssText || collectKatexCssText(),
  });
  return showHtmlPaperOverlay(html, { title: title || 'ExamPulse PDF' });
}

/**
 * Student exam PDF: Times text + embedded figure images (never extracted
 * figure text). Ten questions per A4, at most 10 şəkil per page, overflow
 * to the next sheet. No Cavablar unless options.includeAnswerKey is true.
 * Browser download uses this Blob. “PDF-ə bax” uses openExamPaperPrint (DİM HTML).
 * Not an html2canvas page snapshot.
 */
export async function buildExamPaperPdf(questions = [], title = 'Sinag', options = {}) {
  return buildTextExamPaperPdf(questions, title, options);
}
