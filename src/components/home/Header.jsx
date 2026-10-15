import { Link } from 'react-router-dom';
import { Moon, Sun, Zap } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const LINKS = [
  { href: '/#imkanlar', label: 'İmkanlar' },
  { href: '/#nece', label: 'Necə işləyir' },
  { href: '/teachers', label: 'Müəllim tap' },
  { href: '/#elaqe', label: 'Əlaqə' },
];

export default function Header() {
  const { dark, toggle } = useTheme();

  return (
    <header className="hp-header sticky top-0 z-40">
      <div className="mx-auto flex h-[68px] max-w-[1120px] items-center justify-between gap-1.5 px-4 min-[420px]:gap-2 min-[420px]:px-5">
        <Link to="/" className="flex items-center gap-2.5 font-extrabold">
          <span className="hp-logo-mark grid place-items-center">
            <Zap size={18} fill="currentColor" aria-hidden="true" />
          </span>
          ExamPulse
        </Link>

        <nav className="hidden items-center gap-5 min-[820px]:flex" aria-label="İctimai menyu">
          {LINKS.map((item) => (
            <Link key={item.href} to={item.href} className="text-[var(--hp-muted)] hover:text-[var(--hp-text)]">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="grid h-11 w-11 place-items-center rounded-[14px] text-[var(--hp-text)]"
            aria-label="Tema"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/login" className="hp-btn hp-btn-sm whitespace-nowrap px-2.5 text-[var(--hp-text)] min-[420px]:px-3.5">Daxil ol</Link>
          <Link to="/register" className="hp-btn hp-btn-sm hp-btn-primary hp-lift whitespace-nowrap px-2.5 min-[420px]:px-3.5">Qeydiyyat</Link>
        </div>
      </div>
    </header>
  );
}
