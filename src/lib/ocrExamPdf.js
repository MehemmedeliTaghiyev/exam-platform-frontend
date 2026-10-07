import { getDocument } from 'pdfjs-dist';

function toBytes(buf) {
  const src = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const bytes = new Uint8Array(src.byteLength);
  bytes.set(src);
  return bytes;
}

export async function ocrPdfArrayBuffer(buf, onProgress) {
  const pdf = await getDocument({
    data: toBytes(buf),
    disableWorker: true,
    isEvalSupported: false,
  }).promise;
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1);
  const pages = [];
  const total = Math.min(pdf.numPages, 8);
  try {
    for (let i = 1; i <= total; i += 1) {
      onProgress?.({ page: i, total, status: 'ocr' });
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.35 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d', { alpha: false });
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const result = await worker.recognize(canvas);
      const line = String(result?.data?.text || '').replace(/\s+/g, ' ').trim();
      if (line) pages.push(line);
    }
  } finally {
    await worker.terminate().catch(() => {});
  }
  return pages.join('\n');
}

export async function fetchDrivePdfBuffer(fileId) {
  const id = String(fileId || '').trim();
  const res = await fetch(`/drive-pdf?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Drive PDF yüklənmədi.');
  return res.arrayBuffer();
}
