import { isNativeApp } from './runtime';

function pdfSafe(text) {
  return String(text || '')
    .replace(/ə/g, 'e').replace(/Ə/g, 'E')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[()\\]/g, ' ');
}

function latexPlain(source) {
  return String(source || '')
    .replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, ' [TikZ sxem] ')
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, ' ')
    .replace(/[{}%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapLines(text, width = 78) {
  const words = String(text || '').split(' ');
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 40);
}

function simplePdfBuffer(title, body) {
  const heading = pdfSafe(title).slice(0, 70) || 'ExamPulse';
  const lines = wrapLines(pdfSafe(body), 78);
  const ops = ['BT /F1 18 Tf 50 780 Td (ExamPulse) Tj', '/F1 12 Tf 0 -24 Td (' + heading + ') Tj'];
  lines.forEach((line) => ops.push('0 -16 Td (' + line + ') Tj'));
  ops.push('ET');
  const stream = ops.join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(unescape(encodeURIComponent(pdf)).length);
    pdf += `${obj}\n`;
  });
  const start = unescape(encodeURIComponent(pdf)).length;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i += 1) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `${xref}trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

export function latexToPdfBlob(source, title = 'ExamPulse') {
  const body = latexPlain(source) || 'Material telefondan PDF-e cevrildi.';
  return simplePdfBuffer(title, body);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
  return url;
}

async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function saveAndOpenPdf(blob, filename) {
  const safeName = String(filename || 'material.pdf').replace(/[^\w.\-əöüğçşıİƏÖÜĞÇŞ ]+/gi, '_') || 'material.pdf';
  if (isNativeApp()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const written = await Filesystem.writeFile({
      path: safeName,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
    });
    await Share.share({
      title: safeName,
      url: written.uri,
      dialogTitle: 'PDF-i aç və ya yüklə',
    });
    return written.uri;
  }
  const url = URL.createObjectURL(blob);
  downloadBlob(blob, safeName);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 8000);
  return url;
}

export async function compileLatexPdf(source, { title = 'ExamPulse', filename = 'material.pdf' } = {}) {
  if (!isNativeApp() && import.meta.env.DEV) {
    try {
      const res = await fetch('/latex-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, title, filename }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const fallback = res.headers.get('X-Latex-Fallback') === '1';
        return { blob, fallback };
      }
    } catch {
      /* telefon və ya server yoxdursa yerli çevirmə */
    }
  }
  return { blob: latexToPdfBlob(source, title), fallback: false, local: true };
}
