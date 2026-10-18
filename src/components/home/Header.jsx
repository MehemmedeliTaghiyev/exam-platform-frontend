import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Menu, Moon, Sun, UserRound, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const LINKS = [
  { href: '/#imkanlar', label: 'İmkanlar' },
  { href: '/#nece', label: 'Necə işləyir' },
  { href: '/teachers', label: 'Müəllim tap' },
  { href: '/#elaqe', label: 'Əlaqə' },
];

export default function Header({ hideAuth = false }) {
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="hp-header sticky top-0 z-40">
      <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between gap-3 px-4 min-[420px]:px-6">
        <Link to="/" className="hp-brand flex items-center gap-2.5 font-extrabold">
          <span className="hp-logo-mark grid place-items-center">
            <BookOpen size={20} aria-hidden="true" />
          </span>
          ExamPulse
        </Link>

        <nav className="hidden items-center gap-7 min-[900px]:flex" aria-label="İctimai menyu">
          {LINKS.map((item) => (
            <Link key={item.href} to={item.href} className="font-semibold text-[var(--hp-text)] hover:text-[var(--hp-accent)]">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="grid h-11 w-11 place-items-center rounded-full text-[var(--hp-text)]"
            aria-label="Tema"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {hideAuth ? null : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="hidden text-sm font-extrabold text-[var(--hp-text)] min-[520px]:inline">Daxil ol</Link>
              <Link to="/register" className="hp-btn hp-btn-sm hp-btn-gold hp-lift">
                <UserRound size={16} aria-hidden="true" />
                Qeydiyyat
              </Link>
            </div>
          )}
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full min-[900px]:hidden"
            aria-expanded={open}
            aria-label={open ? 'Menyunu bağla' : 'Menyu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="mx-auto flex max-w-[1180px] flex-col gap-1 px-4 pb-4 min-[900px]:hidden" aria-label="İctimai menyu">
          {LINKS.map((item) => (
            <Link key={item.href} to={item.href} className="rounded-2xl px-3 py-3 font-semibold" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          {hideAuth ? null : (
            <Link to="/login" className="rounded-2xl px-3 py-3 font-semibold min-[520px]:hidden" onClick={() => setOpen(false)}>Daxil ol</Link>
          )}
        </nav>
      ) : null}
    </header>
  );
}
