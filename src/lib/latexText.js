import katex from 'katex';
import { latexToPlain } from './examPaperText.js';
import { needsMathRender, universalMathParser } from './universalMath.js';

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
    if (!best || at < best.at) best = { ...item, at };
  }
  return best;
}

function restAsHtml(chunk) {
  const piece = String(chunk || '');
  if (!piece) return '';
  // Qalıq LaTeX əmri (delimiter olmadan)
  if (/\\[A-Za-z]{2,}/.test(piece) && !piece.includes('$')) {
    return renderMath(piece.replace(/\n+/g, ' '), /\\begin\{|\\\\/.test(piece));
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
      html += restAsHtml(text.slice(delim.at));
      break;
    }
    const math = text.slice(delim.at + delim.open.length, closeAt);
    html += renderMath(math, delim.display);
    i = closeAt + delim.close.length;
  }
  return html;
}

/**
 * Sual/option mətnini ekranda KaTeX ilə göstər.
 * Plain (∠, √, π), şablon (kok, aci) və klassik LaTeX dəstəklənir.
 */
export function renderLatexHtml(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (!needsMathRender(raw) && !/\\[a-zA-Z]{2,}/.test(raw)) {
    return escapeHtml(raw).replace(/\n/g, '<br />');
  }

  try {
    const prepared = universalMathParser(raw);
    const html = splitAndRender(prepared);
    if (!html) return escapeHtml(raw).replace(/\n/g, '<br />');
    // KaTeX uğursuz qalıq əmr buraxıbsa — oxunaqlı plain
    if (/\\[A-Za-z]{2,}/.test(html.replace(/<[^>]+>/g, ''))) {
      return escapeHtml(latexToPlain(raw)).replace(/\n/g, '<br />');
    }
    return html;
  } catch {
    return escapeHtml(latexToPlain(raw)).replace(/\n/g, '<br />');
  }
}

export {
  fixCorruptedEncoding,
  universalMathParser,
  wrapMathExpressions,
  needsMathRender,
} from './universalMath.js';
