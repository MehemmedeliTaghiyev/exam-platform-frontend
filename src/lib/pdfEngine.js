import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = workerUrl;
}

export function isPdfMagic(buf) {
  const bytes = new Uint8Array(buf?.slice ? buf.slice(0, 5) : buf || []);
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export async function openPdfDocument(buf) {
  const data = new Uint8Array(buf.slice ? buf.slice(0) : buf);
  return getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
    disableAutoFetch: true,
    disableStream: true,
    isOffscreenCanvasSupported: false,
  }).promise;
}
