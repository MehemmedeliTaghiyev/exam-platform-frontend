import { classNames } from '../lib/utils';

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  const styles = {
    primary:
      'bg-brand-600 text-white hover:bg-brand-500 shadow-sm',
    secondary:
      'bg-white text-ink border border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 dark:hover:bg-slate-700',
    ghost:
      'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800',
    danger: 'bg-red-600 text-white hover:bg-red-500',
    success: 'bg-emerald-600 text-white hover:bg-emerald-500',
  };

  return (
    <button
      type={type}
      className={classNames(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        styles[variant],
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
        'rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900/80',
        onClick && 'cursor-pointer hover:border-brand-200 dark:hover:border-brand-700 transition-all duration-200',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Input({ label, className = '', ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>
      )}
      <input
        className={classNames(
          'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100 dark:focus:ring-brand-900/40',
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>
      )}
      <select
        className={classNames(
          'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-all duration-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100',
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
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>
      )}
      <textarea
        className={classNames(
          'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100',
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
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

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300',
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    danger: 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span className={classNames('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', tones[tone])}>
      {children}
    </span>
  );
}
