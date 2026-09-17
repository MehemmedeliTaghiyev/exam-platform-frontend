import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { fetchExamPdfBytes } from '../lib/examApi';

GlobalWorkerOptions.workerSrc = pdfWorker;

export default function PdfViewer({ exam, title = 'İmtahan PDF' }) {
  const examId = exam?.id ?? exam?.Id;
  const hostRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const draw = async () => {
      if (!examId && !exam?.pdfFilePath && !exam?.pdfFileUrl) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const bytes = await fetchExamPdfBytes(exam);
        if (cancelled) return;
        const pdf = await getDocument({ data: new Uint8Array(bytes) }).promise;
        if (cancelled) return;
        const host = hostRef.current;
        if (!host) return;
        host.innerHTML = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.25 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = 'mb-3 w-full rounded-lg bg-white shadow-sm';
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          host.appendChild(canvas);
        }
      } catch {
        if (!cancelled) {
          setError('PDF açılmadı. Visual Studio-da API-ni F5 ilə işə salın və səhifəni yeniləyin.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    draw();
    return () => {
      cancelled = true;
      if (hostRef.current) hostRef.current.innerHTML = '';
    };
  }, [examId, exam?.pdfFilePath, exam?.pdfFileUrl]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800">
      <div className="border-b border-gray-200 px-4 py-2 text-sm font-medium text-ink dark:border-slate-800">
        {title}
      </div>
      {loading && <div className="flex h-40 items-center justify-center text-sm text-gray-500">PDF yüklənir...</div>}
      {error && !loading && <div className="px-4 py-8 text-center text-sm text-red-600">{error}</div>}
      <div ref={hostRef} className="max-h-[75vh] overflow-auto bg-gray-100 p-3 dark:bg-slate-950" />
    </div>
  );
}
