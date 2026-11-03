import katex from 'katex';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function unwrapDocument(source) {
  return String(source || '')
    .replace(/\\documentclass[\s\S]*?\\begin\{document\}/i, '')
    .replace(/\\end\{document\}[\s\S]*$/i, '')
    .replace(/\\usepackage(?:\[[^\]]*\])?\{[^}]+\}/g, '')
    .replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi, ' [sxem] ')
    .trim();
}

export function looksLikeLatex(value) {
  const text = String(value || '');
  if (!text) return false;
  return /\$|\\\[|\\\(|\\begin\{|\\frac|\\sqrt|\\sum|\\int|\\cdot|\\times|\\le|\\ge|\\neq|\\pi|\\alpha|\\beta|\\gamma|\\theta|\\lambda|\\overline|\\mathrm|\\text\{|\\left|\\right|\\dfrac|\\tfrac|\\vec|\\hat|\\overline/.test(text);
}

function renderMath(math, display) {
  try {
    return katex.renderToString(math, {
      throwOnError: false,
      displayMode: display,
      strict: 'ignore',
      trust: false,
      output: 'html',
    });
  } catch {
    return `<span>${escapeHtml(math)}</span>`;
  }
}

function nextDelim(text, from) {
  const candidates = [
    { open: '$$', close: '$$', display: true },
    { open: '\\[', close: '\\]', display: true },
    { open: '\\(', close: '\\)', display: false },
    { open: '$', close: '$', display: false },
  ];
  let best = null;
  for (const item of candidates) {
    const at = text.indexOf(item.open, from);
    if (at < 0) continue;
    if (item.open === '$' && text[at + 1] === '$') continue;
    if (!best || at < best.at) best = { ...item, at };
  }
  return best;
}

function splitAndRender(source) {
  const text = unwrapDocument(source);
  if (!text) return '';
  let html = '';
  let i = 0;
  while (i < text.length) {
    const delim = nextDelim(text, i);
    if (!delim) {
      html += restAsHtml(text.slice(i));
      break;
    }
    if (delim.at > i) html += restAsHtml(text.slice(i, delim.at));
    const closeAt = text.indexOf(delim.close, delim.at + delim.open.length);
    if (closeAt < 0) {
      html += restAsHtml(text.slice(delim.at));
      break;
    }
    const math = text.slice(delim.at + delim.open.length, closeAt);
    html += renderMath(math, delim.display);
    i = closeAt + delim.close.length;
  }
  return html;
}

function restAsHtml(chunk) {
  const piece = String(chunk || '');
  if (!piece) return '';
  if (looksLikeLatex(piece) && /\\[a-zA-Z]/.test(piece) && !piece.includes('$')) {
    return renderMath(piece.replace(/\n+/g, ' '), /\\begin\{|\\\\/.test(piece));
  }
  return escapeHtml(piece).replace(/\n/g, '<br />');
}

export function renderLatexHtml(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (!looksLikeLatex(text)) return escapeHtml(text).replace(/\n/g, '<br />');
  return splitAndRender(text);
}
