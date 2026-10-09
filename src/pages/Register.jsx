import { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, Users } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import PublicNav from '../components/PublicNav';
import { errorMessage } from '../lib/utils';
import { registerOpenStudent } from '../lib/examApi';

const TEACHER_EMAIL_HINT = 'ad_soyad@gmail.com';
const TEACHER_EMAIL_RE = /^[a-z0-9əöüğçşı]+_[a-z0-9əöüğçşı]+@gmail\.com$/i;
const STUDENT_EMAIL_HINT = 'ad.soyad_ataadi@gmail.com';
const STUDENT_EMAIL_RE = /^[a-z0-9əöüğçşı]+\.[a-z0-9əöüğçşı]+_[a-z0-9əöüğçşı]+@gmail\.com$/i;

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-surface dark:bg-[#0b1220]">
      <PublicNav />
      <div className="mx-auto w-full max-w-lg px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
          {children}
        </div>
      </div>
    </div>
  );
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
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
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
    try {
      await register({
        ...formData,
        email,
        role: 'Teacher',
        fullName: [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim(),
      });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, 'Qeydiyyat zamanı xəta baş verdi.'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <>
        <h1 className="text-2xl font-bold text-ink dark:text-white">Müraciət göndərildi</h1>
        <p className="mt-3 text-sm text-gray-500">
          Admin sizi qəbul edəndən sonra e-poçt və şifrə ilə daxil ola bilərsiniz. İmtahanları özəl və ya açıq dərc edəcəksiniz.
        </p>
        <Button className="mt-6 w-full" onClick={() => navigate('/login')}>
          Giriş səhifəsinə keç
        </Button>
      </>
    );
  }

  return (
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
          {loading ? 'Qeydiyyat edilir...' : 'Qeydiyyatdan keç'}
        </Button>
      </form>
    </>
  );
}

function StudentForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fatherName: '',
    position: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const email = formData.email.trim().toLowerCase();
    if (!STUDENT_EMAIL_RE.test(email)) {
      setError(`E-poçt ${STUDENT_EMAIL_HINT} formatında olmalıdır.`);
      return;
    }
    setLoading(true);
    try {
      await registerOpenStudent({
        ...formData,
        email,
        fullName: [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim(),
      });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, 'Qeydiyyat alınmadı. Bir az sonra yenidən cəhd edin.'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <>
        <h1 className="text-2xl font-bold text-ink dark:text-white">Qeydiyyat göndərildi</h1>
        <p className="mt-3 text-sm text-gray-500">
          Daxil olandan sonra bölgələrdəki müəllimləri görəcək və açıq imtahanlarına qoşula biləcəksiniz.
        </p>
        <Button className="mt-6 w-full" onClick={() => navigate('/login')}>
          Daxil ol
        </Button>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-ink dark:text-white">Şagird qeydiyyatı</h1>
      <p className="mt-1 text-sm text-gray-500">
        Repetitorun yoxdursa buradan keç. Müəllimin varsa, onunla əlaqə saxla — o qrup linki verəcək.
      </p>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input label="Ad" name="firstName" value={formData.firstName} onChange={handleChange} required />
        <Input label="Soyad" name="lastName" value={formData.lastName} onChange={handleChange} required />
        <Input label="Ata adı" name="fatherName" value={formData.fatherName} onChange={handleChange} required />
        <Input label="Bölgə / şəhər" name="position" value={formData.position} onChange={handleChange} required placeholder="məs. Gəncə" />
        <Input
          label={`E-poçt (${STUDENT_EMAIL_HINT})`}
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder={STUDENT_EMAIL_HINT}
        />
        <Input label="Şifrə" type="password" name="password" value={formData.password} onChange={handleChange} required minLength={4} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Qeydiyyat edilir...' : 'Qeydiyyatdan keç'}
        </Button>
      </form>
    </>
  );
}

export default function Register() {
  const path = useLocation().pathname;
  const kind = path.endsWith('/student') ? 'student' : path.endsWith('/teacher') ? 'teacher' : 'hub';

  return (
    <Shell>
      {kind === 'teacher' ? <TeacherForm /> : null}
      {kind === 'student' ? <StudentForm /> : null}
      {kind === 'hub' ? (
        <>
          <h1 className="text-2xl font-bold text-ink dark:text-white">Hesab yarat</h1>
          <p className="mt-2 text-sm text-gray-500">Kim kimi qeydiyyatdan keçirsiniz?</p>
          <div className="mt-6 grid gap-4">
            <Link to="/register/teacher" className="rounded-2xl border border-gray-200 p-5 hover:border-brand-400 dark:border-slate-700">
              <Users className="text-brand-600" size={22} />
              <p className="mt-3 font-bold">Müəlliməm</p>
              <p className="mt-1 text-sm text-gray-500">Öz şagirdləriniz və açıq imtahanlar üçün hesab açın.</p>
            </Link>
            <Link to="/register/student" className="rounded-2xl border border-gray-200 p-5 hover:border-brand-400 dark:border-slate-700">
              <BookOpen className="text-brand-600" size={22} />
              <p className="mt-3 font-bold">Şagirdəm, repetitorum yoxdur</p>
              <p className="mt-1 text-sm text-gray-500">Bölgələrdəki müəllimləri görün və açıq imtahanlara qoşulun.</p>
            </Link>
          </div>
          <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Repetitorun ExamPulse istifadə edirsə, qeydiyyatı burada etmə. Müəlliminlə əlaqə saxla — o sənə giriş verəcək.
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
