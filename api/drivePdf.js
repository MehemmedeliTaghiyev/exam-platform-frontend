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

function waitPdfObj(page, name, ms = 4000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (!done) {
        done = true;
        resolve(v || null);
      }
    };
    try {
      page.objs.get(name, (data) => finish(data));
    } catch {
      finish(null);
    }
    setTimeout(() => finish(null), ms);
  });
}

function rgbaFromPdfImage(img) {
  const width = Number(img?.width || 0);
  const height = Number(img?.height || 0);
  const src = img?.data;
  if (!width || !height || !src) return null;
  const kind = Number(img.kind || 3);
  const rgba = new Uint8Array(width * height * 4);
  if (kind === 1) {
    for (let i = 0, p = 0; i < src.length && p < rgba.length; i += 1, p += 4) {
      const v = src[i];
      rgba[p] = v;
      rgba[p + 1] = v;
      rgba[p + 2] = v;
      rgba[p + 3] = 255;
    }
  } else if (kind === 2) {
    for (let i = 0, p = 0; i + 2 < src.length && p < rgba.length; i += 3, p += 4) {
      rgba[p] = src[i];
      rgba[p + 1] = src[i + 1];
      rgba[p + 2] = src[i + 2];
      rgba[p + 3] = 255;
    }
  } else {
    const n = Math.min(src.length, rgba.length);
    rgba.set(src.subarray ? src.subarray(0, n) : src.slice(0, n));
  }
  return { data: rgba, width, height };
}

function jpegFromRgba(raw) {
  if (!raw) return null;
  let { data, width, height } = raw;
  const maxEdge = 1400;
  if (Math.max(width, height) > maxEdge) {
    const scale = maxEdge / Math.max(width, height);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const next = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y += 1) {
      const sy = Math.min(height - 1, Math.round(y / scale));
      for (let x = 0; x < w; x += 1) {
        const sx = Math.min(width - 1, Math.round(x / scale));
        const si = (sy * width + sx) * 4;
        const di = (y * w + x) * 4;
        next[di] = data[si];
        next[di + 1] = data[si + 1];
        next[di + 2] = data[si + 2];
        next[di + 3] = 255;
      }
    }
    data = next;
    width = w;
    height = h;
  }
  const { encode } = require('jpeg-js');
  const out = encode({ data: Buffer.from(data), width, height }, 72);
  return out?.data || null;
}

async function collectPageJpegs(pdf, pdfjs) {
  const jpegs = [];
  const limit = Math.min(pdf.numPages, 6);
  for (let i = 1; i <= limit; i += 1) {
    const page = await pdf.getPage(i);
    const ops = await page.getOperatorList();
    let found = null;
    for (let j = 0; j < ops.fnArray.length; j += 1) {
      const fn = ops.fnArray[j];
      if (fn !== pdfjs.OPS.paintImageXObject && fn !== pdfjs.OPS.paintJpegXObject) continue;
      const name = ops.argsArray[j]?.[0];
      if (!name) continue;
      const img = await waitPdfObj(page, name);
      const jpeg = jpegFromRgba(rgbaFromPdfImage(img));
      if (jpeg && jpeg.length > 800) {
        found = jpeg;
        break;
      }
    }
    if (found) jpegs.push(found);
  }
  return jpegs;
}

function visionErrorMessage(json, status) {
  const msg = String(json?.error?.message || `vision ${status}`);
  const low = msg.toLowerCase();
  if (status === 403 || /permission|disabled|not been used|api has not been enabled|referer|blocked/i.test(low)) {
    return `${msg} Billing kifayət deyil. Eyni proyektdə Cloud Vision API-ni Enable edin, API key restriction-a Cloud Vision API əlavə edib Save edin, 2 dəqiqə gözləyin.`;
  }
  return msg;
}

function textFromVisionPayload(json) {
  const chunks = [];
  const take = (r) => {
    const t = String(r?.fullTextAnnotation?.text || r?.textAnnotations?.[0]?.description || '').trim();
    if (t) chunks.push(t);
  };
  (json?.responses || []).forEach((fileRes) => {
    if (Array.isArray(fileRes?.responses)) fileRes.responses.forEach(take);
    else take(fileRes);
  });
  return chunks.join('\n').trim();
}

async function visionOcrPdf(buf) {
  const key = driveApiKey();
  if (!key) throw new Error('GOOGLE_DRIVE_API_KEY Vercel-də yoxdur.');
  const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  try {
    const res = await fetch(`https://vision.googleapis.com/v1/files:annotate?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        requests: [{
          inputConfig: {
            mimeType: 'application/pdf',
            content: bytes.toString('base64'),
          },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          pages: [1, 2, 3, 4, 5],
        }],
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(visionErrorMessage(json, res.status));
    return textFromVisionPayload(json);
  } finally {
    clearTimeout(timer);
  }
}

async function visionOcrJpegs(jpegs) {
  const key = driveApiKey();
  if (!key || !jpegs.length) return '';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 40000);
  try {
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        requests: jpegs.slice(0, 5).map((buf) => ({
          image: { content: Buffer.from(buf).toString('base64') },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          imageContext: { languageHints: ['az', 'tr', 'en'] },
        })),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(visionErrorMessage(json, res.status));
    return textFromVisionPayload(json);
  } finally {
    clearTimeout(timer);
  }
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
  const fileOcr = String(await visionOcrPdf(src) || '').trim();
  if (fileOcr.length >= 40) return fileOcr;
  const jpegs = await collectPageJpegs(pdf, pdfjs);
  return String(await visionOcrJpegs(jpegs) || '').trim();
}
