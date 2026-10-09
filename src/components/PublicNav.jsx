import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, Mail, Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../lib/contact';

const LINKS = [
  { to: '/#features', label: 'İmkanlar' },
  { to: '/exams', label: 'Açıq imtahanlar' },
  { to: '/#contact', label: 'Əlaqə' },
];

export default function PublicNav({ darkOnNavy = false }) {
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  const bar = darkOnNavy
    ? 'border-white/10 bg-[#0b1220] text-white'
    : 'border-gray-200 bg-white text-ink dark:border-slate-800 dark:bg-slate-950 dark:text-white';
  const ghost = darkOnNavy
    ? 'rounded-xl px-3 py-2 text-sm font-medium text-indigo-100 hover:bg-white/10'
    : 'rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800';
  const primary = darkOnNavy
    ? 'rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-indigo-50'
    : 'rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500';
  const iconBtn = darkOnNavy
    ? 'rounded-xl p-2 text-indigo-200 hover:bg-white/10'
    : 'rounded-xl p-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800';

  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur ${bar}`}>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${darkOnNavy ? 'bg-indigo-600' : 'bg-brand-600 text-white'}`}>
            <GraduationCap size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight">ExamPulse</p>
            <p className={`truncate text-xs ${darkOnNavy ? 'text-indigo-200' : 'text-gray-500'}`}>İmtahan platforması</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="İctimai menyu">
          {LINKS.map((item) => (
            <Link key={item.to} to={item.to} className={ghost}>
              {item.label}
            </Link>
          ))}
          <a href={CONTACT_MAILTO} className={`${ghost} inline-flex items-center gap-1.5`}>
            <Mail size={16} />
            {CONTACT_EMAIL}
          </a>
          <button type="button" onClick={toggle} className={iconBtn} title="Tema">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/login" className={ghost}>Daxil ol</Link>
          <Link to="/register" className={primary}>Qeydiyyat</Link>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <button type="button" onClick={toggle} className={iconBtn} title="Tema">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            className={iconBtn}
            aria-expanded={open}
            aria-label={open ? 'Menyunu bağla' : 'Menyu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className={`border-t px-4 py-3 md:hidden ${darkOnNavy ? 'border-white/10' : 'border-gray-200 dark:border-slate-800'}`}>
          <div className="flex flex-col gap-1">
            {LINKS.map((item) => (
              <Link key={item.to} to={item.to} className={ghost}>
                {item.label}
              </Link>
            ))}
            <a href={CONTACT_MAILTO} className={`${ghost} inline-flex items-center gap-1.5`}>
              <Mail size={16} />
              {CONTACT_EMAIL}
            </a>
            <Link to="/login" className={ghost}>Daxil ol</Link>
            <Link to="/register" className={`${primary} text-center`}>Qeydiyyat</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
