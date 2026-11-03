import { renderLatexHtml } from '../lib/latexText';
import 'katex/dist/katex.min.css';

export default function LatexText({ text, className = '', as: Tag = 'span' }) {
  const html = renderLatexHtml(text);
  if (!html) return null;
  return (
    <Tag
      className={`ep-latex min-w-0 [&_.katex]:max-w-full [&_.katex]:overflow-x-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
