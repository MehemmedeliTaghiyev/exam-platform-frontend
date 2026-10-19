import { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, GraduationCap, Lock, Mail, UserPlus } from 'lucide-react';
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
      <section className="login-scene" aria-label="Dərs otağı">
        <img className="login-photo" src="/login-scene.jpg" alt="Gecə vaxtı Bakıda dərs hazırlayan şagird" />
        <svg className="login-wave login-wave-bottom" viewBox="0 0 800 70" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 36C140 70 260 4 400 28C540 52 660 0 800 32V70H0Z" />
        </svg>
      </section>

      <section className="login-form">
        <svg className="login-wave login-wave-side" viewBox="0 0 1000 800" preserveAspectRatio="none" aria-hidden="true">
          <path d="M118 0C36 170 32 290 104 400C168 510 34 640 110 800H1000V0Z" />
        </svg>
        <div className="login-scroll">
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
        </div>
      </section>
    </div>
  );
}
