const KEY = 'exampulse_exam_outcomes';

function rankingClock(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function openLeaderboardPdf({ title, rows = [], highlightId }) {
  const safeTitle = String(title || 'Tam siyahı').replace(/</g, '');
  const body = rows.map((row) => `
    <tr class="${String(row.studentId ?? row.userId) === String(highlightId) ? 'me' : ''}">
      <td>${row.rank ?? ''}</td>
      <td>${String(row.studentName || row.fullName || 'İştirakçı').replace(/</g, '')}</td>
      <td>${Math.round(Number(row.percent ?? row.score ?? 0))}%</td>
      <td>${row.correctAnswersCount ?? row.correct ?? '—'}/${row.totalQuestions ?? row.total ?? '—'}</td>
      <td>${rankingClock(row.durationSeconds)}</td>
    </tr>
  `).join('');
  const html = `<!DOCTYPE html>
<html lang="az"><head><meta charset="utf-8" /><title>${safeTitle}</title>
<style>
  body{font-family:Segoe UI,Arial,sans-serif;color:#122018;padding:32px}
  h1{font-size:22px;margin:0 0 8px}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #d7e0da;font-size:13px}
  tr.me td{background:#e7f6ec;font-weight:700}
</style></head>
<body>
  <h1>${safeTitle}</h1>
  <table>
    <thead><tr><th>#</th><th>Ad</th><th>Faiz</th><th>Düzgün</th><th>Vaxt</th></tr></thead>
    <tbody>${body || '<tr><td colspan="5">Siyahı boşdur.</td></tr>'}</tbody>
  </table>
</body></html>`;
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) return false;
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 250);
  return true;
}

function readMap() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function slot(userId, examId) {
  return `${userId}:${examId}`;
}

export function rememberExamOutcome(userId, examId, payload) {
  if (userId == null || examId == null) return null;
  const map = readMap();
  const next = {
    percent: payload.percent == null ? null : Number(payload.percent),
    rank: payload.rank == null ? null : Number(payload.rank),
    correct: payload.correct,
    total: payload.total,
    at: new Date().toISOString(),
  };
  map[slot(userId, examId)] = next;
  localStorage.setItem(KEY, JSON.stringify(map));
  return next;
}

export function readExamOutcome(userId, examId) {
  if (userId == null || examId == null) return null;
  return readMap()[slot(userId, examId)] || null;
}

export function leaderboardRowIsUser(row, user, extraIds = []) {
  if (!row || !user) return false;
  const mine = new Set(
    [user.id, user.studentId, user.StudentId, ...extraIds]
      .filter((value) => value != null && value !== '')
      .map(String),
  );
  const theirs = [row.studentId, row.StudentId, row.userId, row.UserId, row.id, row.studentExamId]
    .filter((value) => value != null && value !== '')
    .map(String);
  if (theirs.some((id) => mine.has(id))) return true;
  const name = String(row.studentName || row.fullName || '').trim().toLowerCase();
  const mineName = String(user.fullName || '').trim().toLowerCase();
  return Boolean(name && mineName && name === mineName);
}
