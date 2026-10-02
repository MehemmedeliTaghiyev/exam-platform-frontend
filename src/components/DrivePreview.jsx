import { driveFileViewUrl, examDriveFileId, examDrivePreviewUrl } from '../lib/driveLinks';

export default function DrivePreview({ exam, title = 'İmtahan PDF' }) {
  const src = examDrivePreviewUrl(exam);
  const openUrl = driveFileViewUrl(examDriveFileId(exam));
  if (!src) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2 dark:border-slate-800">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
        <a
          className="text-sm font-semibold text-brand-600 underline"
          href={openUrl}
          target="_blank"
          rel="noreferrer"
        >
          PDF-i böyük pəncərədə aç
        </a>
      </div>
      <iframe
        title={title}
        src={src}
        className="h-[48vh] w-full min-h-[320px] bg-gray-50"
        allow="autoplay; fullscreen"
      />
      <p className="px-4 py-2 text-xs text-gray-500">
        PDF görünmürsə, yuxarıdakı linki basın. Fayl Drive-da “linki olanlar baxa bilər” olmalıdır.
      </p>
    </div>
  );
}
