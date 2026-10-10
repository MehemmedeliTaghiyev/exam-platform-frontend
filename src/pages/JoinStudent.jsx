import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { GraduationCap, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import { fetchGroupInvite, registerStudentInvite } from '../lib/examApi';
import { errorMessage } from '../lib/utils';
import { isPublicGroupCode, isPublicGroupName, PUBLIC_GROUP_NAME } from '../lib/publicGroup';
import { buildStudentEmail, STUDENT_EMAIL_HINT, STUDENT_EMAIL_RE } from '../lib/studentEmail';

export default function JoinStudent() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const namedGroup = String(params.get('group') || '').trim();
  const publicGroup = isPublicGroupCode(code) || isPublicGroupName(namedGroup);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [emailEdited, setEmailEdited] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    fatherName: '',
    phone: '',
    email: '',
    password: '',
  });
  const suggestedEmail = buildStudentEmail(form.firstName, form.lastName, form.fatherName);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setPreview({
        inviteCode: code,
        groupName: namedGroup || (publicGroup ? PUBLIC_GROUP_NAME : 'Qrup'),
        teacherName: '',
      });
      setLoading(false);
      try {
        const data = await fetchGroupInvite(code);
        if (!cancelled && data?.groupName) {
          setPreview({ ...data, groupName: data.groupName || namedGroup || (publicGroup ? PUBLIC_GROUP_NAME : 'Qrup') });
        }
      } catch {
        /* forma açıq qalır */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, namedGroup, publicGroup]);

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') setEmailEdited(value.trim() !== '' && value.trim().toLowerCase() !== suggestedEmail);
    setForm((f) => ({ ...f, [name]: value }));
  };

  const email = (emailEdited ? form.email : suggestedEmail || form.email).trim().toLowerCase();

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    if (!STUDENT_EMAIL_RE.test(email)) {
      setError(`E-poçt ${STUDENT_EMAIL_HINT} formatında olmalıdır. Ad, soyad və ata adı yazılanda ünvan özü yaranır. Adi Gmail qəbul olunmur.`);
      return;
    }
    setSaving(true);
    try {
      const result = await registerStudentInvite({
        inviteCode: code,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        fatherName: form.fatherName.trim(),
        phone: form.phone.trim(),
        email,
        password: form.password,
        independent: publicGroup,
      });
      if (publicGroup) {
        try {
          await login({ email, password: form.password });
          navigate('/student');
          return;
        } catch (err) {
          const apiMsg = err?.response?.data?.message;
          setDone({
            ...result,
            email,
            message: apiMsg
              ? `Hesab yaradıldı (${email}). Giriş hələ bağlıdır: ${apiMsg} Ümumi qrupun sahibi «Yeni şagirdlər»də «Giriş ver» basmalıdır.`
              : 'Ümumi qrupa yazıldınız. E-poçt və şifrə ilə daxil olun.',
          });
          return;
        }
      }
      setDone({
        ...result,
        email,
        message: 'Bu müəllimin qrupundasınız. «Yeni şagirdlər»də icazə verdikdən sonra daxil ola bilərsiniz.',
      });
    } catch (err) {
      setError(errorMessage(err, 'Qeydiyyat göndərilmədi.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10 dark:bg-[#0b1220]">
      <div className="w-full max-w-lg">
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
          {loading ? (
            <p className="text-sm text-gray-500">Link yoxlanılır...</p>
          ) : done ? (
            <>
              <h1 className="text-2xl font-bold">Qeydiyyat göndərildi</h1>
              <p className="mt-3 text-sm text-gray-500">
                {done.message
                  || (publicGroup
                    ? 'Ümumi qrupa yazıldınız. E-poçt və şifrə ilə daxil ola bilərsiniz.'
                    : 'Müəllim «Yeni şagirdlər»də icazə verdikdən sonra e-poçt və şifrə ilə daxil ola bilərsiniz. Şifrəni yadda saxlayın.')}
              </p>
              <p className="mt-2 text-sm font-medium">{done.email}</p>
              <Link to="/login" className="mt-6 inline-block text-sm font-medium text-brand-600">
                Giriş səhifəsinə keç
              </Link>
            </>
          ) : !preview ? (
            <>
              <h1 className="text-2xl font-bold">Link etibarsızdır</h1>
              <p className="mt-3 text-sm text-red-600">{error}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Şagird qeydiyyatı</h1>
              <p className="mt-1 text-sm text-gray-500">
                {publicGroup
                  ? 'Bu ümumi qrupdur. E-poçt ad.soyad_ataadi@gmail.com olur. Adi Gmail qəbul olunmur.'
                  : 'Qrup adı dəyişdirilə bilməz. Yeni şagird yalnız bu qrupu göndərən müəllimin hesabına düşür. E-poçt ad.soyad_ataadi@gmail.com olmalıdır.'}
              </p>
              {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input label="Qrup" value={preview.groupName} readOnly disabled />
                </div>
                <Input label="Ad" name="firstName" required value={form.firstName} onChange={onChange} />
                <Input label="Soyad" name="lastName" required value={form.lastName} onChange={onChange} />
                <div className="sm:col-span-2">
                  <Input label="Ata adı" name="fatherName" required value={form.fatherName} onChange={onChange} />
                </div>
                <div className="sm:col-span-2">
                  <Input label="Əlaqə nömrəsi" name="phone" required value={form.phone} onChange={onChange} />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label={`E-poçt (${STUDENT_EMAIL_HINT})`}
                    type="text"
                    inputMode="email"
                    autoComplete="off"
                    name="email"
                    required
                    value={emailEdited ? form.email : suggestedEmail || form.email}
                    onChange={onChange}
                    placeholder={STUDENT_EMAIL_HINT}
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    {suggestedEmail
                      ? `Giriş ünvanı: ${suggestedEmail}`
                      : 'Ad, soyad və ata adı yazın. Ünvan belə yaranır: nigar.eliyeva_veli@gmail.com'}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Şifrə"
                    type="password"
                    name="password"
                    required
                    minLength={4}
                    value={form.password}
                    onChange={onChange}
                  />
                </div>
                <p className="sm:col-span-2 text-xs text-gray-500">
                  {publicGroup
                    ? 'Şifrəni yadda saxlayın. Bu siyahı adminin «Yeni şagirdlər»inə düşmür.'
                    : 'Şifrəni yadda saxlayın. Göndərdikdən sonra yalnız bu müəllimin «Yeni şagirdlər» siyahısına düşəcəksiniz.'}
                </p>
                <div className="sm:col-span-2">
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? 'Göndərilir...' : 'Təsdiq et və göndər'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
