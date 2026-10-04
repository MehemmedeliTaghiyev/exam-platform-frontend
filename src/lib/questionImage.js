const IMG_PREFIX = '__IMG__';
const IMG_SUFFIX = '__';

export function parseQuestionImage(q) {
  const direct = q?.imageUrl || q?.ImageUrl || q?.image || q?.Image || q?.photo || q?.Photo || '';
  if (typeof direct === 'string' && (direct.startsWith('data:image') || /^https?:\/\//i.test(direct))) {
    return direct.trim();
  }
  const text = String(q?.text || q?.questionText || '');
  const start = text.indexOf(IMG_PREFIX);
  if (start !== 0) return '';
  const end = text.indexOf(IMG_SUFFIX, IMG_PREFIX.length);
  if (end < 0) return '';
  return text.slice(IMG_PREFIX.length, end).replace(/\s/g, '');
}

export function stripQuestionImage(text) {
  const raw = String(text || '');
  if (!raw.startsWith(IMG_PREFIX)) return raw.trim();
  const end = raw.indexOf(IMG_SUFFIX, IMG_PREFIX.length);
  if (end < 0) return raw.trim();
  return raw.slice(end + IMG_SUFFIX.length).replace(/^\n/, '').trim();
}

export function wrapQuestionImage(text, dataUrl) {
  const clean = stripQuestionImage(text);
  const src = String(dataUrl || '').trim();
  if (!src) return clean;
  return `${IMG_PREFIX}${src}${IMG_SUFFIX}\n${clean}`;
}

export function compressQuestionImage(file, maxEdge = 720, quality = 0.68) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Şəkil seçilmədi.'));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Şəkil oxunmadı.'));
    };
    img.src = url;
  });
}
