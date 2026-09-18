import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Moon, Sun } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Input } from '../components/ui';
import { errorMessage } from '../lib/utils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const { dark, toggle } = useTheme();
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
        setError(err.response.data.message || 'Hesabınız bağlanıb. Giriş üçün adminə müraciət edin.');
      } else {
        setError(errorMessage(err, 'Giriş uğursuz oldu. E-poçt və ya şifrə yanlışdır.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 dark:bg-[#0b1220]">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={toggle}
            className="rounded-xl p-2.5 text-gray-500 transition-all duration-200 hover:bg-white dark:hover:bg-slate-800"
            title="Tema"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <GraduationCap size={20} />
          </div>
          <span className="text-lg font-bold text-ink dark:text-white">ExamPulse</span>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-ink dark:text-white">Daxil ol</h1>
          <p className="mt-1 text-sm text-gray-500">Müəllimin verdiyi e-poçt və ya istifadəçi adı ilə daxil olun</p>
          {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">{error}</p>}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input label="E-poçt və ya istifadəçi adı" type="text" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Şifrə" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Daxil olunur...' : 'Daxil ol'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-500">
            Hesabınız yoxdur?{' '}
            <Link to="/register" className="font-medium text-brand-600 hover:text-brand-500">
              Qeydiyyat
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
