export function normalizeDifficulty(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (['asan', 'easy', '1'].includes(value)) return 'asan';
  if (['çətin', 'cetin', 'chetin', 'hard', '3'].includes(value)) return 'çətin';
  if (['orta', 'medium', '2'].includes(value)) return 'orta';
  return '';
}

export function pointsForDifficulty(raw) {
  const level = normalizeDifficulty(raw);
  if (level === 'asan') return 1;
  if (level === 'çətin') return 3;
  if (level === 'orta') return 2;
  return 1;
}

export function difficultyLabel(raw) {
  const level = normalizeDifficulty(raw);
  if (level === 'asan') return 'Asan';
  if (level === 'çətin') return 'Çətin';
  if (level === 'orta') return 'Orta';
  return '';
}

export function isAiExam(exam) {
  if (!exam) return false;
  if (exam.isAiGenerated === true || exam.IsAiGenerated === true) return true;
  const desc = String(exam.description || exam.Description || '');
  return /AI ilə|gpt-4o|AI studio/i.test(desc);
}
