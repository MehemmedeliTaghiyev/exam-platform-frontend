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

function isCaptureKey(event) {
  const key = String(event.key || '');
  const lower = key.toLowerCase();
  if (key === 'PrintScreen') return true;
  if (event.metaKey && event.shiftKey && ['3', '4', '5', 's'].includes(lower)) return true;
  if (event.ctrlKey && event.shiftKey && ['s', 'i', 'c'].includes(lower)) return true;
  if ((event.ctrlKey || event.metaKey) && ['p', 's', 'u'].includes(lower)) return true;
  return false;
}

export default function ScreenGuard({ active, name }) {
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    if (!active) {
      setCovered(false);
      return undefined;
    }

    const cover = () => setCovered(true);
    const onVisibility = () => {
      if (document.hidden) cover();
    };
    const onBlur = () => {
      window.setTimeout(() => {
        if (document.hidden || document.hasFocus()) return;
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'IFRAME') return;
        cover();
      }, 180);
    };
    const onKey = (event) => {
      if (!isCaptureKey(event)) return;
      event.preventDefault();
      cover();
    };
    const block = (event) => event.preventDefault();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    window.addEventListener('beforeprint', cover);
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('dragstart', block);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      window.removeEventListener('beforeprint', cover);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('dragstart', block);
    };
  }, [active]);

  if (!active) return null;

  return (
    <>
      <div className="exam-watermark" style={watermarkStyle(name)} aria-hidden="true" />
      {covered ? (
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
