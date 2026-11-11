import { FIGURE_QNUMS } from './figureFiles';

const IMG_PREFIX = '__IMG__';
const IMG_SUFFIX = '__';
const FIGURE_ORIGIN = 'https://raw.githubusercontent.com/MehemmedeliTaghiyev/exam-platform-frontend/figures-cdn';

function publicFigureOrigin() {
  return FIGURE_ORIGIN;
}

function isImageSrc(value) {
  const src = String(value || '').trim().replace(/\\/g, '/');
  if (!src) return '';
  if (src.startsWith('data:image')) return src;
  if (/^https?:\/\//i.test(src)) return src;
  const relative = src.replace(/^\.\//, '');
  if (/^figures\/[^/?#]+\.(png|jpe?g|gif|webp|svg)$/i.test(relative)) {
    return `${publicFigureOrigin()}/${relative}`;
  }
  if (src.startsWith('/') && /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(src)) {
    if (src.startsWith('/figures/')) return `${publicFigureOrigin()}${src}`;
    return src;
  }
  return '';
}

function figureUrlForQnum(q) {
  const qnum = String(q?.sourceQnum || q?.SourceQnum || q?.qnum || q?.Qnum || '')
    .trim()
    .toUpperCase();
  if (!FIGURE_QNUMS.has(qnum)) return '';
  return `${FIGURE_ORIGIN}/figures/${qnum}.png`;
}

export function parseQuestionImage(q) {
  const fromQnum = figureUrlForQnum(q);
  if (fromQnum) return fromQnum;
  const direct = [
    q?.imageUrl,
    q?.ImageUrl,
    q?.figureUrl,
    q?.FigureUrl,
    q?.figure_path,
    q?.figure,
    q?.figure_data_url,
    q?.image,
    q?.Image,
    q?.photo,
    q?.Photo,
  ].map(isImageSrc).find(Boolean);
  if (direct) return direct;
  const text = String(q?.text || q?.questionText || '');
  const html = text.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (html) {
    const fromHtml = isImageSrc(html[1]);
    if (fromHtml) return fromHtml;
  }
  const start = text.indexOf(IMG_PREFIX);
  if (start !== 0) return '';
  const end = text.indexOf(IMG_SUFFIX, IMG_PREFIX.length);
  if (end < 0) return '';
  return text.slice(IMG_PREFIX.length, end).replace(/\s/g, '');
}

/**
 * True only when the payload itself embeds a figure.
 * Do NOT use FIGURE_QNUMS CDN guess here — that strips almost every bank item from PDF.
 */
export function questionHasEmbeddedFigure(q) {
  if (!q) return false;
  const direct = q?.figureUrl || q?.FigureUrl || q?.imageUrl || q?.ImageUrl || q?.figure || q?.figure_path;
  if (direct && String(direct).trim()) return true;
  const text = String(q?.text || q?.Text || q?.questionText || '');
  if (/\[şəkil\]|\[sekil\]|\[şekil\]|\[figure\]/i.test(text)) return true;
  if (/<img\b/i.test(text)) return true;
  if (/!\[[^\]]*\]\([^)]+\)/.test(text)) return true;
  if (text.startsWith('__IMG__')) return true;
  return false;
}

/** @deprecated use questionHasEmbeddedFigure for paper filtering */
export function questionHasFigure(q) {
  return questionHasEmbeddedFigure(q);
}

export function stripQuestionImage(text) {
  let raw = String(text || '');
  if (raw.startsWith(IMG_PREFIX)) {
    const end = raw.indexOf(IMG_SUFFIX, IMG_PREFIX.length);
    if (end >= 0) raw = raw.slice(end + IMG_SUFFIX.length).replace(/^\n/, '');
  }
  return raw.replace(/<img[^>]*>/gi, '').trim();
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
