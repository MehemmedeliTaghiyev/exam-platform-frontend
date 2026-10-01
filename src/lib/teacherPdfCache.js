const files = new Map();

export function stashTeacherPdf(examId, payload) {
  if (!examId || !payload?.bytes) return;
  files.set(String(examId), payload);
}

export function peekTeacherPdf(examId) {
  if (!examId) return null;
  return files.get(String(examId)) || null;
}

export function dropTeacherPdf(examId) {
  if (!examId) return;
  files.delete(String(examId));
}
