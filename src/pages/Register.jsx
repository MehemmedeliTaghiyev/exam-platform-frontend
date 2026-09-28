import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Moon, Sun } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Input } from '../components/ui';
import { errorMessage } from '../lib/utils';

const EMAIL_HINT = 'ad_soyad@gmail.com';
const EMAIL_RE = /^[a-z0-9əöüğçşı]+_[a-z0-9əöüğçşı]+@gmail\.com$/i;

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    position: '',
    phone: '',
    email: '',
    password: '',
    role: 'Teacher',
  });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const email = formData.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setError(`E-poçt ${EMAIL_HINT} formatında olmalıdır.`);
      return;
    }
    setLoading(true);
    try {
      await register({
        ...formData,
        email,
        fullName: [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim(),
      });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, 'Qeydiyyat zamanı xəta baş verdi.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10 dark:bg-[#0b1220]">
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
          {done ? (
            <>
              <h1 className="text-2xl font-bold text-ink dark:text-white">Müraciət göndərildi</h1>
              <p className="mt-3 text-sm text-gray-500">
                Admin sizi qəbul edəndən sonra e-poçt və şifrə ilə daxil ola bilərsiniz. Konumu kabinetdə də yeniləyə biləcəksiniz.
              </p>
              <Button className="mt-6 w-full" onClick={() => navigate('/login')}>
                Giriş səhifəsinə keç
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-ink dark:text-white">Müəllim qeydiyyatı</h1>
              <p className="mt-1 text-sm text-gray-500">Konum (yer) mütləqdir. Admin təsdiqindən sonra giriş açılacaq.</p>
              {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <Input label="Ad" name="firstName" value={formData.firstName} onChange={handleChange} required />
                <Input label="Soyad" name="lastName" value={formData.lastName} onChange={handleChange} required />
                <Input label="Konum" name="position" value={formData.position} onChange={handleChange} required placeholder="məs. Bakı, Nəsimi" />
                <Input label="Əlaqə nömrəsi" name="phone" value={formData.phone} onChange={handleChange} />
                <Input
                  label={`E-poçt (${EMAIL_HINT})`}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder={EMAIL_HINT}
                />
                <Input
                  label="Şifrə"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={4}
                />
                <p className="text-xs text-gray-500">Şifrə hərf və rəqəm qarışığı ola bilər. Yadda saxlayın.</p>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Qeydiyyat edilir...' : 'Qeydiyyatdan keç'}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-gray-500">
                Hesabınız var?{' '}
                <Link to="/login" className="font-medium text-brand-600 hover:text-brand-500">
                  Daxil olun
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
