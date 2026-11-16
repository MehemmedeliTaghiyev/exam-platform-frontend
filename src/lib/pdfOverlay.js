const OVERLAY_ID = 'ep-pdf-overlay';

function removeOverlay() {
  const el = document.getElementById(OVERLAY_ID);
  if (!el) return;
  const url = el.getAttribute('data-blob-url');
  el.remove();
  if (url) {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  }
}

function toolbar(title) {
  const bar = document.createElement('div');
  bar.setAttribute('style', [
    'flex:0 0 auto',
    'display:flex',
    'flex-wrap:wrap',
    'align-items:center',
    'gap:8px',
    'padding:10px 12px',
    'background:#12141a',
    'color:#fff',
    'font:700 14px/1.2 system-ui,sans-serif',
  ].join(';'));
  const label = document.createElement('span');
  label.textContent = title || 'ExamPulse PDF';
  label.style.marginRight = 'auto';
  bar.appendChild(label);
  return bar;
}

function addBtn(bar, label, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  btn.setAttribute('style', [
    'min-height:40px',
    'padding:0 14px',
    'border:0',
    'border-radius:999px',
    'background:#7c6aff',
    'color:#fff',
    'font:700 13px/1 system-ui,sans-serif',
    'cursor:pointer',
  ].join(';'));
  btn.addEventListener('click', onClick);
  bar.appendChild(btn);
  return btn;
}

function mountOverlay() {
  if (typeof document === 'undefined') return null;
  removeOverlay();
  const wrap = document.createElement('div');
  wrap.id = OVERLAY_ID;
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('style', [
    'position:fixed',
    'inset:0',
    'z-index:2147483000',
    'display:flex',
    'flex-direction:column',
    'background:#0b0d12',
  ].join(';'));
  document.body.appendChild(wrap);
  return wrap;
}

/** Same-window HTML paper (no blob tab, no auto-print, no popup). */
export function showHtmlPaperOverlay(html, { title = 'ExamPulse PDF' } = {}) {
  if (typeof document === 'undefined') return false;
  const wrap = mountOverlay();
  if (!wrap) return false;
  const bar = toolbar(title);
  const iframe = document.createElement('iframe');
  iframe.title = title;
  iframe.setAttribute('style', 'flex:1 1 auto;width:100%;border:0;background:#fff;');
  addBtn(bar, 'Çap et / PDF saxla', () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch { /* print may be blocked */ }
  });
  addBtn(bar, 'Bağla', removeOverlay);
  wrap.appendChild(bar);
  wrap.appendChild(iframe);
  iframe.srcdoc = String(html || '');
  return true;
}

/** Same-window PDF blob viewer + a second-click download (survives lost user-gesture). */
export function showPdfBlobOverlay(blob, filename = 'material.pdf', { title = 'ExamPulse PDF' } = {}) {
  if (typeof document === 'undefined' || !(blob instanceof Blob)) return false;
  const wrap = mountOverlay();
  if (!wrap) return false;
  const url = URL.createObjectURL(blob);
  wrap.setAttribute('data-blob-url', url);
  const bar = toolbar(title);
  addBtn(bar, 'Yüklə', () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  addBtn(bar, 'Bağla', removeOverlay);
  const iframe = document.createElement('iframe');
  iframe.title = title;
  iframe.src = url;
  iframe.setAttribute('style', 'flex:1 1 auto;width:100%;border:0;background:#fff;');
  wrap.appendChild(bar);
  wrap.appendChild(iframe);
  return true;
}

export function collectKatexCssText() {
  if (typeof document === 'undefined') return '';
  const parts = [];
  try {
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        const text = rule.cssText || '';
        if (/katex/i.test(text)) parts.push(text);
      }
    }
  } catch {
    /* ignore */
  }
  return parts.join('\n');
}
