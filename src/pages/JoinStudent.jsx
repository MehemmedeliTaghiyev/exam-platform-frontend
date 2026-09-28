import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { GraduationCap, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Button, Input } from '../components/ui';
import { fetchGroupInvite, registerStudentInvite } from '../lib/examApi';
import { errorMessage } from '../lib/utils';

const EMAIL_HINT = 'ad.soyad_ataadi@gmail.com';
const EMAIL_RE = /^[a-z0-9əöüğçşı]+\.[a-z0-9əöüğçşı]+_[a-z0-9əöüğçşı]+@gmail\.com$/i;

export default function JoinStudent() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const namedGroup = String(params.get('group') || '').trim();
  const { dark, toggle } = useTheme();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const localPreview = namedGroup || /^g\d+$/i.test(String(code || ''))
        ? {
            inviteCode: code,
            groupName: namedGroup || 'Qrup',
            teacherName: '',
          }
        : null;
      if (localPreview) {
        setPreview(localPreview);
        setLoading(false);
        try {
          const data = await fetchGroupInvite(code);
          if (!cancelled && data?.groupName) {
            setPreview({ ...data, groupName: data.groupName || namedGroup });
          }
        } catch {
          /* qrup adı linkdə var; API cavab verməsə də forma açıq qalır */
        }
        return;
      }
      try {
        const data = await fetchGroupInvite(code);
        if (!cancelled) setPreview({ ...data, groupName: data.groupName || namedGroup });
      } catch (err) {
        if (!cancelled) {
          setPreview(null);
          setError(errorMessage(err, 'Qeydiyyat linki etibarsızdır.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, namedGroup]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setError(`E-poçt ${EMAIL_HINT} formatında olmalıdır.`);
      return;
    }
    setSaving(true);
    try {
      const result = await registerStudentInvite({
        inviteCode: code,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email,
        password: form.password,
      });
      setDone(result);
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
                {done.message || 'Müəllim təsdiq edəndən sonra e-poçt və şifrə ilə daxil ola bilərsiniz. Şifrəni yadda saxlayın.'}
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
              <p className="mt-1 text-sm text-gray-500">Qrup adı dəyişdirilə bilməz. Müəllim icazə verdikdən sonra daxil olacaqsınız.</p>
              {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input label="Qrup" value={preview.groupName} readOnly disabled />
                </div>
                <Input label="Ad" name="firstName" required value={form.firstName} onChange={onChange} />
                <Input label="Soyad" name="lastName" required value={form.lastName} onChange={onChange} />
                <div className="sm:col-span-2">
                  <Input label="Əlaqə nömrəsi" name="phone" required value={form.phone} onChange={onChange} />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label={`E-poçt (${EMAIL_HINT})`}
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={onChange}
                    placeholder={EMAIL_HINT}
                  />
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
                  Şifrə hərf və rəqəm qarışığı ola bilər. Yadda saxlayın. Göndərdikdən sonra müəllimin «Yeni şagirdlər» siyahısına düşəcəksiniz.
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
