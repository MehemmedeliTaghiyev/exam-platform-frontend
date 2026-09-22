import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { fetchExamPdfBytes } from '../lib/examApi';

try {
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
} catch {
  /* worker optional */
}

export default function PdfViewer({ exam, title = 'İmtahan PDF' }) {
  const examId = exam?.id ?? exam?.Id;
  const wrapRef = useRef(null);
  const hostRef = useRef(null);
  const pdfRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let debounce;

    const paint = async () => {
      const pdf = pdfRef.current;
      const host = hostRef.current;
      const wrap = wrapRef.current;
      if (!pdf || !host || !wrap) return;
      const width = Math.max(240, wrap.clientWidth - 24);
      host.replaceChildren();
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        if (cancelled) return;
        const page = await pdf.getPage(pageNum);
        const base = page.getViewport({ scale: 1 });
        const scale = width / base.width;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.style.display = 'block';
        canvas.className = 'mb-3 rounded-md bg-white shadow-sm';
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) continue;
        const task = page.render({
          canvasContext: ctx,
          canvas,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        });
        await task.promise;
        host.appendChild(canvas);
      }
    };

    const load = async () => {
      if (!examId && !exam?.pdfFilePath && !exam?.pdfFileUrl) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const bytes = await fetchExamPdfBytes(exam);
        if (cancelled) return;
        const data = new Uint8Array(bytes.slice ? bytes.slice(0) : bytes);
        const pdf = await getDocument({ data, disableWorker: true }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setPages(pdf.numPages);
        await paint();
      } catch (err) {
        if (!cancelled) {
          const status = err?.response?.status;
          setError(
            status === 404
              ? 'PDF tapılmadı. Müəllim imtahanın PDF-ini yenidən yükləməlidir.'
              : 'PDF açılmadı. Səhifəni yeniləyin və ya PDF-i yenidən yükləyin.',
          );
        }
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
  }, [examId, exam?.pdfFilePath, exam?.pdfFileUrl]);

  if (!examId && !exam?.pdfFilePath && !exam?.pdfFileUrl) {
    return null;
  }

  return (
    <div
      ref={wrapRef}
      className="flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 text-sm font-medium dark:border-slate-800">
        <span>{title}</span>
        {pages > 0 && <span className="text-xs font-normal text-gray-500">{pages} səhifə · aşağı sürüşdürün</span>}
      </div>
      {loading && (
        <div className="flex h-40 items-center justify-center text-sm text-gray-500">PDF yüklənir...</div>
      )}
      {error && !loading && <div className="px-4 py-8 text-center text-sm text-red-600">{error}</div>}
      <div
        ref={hostRef}
        className="w-full overflow-y-auto overflow-x-hidden bg-gray-200 p-2 sm:p-3 dark:bg-slate-950"
        style={{
          height: 'min(75dvh, 880px)',
          WebkitOverflowScrolling: 'touch',
        }}
      />
    </div>
  );
}
