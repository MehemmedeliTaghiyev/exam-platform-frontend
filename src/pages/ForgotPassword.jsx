import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Smartphone } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { FormError } from '../components/ui';
import { requestPasswordSms, resetPasswordWithSms } from '../lib/examApi';
import { errorMessage } from '../lib/utils';
import './login.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('ask');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [masked, setMasked] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const payload = () => {
    const value = identifier.trim();
    if (value.includes('@')) return { email: value, phone: '' };
    return { email: '', phone: value };
  };

  const sendCode = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) {
      setError('E-poçt və ya telefon nömrəsini yazın.');
      return;
    }
    setBusy(true);
    try {
      const res = await requestPasswordSms(payload());
      setMasked(res?.maskedPhone || res?.MaskedPhone || '');
      setStep('reset');
    } catch (err) {
      setError(errorMessage(err, 'SMS göndərilmədi.'));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code.trim())) {
      setError('SMS-dəki 6 rəqəmli kodu yazın.');
      return;
    }
    if (password.length < 4) {
      setError('Yeni şifrə ən azı 4 simvol olmalıdır.');
      return;
    }
    if (password !== confirm) {
      setError('Şifrələr eyni deyil.');
      return;
    }
    setBusy(true);
    try {
      await resetPasswordWithSms({ ...payload(), code: code.trim(), newPassword: password });
      navigate('/login', { state: { notice: 'Şifrə yeniləndi. Yeni şifrə ilə daxil olun.' } });
    } catch (err) {
      setError(errorMessage(err, 'Kod yanlışdır və ya vaxtı bitib.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-scene" aria-label="Dərs otağı">
        <button type="button" className="login-back" aria-label="Geri" onClick={() => navigate('/login')}>
          <ArrowLeft size={20} />
        </button>
        <img className="login-photo" src="/login-scene.jpg" alt="" />
        <svg className="login-wave login-wave-bottom" viewBox="0 0 800 48" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 24C120 40 240 8 400 20C560 32 680 6 800 18V48H0Z" />
        </svg>
      </section>
      <section className="login-form">
        <div className="login-scroll">
          <div className="login-card">
            <Link to="/" className="login-brand">
              <BrandLogo size={40} nameClassName="text-[27px]" />
            </Link>
            <h1>Şifrəni unutmusunuz?</h1>
            <p className="login-lead">
              {step === 'ask'
                ? 'E-poçt və ya telefon yazın. Kod qeydiyyatdakı nömrənizə SMS ilə gələcək.'
                : `Kod ${masked || 'nömrənizə'} göndərildi. SMS-i yazıb yeni şifrə qoyun.`}
            </p>
            {error ? <div className="login-error"><FormError message={error} /></div> : null}

            {step === 'ask' ? (
              <form onSubmit={sendCode}>
                <div className="login-group">
                  <label htmlFor="reset-id">E-poçt və ya telefon</label>
                  <div className="login-field">
                    <Smartphone size={18} aria-hidden="true" />
                    <input
                      id="reset-id"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="0501234567 və ya e-poçt"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="login-submit" disabled={busy}>
                  <span>{busy ? 'Göndərilir...' : 'SMS kod göndər'}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              <form onSubmit={savePassword}>
                <div className="login-group">
                  <label htmlFor="reset-code">SMS kodu</label>
                  <div className="login-field">
                    <Lock size={18} aria-hidden="true" />
                    <input
                      id="reset-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6 rəqəm"
                      required
                    />
                  </div>
                </div>
                <div className="login-group">
                  <label htmlFor="reset-pass">Yeni şifrə</label>
                  <div className="login-field">
                    <Lock size={18} aria-hidden="true" />
                    <input
                      id="reset-pass"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={4}
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label="Şifrəni göstər">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="login-group">
                  <label htmlFor="reset-confirm">Şifrəni təkrar yazın</label>
                  <div className="login-field">
                    <Lock size={18} aria-hidden="true" />
                    <input
                      id="reset-confirm"
                      type={showPassword ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={4}
                    />
                  </div>
                </div>
                <button type="submit" className="login-submit" disabled={busy}>
                  <span>{busy ? 'Yenilənir...' : 'Şifrəni yenilə'}</span>
                  <ArrowRight size={18} />
                </button>
                <button type="button" className="login-create" style={{ marginTop: 12 }} disabled={busy} onClick={sendCode}>
                  Kodu yenidən göndər
                </button>
              </form>
            )}
            <p className="login-lead" style={{ marginTop: 18 }}>
              <Link to="/login">Girişə qayıt</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
