import { examDriveFileId, driveFileViewUrl } from '../lib/driveLinks';
import PdfViewer from './PdfViewer';

export default function DrivePreview({ exam, title = 'İmtahan PDF' }) {
  const fileId = examDriveFileId(exam);
  if (!fileId) return null;
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
