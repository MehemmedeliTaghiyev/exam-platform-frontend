import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { classNames } from '../lib/utils';

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  size = 'md',
  ...props
}) {
  const styles = {
    primary: 'text-white shadow-[0_10px_28px_var(--glow)]',
    secondary: 'border border-[var(--line)] bg-[var(--card)] text-[var(--text)]',
    ghost: 'bg-transparent text-[var(--muted)]',
    danger: 'bg-[#e11d48] text-white',
    'danger-soft': 'bg-[rgba(225,29,72,0.12)] text-[var(--danger-text)]',
    'text-danger': 'bg-transparent text-[var(--danger-text)]',
    success: 'bg-[#16a34a] text-white',
  };
  const sizeClass = size === 'sm' ? 'min-h-10 px-3 text-sm' : 'min-h-12 px-4 text-sm';

  return (
    <button
      type={type}
      className={classNames(
        'ep-focus ep-lift inline-flex items-center justify-center gap-2 rounded-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-50',
        sizeClass,
        styles[variant] || styles.primary,
        variant === 'primary' ? 'bg-[linear-gradient(135deg,#5b4cf5,#7c5cff)]' : '',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={classNames(
        'rounded-[22px] border border-[var(--line)] bg-[var(--card)] p-6 text-[var(--text)]',
        onClick && 'cursor-pointer hover:border-brand-200 active:scale-[0.98] active:brightness-95 dark:hover:border-brand-700 transition-all duration-150',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Input({ label, className = '', type = 'text', ...props }) {
  const [show, setShow] = useState(false);
  const secret = type === 'password';
  const field = classNames(
    'ep-focus h-[52px] w-full rounded-[14px] border border-[var(--line)] bg-[var(--bg)] px-3.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]',
    secret && 'pr-12',
    className,
  );
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-sm font-semibold text-[var(--text)]">{label}</span>
      )}
      {secret ? (
        <span className="relative block">
          <input type={show ? 'text' : 'password'} className={field} {...props} />
          <button
            type="button"
            className="ep-focus absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[10px] text-[var(--muted)]"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </span>
      ) : (
        <input type={type} className={field} {...props} />
      )}
    </label>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-sm font-semibold text-[var(--text)]">{label}</span>
      )}
      <select
        className={classNames(
          'ep-focus h-[52px] w-full rounded-[14px] border border-[var(--line)] bg-[var(--bg)] px-3.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-sm font-semibold text-[var(--text)]">{label}</span>
      )}
      <textarea
        className={classNames(
          'ep-focus w-full rounded-[14px] border border-[var(--line)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]',
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function Modal({ open, title, onClose, children, className = '' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={classNames('relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900', className)}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold text-ink dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800"
          >
            Bağla
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return (
    <div
      className={classNames(
        'animate-pulse rounded-xl bg-gray-200/80 dark:bg-slate-800',
        className,
      )}
    />
  );
}

export function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-400">
          {Icon ? <Icon size={20} /> : null}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-white">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <Card className="py-12 text-center">
      <p className="text-base font-semibold text-ink dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  const lines = String(message).split('\n').map((line) => line.trim()).filter(Boolean);
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100" role="alert">
      <p className="font-semibold text-red-900 dark:text-red-50">Məlumatı yoxlayın</p>
      {lines.length === 1 ? (
        <p className="mt-1 leading-5">{lines[0]}</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-4 leading-5">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-[var(--line)] text-[var(--muted)]',
    brand: 'bg-[var(--accent-soft)] text-[var(--accent)]',
    accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
    success: 'bg-[rgba(22,163,74,0.12)] text-[var(--success-text)]',
    warning: 'bg-[var(--warning-bg)] text-[var(--warning-text)]',
    danger: 'bg-[rgba(225,29,72,0.12)] text-[var(--danger-text)]',
  };
  return (
    <span className={classNames('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold', tones[tone] || tones.neutral)}>
      {children}
    </span>
  );
}

export function ConfirmDialog({ open, text, note, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="absolute inset-0 bg-[#0a0e1f]/50" aria-label="Ləğv et" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-[22px] border border-[var(--line)] bg-[var(--card)] p-6 text-[var(--text)]">
        <h3 className="text-lg font-extrabold">Əminsiniz?</h3>
        {text ? <p className="mt-2 text-sm text-[var(--muted)]">{text}</p> : null}
        {note ? <p className="mt-2 text-sm text-[var(--muted)]">{note}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>Ləğv et</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>Sil</Button>
        </div>
      </div>
    </div>
  );
}
