import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu, Moon, Sun, UserRound, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { goToHash, scrollToHash } from '../../lib/scrollToHash';
import BrandLogo from '../BrandLogo';

const LINKS = [
  { href: '/#imkanlar', label: 'İmkanlar', hash: 'imkanlar' },
  { href: '/#elaqe', label: 'Necə işləyir', hash: 'elaqe' },
  { href: '/teachers', label: 'Müəllim tap' },
  { href: '/#elaqe', label: 'Əlaqə', hash: 'elaqe' },
];

export default function Header({ hideAuth = false, overlay = false }) {
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuId = 'hp-mobile-nav';
  const showBack = location.pathname !== '/';

  useEffect(() => {
    if (!overlay) return undefined;
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overlay]);

  useEffect(() => {
    if (open) {
      setShown(true);
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setShown(false), reduce ? 0 : 220);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onResize = () => {
      if (window.matchMedia('(min-width: 900px)').matches) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const close = () => setOpen(false);
  const goBack = () => {
    close();
    if (location.key !== 'default') navigate(-1);
    else navigate('/');
  };
  const goLink = (item) => (event) => {
    if (!item.hash) {
      close();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    close();
    if (location.pathname !== '/') {
      goToHash(navigate, item.hash);
      return;
    }
    if (location.hash !== `#${item.hash}`) {
      navigate({ pathname: '/', hash: `#${item.hash}` }, { replace: true });
    }
    window.setTimeout(() => scrollToHash(item.hash), 30);
  };
  const bar = overlay && !scrolled && !open ? 'hp-header-overlay' : '';

  return (
    <header className={`hp-header sticky top-0 z-40 ${bar} ${open || shown ? 'is-open' : ''} ${showBack ? 'has-back' : ''}`}>
      <div className="hp-header-bar">
        <div className="hp-header-start">
          {showBack ? (
            <button type="button" className="hp-header-icon hp-header-back" aria-label="Geri" onClick={goBack}>
              <ArrowLeft size={20} />
            </button>
          ) : null}
          <Link to="/" className="hp-brand flex min-w-0 items-center gap-2 font-extrabold" onClick={close}>
          <BrandLogo />
        </Link>
        </div>

        <nav className="hp-desktop-nav hidden items-center gap-7 min-[900px]:flex" aria-label="İctimai menyu">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={goLink(item)}
              className="font-semibold text-[var(--hp-text)] hover:text-[var(--hp-accent)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hp-header-actions">
          <button
            type="button"
            onClick={toggle}
            className="hp-header-icon"
            aria-label="Tema"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {hideAuth ? null : (
            <>
              <Link to="/login" className="hp-header-login hidden text-sm font-extrabold text-[var(--hp-text)] min-[520px]:inline">Daxil ol</Link>
              <Link to="/register" className="hp-btn hp-btn-sm hp-btn-gold hp-lift hp-header-register">
                <UserRound size={16} aria-hidden="true" />
                <span className="hp-header-register-label">Qeydiyyat</span>
              </Link>
            </>
          )}
          <button
            type="button"
            className="hp-header-icon hp-header-menu min-[900px]:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? 'Menyunu bağla' : 'Menyu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {shown ? (
        <>
          <button
            type="button"
            className={`hp-nav-backdrop ${open ? 'is-open' : ''}`}
            tabIndex={-1}
            aria-label="Menyunu bağla"
            onClick={close}
          />
          <nav
            id={menuId}
            className={`hp-mobile-nav ${open ? 'is-open' : ''}`}
            aria-label="İctimai menyu"
          >
            {LINKS.map((item) => (
              <Link key={item.href} to={item.href} onClick={goLink(item)}>
                {item.label}
              </Link>
            ))}
            {hideAuth ? null : (
              <>
                <Link to="/login" className="min-[520px]:hidden" onClick={close}>Daxil ol</Link>
                <Link to="/register" className="hp-mobile-register" onClick={close}>Qeydiyyat</Link>
              </>
            )}
          </nav>
        </>
      ) : null}
    </header>
  );
}
