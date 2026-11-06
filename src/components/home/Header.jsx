import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { goToHash, scrollToHash } from '../../lib/scrollToHash';
import BrandLogo from '../BrandLogo';
import { useLocale } from '../../context/LocaleContext';

const LINKS = [
  { href: '/#imkanlar', labelKey: 'auth.features', hash: 'imkanlar' },
  { href: '/#elaqe', labelKey: 'auth.how', hash: 'elaqe' },
  { href: '/teachers', labelKey: 'auth.findTeacher' },
  { href: '/#elaqe', labelKey: 'auth.contact', hash: 'elaqe' },
];

export default function Header({ hideAuth = false, overlay = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLocale();
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
      if (window.matchMedia('(min-width: 768px)').matches) setOpen(false);
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
            <BrandLogo nameClassName="text-white" />
          </Link>
        </div>

        <nav className="hp-desktop-nav hidden items-center gap-8 min-[768px]:flex" aria-label="İctimai menyu">
          {LINKS.map((item) => (
            <Link
              key={item.labelKey}
              to={item.href}
              onClick={goLink(item)}
              className="text-sm font-semibold text-white/70 hover:text-white"
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="hp-header-actions">
          {hideAuth ? null : (
            <>
              <Link to="/login" className="hp-header-login hidden text-sm font-extrabold text-white/80 min-[520px]:inline">{t('auth.login')}</Link>
              <Link to="/register" className="hp-btn hp-btn-sm hp-btn-gold hp-lift hp-header-register">
                <span className="hp-header-register-label">{t('auth.register')}</span>
              </Link>
            </>
          )}
          <button
            type="button"
            className="hp-header-icon hp-header-menu min-[768px]:hidden"
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
              <Link key={item.labelKey} to={item.href} onClick={goLink(item)}>
                {t(item.labelKey)}
              </Link>
            ))}
            {hideAuth ? null : (
              <>
                <Link to="/login" className="min-[520px]:hidden" onClick={close}>{t('auth.login')}</Link>
                <Link to="/register" className="hp-mobile-register" onClick={close}>{t('auth.register')}</Link>
              </>
            )}
          </nav>
        </>
      ) : null}
    </header>
  );
}
