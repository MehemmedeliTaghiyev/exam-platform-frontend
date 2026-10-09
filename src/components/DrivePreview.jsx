import { examDriveFileId, driveFileViewUrl, driveFilePreviewUrl } from '../lib/driveLinks';
import PdfViewer from './PdfViewer';

export default function DrivePreview({ exam, title = 'İmtahan PDF', mode = 'pdf' }) {
  const fileId = examDriveFileId(exam);
  if (!fileId) return null;
  if (mode === 'iframe') {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-slate-800">
          <p className="text-sm font-semibold">{title}</p>
          <a
            className="text-sm font-medium text-brand-600"
            href={driveFileViewUrl(fileId)}
            target="_blank"
            rel="noreferrer"
          >
            Drive-da aç
          </a>
        </div>
        <iframe
          title={title}
          src={driveFilePreviewUrl(fileId)}
          className="h-[70vh] w-full bg-gray-50"
          allow="autoplay"
        />
      </div>
    );
  }
  const src = `/drive-pdf?id=${encodeURIComponent(fileId)}`;
  return (
    <PdfViewer
      src={src}
      title={title}
      extraHref={driveFileViewUrl(fileId)}
      extraLabel="Drive-da aç"
    />
  );
}
