import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Moon, Sun } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Input, Select } from '../components/ui';
import { errorMessage } from '../lib/utils';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'Student',
  });
  const [error, setError] = useState('');
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
    setLoading(true);
    try {
      await register(formData);
      navigate('/login');
    } catch (err) {
      setError(errorMessage(err, 'Qeydiyyat zamanı xəta baş verdi.'));
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold text-ink dark:text-white">Qeydiyyat</h1>
          {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input label="Ad və soyad" name="fullName" value={formData.fullName} onChange={handleChange} required />
            <Input label="E-poçt" type="email" name="email" value={formData.email} onChange={handleChange} required />
            <Input label="Şifrə" type="password" name="password" value={formData.password} onChange={handleChange} required />
            <Select label="Rol" name="role" value={formData.role} onChange={handleChange}>
              <option value="Student">Tələbə</option>
              <option value="Teacher">Müəllim</option>
              <option value="Admin">Admin</option>
            </Select>
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
        </div>
      </div>
    </div>
  );
}
