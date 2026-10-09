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
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    'pdfjs-dist/build/pdf.worker.mjs',
  ];
  for (const spec of workerSpecs) {
    try {
      const file = require.resolve(spec);
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(file).href;
      return;
    } catch {
      /* next */
    }
  }
}

function openaiKey() {
  return String(process.env.OPENAI_API_KEY || process.env.EXAM_OPENAI_API_KEY || '').trim();
}

function loadCanvas() {
  try {
    return require('@napi-rs/canvas');
  } catch {
    return null;
  }
}

async function renderPageJpegs(pdf) {
  const napi = loadCanvas();
  if (!napi?.createCanvas) return [];
  try {
    const jpegs = [];
    const limit = Math.min(pdf.numPages, 5);
    for (let i = 1; i <= limit; i += 1) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.45 });
      const width = Math.max(1, Math.ceil(viewport.width));
      const height = Math.max(1, Math.ceil(viewport.height));
      const canvas = napi.createCanvas(width, height);
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      const canvasFactory = {
        create(w, h) {
          const c = napi.createCanvas(Math.ceil(w), Math.ceil(h));
          return { canvas: c, context: c.getContext('2d') };
        },
        reset(pair, w, h) {
          pair.canvas.width = Math.ceil(w);
          pair.canvas.height = Math.ceil(h);
        },
        destroy(pair) {
          pair.canvas.width = 0;
          pair.canvas.height = 0;
        },
      };
      await page.render({
        canvasContext: context,
        viewport,
        canvas,
        canvasFactory,
      }).promise;
      const encoded = typeof canvas.encode === 'function'
        ? Buffer.from(await canvas.encode('jpeg', 62))
        : canvas.toBuffer('image/jpeg');
      if (encoded && encoded.length > 800) jpegs.push(encoded);
    }
    return jpegs;
  } catch {
    return [];
  }
}

async function gpt4oOcrJpegs(jpegs) {
  const key = openaiKey();
  if (!key) {
    throw new Error('Skan PDF üçün Vercel-də OPENAI_API_KEY lazımdır (Exam API-dəki GPT-4o açarı). Sonra Redeploy edin.');
  }
  if (!jpegs.length) return '';
  const content = [
    {
      type: 'text',
      text: 'Extract all readable exam text from these pages. Keep question numbers, options A-E, and answers if visible. Azerbaijani/Turkish/English. Plain text only, no commentary.',
    },
    ...jpegs.slice(0, 5).map((buf) => ({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`,
        detail: 'low',
      },
    })),
  ];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        max_tokens: 4000,
        messages: [{ role: 'user', content }],
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = String(json?.error?.message || `openai ${res.status}`);
      throw new Error(msg.slice(0, 180));
    }
    return String(json?.choices?.[0]?.message?.content || '').trim();
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
    disableRange: true,
    disableStream: true,
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
  const text = pages.join('\n').trim();
  if (text.length >= 40) return text;
  const jpegs = await renderPageJpegs(pdf);
  if (!jpegs.length) return text;
  return String(await gpt4oOcrJpegs(jpegs) || text).trim();
}
