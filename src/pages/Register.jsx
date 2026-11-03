import { useContext, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Info, Users } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { Button, FormError, Input, Select } from '../components/ui';
import AuthShell from '../components/AuthShell';
import { localDb } from '../lib/localDb';
import { PREFERENCE_OPTIONS } from '../lib/storageCatalog';
import { errorMessage } from '../lib/utils';
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
    teachingSubject: '',
    phone: '',
    email: '',
    password: '',
  });
  const [emailEdited, setEmailEdited] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
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
    if (!formData.teachingSubject.trim()) problems.push('Hansı fənn müəllimi olduğunuzu seçin.');
    if (!/^\+?\d[\d\s()-]{6,}$/.test(formData.phone.trim())) problems.push('Əlaqə nömrəsini rəqəmlə yazın. Məsələn: 0501234567.');
    if (!TEACHER_EMAIL_RE.test(email)) problems.push(`E-poçt ${TEACHER_EMAIL_HINT} olmalıdır. Ad və soyad yazılanda ünvan özü yaranır.`);
    if (String(formData.password || '').length < 4) problems.push('Şifrə ən azı 4 simvol olmalıdır.');
    if (problems.length) {
      setError(problems.join('\n'));
      return;
    }
    setLoading(true);
    const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim();
    let driveFolderUrl = '';
    try {
      const folder = await createTeacherDriveFolder(fullName);
      driveFolderUrl = folder?.url || '';
    } catch {
      driveFolderUrl = '';
    }
    const trialMessage = wrapTrialMessage('Hesab aktivdir.', driveFolderUrl);
    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      position: formData.position.trim(),
      phone: formData.phone.trim(),
      email,
      password: formData.password,
      role: 'Teacher',
      Role: 'Teacher',
      fullName,
      FullName: fullName,
      FirstName: formData.firstName.trim(),
      LastName: formData.lastName.trim(),
      Position: formData.position.trim(),
      Phone: formData.phone.trim(),
      Email: email,
      Password: formData.password,
      driveFolderUrl,
      DriveFolderUrl: driveFolderUrl,
      trialMessage,
      TrialMessage: trialMessage,
      isAccessEnabled: true,
      IsAccessEnabled: true,
      teachingSubject: formData.teachingSubject,
      TeachingSubject: formData.teachingSubject,
    };
    try {
      localDb.setTeacherSubject('', formData.teachingSubject, email);
      const signed = await register(payload);
      const createdId = signed?.id || signed?.userId || signed?.user?.id;
      if (createdId) localDb.setTeacherSubject(createdId, formData.teachingSubject, email);
      navigate('/teacher', { replace: true });
    } catch (err) {
      const taken = /artıq qeydiyyat/i.test(String(err?.response?.data?.message || ''));
      setError(errorMessage(
        err,
        taken
          ? 'Bu e-poçt artıq qeydiyyatdadır. E-poçt və şifrə ilə daxil olun.'
          : 'Qeydiyyat zamanı xəta baş verdi. Yazılan məlumatı yoxlayın.',
      ));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-extrabold text-[var(--hp-text)]">Müəllim qeydiyyatı</h1>
      <p className="mt-1 text-sm font-semibold text-[var(--hp-muted)]">
        Fənn və konum mütləqdir. Anbar sonra bu fənnə uyğun PDF göstərir. Qeydiyyatdan sonra hesabınız dərhal açılır — admin təsdiqi lazım deyil.
      </p>
      {error ? <div className="mt-4"><FormError message={error} /></div> : null}
      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Input label="Ad" name="firstName" value={formData.firstName} onChange={handleChange} required />
        <Input label="Soyad" name="lastName" value={formData.lastName} onChange={handleChange} required />
        <Input label="Konum" name="position" value={formData.position} onChange={handleChange} required placeholder="məs. Bakı, Nəsimi" />
        <Select label="Fənn" name="teachingSubject" value={formData.teachingSubject} onChange={handleChange} required>
          <option value="">Fənni seçin</option>
          {PREFERENCE_OPTIONS.subjects.map((subject) => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </Select>
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
          <p className="mt-1.5 text-xs font-semibold text-[var(--hp-muted)]">
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
      <p className="mb-5">
        <Link
          to={kind === 'hub' ? '/' : '/register'}
          className="inline-flex min-h-11 items-center rounded-full bg-[color-mix(in_srgb,var(--hp-accent)_18%,transparent)] px-4 text-sm font-extrabold text-[var(--hp-accent)]"
        >
          ← Geri
        </Link>
      </p>
      {kind === 'teacher' ? <TeacherForm /> : null}
      {kind === 'hub' ? (
        <>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[var(--hp-text)]">Hesab yarat</h1>
          <p className="mt-2 text-base font-semibold text-[var(--hp-accent)]">Kim kimi qeydiyyatdan keçirsiniz?</p>
          <div className="mt-6 grid gap-4">
            <Link to="/register/teacher" className="reg-choice">
              <span className="reg-choice-icon"><Users size={22} aria-hidden="true" /></span>
              <span>
                <p className="font-extrabold text-[var(--hp-text)]">Müəlliməm</p>
                <p className="mt-1 text-sm font-medium text-[var(--hp-muted)]">Qeydiyyatdan keçin, kabinet dərhal açılır. Admin təsdiqi yoxdur.</p>
              </span>
            </Link>
            <Link to={publicJoinPath()} className="reg-choice">
              <span className="reg-choice-icon"><BookOpen size={22} aria-hidden="true" /></span>
              <span>
                <p className="font-extrabold text-[var(--hp-text)]">Şagirdəm, repetitorum yoxdur</p>
                <p className="mt-1 text-sm font-medium text-[var(--hp-muted)]">Adminin Ümumi qrupuna yazılın, sonra müəllim tapın.</p>
              </span>
            </Link>
          </div>
          <div className="reg-note" role="note">
            <Info size={18} aria-hidden="true" />
            <p>Repetitorun ExamPulse istifadə edirsə, burada yazılma. Müəllimin qrup linkini aç — yeni şagird yalnız onun kabinetinə düşür.</p>
          </div>
          <p className="mt-8 text-center text-sm font-semibold text-[var(--hp-text)]">
            Hesabınız var?{' '}
            <Link to="/login" className="font-extrabold text-[var(--hp-accent)] underline decoration-2 underline-offset-4">
              Daxil olun
            </Link>
          </p>
        </>
      ) : null}
    </Shell>
  );
}
