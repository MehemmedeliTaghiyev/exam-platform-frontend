import {
  parseQuestionImage,
  questionIsPipelineFullImage,
  stripImageMetaMarker,
  stripQuestionImage,
} from './questionImage';
import { latexToPlain, stripStemImage } from './examPaperText';

export { latexToPlain } from './examPaperText';

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
    // mojibake qüvvət (əgər latexToPlain-dən keçməyibsə)
    .replace(/´†/g, '²')
    .replace(/´‡/g, '³')
    .replace(/Â²/g, '²')
    .replace(/Â³/g, '³')
    .replace(/Â°/g, '°')
    // supers outside WinAnsi → digit
    .replace(/¹/g, '^1').replace(/⁰/g, '^0').replace(/⁴/g, '^4')
    .replace(/⁵/g, '^5').replace(/⁶/g, '^6').replace(/⁷/g, '^7')
    .replace(/⁸/g, '^8').replace(/⁹/g, '^9').replace(/ⁿ/g, '^n')
    .replace(/₀/g, '_0').replace(/₁/g, '_1').replace(/₂/g, '_2')
    .replace(/₃/g, '_3').replace(/₄/g, '_4').replace(/₅/g, '_5')
    .replace(/₆/g, '_6').replace(/₇/g, '_7').replace(/₈/g, '_8')
    .replace(/₉/g, '_9')
    // keep: ASCII + SQRT_MARK + ° ± ² ³ · × ÷
    .replace(/[^\x01\x20-\x7E\xB0\xB1\xB2\xB3\xB7\xD7\xF7]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** PDF literal string: WinAnsi bytes as \\ooo for >127 */
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
    else if (c === 0x01) out += ch; // SQRT_MARK — split before escape
    else if (c > 127) out += `\\${c.toString(8).padStart(3, '0')}`;
    else out += ch;
  }
  return out;
}

function pdfSafe(text) {
  return pdfLatin(text);
}

function wrapLines(text, width = 78) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      if (line) lines.push(line);
      line = word.length > width ? word.slice(0, width) : word;
    } else line = next;
  });
  if (line) lines.push(line);
  return lines;
}

function optionBody(opt) {
  return String(opt?.optionText || opt?.OptionText || opt?.text || opt?.Text || '')
    .replace(/^[A-F][\)\.\-:]\s*/i, '')
    .trim();
}

function isStubOption(opt, index) {
  const body = optionBody(opt);
  const letter = String.fromCharCode(65 + index);
  if (!body) return true;
  if (/^aç[iı]q$/i.test(body) || /^open$/i.test(body)) return true;
  if (body.toUpperCase() === letter) return true;
  if (/^[A-F]$/i.test(body)) return true;
  return false;
}

function optionLines(q) {
  const opts = q?.options || q?.Options || [];
  const real = opts
    .map((o, oi) => ({ o, oi }))
    .filter(({ o, oi }) => !isStubOption(o, oi));
  if (!real.length) return [];
  return real.map(({ o, oi }) => {
    const letter = String.fromCharCode(65 + oi);
    return `   ${letter}) ${pdfSafe(latexToPlain(optionBody(o)))}`;
  });
}

function cleanStem(q) {
  const raw = stripImageMetaMarker(
    stripQuestionImage(stripStemImage(q?.text || q?.Text || '')),
  );
  return pdfSafe(latexToPlain(raw));
}

function answerLetter(q, index) {
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
  const plain = pdfSafe(latexToPlain(raw)).slice(0, 24);
  return plain || '—';
}

