import { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, UserPlus } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { AuthContext } from '../context/AuthContext';
import { FormError } from '../components/ui';
import { readBrowserCredential, readRemembered, saveRemembered } from '../lib/rememberLogin';
import { errorMessage } from '../lib/utils';
import './login.css';

export default function Login() {
  const saved = readRemembered();
  const [email, setEmail] = useState(saved.email);
  const [password, setPassword] = useState(saved.password);
  const [remember, setRemember] = useState(saved.rememberEmail || saved.rememberPassword);
  const [rememberPassword, setRememberPassword] = useState(saved.rememberPassword);
  const [showPassword, setShowPassword] = useState(false);
  const location = useLocation();
  const [error, setError] = useState(location.state?.notice || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/');
  };

  useEffect(() => {
    let cancelled = false;
    readBrowserCredential().then((cred) => {
      if (cancelled || !cred?.email || !cred?.password) return;
      setEmail((value) => value || cred.email);
      setPassword((value) => value || cred.password);
      setRemember(true);
      setRememberPassword(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const userData = await login({ email, password });
      saveRemembered({
        email,
        password,
        rememberEmail: remember || rememberPassword,
        rememberPassword,
      });
      if (userData?.role === 'Admin') navigate('/admin');
      else if (userData?.role === 'Teacher') navigate('/teacher');
      else navigate('/student');
    } catch (err) {
      if (!remember && !rememberPassword) {
        saveRemembered({ email: '', password: '', rememberEmail: false, rememberPassword: false });
      }
      if (err?.response?.data?.code === 'ACCESS_CLOSED') {
        const apiMsg = String(err.response.data.message || '');
        if (/müəllim təsdiq/i.test(apiMsg)) setError(apiMsg);
        else if (/admin təsdiq/i.test(apiMsg)) setError('Qeydiyyatdan sonra kabinet dərhal açılır. E-poçt və şifrəni yoxlayıb yenidən daxil olun.');
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
        <button type="button" className="login-back" aria-label="Geri" onClick={goBack}>
          <ArrowLeft size={20} />
        </button>
        <img className="login-photo" src="/login-scene.jpg" alt="Gecə vaxtı Bakıda dərs hazırlayan şagird" />
        <svg className="login-wave login-wave-bottom" viewBox="0 0 800 48" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 24C120 40 240 8 400 20C560 32 680 6 800 18V48H0Z" />
        </svg>
      </section>

      <section className="login-form">
        <svg className="login-wave login-wave-side" viewBox="0 0 1000 800" preserveAspectRatio="none" aria-hidden="true">
          <path d="M72 0C46 150 38 290 60 400C82 520 40 660 64 800H1000V0Z" />
        </svg>
        <div className="login-scroll">
        <div className="login-card">
          <Link to="/" className="login-brand">
            <BrandLogo size={40} nameClassName="text-[27px]" />
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
              <div className="login-remember">
                <label htmlFor="login-remember">
                  <input
                    id="login-remember"
                    type="checkbox"
                    checked={remember || rememberPassword}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setRemember(on);
                      if (!on) setRememberPassword(false);
                    }}
                  />
                  Məni xatırla
                </label>
                <label htmlFor="login-remember-password">
                  <input
                    id="login-remember-password"
                    type="checkbox"
                    checked={rememberPassword}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setRememberPassword(on);
                      if (on) setRemember(true);
                    }}
                  />
                  Şifrəni xatırla
                </label>
              </div>
              <Link to="/forgot-password">
                Şifrəni unutmusunuz?
              </Link>
            </div>
            {rememberPassword ? (
              <p className="login-remember-note">Şifrə yalnız bu cihazda saxlanır. Başqa telefondan daxil olanda yenidən yazın.</p>
            ) : null}

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
