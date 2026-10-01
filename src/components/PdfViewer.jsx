import { useEffect, useRef, useState } from 'react';
import { openPdfDocument } from '../lib/pdfEngine';

export default function PdfViewer({ bytes, title = 'Orijinal PDF', allPages = false }) {
  const wrapRef = useRef(null);
  const hostRef = useRef(null);
  const pdfRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(bytes));
  const [pages, setPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let debounce;

    const yieldFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

    const paint = async () => {
      const pdf = pdfRef.current;
      const host = hostRef.current;
      const wrap = wrapRef.current;
      if (!pdf || !host || !wrap) return;
      const width = Math.max(240, wrap.clientWidth - 24);
      host.replaceChildren();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const maxPage = (!allPages && typeof window !== 'undefined' && window.innerWidth < 768)
        ? Math.min(pdf.numPages, 3)
        : pdf.numPages;
      for (let pageNum = 1; pageNum <= maxPage; pageNum += 1) {
        if (cancelled) return;
        const page = await pdf.getPage(pageNum);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: width / base.width });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.style.display = 'block';
        canvas.className = 'mb-3 rounded-md bg-white shadow-sm';
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
        await yieldFrame();
      }
    };

    const load = async () => {
      if (!bytes) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const pdf = await openPdfDocument(bytes);
        if (cancelled) return;
        pdfRef.current = pdf;
        setPages(pdf.numPages);
        await paint();
      } catch {
        if (!cancelled) setError('PDF açılmadı. Faylı yenidən seçin.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

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
  }, [bytes]);

  if (!bytes) return null;

  return (
    <div
      ref={wrapRef}
      className="flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 text-sm font-medium dark:border-slate-800">
        <span>{title}</span>
        {pages > 0 && <span className="text-xs font-normal text-gray-500">{pages} səhifə · AI səhv oxuyarsa buradan düzəldin</span>}
      </div>
      {loading && (
        <div className="flex h-40 items-center justify-center text-sm text-gray-500">PDF açılır...</div>
      )}
      {error && !loading && (
        <div className="px-4 py-8 text-center text-sm text-gray-500">
          PDF önizləmə bu brauzerdə açılmadı. Sağdakı kartlar imtahandır — onları yoxlayın.
        </div>
      )}
      <div
        ref={hostRef}
        className="w-full overflow-y-auto overflow-x-hidden bg-gray-200 p-2 sm:p-3 dark:bg-slate-950"
        style={{
          height: 'min(70dvh, 640px)',
          WebkitOverflowScrolling: 'touch',
        }}
      />
    </div>
  );
}
