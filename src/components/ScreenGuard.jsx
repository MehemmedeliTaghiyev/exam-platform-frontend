import { useEffect, useState } from 'react';

function watermarkStyle(name) {
  const safe = String(name || 'ExamPulse')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><text x="20" y="100" fill="#1f2937" font-size="18" font-family="Manrope,sans-serif" transform="rotate(-28 160 90)">${safe}</text></svg>`;
  return { backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` };
}

function isEditableTarget(target) {
  const tag = String(target?.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || Boolean(target?.isContentEditable);
}

function isCaptureKey(event) {
  if (isEditableTarget(event.target)) return false;
  const key = String(event.key || '');
  const lower = key.toLowerCase();
  if (key === 'PrintScreen') return true;
  if (event.metaKey && event.shiftKey && ['3', '4', '5', 's'].includes(lower)) return true;
  if (event.ctrlKey && event.shiftKey && ['s', 'i', 'c'].includes(lower)) return true;
  if ((event.ctrlKey || event.metaKey) && ['p', 's', 'u', 'c', 'x', 'a'].includes(lower)) return true;
  return false;
}

/**
 * @param {object} props
 * @param {boolean} props.active
 * @param {string} [props.name]
 * @param {() => void} [props.onAbandon] — tab/sayt dəyişəndə imtahandan çıxış
 */
export default function ScreenGuard({ active, name, onAbandon = null }) {
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    if (!active) {
      setCovered(false);
      return undefined;
    }

    let abandoned = false;
    const abandon = () => {
      if (abandoned || typeof onAbandon !== 'function') return;
      abandoned = true;
      onAbandon();
    };
    const cover = () => {
      if (typeof onAbandon === 'function') {
        abandon();
        return;
      }
      setCovered(true);
    };
    const onVisibility = () => {
      if (document.hidden) abandon();
    };
    const onPageHide = () => abandon();
    const onBlur = () => {
      // Yalnız köhnə rejimdə örtük — auto-exit üçün visibility/pagehide kifayətdir
      if (typeof onAbandon === 'function') return;
      window.setTimeout(() => {
        if (document.hidden || document.hasFocus()) return;
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'IFRAME') return;
        setCovered(true);
      }, 220);
    };
    const onKey = (event) => {
      if (!isCaptureKey(event)) return;
      event.preventDefault();
      event.stopPropagation();
      cover();
    };
    const block = (event) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    window.addEventListener('beforeprint', cover);
    document.addEventListener('contextmenu', block, true);
    document.addEventListener('copy', block, true);
    document.addEventListener('cut', block, true);
    document.addEventListener('paste', block, true);
    document.addEventListener('dragstart', block, true);
    document.addEventListener('selectstart', block, true);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      window.removeEventListener('beforeprint', cover);
      document.removeEventListener('contextmenu', block, true);
      document.removeEventListener('copy', block, true);
      document.removeEventListener('cut', block, true);
      document.removeEventListener('paste', block, true);
      document.removeEventListener('dragstart', block, true);
      document.removeEventListener('selectstart', block, true);
    };
  }, [active, onAbandon]);

  if (!active) return null;

  return (
    <>
      {name ? <div className="exam-watermark" style={watermarkStyle(name)} aria-hidden="true" /> : null}
      {covered && !onAbandon ? (
        <div className="exam-shield" role="alertdialog" aria-modal="true" aria-labelledby="exam-shield-title">
          <div className="exam-shield-card">
            <h2 id="exam-shield-title">Ekran qorunur</h2>
            <p>Bu sınaq müəllimin şəxsi materialıdır. Ekran görüntüsü, çap və kopyalama bağlıdır.</p>
            <button type="button" onClick={() => setCovered(false)}>Sınağa qayıt</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
