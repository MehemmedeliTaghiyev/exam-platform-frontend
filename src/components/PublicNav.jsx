import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const LINKS = [
  { to: '/#imkanlar', label: 'İmkanlar' },
  { to: '/teachers', label: 'Müəllim tap' },
  { to: '/exams', label: 'Açıq imtahanlar' },
  { to: '/#elaqe', label: 'Əlaqə' },
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
    ? 'border-[#2a2a2a] bg-[#161616] text-[#e8e8e8]'
    : 'border-indigo-100 bg-white text-slate-900';
  const ghost = navy
    ? 'rounded-md px-2.5 py-1.5 text-sm text-[#c8c8c8] hover:bg-white/5 hover:text-white'
    : 'rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-indigo-50';
  const primary = navy
    ? 'rounded-md bg-[#3a2428] px-2.5 py-1.5 font-mono text-[13px] text-[#e7a8a8] hover:bg-[#4a2c32]'
    : 'rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500';
  const iconBtn = navy
    ? 'rounded-md p-2 text-[#a3a3a3] hover:bg-white/5 hover:text-white'
    : 'rounded-xl p-2.5 text-slate-500 hover:bg-indigo-50';

  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur ${bar}`}>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          {navy ? null : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <GraduationCap size={20} />
            </div>
          )}
          <div className="min-w-0">
            <p className={`leading-tight ${navy ? 'text-[15px] font-semibold text-[#f2f2f2]' : 'text-lg font-bold'}`}>ExamPulse</p>
            {navy ? null : <p className="truncate text-xs text-slate-500">İmtahan platforması</p>}
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
        <div className={`border-t px-4 py-3 md:hidden ${navy ? 'border-[#2a2a2a]' : 'border-indigo-100'}`}>
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
