import { useState } from 'react';
import { useLocale } from '../context/LocaleContext';

export function useExamFinishGuard(_enabled, onFinish) {
  const [open, setOpen] = useState(false);

  const request = () => setOpen(true);
  const stay = () => setOpen(false);
  const release = () => setOpen(false);
  const confirm = () => {
    setOpen(false);
    onFinish?.();
  };

  return { open, request, stay, confirm, release };
}

export default function ExamFinishConfirm({ open, busy = false, onStay, onFinish }) {
  const { t } = useLocale();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-5" onClick={busy ? undefined : onStay}>
      <div className="absolute inset-0 bg-black/55" />
      <div
        className="relative w-full max-w-sm rounded-[28px] bg-[var(--card)] p-5 text-[var(--text)] shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-[20px] font-black leading-snug">{t('finish.title')}</h3>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-[var(--muted)]">
          {t('finish.body')}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onStay}
            className="min-h-12 rounded-full bg-[var(--bg)] text-sm font-extrabold disabled:opacity-50"
          >
            {t('finish.no')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onFinish}
            className="min-h-12 rounded-full bg-[linear-gradient(180deg,#ffb84a,#f5a623)] text-sm font-extrabold text-[#3a2200] disabled:opacity-50"
          >
            {busy ? '...' : t('finish.yes')}
          </button>
        </div>
      </div>
    </div>
  );
}
