import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, GraduationCap, Lock, Mail, UserRound } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { FormError } from '../components/ui';
import { CONTACT_MAILTO } from '../lib/contact';
import { errorMessage, rememberedTrialEnded, TRIAL_ENDED_MESSAGE } from '../lib/utils';
import './login.css';

const REMEMBER_KEY = 'exampulse_remember_login';

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
      art.style.top = `${(height - h) * 0.4}px`;
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
      <section className="login-scene" ref={sceneRef}>
        <div className="login-art" ref={artRef}>
          <img src="/login-scene.jpg" alt="Gecə vaxtı dərs hazırlayan şagird" />
          <div className="login-curtain login-curtain-a" aria-hidden="true" />
          <div className="login-curtain login-curtain-b" aria-hidden="true" />
          <div className="login-tea" aria-hidden="true">
            <i />
            <span />
            <span />
          </div>
          <div className="login-hello">
            <p className="login-hello-title">Xoş gəldin!</p>
            <p>Bu gün yeni nəsə öyrənmək üçün əla gündür.</p>
          </div>
        </div>
      </section>

      <section className="login-form">
        <div className="login-card">
          <Link to="/" className="login-brand">
            <GraduationCap size={42} aria-hidden="true" />
            <span>
              <strong>ExamPulse</strong>
              Daha yaxşı nəticələr üçün
            </span>
          </Link>

          <h1 className="mt-8 text-[28px] font-extrabold tracking-tight">Hesabınıza daxil olun</h1>
          <p className="mt-1 text-sm text-[#64748b]">Davam etmək üçün öz hesabınıza daxil olun.</p>

          {error ? <div className="mt-4"><FormError message={error} /></div> : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="login-field">
              <Mail size={18} className="text-[#94a3b8]" aria-hidden="true" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email və ya istifadəçi adı"
                autoComplete="username"
                required
              />
            </label>
            <label className="login-field">
              <Lock size={18} className="text-[#94a3b8]" aria-hidden="true" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrə"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="grid h-9 w-9 place-items-center text-[#94a3b8]"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </label>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="inline-flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Məni xatırla
              </label>
              <a className="font-semibold text-[#64748b]" href={`${CONTACT_MAILTO}?subject=${encodeURIComponent('Şifrəni unutdum')}`}>
                Şifrəni unutdunuz?
              </a>
            </div>

            <button type="submit" className="login-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Daxil olunur...' : 'Daxil ol'}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-sm text-[#94a3b8]">
            <span className="h-px flex-1 bg-[#e6e8ee]" />
            və ya
            <span className="h-px flex-1 bg-[#e6e8ee]" />
          </div>

          <Link to="/register" className="login-create">
            <UserRound size={18} aria-hidden="true" />
            Hesab yarat
          </Link>
        </div>
      </section>
    </div>
  );
}
