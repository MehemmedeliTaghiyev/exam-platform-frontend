import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const LINKS = [
  { to: '/#features', label: 'İmkanlar' },
  { to: '/teachers', label: 'Müəllim tap' },
  { to: '/exams', label: 'Açıq imtahanlar' },
  { to: '/#contact', label: 'Əlaqə' },
];

export default function PublicNav({ darkOnNavy = false, appearance }) {
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const navy = appearance === 'navy' || (appearance !== 'light' && darkOnNavy);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  const bar = navy
    ? 'border-white/10 bg-[#0b1220] text-white'
    : 'border-indigo-100 bg-white text-slate-900';
  const ghost = navy
    ? 'rounded-xl px-3 py-2 text-sm font-medium text-indigo-100 hover:bg-white/10'
    : 'rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-indigo-50';
  const primary = navy
    ? 'rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400'
    : 'rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500';
  const iconBtn = navy
    ? 'rounded-xl p-2 text-indigo-200 hover:bg-white/10'
    : 'rounded-xl p-2.5 text-slate-500 hover:bg-indigo-50';

  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur ${bar}`}>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${navy ? 'bg-indigo-500' : 'bg-indigo-600'} text-white`}>
            <GraduationCap size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight">ExamPulse</p>
            <p className={`truncate text-xs ${navy ? 'text-indigo-200' : 'text-slate-500'}`}>İmtahan platforması</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="İctimai menyu">
          {LINKS.map((item) => (
            <Link key={item.to} to={item.to} className={ghost}>
              {item.label}
            </Link>
          ))}
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
        <div className={`border-t px-4 py-3 md:hidden ${navy ? 'border-white/10' : 'border-indigo-100'}`}>
          <div className="flex flex-col gap-1">
            {LINKS.map((item) => (
              <Link key={item.to} to={item.to} className={ghost}>
                {item.label}
              </Link>
            ))}
            <Link to="/login" className={ghost}>Daxil ol</Link>
            <Link to="/register" className={`${primary} text-center`}>Qeydiyyat</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
