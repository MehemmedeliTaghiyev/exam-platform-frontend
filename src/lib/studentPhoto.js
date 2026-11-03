export const STUDENT_PHOTO_EVENT = 'exampulse-student-photo';
const KEY = 'exampulse_student_photos';

function readMap() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function getStudentPhoto(userId) {
  if (userId == null || userId === '') return '';
  return String(readMap()[String(userId)] || '');
}

export function saveStudentPhoto(userId, dataUrl) {
  if (userId == null || userId === '') return '';
  const map = readMap();
  const value = String(dataUrl || '');
  if (value) map[String(userId)] = value;
  else delete map[String(userId)];
  localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(STUDENT_PHOTO_EVENT, { detail: { userId: String(userId), photo: value } }));
  return value;
}
