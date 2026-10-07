import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ID_RE = /^[a-zA-Z0-9_-]{20,}$/;
const MAX_PDF_BYTES = 12 * 1024 * 1024;

export function parseDrivePdfId(raw) {
  const s = String(raw || '').trim();
  return ID_RE.test(s) ? s : '';
}

function driveApiKey() {
  return String(process.env.GOOGLE_DRIVE_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
}

function isPdfBuffer(buf) {
  return Boolean(buf && buf.length > 5 && buf.subarray(0, 5).toString() === '%PDF-');
}

async function bufferIfPdf(res) {
  if (!res?.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_PDF_BYTES) return null;
  return isPdfBuffer(buf) ? buf : null;
}

async function loadViaDriveApi(safe) {
  const key = driveApiKey();
  if (!key) return null;
  const qs = `key=${encodeURIComponent(key)}&supportsAllDrives=true`;
  let mime = '';
  try {
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(safe)}?fields=id,mimeType,name&${qs}`,
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      mime = String(meta.mimeType || '');
    }
  } catch {
    /* media still */
  }
  const googleDoc = mime.startsWith('application/vnd.google-apps.');
  const url = googleDoc
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(safe)}/export?mimeType=${encodeURIComponent('application/pdf')}&${qs}`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(safe)}?alt=media&${qs}`;
  try {
    return await bufferIfPdf(await fetch(url, { redirect: 'follow' }));
  } catch {
    return null;
  }
}

async function loadViaPublicExport(safe) {
  const urls = [
    `https://drive.google.com/uc?export=download&id=${safe}`,
    `https://drive.google.com/uc?export=download&id=${safe}&confirm=t`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          Accept: 'application/pdf,*/*',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      const buf = await bufferIfPdf(res);
      if (buf) return buf;
    } catch {
      /* next url */
    }
  }
  return null;
}

export async function loadDrivePdfBuffer(id) {
  const safe = parseDrivePdfId(id);
  if (!safe) return null;
  const viaApi = await loadViaDriveApi(safe);
  if (viaApi) return viaApi;
  return loadViaPublicExport(safe);
}

function setupPdfWorker(pdfjs) {
  const workerSpecs = [
    'pdfjs-dist/legacy/build/pdf.worker.mjs',
    'pdfjs-dist/build/pdf.worker.mjs',
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
  ];
  for (const spec of workerSpecs) {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve(spec)).href;
      return;
    } catch {
      /* next */
    }
  }
}

async function ocrPdfPages(pdf) {
  let createCanvas;
  try {
    ({ createCanvas } = await import('@napi-rs/canvas'));
  } catch {
    return '';
  }
  let createWorker;
  try {
    ({ createWorker } = await import('tesseract.js'));
  } catch {
    return '';
  }
  const worker = await createWorker('eng', 1, {
    cachePath: '/tmp',
    gzip: false,
  });
  const pages = [];
  const limit = Math.min(pdf.numPages, 8);
  try {
    for (let i = 1; i <= limit; i += 1) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.35 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext('2d');
      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;
      const jpeg = canvas.toBuffer('image/jpeg', 75);
      const result = await worker.recognize(jpeg);
      const line = String(result?.data?.text || '').replace(/\s+/g, ' ').trim();
      if (line) pages.push(line);
    }
  } finally {
    await worker.terminate().catch(() => {});
  }
  return pages.join('\n');
}

export async function extractTextFromPdfBuffer(buf) {
  const src = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const bytes = new Uint8Array(src.byteLength);
  bytes.set(src);
  let pdfjs;
  try {
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch {
    pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  }
  setupPdfWorker(pdfjs);
  const pdf = await pdfjs.getDocument({
    data: bytes,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = (content.items || [])
      .map((it) => String(it.str || ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (line) pages.push(line);
  }
  let text = pages.join('\n').trim();
  if (text.length >= 40) return text;
  const ocr = String(await ocrPdfPages(pdf) || '').trim();
  return ocr.length > text.length ? ocr : text;
}
