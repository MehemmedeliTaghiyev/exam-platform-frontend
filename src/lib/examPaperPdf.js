import { parseQuestionImage, stripQuestionImage } from './questionImage';

function pdfSafe(text) {
  return String(text || '')
    .replace(/ə/g, 'e').replace(/Ə/g, 'E')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/\$/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[()\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function optionLines(q) {
  return (q?.options || []).map((o, oi) => {
    const letter = String.fromCharCode(65 + oi);
    const text = pdfSafe(String(o.optionText || o.text || '').replace(/^[A-E][\)\.\-:]\s*/i, ''));
    return text ? `   ${letter}) ${text}` : `   ${letter})`;
  });
}

async function loadJpeg(url) {
  if (!url || typeof document === 'undefined') return null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const maxW = 440;
    const scale = Math.min(1, maxW / Math.max(1, img.width));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const b64 = canvas.toDataURL('image/jpeg', 0.84).split(',')[1] || '';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return { bytes, width: w, height: h };
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

/**
 * Exam PDF with question text + embedded JPEG figures when available.
 */
export async function buildExamPaperPdf(questions = [], title = 'Sinag') {
  const heading = pdfSafe(title).slice(0, 80) || 'ExamPulse';
  /** @type {{lines:string[], image:null|{bytes:Uint8Array,width:number,height:number}}[]} */
  const blocks = [];

  for (let i = 0; i < (questions || []).length; i += 1) {
    const q = questions[i];
    const stem = pdfSafe(stripQuestionImage(q?.text || ''));
    const lines = [`${i + 1}. ${stem}`, ...optionLines(q), ''];
    const image = await loadJpeg(parseQuestionImage(q));
    blocks.push({ lines, image });
  }
  if (!blocks.length) blocks.push({ lines: ['Suallar yoxdur.'], image: null });

  // Pack into pages (approx lines; image ~10 lines)
  const pages = [];
  let cur = { lines: ['ExamPulse', heading, ''], images: [] };
  let used = 3;
  blocks.forEach((block) => {
    const cost = block.lines.reduce((n, row) => n + wrapLines(row, 78).length, 0) + (block.image ? 12 : 0);
    if (used + cost > 42 && used > 3) {
      pages.push(cur);
      cur = { lines: [], images: [] };
      used = 0;
    }
    block.lines.forEach((row) => {
      wrapLines(row, 78).forEach((ln) => cur.lines.push(ln));
    });
    if (block.image) {
      cur.images.push({
        ...block.image,
        anchor: cur.lines.length,
      });
      cur.lines.push('[sekil]');
      cur.lines.push('');
    }
    used += cost;
  });
  if (cur.lines.length) pages.push(cur);

  const objs = [];
  const push = (raw) => {
    objs.push(raw);
    return objs.length;
  };

  const fontId = push({ type: 'text', body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' });
  const pageRefs = [];

  pages.forEach((page) => {
    const imgIds = page.images.map((img) => {
      const id = push({
        type: 'image',
        width: img.width,
        height: img.height,
        bytes: img.bytes,
      });
      return { id, img };
    });

    const ops = ['BT /F1 11 Tf 48 800 Td'];
    page.lines.forEach((line, idx) => {
      const safe = pdfSafe(line).slice(0, 95);
      ops.push(idx === 0 ? `(${safe}) Tj` : `0 -15 Td (${safe}) Tj`);
    });
    ops.push('ET');
    imgIds.forEach(({ id, img }, n) => {
      const maxW = 300;
      const maxH = 150;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const top = Math.max(70, 790 - (img.anchor || 8) * 15);
      ops.push(`q ${w} 0 0 ${h} 48 ${top - h} cm /Im${n} Do Q`);
    });
    const stream = ops.join('\n');
    const contentId = push({ type: 'stream', body: stream });
    const xobj = imgIds.map(({ id }, n) => `/Im${n} ${id} 0 R`).join(' ');
    const pageId = push({
      type: 'page',
      contentId,
      fontId,
      xobj,
    });
    pageRefs.push(pageId);
  });

  const pagesId = push({
    type: 'pages',
    kids: pageRefs,
  });
  const catalogId = push({ type: 'catalog', pagesId });

  // Serialize
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
      const text = `${num} 0 obj\n<< /Length ${enc(body).length} >>\nstream\n${body}\nendstream\nendobj\n`;
      writeObj(num, enc(text));
      return;
    }
    if (obj.type === 'page') {
      const text = `${num} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${obj.contentId} 0 R /Resources << /Font << /F1 ${obj.fontId} 0 R >> ${obj.xobj ? `/XObject << ${obj.xobj} >>` : ''} >> >>\nendobj\n`;
      writeObj(num, enc(text));
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
