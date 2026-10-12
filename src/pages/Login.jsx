import { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button, FormError, Input } from '../components/ui';
import AuthShell from '../components/AuthShell';
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
    <AuthShell>
      <p className="mb-4 text-center text-sm text-slate-500">
        <Link to="/" className="font-medium text-indigo-600 hover:text-indigo-500">
          ← Məşq səhifəsinə qayıt
        </Link>
      </p>
      <h1 className="text-2xl font-bold text-slate-900">Daxil ol</h1>
      <p className="mt-1 text-sm text-slate-500">
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
      <p className="mt-6 text-center text-sm text-slate-500">
        Hesabınız yoxdur?{' '}
        <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Qeydiyyat
        </Link>
      </p>
    </AuthShell>
  );
}
