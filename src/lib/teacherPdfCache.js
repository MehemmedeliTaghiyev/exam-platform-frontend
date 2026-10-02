const files = new Map();

export function stashTeacherPdf(examId, file) {
  if (!examId || !file) return;
  files.set(String(examId), file);
}

export function peekTeacherPdf(examId) {
  if (!examId) return null;
  return files.get(String(examId)) || null;
}

export function dropTeacherPdf(examId) {
  if (!examId) return;
  files.delete(String(examId));
}
