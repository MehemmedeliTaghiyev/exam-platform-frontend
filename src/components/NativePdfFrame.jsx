import { useEffect, useState } from 'react';

export default function NativePdfFrame({
  src = '',
  file = null,
  title = 'PDF',
  extraHref = '',
  extraLabel = 'Yeni tabda aç',
}) {
  const [objectUrl, setObjectUrl] = useState('');

  useEffect(() => {
    if (!file) {
      setObjectUrl('');
      return undefined;
    }
    const blob = file instanceof Blob ? file : new Blob([file], { type: 'application/pdf' });
    const typed = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(typed);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const iframeSrc = objectUrl || src;
  const openHref = extraHref || src || objectUrl || '';
  if (!iframeSrc) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-slate-800">
        <p className="text-sm font-semibold">{title}</p>
        {openHref ? (
          <a className="text-sm font-medium text-brand-600" href={openHref} target="_blank" rel="noreferrer">
            {extraLabel}
          </a>
        ) : null}
      </div>
      <iframe
        title={title}
        src={iframeSrc}
        className="h-[70vh] w-full bg-gray-50"
        style={{ border: 'none' }}
      />
    </div>
  );
}
