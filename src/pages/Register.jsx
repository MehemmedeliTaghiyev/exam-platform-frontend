import { useContext, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Users } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import AuthShell from '../components/AuthShell';
import { computeAccessEnd, DEFAULT_TEACHER_TRIAL_DAYS, errorMessage } from '../lib/utils';
import { publicJoinPath } from '../lib/publicGroup';

const TEACHER_EMAIL_HINT = 'ad_soyad@gmail.com';
const TEACHER_EMAIL_RE = /^[a-z0-9əöüğçşı]+_[a-z0-9əöüğçşı]+@gmail\.com$/i;

function Shell({ children }) {
  return <AuthShell wide>{children}</AuthShell>;
}

function TeacherForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    position: '',
    phone: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const email = formData.email.trim().toLowerCase();
    if (!TEACHER_EMAIL_RE.test(email)) {
      setError(`E-poçt ${TEACHER_EMAIL_HINT} formatında olmalıdır.`);
      return;
    }
    setLoading(true);
    const trialStartsAt = new Date().toISOString();
    const trialEndsAt = computeAccessEnd(trialStartsAt, 'FreeTrial', DEFAULT_TEACHER_TRIAL_DAYS);
    const trialMessage = `${DEFAULT_TEACHER_TRIAL_DAYS} günlük sınaq müddəti avtomatik başladı.`;
    const payload = {
      ...formData,
      email,
      role: 'Teacher',
      Role: 'Teacher',
      fullName: [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim(),
      isAccessEnabled: true,
      IsAccessEnabled: true,
      trialDays: DEFAULT_TEACHER_TRIAL_DAYS,
      TrialDays: DEFAULT_TEACHER_TRIAL_DAYS,
      trialStartsAt,
      TrialStartsAt: trialStartsAt,
      trialEndsAt,
      TrialEndsAt: trialEndsAt,
      billingPlan: 'FreeTrial',
      BillingPlan: 'FreeTrial',
      trialMessage,
      TrialMessage: trialMessage,
    };
    try {
      await register(payload);
      try {
        await login({ email, password: formData.password });
        navigate('/teacher');
        return;
      } catch {
        setError('Hesab yaradıldı, amma avtomatik giriş alınmadı. E-poçt və şifrə ilə daxil olun.');
        navigate('/login');
      }
    } catch (err) {
      setError(errorMessage(err, 'Qeydiyyat zamanı xəta baş verdi.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-ink dark:text-white">Müəllim qeydiyyatı</h1>
      <p className="mt-1 text-sm text-gray-500">
        Konum mütləqdir. Qeydiyyatdan sonra hesabınız dərhal açılır və {DEFAULT_TEACHER_TRIAL_DAYS} günlük sınaq başlayır — admin təsdiqi lazım deyil.
      </p>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input label="Ad" name="firstName" value={formData.firstName} onChange={handleChange} required />
        <Input label="Soyad" name="lastName" value={formData.lastName} onChange={handleChange} required />
        <Input label="Konum" name="position" value={formData.position} onChange={handleChange} required placeholder="məs. Bakı, Nəsimi" />
        <Input label="Əlaqə nömrəsi" name="phone" value={formData.phone} onChange={handleChange} required placeholder="0501234567" />
        <Input
          label={`E-poçt (${TEACHER_EMAIL_HINT})`}
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder={TEACHER_EMAIL_HINT}
        />
        <Input label="Şifrə" type="password" name="password" value={formData.password} onChange={handleChange} required minLength={4} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Qeydiyyat edilir...' : 'Qeydiyyatdan keç və daxil ol'}
        </Button>
      </form>
    </>
  );
}

export default function Register() {
  const path = useLocation().pathname;
  const kind = path.endsWith('/student') ? 'student' : path.endsWith('/teacher') ? 'teacher' : 'hub';

  if (kind === 'student') {
    return <Navigate to={publicJoinPath()} replace />;
  }

  return (
    <Shell>
      {kind === 'teacher' ? <TeacherForm /> : null}
      {kind === 'hub' ? (
        <>
          <h1 className="text-2xl font-bold text-ink dark:text-white">Hesab yarat</h1>
          <p className="mt-2 text-sm text-gray-500">Kim kimi qeydiyyatdan keçirsiniz?</p>
          <div className="mt-6 grid gap-4">
            <Link to="/register/teacher" className="rounded-2xl border border-gray-200 p-5 hover:border-brand-400 dark:border-slate-700">
              <Users className="text-brand-600" size={22} />
              <p className="mt-3 font-bold">Müəlliməm</p>
              <p className="mt-1 text-sm text-gray-500">20 günlük sınaqla dərhal daxil olun. Admin təsdiqi yoxdur.</p>
            </Link>
            <Link to={publicJoinPath()} className="rounded-2xl border border-gray-200 p-5 hover:border-brand-400 dark:border-slate-700">
              <BookOpen className="text-brand-600" size={22} />
              <p className="mt-3 font-bold">Şagirdəm, repetitorum yoxdur</p>
              <p className="mt-1 text-sm text-gray-500">Adminin Ümumi qrupuna yazılın, sonra müəllim tapın.</p>
            </Link>
          </div>
          <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Repetitorun ExamPulse istifadə edirsə, burada yazılma. Müəllimin qrup linkini aç — yeni şagird yalnız onun kabinetinə düşür.
          </div>
          <p className="mt-6 text-center text-sm text-gray-500">
            Hesabınız var?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-500">
              Daxil olun
            </Link>
          </p>
        </>
      ) : (
        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/register" className="font-medium text-brand-600">
            ← Geri
          </Link>
        </p>
      )}
    </Shell>
  );
}
