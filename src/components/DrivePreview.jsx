import { driveFileViewUrl, examDriveFileId, examDrivePreviewUrl } from '../lib/driveLinks';

export default function DrivePreview({ exam, title = 'İmtahan PDF' }) {
  const src = examDrivePreviewUrl(exam);
  const openUrl = driveFileViewUrl(examDriveFileId(exam));
  if (!src && !openUrl) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="hidden items-center justify-between gap-2 border-b border-gray-100 px-4 py-2 lg:flex dark:border-slate-800">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
        <a className="text-sm font-semibold text-brand-600 underline" href={openUrl} target="_blank" rel="noopener">
          PDF-i böyük pəncərədə aç
        </a>
      </div>

      <div className="space-y-3 p-4 lg:hidden">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{title}</p>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener"
          className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-center text-base font-bold text-white"
        >
          PDF-i aç
        </a>
        <p className="text-xs leading-5 text-gray-500">
          Telefonda PDF brauzerin öz səhifəsində açılır. Açın, oxuyun, geriyə qayıdıb aşağıda cavab yazın.
        </p>
      </div>

      {src ? (
        <iframe
          title={title}
          src={src}
          className="hidden h-[48vh] w-full min-h-[320px] bg-gray-50 lg:block"
          allow="autoplay; fullscreen"
        />
      ) : null}
    </div>
  );
}
