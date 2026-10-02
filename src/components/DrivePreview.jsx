import { useMemo } from 'react';
import { driveFileViewUrl, examDriveFileId } from '../lib/driveLinks';

export default function DrivePreview({ exam, title = 'İmtahan PDF' }) {
  const fileId = examDriveFileId(exam);
  const openUrl = driveFileViewUrl(fileId);
  const embedSrc = useMemo(
    () => (fileId ? `/drive-pdf?id=${encodeURIComponent(fileId)}#view=FitH` : ''),
    [fileId],
  );
  if (!fileId) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2 dark:border-slate-800">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
        <a className="text-sm font-semibold text-brand-600 underline" href={openUrl} target="_blank" rel="noopener">
          Drive-da aç
        </a>
      </div>
      <iframe
        title={title}
        src={embedSrc}
        className="h-[42vh] w-full min-h-[280px] bg-gray-100 sm:h-[48vh]"
      />
      <p className="px-4 py-2 text-xs text-gray-500">
        PDF bu səhifədə, cavab vərəqinin üstündədir. Görünməsə Drive-da açın — fayl “linki olanlar baxa bilər” olmalıdır.
      </p>
    </div>
  );
}
