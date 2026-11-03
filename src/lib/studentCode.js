const PRACTICE = [
  { id: 'practice-student', fullName: 'Məşq şagirdi', code: 'EP-P0001' },
  { id: 'own-a', fullName: 'Aysel Məmmədova', code: 'EP-P0002' },
  { id: 'own-b', fullName: 'Elvin Quliyev', code: 'EP-P0003' },
  { id: 'pub-a', fullName: 'Nigar Həsənova', code: 'EP-P0004' },
  { id: 'pub-b', fullName: 'Rəşad Əliyev', code: 'EP-P0005' },
];

export function normalizeDuelCode(raw) {
  let value = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!value) return '';
  if (value.startsWith('EP-')) return value;
  if (value.startsWith('EP')) return `EP-${value.slice(2)}`;
  return `EP-${value}`;
}

export function studentDuelCode(user) {
  if (!user?.id && user?.id !== 0) return '';
  const practice = PRACTICE.find((row) => String(row.id) === String(user.id));
  if (practice) return practice.code;
  const id = Number(user.id);
  if (!Number.isFinite(id) || id <= 0 || !/^\d+$/.test(String(user.id))) return '';
  return `EP-${id.toString(36).toUpperCase().padStart(5, '0')}`;
}

export function applicantCode(user) {
  return studentDuelCode(user);
}

export function practiceStudentByCode(raw) {
  const code = normalizeDuelCode(raw);
  return PRACTICE.find((row) => row.code === code) || null;
}

export function userIdFromDuelCode(raw) {
  const code = normalizeDuelCode(raw);
  const body = code.replace(/^EP-/, '');
  if (!body || body.startsWith('P')) return null;
  const id = parseInt(body, 36);
  return Number.isFinite(id) && id > 0 ? id : null;
}
