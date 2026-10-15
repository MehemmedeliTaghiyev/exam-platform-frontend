import { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button, FormError, Input } from '../components/ui';
import Header from '../components/home/Header';
import '../components/home/home.css';
import { errorMessage, rememberedTrialEnded, TRIAL_ENDED_MESSAGE } from '../lib/utils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const location = useLocation();
  const [error, setError] = useState(location.state?.notice || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
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
    <div className="home-page min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Header />
      <main className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 min-[900px]:grid-cols-2">
        <section className="hidden min-h-[460px] rounded-[28px] bg-[linear-gradient(160deg,#4a3df0,#22b8e0)] p-10 text-white min-[900px]:block" aria-hidden="true">
          <h2 className="text-3xl font-extrabold">Nəticələrin sənə nə deyir?</h2>
          <p className="mt-3 max-w-sm text-white/85">Hər imtahandan sonra güclü və zəif mövzularını gör.</p>
          <ul className="mt-8 space-y-3 text-sm font-semibold">
            {['Müəllimin imtahanını həll et', 'Mövzu üzrə təhlilə bax', 'İrəliləyişini izlə'].map((row) => (
              <li key={row} className="rounded-2xl bg-white/15 px-4 py-3">{row}</li>
            ))}
          </ul>
        </section>
        <section className="mx-auto w-full max-w-[480px] rounded-[24px] border border-[var(--line)] bg-[var(--card)] p-9 shadow-[0_18px_50px_var(--glow)]">
          <Link to="/" className="text-sm font-semibold text-[var(--accent)]">← Məşq səhifəsinə qayıt</Link>
          <h1 className="mt-4 text-3xl font-extrabold">Daxil ol</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Müəllimin verdiyi e-poçt ilə daxil olun. Repetitorunuz varsa, o sizə giriş açmalıdır. Yoxdursa, qeydiyyatdan keçib bölgə müəllimlərini görün.
      </p>
      {error ? <div className="mt-4"><FormError message={error} /></div> : null}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input label="E-poçt və ya istifadəçi adı" type="text" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Şifrə" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Daxil olunur...' : 'Daxil ol'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-[var(--muted)]">
        Hesabınız yoxdur? <Link to="/register" className="font-extrabold text-[var(--accent)]">Qeydiyyat</Link>
      </p>
        </section>
      </main>
    </div>
  );
}
