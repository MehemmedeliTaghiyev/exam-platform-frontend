import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { isIosDevice } from '../lib/device';
import NativePdfFrame from './NativePdfFrame';

try {
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
} catch {
  /* worker optional */
}

function toPdfBytes(buf) {
  const src = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const bytes = new Uint8Array(src.byteLength);
  bytes.set(src);
  return bytes;
}

export default function PdfViewer({
  file,
  src,
  title = 'Orijinal PDF',
  extraHref = '',
  extraLabel = 'Yeni tabda aç',
}) {
  const wrapRef = useRef(null);
  const hostRef = useRef(null);
  const pdfRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(file || src));
  const [pages, setPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      pdfRef.current = null;
      if (hostRef.current) hostRef.current.replaceChildren();
      if (isIosDevice() || (!file && !src)) {
        setLoading(false);
        setPages(0);
        return;
      }
      setLoading(true);
      setError('');
      try {
        let buf;
        if (file) buf = await file.arrayBuffer();
        else {
          const res = await fetch(src);
          if (!res.ok) throw new Error('fetch');
          buf = await res.arrayBuffer();
        }
        const data = toPdfBytes(buf);
        const pdf = await getDocument({
          data,
          disableWorker: true,
          disableRange: true,
          disableStream: true,
          isEvalSupported: false,
          useSystemFonts: true,
        }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setPages(pdf.numPages);
        await paint();
      } catch {
        if (!cancelled) setError('PDF bu pəncərədə açılmadı. Aşağıdakı linkdən açın.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const paint = async () => {
      const pdf = pdfRef.current;
      const host = hostRef.current;
      const wrap = wrapRef.current;
      if (!pdf || !host || !wrap) return;
      const width = Math.max(280, wrap.clientWidth - 16) * zoomRef.current;
      host.replaceChildren();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        if (cancelled) return;
        const page = await pdf.getPage(pageNum);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: width / base.width });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = 'auto';
        canvas.style.display = 'block';
        canvas.className = 'mx-auto mb-3 rounded-md bg-white shadow-sm';
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) continue;
        await page.render({
          canvasContext: ctx,
          canvas,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        }).promise;
        host.appendChild(canvas);
        if (pageNum === 1) setLoading(false);
      }
    };

    load();

    let debounce;
    const onResize = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        paint().catch(() => {});
      }, 200);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      clearTimeout(debounce);
      window.removeEventListener('resize', onResize);
      pdfRef.current = null;
      if (hostRef.current) hostRef.current.replaceChildren();
    };
  }, [file, src]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const host = hostRef.current;
    const wrap = wrapRef.current;
    if (!pdf || !host || !wrap) return;
    let cancelled = false;
    const paint = async () => {
      const width = Math.max(280, wrap.clientWidth - 16) * zoom;
      host.replaceChildren();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        if (cancelled) return;
        const page = await pdf.getPage(pageNum);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: width / base.width });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = 'auto';
        canvas.style.display = 'block';
        canvas.className = 'mx-auto mb-3 rounded-md bg-white shadow-sm';
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) continue;
        await page.render({
          canvasContext: ctx,
          canvas,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        }).promise;
        host.appendChild(canvas);
      }
    };
    paint().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [zoom]);

  if (!file && !src) return null;

  if (isIosDevice()) {
    return (
      <NativePdfFrame
        src={src}
        file={file}
        title={title}
        extraHref={extraHref}
        extraLabel={extraLabel}
      />
    );
  }

  const openHref = extraHref || src || '';

  return (
    <div
      ref={wrapRef}
      className="flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 text-sm font-medium dark:border-slate-800">
        <span>{title}{pages > 0 ? ` · ${pages} səhifə` : ''}</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs dark:border-slate-700"
            onClick={() => setZoom((z) => Math.max(0.7, Math.round((z - 0.2) * 10) / 10))}
          >
            −
          </button>
          <span className="w-10 text-center text-xs text-gray-500">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs dark:border-slate-700"
            onClick={() => setZoom((z) => Math.min(2.4, Math.round((z + 0.2) * 10) / 10))}
          >
            +
          </button>
          {openHref ? (
            <a className="text-xs font-semibold text-brand-600 underline" href={openHref} target="_blank" rel="noopener">
              {extraLabel}
            </a>
          ) : null}
        </div>
      </div>
      {loading && (
        <div className="flex h-40 items-center justify-center text-sm text-gray-500">PDF açılır...</div>
      )}
      {error && !loading && <div className="px-4 py-8 text-center text-sm text-red-600">{error}</div>}
      <div
        ref={hostRef}
        className="w-full overflow-auto bg-gray-200 p-2 sm:p-3 dark:bg-slate-950"
        style={{
          height: 'min(82dvh, 1100px)',
          WebkitOverflowScrolling: 'touch',
        }}
      />
    </div>
  );
}
