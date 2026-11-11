/** Strip embedded image marker / HTML img for plain PDF text. */
export function stripStemImage(text) {
  let raw = String(text || '');
  if (raw.startsWith('__IMG__')) {
    const end = raw.indexOf('__', 7);
    if (end >= 0) raw = raw.slice(end + 2).replace(/^\n/, '');
  }
  return raw.replace(/<img[^>]*>/gi, '').trim();
}

/** Common LaTeX / placeholders → readable plain text for Helvetica PDF. */
export function latexToPlain(raw) {
  let text = stripStemImage(raw);
  text = text
    .replace(/\[şəkil\]|\[sekil\]|\[şekil\]|\[figure\]/gi, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\angle\s*/g, 'aci ')
    .replace(/\bangle\s+/gi, 'aci ')
    .replace(/\\circ\b/g, ' deg')
    .replace(/\^\{\\circ\}/g, ' deg')
    .replace(/\^\{\s*circ\s*\}/g, ' deg')
    .replace(/\^\\circ/g, ' deg')
    .replace(/\\sqrt\{([^{}]+)\}/g, 'kok($1)')
    .replace(/\\sqrt\s*([A-Za-z0-9]+)/g, 'kok($1)')
    .replace(/\bsqrt\{([^{}]+)\}/g, 'kok($1)')
    .replace(/\bsqrt\s*([A-Za-z0-9]+)/g, 'kok($1)')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, 'x')
    .replace(/\\leq/g, '<=')
    .replace(/\\geq/g, '>=')
    .replace(/\\neq/g, '!=')
    .replace(/\\pi\b/g, 'pi')
    .replace(/\\cup/g, 'U')
    .replace(/\\cap/g, 'n')
    .replace(/\\triangle/g, 'ucbucaq')
    .replace(/\\overline\{([^{}]+)\}/g, '$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\\,/g, ' ')
    .replace(/\\;/g, ' ')
    .replace(/\\!/g, '')
    .replace(/\\ /g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\\\\/g, ' ')
    .replace(/\\([A-Za-z]+)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}