function formatPdfDate(d = new Date()) {
  try {
    return d.toLocaleDateString('az-AZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Tam sual şəkli: mətn boş/placeholder, variantlar stub — PDF-də yalnız şəkil. */
function isFullImageQuestion(stem, opts) {
  if (opts.length > 0) return false;
  const s = String(stem || '').trim();
  if (!s) return true;
  if (/^(\[sekil\]|\[şəkil\]|\[figure\]|sekil|şəkil)$/i.test(s)) return true;
  if (s.length <= 12 && /sekil|şəkil|figure|img/i.test(s)) return true;
  return false;
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
  // 1) fetch → blob (CORS/CDN üçün daha sabit)
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

/**
 * Bank FigureUrl / CDN → JPEG bytes for PDF.
 * fullQuestion: tam sual şəkli — daha böyük yer.
 */
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

const PAGE_TOP = 800;
const LINE_H = 15;
const MARGIN_X = 48;
const PAGE_LINES = 48;

/** Emit PDF text ops for a line that may contain √ markers (Symbol /F2). */
function pdfLineOps(safeLine, { moveFirst = false } = {}) {
  const parts = String(safeLine || '').split(SQRT_MARK);
  const ops = [];
  if (moveFirst) ops.push(`0 -${LINE_H} Td`);
  if (parts.length === 1) {
    ops.push(`(${pdfEscape(parts[0]).slice(0, 95)}) Tj`);
    return ops;
  }
  parts.forEach((chunk, i) => {
    if (i > 0) {
      // Adobe Symbol: radical = octal 326
      ops.push('/F2 11 Tf (\\326) Tj /F1 11 Tf');
    }
    if (chunk) ops.push(`(${pdfEscape(chunk).slice(0, 95)}) Tj`);
  });
  return ops;
}

/**
 * Exam PDF: mətn + bank URL-dən fiqur/tam-sual şəkli.
 * options.preferFigures — şəkilli sualları mümkün qədər saxla (default true).
 * options.includeAnswerKey — müəllim üçün son səhifədə cavablar (default true).
 * options.meta — əlavə sətir (sinif, mövzu və s.).
 */
export async function buildExamPaperPdf(questions = [], title = 'Sinag', options = {}) {
  const preferFigures = options.preferFigures !== false;
  const includeAnswerKey = options.includeAnswerKey !== false;
  const heading = pdfSafe(latexToPlain(title)).slice(0, 80) || 'ExamPulse';
  const count = (questions || []).length;
  const metaBits = [
    formatPdfDate(),
    count ? `${count} sual` : '',
    options.meta ? pdfSafe(String(options.meta)).slice(0, 60) : '',
  ].filter(Boolean);
  const metaLine = metaBits.join('  |  ');
  const blocks = [];
  const answers = [];

  for (let i = 0; i < (questions || []).length; i += 1) {
    const q = questions[i];
    const stem = cleanStem(q);
    const opts = optionLines(q);
    const pipelineMeta = questionIsPipelineFullImage(q);
    // Pipeline S* / __IM: həmişə şəkli yüklə — allowFigures=false olsa belə mətn+şəkilsiz qalmasın.
    const url = (preferFigures || pipelineMeta)
      ? (q?.imageUrl || q?.ImageUrl || parseQuestionImage(q) || '')
      : '';
    // image_meta 1|2: mətn bazada dedup üçündür; PDF-də şəkil kifayətdir (fiqur artıq şəkildədir).
    const pipelineFull = Boolean(url) && pipelineMeta;
    const fullImage = pipelineFull || (Boolean(url) && isFullImageQuestion(stem, opts));
    const image = url ? await loadJpeg(url, { fullQuestion: fullImage }) : null;
    answers.push({ n: i + 1, a: answerLetter(q, i) });

    const lines = [];
    if (fullImage && image) {
      lines.push(`${i + 1}.`);
      const imgLines = Math.max(8, Math.ceil((image.height + 16) / LINE_H));
      for (let s = 0; s < imgLines; s += 1) lines.push('');
    } else {
      lines.push(`${i + 1}. ${stem || (image ? '' : '...')}`);
      if (image) {
        const imgLines = Math.max(5, Math.ceil((image.height + 14) / LINE_H));
        for (let s = 0; s < imgLines; s += 1) lines.push('');
      }
      lines.push(...opts);
    }
    lines.push('');
    blocks.push({
      lines,
      image,
      imageAfter: 1,
      fullImage,
    });
  }
  if (!blocks.length) blocks.push({ lines: ['Suallar yoxdur.'], image: null, imageAfter: 0 });

  const pages = [];
  const headerLines = metaLine
    ? ['ExamPulse — muellim vereqi', heading, metaLine, '']
    : ['ExamPulse — muellim vereqi', heading, ''];
  let cur = { lines: [...headerLines], images: [] };
  let used = cur.lines.length;
  blocks.forEach((block) => {
    const cost = block.lines.reduce((n, row) => n + Math.max(1, wrapLines(row, 78).length), 0);
    if (used + cost > PAGE_LINES && used > cur.lines.length) {
      pages.push(cur);
      cur = { lines: [], images: [] };
      used = 0;
    }
    const startLine = cur.lines.length;
    block.lines.forEach((row) => {
      const wrapped = wrapLines(row, 78);
      if (!wrapped.length) cur.lines.push('');
      else wrapped.forEach((ln) => cur.lines.push(ln));
    });
    if (block.image) {
      cur.images.push({
        ...block.image,
        anchor: startLine + (block.imageAfter || 1),
        fullImage: Boolean(block.fullImage),
      });
    }
    used += cost;
  });
  if (cur.lines.length) pages.push(cur);

  if (includeAnswerKey && answers.length) {
    const keyLines = ['Cavablar (muellim)', ''];
    let row = '';
    answers.forEach((item, idx) => {
      const cell = `${String(item.n).padStart(2, ' ')}.${item.a}`;
      row = row ? `${row}   ${cell}` : cell;
      if ((idx + 1) % 5 === 0) {
        keyLines.push(row);
        row = '';
      }
    });
    if (row) keyLines.push(row);
    keyLines.push('', 'Sekilli suallarda cavab sekilde / bankda saxlanilir.');
    pages.push({ lines: keyLines, images: [] });
  }

  const objs = [];
  const push = (raw) => {
    objs.push(raw);
    return objs.length;
  };

  // WinAnsi: ² ³ ° və s. Helvetica-də görünür (StandardEncoding-də yoxdur)
  const fontId = push({
    type: 'text',
    body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  });
  const symbolFontId = push({ type: 'text', body: '<< /Type /Font /Subtype /Type1 /BaseFont /Symbol >>' });
  const pageRefs = [];

  const totalPages = pages.length;
  pages.forEach((page, pageIndex) => {
    const imgIds = page.images.map((img) => {
      const id = push({
        type: 'image',
        width: img.width,
        height: img.height,
        bytes: img.bytes,
      });
      return { id, img };
    });

    const ops = [`BT /F1 11 Tf ${MARGIN_X} ${PAGE_TOP} Td`];
    page.lines.forEach((line, idx) => {
      const safe = pdfLatin(line).slice(0, 95);
      ops.push(...pdfLineOps(safe, { moveFirst: idx > 0 }));
    });
    ops.push('ET');
    // Footer: page number (seliqeli muellim vereqi)
    const footer = pdfEscape(`Sehife ${pageIndex + 1} / ${totalPages}`);
    ops.push(`BT /F1 9 Tf ${MARGIN_X} 28 Td (${footer}) Tj ET`);
    imgIds.forEach(({ img }, n) => {
      const maxW = img.fullImage ? 500 : 320;
      const maxH = img.fullImage ? 620 : 200;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const top = Math.max(50, PAGE_TOP - (img.anchor || 1) * LINE_H - 2);
      ops.push(`q ${w} 0 0 ${h} ${MARGIN_X} ${top - h} cm /Im${n} Do Q`);
    });
    const stream = ops.join('\n');
    const contentId = push({ type: 'stream', body: stream });
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
