import { localDb } from './localDb';

export function claimDream(studentId, email) {
  const current = localDb.getDream(studentId);
  if (current?.university || current?.major || current?.image) return current;
  const pending = localDb.takeDreamPending(email);
  if (!pending) return current;
  return localDb.saveDream(studentId, pending);
}

export function saveDream(studentId, dream) {
  return localDb.saveDream(studentId, {
    university: String(dream.university || '').trim(),
    major: String(dream.major || '').trim(),
    image: dream.image || '',
  });
}

export function readDreamImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || '').startsWith('image/')) {
      reject(new Error('Şəkil faylı seçin.'));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 480;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Şəkil açılmadı.'));
    };
    img.src = url;
  });
}

export function crestHue(name) {
  const text = String(name || 'Dream');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 33 + text.charCodeAt(i)) % 360;
  return hash;
}

export function crestInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'DU';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}
