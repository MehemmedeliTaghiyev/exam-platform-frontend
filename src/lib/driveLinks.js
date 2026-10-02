export const AI_FEATURE_OPEN = false;

export function parseDriveFileId(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  const file = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (file) return file[1];
  const open = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (open && !/\/folders\//i.test(s)) return open[1];
  if (/^[a-zA-Z0-9_-]{25,}$/.test(s) && !/folders/i.test(s)) return s;
  return '';
}

export function parseDriveFolderId(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  const folder = s.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folder) return folder[1];
  if (/drive\.google\.com/i.test(s)) return '';
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  return '';
}

export function driveFilePreviewUrl(idOrUrl) {
  const id = parseDriveFileId(idOrUrl);
  return id ? `https://drive.google.com/file/d/${id}/preview` : '';
}

export function driveFileViewUrl(idOrUrl) {
  const id = parseDriveFileId(idOrUrl);
  return id ? `https://drive.google.com/file/d/${id}/view` : '';
}

export function driveFolderOpenUrl(idOrUrl) {
  const id = parseDriveFolderId(idOrUrl);
  if (id) return `https://drive.google.com/drive/folders/${id}`;
  const s = String(idOrUrl || '').trim();
  return /drive\.google\.com/i.test(s) ? s : '';
}

export function displayTrialMessage(raw) {
  return String(raw || '').replace(/^DRVFLD:.*\n?/i, '').trim();
}

export function wrapTrialMessage(message, folderUrl) {
  const existing = teacherDriveFolderUrl({ trialMessage: message });
  const folder = folderUrl === undefined ? existing : driveFolderOpenUrl(folderUrl);
  const clean = displayTrialMessage(message);
  if (!folder) return clean;
  return `DRVFLD:${folder}\n${clean}`;
}

export function teacherDriveFolderUrl(teacher) {
  if (!teacher) return '';
  const direct = driveFolderOpenUrl(
    teacher.driveFolderUrl || teacher.DriveFolderUrl || '',
  );
  if (direct) return direct;
  const msg = String(teacher.trialMessage || teacher.TrialMessage || '');
  const line = msg.split(/\r?\n/)[0] || '';
  const m = line.match(/^DRVFLD:(.+)$/i);
  return m ? driveFolderOpenUrl(m[1].trim()) : '';
}

export function wrapExamDescription(description, fileUrlOrId) {
  const existing = String(description || '').match(/^DRVFILE:([a-zA-Z0-9_-]+)/i)?.[1] || '';
  const id = parseDriveFileId(fileUrlOrId) || existing;
  const clean = String(description || '').replace(/^DRVFILE:\S+\s*/i, '').trim();
  if (!id) return clean;
  return `DRVFILE:${id}\n${clean}`;
}

export function examDriveFileId(exam) {
  if (!exam) return '';
  const fromPdf = parseDriveFileId(
    exam.pdfFileUrl || exam.PdfFileUrl || exam.pdfFilePath || exam.PdfFilePath || '',
  );
  if (fromPdf) return fromPdf;
  const desc = String(exam.description || exam.Description || '');
  const m = desc.match(/^DRVFILE:([a-zA-Z0-9_-]+)/i);
  if (m) return m[1];
  return parseDriveFileId(desc);
}

export function examDrivePreviewUrl(exam) {
  return driveFilePreviewUrl(examDriveFileId(exam));
}

export function displayExamDescription(exam) {
  return String(exam?.description || exam?.Description || '')
    .replace(/^DRVFILE:\S+\s*/i, '')
    .trim();
}
