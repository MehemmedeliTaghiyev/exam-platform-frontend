import katex from 'katex';
import { needsMathRender, universalMathParser, wrapMathExpressions } from './universalMath.js';

const KATEX_ENV = /^(equation|align|gather|multline|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|aligned|array|split)\*?$/i;
const LAYOUT_ENV = /^(center|flushleft|flushright|minipage|quote|verbatim|enumerate|itemize|document|figure|table)$/i;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeTransport(source) {
  let text = String(source || '');
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  text = text.replace(/\\{2,}(?=[A-Za-z])/g, '\\');
  return text;
}

function unwrapDocument(source) {
  return String(source || '')
    .replace(/\\documentclass[\s\S]*?\\begin\{document\}/i, '')
    .replace(/\\end\{document\}[\s\S]*$/i, '')
    .replace(/\\usepackage(?:\[[^\]]*\])?\{[^}]+\}/g, '')
    .replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi, ' [sxem] ')
    .replace(/\\begin\{(center|flushleft|flushright|minipage|quote|verbatim|enumerate|itemize)\}/gi, '')
    .replace(/\\end\{(center|flushleft|flushright|minipage|quote|verbatim|enumerate|itemize)\}/gi, '')
    .replace(/\\(vspace|hspace|noindent|newline|newpage|clearpage)(?:\[[^\]]*\])?(?:\{[^}]*\})?/gi, ' ')
    .replace(/\\item\b/gi, ' ')
    .replace(/\\(LARGE|Large|large|normalsize|bfseries|textit)\b/g, ' ')
    .trim();
}

export function looksLikeLatex(value) {
  return needsMathRender(value) || /\\[a-zA-Z]{2,}/.test(String(value || ''));
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
    if (!best || at < best.at) best = { ...item, at, includeDelims: false };
  }

  const beginRe = /\\begin\{([A-Za-z*]+)\}/g;
  beginRe.lastIndex = from;
  const found = beginRe.exec(text);
  if (found && KATEX_ENV.test(found[1]) && (!best || found.index < best.at)) {
    best = {
      open: found[0],
      close: `\\end{${found[1]}}`,
      display: true,
      at: found.index,
      includeDelims: true,
    };
  } else if (found && LAYOUT_ENV.test(found[1]) && (!best || found.index < best.at)) {
    best = {
      open: found[0],
      close: `\\end{${found[1]}}`,
      display: false,
      at: found.index,
      includeDelims: false,
      strip: true,
    };
  }
  return best;
}

function looksLikePureMath(piece) {
  const t = String(piece || '').trim();
  if (!t) return false;
  if (/[əöüğışçƏÖÜĞİŞÇıİ]/.test(t)) return false;
  if (/(^|\s)[a-zəöüğışç]{4,}(\s|$)/i.test(t) && /\\[A-Za-z]{2,}/.test(t) === false) return false;
  return /\\[A-Za-z]{2,}|\\begin\{/.test(t);
}

function wrapBareCommands(text) {
  const parts = String(text || '').split(/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$]+\$)/);
  return parts.map((part) => {
    if (!part) return '';
    if (part.startsWith('$$') || part.startsWith('$') || part.startsWith('\\[') || part.startsWith('\\(')) {
      return part;
    }
    if (!/\\[A-Za-z]/.test(part)) return part;
    if (/\\begin\{/.test(part)) return part;
    return wrapMathExpressions(part);
  }).join('');
}

function restAsHtml(chunk) {
  const piece = String(chunk || '');
  if (!piece) return '';
  if (/\\[A-Za-z]{2,}|\\begin\{/.test(piece) && !piece.includes('$')) {
    const wrapped = wrapMathExpressions(piece);
    if (wrapped !== piece && /\$|\\\(|\\\[/.test(wrapped)) {
      return splitAndRender(wrapped);
    }
    if (looksLikePureMath(piece)) {
      return renderMath(piece.replace(/\n+/g, ' '), /\\begin\{|\\\\/.test(piece));
    }
  }
  return escapeHtml(piece).replace(/\n/g, '<br />');
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
      const rest = text.slice(delim.at);
      html += delim.strip ? restAsHtml(rest.replace(delim.open, '')) : restAsHtml(rest);
      break;
    }
    const inner = text.slice(delim.at + delim.open.length, closeAt);
    if (delim.strip) {
      html += restAsHtml(inner);
    } else {
      const math = delim.includeDelims
        ? text.slice(delim.at, closeAt + delim.close.length)
        : inner;
      html += renderMath(math, delim.display);
    }
    i = closeAt + delim.close.length;
  }
  return html;
}

/**
 * Sual/option mətnini ekranda KaTeX ilə göstər.
 * Bank LaTeX qalır; Unicode plain (∠ √ x²) istifadə olunmur.
 */
export function renderLatexHtml(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (!needsMathRender(raw) && !/\\[a-zA-Z]{2,}/.test(raw)) {
    return escapeHtml(raw).replace(/\n/g, '<br />');
  }

  try {
    const prepared = wrapBareCommands(
      universalMathParser(unwrapDocument(decodeTransport(raw))),
    );
    const html = splitAndRender(prepared);
    return html || escapeHtml(raw).replace(/\n/g, '<br />');
  } catch {
    return escapeHtml(raw).replace(/\n/g, '<br />');
  }
}

export {
  fixCorruptedEncoding,
  universalMathParser,
  wrapMathExpressions,
  needsMathRender,
} from './universalMath.js';
