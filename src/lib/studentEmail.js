const PART_RE = /[^a-z0-9əöüğçşı]/gi;

export const STUDENT_EMAIL_HINT = 'ad.soyad_ataadi@gmail.com';
export const STUDENT_EMAIL_RE = /^[a-z0-9əöüğçşı]+\.[a-z0-9əöüğçşı]+_[a-z0-9əöüğçşı]+@gmail\.com$/i;

export function studentEmailPart(value) {
  return String(value || '').trim().toLowerCase().replace(PART_RE, '');
}

export const TEACHER_EMAIL_HINT = 'ad_soyad@gmail.com';
export const TEACHER_EMAIL_RE = /^[a-z0-9əöüğçşı]+_[a-z0-9əöüğçşı]+@gmail\.com$/i;

export function buildTeacherEmail(firstName, lastName) {
  const first = studentEmailPart(firstName);
  const last = studentEmailPart(lastName);
  if (!first || !last) return '';
  return `${first}_${last}@gmail.com`;
}

export function buildStudentEmail(firstName, lastName, fatherName) {
  const first = studentEmailPart(firstName);
  const last = studentEmailPart(lastName);
  const father = studentEmailPart(fatherName);
  if (!first || !last || !father) return '';
  return `${first}.${last}_${father}@gmail.com`;
}
