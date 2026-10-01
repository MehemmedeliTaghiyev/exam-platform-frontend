import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

if (typeof Promise !== 'undefined' && typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = workerUrl;
}

function isPhone() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}

export function isPdfMagic(buf) {
  const bytes = new Uint8Array(buf?.slice ? buf.slice(0, 5) : buf || []);
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export async function openPdfDocument(buf) {
  const data = new Uint8Array(buf.slice ? buf.slice(0) : buf);
  try {
    return await getDocument({
      data,
      disableWorker: isPhone(),
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
      disableAutoFetch: true,
      disableStream: true,
      isOffscreenCanvasSupported: false,
    }).promise;
  } catch (err) {
    const msg = String(err?.message || err);
    throw new Error(`[2 PDF.js] getDocument: ${msg}`);
  }
}
