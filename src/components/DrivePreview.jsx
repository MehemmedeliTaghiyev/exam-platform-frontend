import { examDrivePreviewUrl } from '../lib/driveLinks';

export default function DrivePreview({ exam, title = 'İmtahan PDF' }) {
  const src = examDrivePreviewUrl(exam);
  if (!src) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <p className="border-b border-gray-100 px-4 py-2 text-sm font-medium text-gray-600 dark:border-slate-800 dark:text-gray-300">
        {title}
      </p>
      <iframe
        title={title}
        src={src}
        className="h-[75vh] w-full min-h-[480px] bg-gray-50"
        allow="autoplay"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
