export function whatsappDigits(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 10) digits = `994${digits.slice(1)}`;
  else if (digits.length === 9) digits = `994${digits}`;
  if (digits.length < 11 || digits.length > 15) return '';
  return digits;
}

export function buildExamResultMessage() {
  return '';
}

export function openParentWhatsapp() {
  return false;
}
