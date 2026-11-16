import { examDriveFileId, driveFileViewUrl } from '../lib/driveLinks';
import { isIosDevice } from '../lib/device';
import { drivePdfSrc } from '../lib/runtime';
import NativePdfFrame from './NativePdfFrame';
import PdfViewer from './PdfViewer';

export default function DrivePreview({ exam, title = 'İmtahan PDF', mode = 'pdf' }) {
  const fileId = examDriveFileId(exam);
  if (!fileId) return null;
  const proxySrc = drivePdfSrc(fileId);
  const extraHref = driveFileViewUrl(fileId);
  if (isIosDevice() || mode === 'iframe') {
    return (
      <NativePdfFrame
        src={proxySrc}
        title={title}
        extraHref={extraHref}
        extraLabel="Drive-da aç"
      />
    );
  }
  return (
    <PdfViewer
      src={proxySrc}
      title={title}
      extraHref={extraHref}
      extraLabel="Drive-da aç"
    />
  );
}
