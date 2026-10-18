function clip(text, max = 90) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export function whatsappDigits(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 10) digits = `994${digits.slice(1)}`;
  else if (digits.length === 9) digits = `994${digits}`;
  if (digits.length < 11 || digits.length > 15) return '';
  return digits;
}

export function buildExamResultMessage({
  studentName,
  examTitle,
  subjectName,
  submittedAt,
  percent,
  correct,
  wrong,
  blank,
  total,
  rank,
  passed,
  questions = [],
}) {
  const lines = [
    'ExamPulse — imtahan nəticəsi',
    `Şagird: ${studentName || '—'}`,
    `İmtahan: ${examTitle || '—'}`,
  ];
  if (subjectName) lines.push(`Fənn: ${subjectName}`);
  if (submittedAt) lines.push(`Tarix: ${submittedAt}`);
  lines.push(`Düzgün: ${correct} / ${total}`);
  lines.push(`Səhv: ${wrong}`);
  lines.push(`Boş: ${blank}`);
  lines.push(`Faiz: ${percent}%`);
  lines.push(`Nəticə: ${passed ? 'Keçdi' : 'Kəsildi'}`);
  if (rank) lines.push(`Ümumi sıra: #${rank}`);
  lines.push('');
  lines.push('Suallar:');
  questions.forEach((question, index) => {
    const status = question.unanswered ? 'boş' : question.isCorrect ? 'düzgün' : 'səhv';
    const selected = question.selectedText ? ` Seçilən: ${clip(question.selectedText, 40)}.` : '';
    const answer = !question.isCorrect && question.correctText
      ? ` Düzgün cavab: ${clip(question.correctText, 40)}.`
      : '';
    lines.push(`${question.index || index + 1}. ${clip(question.text, 80) || 'Sual'} — ${status}.${selected}${answer}`);
  });
  let text = lines.join('\n');
  if (text.length > 3500) text = `${text.slice(0, 3400)}\n… Qalan suallar ExamPulse-da.`;
  return text;
}

export function openParentWhatsapp(phone, text) {
  const digits = whatsappDigits(phone);
  if (!digits || !text) return false;
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.href = url;
  return true;
}
