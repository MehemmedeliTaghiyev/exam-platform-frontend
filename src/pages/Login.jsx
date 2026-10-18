import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, GraduationCap, Lock, Mail, UserPlus } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { FormError } from '../components/ui';
import { CONTACT_MAILTO } from '../lib/contact';
import { errorMessage, rememberedTrialEnded, TRIAL_ENDED_MESSAGE } from '../lib/utils';
import './login.css';

const REMEMBER_KEY = 'exampulse_remember_login';

function Leaf() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M5 19c8-1 13-8 14-15-7 1-14 6-14 15z" />
      <path fill="none" stroke="currentColor" strokeWidth="1.6" d="M8 16c2-2 5-5 8-7" />
    </svg>
  );
}

function Flask() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M9 3h6v2l-1 1v5l5 8a3 3 0 0 1-2.5 4.5h-9A3 3 0 0 1 5 19l5-8V6L9 5V3z" />
    </svg>
  );
}

function Columns() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3 20h18v2H3zm1-2h3V8H4zm6 0h4V8h-4zm7 0h3V8h-3zM2 6l10-4 10 4v2H2z" />
    </svg>
  );
}

function Dna() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.7" d="M7 3c6 4 6 6 0 9s-6 5 0 9M17 3c-6 4-6 6 0 9s6 5 0 9" />
      <path fill="currentColor" d="M9 8h6M8.5 12h7M9 16h6" />
    </svg>
  );
}

function Flag() {
  return (
    <svg viewBox="0 0 24 16" aria-hidden="true">
      <rect width="24" height="16" rx="2" fill="#1d4ed8" />
      <path fill="#fff" d="M10 0h4v16h-4zM0 6h24v4H0z" />
      <path fill="#dc2626" d="M11 0h2v16h-2zM0 7h24v2H0z" />
    </svg>
  );
}

const BOOKS = [
  { name: 'Riyaziyyat', color: '#2a62d0', edge: '#1d4eaf', mark: <span className="book-pi">π ±</span> },
  { name: 'Azərbaycan dili', color: '#1f9a45', edge: '#157a34', mark: <Leaf /> },
  { name: 'İngilis dili', color: '#e23b3b', edge: '#b42323', mark: <Flag /> },
  { name: 'Kimya', color: '#7a3ff0', edge: '#5b22c7', mark: <Flask /> },
  { name: 'Biologiya', color: '#0e7a78', edge: '#0a5554', mark: <Dna /> },
  { name: 'Tarix', color: '#8b5a34', edge: '#6a4122', mark: <Columns /> },
];

export default function Login() {
  const savedEmail = localStorage.getItem(REMEMBER_KEY) || '';
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(Boolean(savedEmail));
  const [showPassword, setShowPassword] = useState(false);
  const location = useLocation();
  const [error, setError] = useState(location.state?.notice || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const sceneRef = useRef(null);
  const artRef = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const art = artRef.current;
    const img = art?.querySelector('img');
    if (!scene || !art || !img) return undefined;
    const place = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const { width, height } = scene.getBoundingClientRect();
      if (!nw || !nh || !width || !height) return;
      const scale = Math.max(width / nw, height / nh);
      const w = nw * scale;
      const h = nh * scale;
      art.style.width = `${w}px`;
      art.style.height = `${h}px`;
      art.style.left = `${(width - w) / 2}px`;
      art.style.top = `${(height - h) * 0.62}px`;
    };
    img.addEventListener('load', place);
    const observer = new ResizeObserver(place);
    observer.observe(scene);
    place();
    return () => {
      img.removeEventListener('load', place);
      observer.disconnect();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
    else localStorage.removeItem(REMEMBER_KEY);
    try {
      const userData = await login({ email, password });
      if (userData?.role === 'Admin') navigate('/admin');
      else if (userData?.role === 'Teacher') navigate('/teacher');
      else navigate('/student');
    } catch (err) {
      if (err?.response?.data?.code === 'ACCESS_CLOSED') {
        const apiMsg = String(err.response.data.message || '');
        const ended = rememberedTrialEnded(email) || /test müddəti|sınaq müddəti|trial/i.test(apiMsg);
        if (ended) setError(TRIAL_ENDED_MESSAGE);
        else if (/müəllim təsdiq/i.test(apiMsg)) setError(apiMsg);
        else if (/admin təsdiq/i.test(apiMsg)) setError('20 günlük sınaq başlayıb. Admin təsdiqi gözlənilmir. E-poçt və şifrəni yoxlayıb yenidən daxil olun.');
        else setError(apiMsg || 'Giriş hazırda bağlıdır. Məlumatları yoxlayıb yenidən cəhd edin.');
      } else {
        setError(errorMessage(err, 'Giriş uğursuz oldu. E-poçt və ya şifrə yanlışdır.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-scene" ref={sceneRef} aria-label="Dərs otağı">
        <div className="login-art" ref={artRef}>
          <img src="/login-scene.jpg" alt="Gecə vaxtı Bakıda dərs hazırlayan şagird" />
          <div className="book-stack" aria-hidden="true">
            {BOOKS.map((book) => (
              <div key={book.name} className="book" style={{ '--cover': book.color, '--edge': book.edge }}>
                <span className="book-face">
                  <span>{book.name}</span>
                  {book.mark}
                </span>
                <span className="book-pages" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="login-form">
        <div className="login-card">
          <Link to="/" className="login-brand">
            <span className="login-mark">
              <GraduationCap size={26} aria-hidden="true" />
            </span>
            <span>
              <strong>ExamPulse</strong>
              Daha yaxşı nəticələr üçün
            </span>
          </Link>

          <h1>Xoş gəlmisən!</h1>
          <p className="login-lead">Öyrənməyə və hədəflərinə bir addım daha yaxınlaşmağa davam et.</p>

          {error ? <div className="login-error"><FormError message={error} /></div> : null}

          <form onSubmit={handleSubmit}>
            <div className="login-group">
              <label htmlFor="login-email">E-poçt və ya istifadəçi adı</label>
              <div className="login-field">
                <Mail size={18} aria-hidden="true" />
                <input
                  id="login-email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-poçtunu və ya istifadəçi adını daxil et"
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div className="login-group">
              <label htmlFor="login-password">Şifrə</label>
              <div className="login-field">
                <Lock size={18} aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifrənizi daxil edin"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-row">
              <label htmlFor="login-remember">
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Məni xatırla
              </label>
              <a href={`${CONTACT_MAILTO}?subject=${encodeURIComponent('Şifrəni unutdum')}`}>
                Şifrəni unutmusunuz?
              </a>
            </div>

            <button type="submit" className="login-submit" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Daxil olunur...' : 'Daxil ol'}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>

          <div className="login-or" aria-hidden="true">
            <span />
            və ya
            <span />
          </div>

          <Link to="/register" className="login-create">
            <UserPlus size={18} aria-hidden="true" />
            Hesab yarat
          </Link>
        </div>
      </section>
    </div>
  );
}
