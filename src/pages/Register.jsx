import { useContext, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Users } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { Button, FormError, Input } from '../components/ui';
import AuthShell from '../components/AuthShell';
import { computeAccessEnd, DEFAULT_TEACHER_TRIAL_DAYS, errorMessage, rememberTeacherTrial } from '../lib/utils';
import { publicJoinPath } from '../lib/publicGroup';
import { wrapTrialMessage } from '../lib/driveLinks';
import { createTeacherDriveFolder } from '../lib/teacherDrive';
import { buildTeacherEmail, TEACHER_EMAIL_HINT, TEACHER_EMAIL_RE } from '../lib/studentEmail';

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
  const [emailEdited, setEmailEdited] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const suggestedEmail = buildTeacherEmail(formData.firstName, formData.lastName);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') {
      setEmailEdited(value.trim() !== '' && value.trim().toLowerCase() !== suggestedEmail);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const email = (emailEdited ? formData.email : suggestedEmail || formData.email).trim().toLowerCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const problems = [];
    if (!formData.firstName.trim() || !formData.lastName.trim()) problems.push('Ad və soyadı yazın.');
    if (!formData.position.trim()) problems.push('Konum yazın. Məsələn: Bakı, Nəsimi.');
    if (!/^\+?\d[\d\s()-]{6,}$/.test(formData.phone.trim())) problems.push('Əlaqə nömrəsini rəqəmlə yazın. Məsələn: 0501234567.');
    if (!TEACHER_EMAIL_RE.test(email)) problems.push(`E-poçt ${TEACHER_EMAIL_HINT} olmalıdır. Ad və soyad yazılanda ünvan özü yaranır.`);
    if (String(formData.password || '').length < 4) problems.push('Şifrə ən azı 4 simvol olmalıdır.');
    if (problems.length) {
      setError(problems.join('\n'));
      return;
    }
    setLoading(true);
    const trialStartsAt = new Date().toISOString();
    const trialEndsAt = computeAccessEnd(trialStartsAt, 'FreeTrial', DEFAULT_TEACHER_TRIAL_DAYS);
    const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim();
    let driveFolderUrl = '';
    try {
      const folder = await createTeacherDriveFolder(fullName);
      driveFolderUrl = folder?.url || '';
    } catch {
      driveFolderUrl = '';
    }
    const trialMessage = wrapTrialMessage(
      `${DEFAULT_TEACHER_TRIAL_DAYS} günlük sınaq müddəti avtomatik başladı.`,
      driveFolderUrl,
    );
    const payload = {
      ...formData,
      email,
      role: 'Teacher',
      Role: 'Teacher',
      fullName,
      driveFolderUrl,
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
      rememberTeacherTrial(email, trialEndsAt);
      await register(payload);
      try {
        await login({ email, password: formData.password });
        navigate('/teacher');
        return;
      } catch (err) {
        const apiMsg = String(err?.response?.data?.message || '');
        const notice = err?.response?.data?.code === 'ACCESS_CLOSED' && /təsdiq/i.test(apiMsg)
          ? 'Hesab yaradıldı və 20 günlük sınaq başladı. Admin təsdiqi gözlənilmir. E-poçt və şifrə ilə daxil olun.'
          : 'Hesab yaradıldı. E-poçt və şifrə ilə daxil olun.';
        navigate('/login', { state: { notice } });
      }
    } catch (err) {
      setError(errorMessage(err, 'Qeydiyyat zamanı xəta baş verdi. Yazılan məlumatı yoxlayın.'));
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
      {error ? <div className="mt-4"><FormError message={error} /></div> : null}
      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Input label="Ad" name="firstName" value={formData.firstName} onChange={handleChange} required />
        <Input label="Soyad" name="lastName" value={formData.lastName} onChange={handleChange} required />
        <Input label="Konum" name="position" value={formData.position} onChange={handleChange} required placeholder="məs. Bakı, Nəsimi" />
        <Input label="Əlaqə nömrəsi" name="phone" value={formData.phone} onChange={handleChange} required placeholder="0501234567" />
        <div>
          <Input
            label={`E-poçt (${TEACHER_EMAIL_HINT})`}
            type="text"
            inputMode="email"
            autoComplete="off"
            name="email"
            value={emailEdited ? formData.email : suggestedEmail || formData.email}
            onChange={handleChange}
            required
            placeholder={TEACHER_EMAIL_HINT}
          />
          <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300">
            {suggestedEmail ? `Giriş ünvanı: ${suggestedEmail}` : 'Ad və soyad yazın. Ünvan belə yaranır: aysel_eliyeva@gmail.com'}
          </p>
        </div>
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
