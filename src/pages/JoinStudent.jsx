import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Header from '../components/home/Header';
import { Button, FormError, Input, Select } from '../components/ui';
import { AZERBAIJAN_UNIVERSITIES, universityById } from '../lib/azerbaijanUniversities';
import { fetchGroupInvite, registerStudentInvite } from '../lib/examApi';
import { errorMessage } from '../lib/utils';
import { isPublicGroupCode, isPublicGroupName, PUBLIC_GROUP_CODE, PUBLIC_GROUP_NAME } from '../lib/publicGroup';
import { groupNeedsApproval } from '../lib/groupApproval';
import { buildStudentEmail, STUDENT_EMAIL_HINT, STUDENT_EMAIL_RE } from '../lib/studentEmail';
import { localDb } from '../lib/localDb';
import { subscribeToGroup } from '../lib/groupSubscriptions';
import '../components/home/home.css';

function subscriptionFromInvite({ inviteCode, preview, namedGroup, publicGroup }) {
  const numeric = String(inviteCode || '').replace(/^g/i, '');
  const fromCode = Number.isFinite(Number(numeric)) ? Number(numeric) : null;
  return {
    groupId: preview?.groupId ?? preview?.GroupId ?? fromCode,
    groupName: preview?.groupName || namedGroup || (publicGroup ? PUBLIC_GROUP_NAME : 'Qrup'),
    teacherName: preview?.teacherName || '',
    teacherId: preview?.teacherId ?? preview?.TeacherId ?? null,
    inviteCode: preview?.inviteCode || inviteCode,
  };
}

export default function JoinStudent() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const namedGroup = String(params.get('group') || '').trim();
  const icaze = String(params.get('icaze') || '').trim().toLowerCase();
  const { user, login, completeLogin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const publicFromLink = isPublicGroupCode(code) || isPublicGroupName(namedGroup);
  const publicGroup = publicFromLink
    || isPublicGroupName(preview?.groupName)
    || isPublicGroupName(preview?.groupNumber || preview?.number)
    || isPublicGroupCode(preview?.inviteCode);
  const inviteCode = publicFromLink ? PUBLIC_GROUP_CODE : String(code || '').trim();
  const previewOpen = preview
    ? !groupNeedsApproval({
      name: preview.groupName,
      number: preview.groupNumber || preview.number,
      inviteCode: preview.inviteCode || inviteCode,
      approvalRequired: preview.approvalRequired,
    })
    : false;
  const openJoin = publicGroup || previewOpen || icaze === 'yox' || icaze === '0';
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
    dreamUniversity: '',
    dreamMajor: '',
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
        const data = await fetchGroupInvite(inviteCode);
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
  }, [code, namedGroup, publicGroup, inviteCode]);

  useEffect(() => {
    if (!user || user.practice || user.role !== 'Student' || !preview) return;
    const row = subscribeToGroup(user, subscriptionFromInvite({
      inviteCode,
      preview,
      namedGroup,
      publicGroup,
    }));
    navigate('/student', { replace: true });
  }, [user, preview, inviteCode, namedGroup, publicGroup, navigate]);

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
    const problems = [];
    if (!form.firstName.trim() || !form.lastName.trim() || !form.fatherName.trim()) {
      problems.push('Ad, soyad və ata adını yazın.');
    }
    if (!/^\+?\d[\d\s()-]{6,}$/.test(form.phone.trim())) {
      problems.push('Valideynin WhatsApp nömrəsini rəqəmlə yazın. Məsələn: 0501234567.');
    }
    if (!STUDENT_EMAIL_RE.test(email)) {
      problems.push(`E-poçt ${STUDENT_EMAIL_HINT} olmalıdır. Ad, soyad və ata adı yazılanda ünvan özü yaranır. Adi Gmail qəbul olunmur.`);
    }
    if (String(form.password || '').length < 4) problems.push('Şifrə ən azı 4 simvol olmalıdır.');
    if (problems.length) {
      setError(problems.join('\n'));
      return;
    }
    setSaving(true);
    try {
      if (form.dreamUniversity.trim() || form.dreamMajor.trim()) {
        const uni = universityById(form.dreamUniversity.trim());
        if (form.dreamUniversity.trim() && !uni) {
          setError('Universiteti siyahıdan seçin.');
          setSaving(false);
          return;
        }
        localDb.saveDreamPending(email, {
          universityId: uni?.id || '',
          university: uni?.name || '',
          major: form.dreamMajor.trim(),
          image: uni?.image || '',
        });
      }
      const result = await registerStudentInvite({
        inviteCode,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        fatherName: form.fatherName.trim(),
        phone: form.phone.trim(),
        email,
        password: form.password,
        independent: openJoin,
      });
      if (openJoin) {
        try {
          const token = result?.token || result?.Token || result?.accessToken;
          let signed = null;
          if (token) {
            signed = completeLogin({
              ...result,
              token,
              email: result.email || result.Email || email,
              role: result.role || result.Role || 'Student',
            });
          } else {
            signed = await login({ email, password: form.password });
          }
          const row = subscribeToGroup(signed || { id: result?.id, role: 'Student', email }, subscriptionFromInvite({
            inviteCode,
            preview,
            namedGroup,
            publicGroup,
          }));
          navigate('/student', { replace: true });
          return;
        } catch (err) {
          const apiMsg = err?.response?.data?.message;
          setDone({
            ...result,
            email,
            message: apiMsg
              ? `Hesab yaradıldı (${email}). Bu qrupda müəllim icazəsi tələb olunmur. Giriş hələ açılmayıbsa bir neçə saniyə sonra yenidən daxil olun.`
              : 'Qrupa yazıldınız. E-poçt və şifrə ilə daxil ola bilərsiniz.',
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

  if (user && !user.practice && user.role === 'Student') {
    return (
      <div className="home-page flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-[var(--hp-line)] bg-[var(--hp-card)] p-8 text-center text-[var(--hp-text)] shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <p className="text-lg font-extrabold">Qrupa abunə olunur...</p>
          <p className="mt-2 text-sm text-[var(--hp-muted)]">{preview?.groupName || 'Qrup'} Abunələr siyahınıza əlavə edilir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page min-h-screen">
      <Header hideAuth />
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <div className="rounded-2xl border border-[var(--hp-line)] bg-[var(--hp-card)] p-8 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <p className="mb-4">
            <Link to="/register" className="text-sm font-extrabold text-[var(--hp-accent)] underline decoration-2 underline-offset-4">
              ← Geri
            </Link>
          </p>
          {loading ? (
            <p className="text-sm text-gray-500">Link yoxlanılır...</p>
          ) : done ? (
            <>
              <h1 className="text-2xl font-bold">Qeydiyyat göndərildi</h1>
              <p className="mt-3 text-sm text-gray-500">
                {done.message
                  || (openJoin
                    ? 'Qrupa yazıldınız. E-poçt və şifrə ilə daxil ola bilərsiniz.'
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
              <h1 className="text-2xl font-bold text-[var(--hp-text)]">Şagird qeydiyyatı</h1>
              <p className="mt-1 text-sm text-[var(--hp-muted)]">
                {publicGroup
                  ? 'Bu ümumi qrupdur. E-poçt ad.soyad_ataadi@gmail.com olur. Adi Gmail qəbul olunmur. Müəllimin icazəsi tələb olunmur.'
                  : openJoin
                    ? 'Bu qrupda müəllimin icazəsi tələb olunmur. Qeydiyyatdan sonra e-poçt və şifrə ilə daxil ola bilərsiniz.'
                    : 'Qrup adı dəyişdirilə bilməz. Yeni şagird yalnız bu qrupu göndərən müəllimin hesabına düşür və icazədən sonra daxil olur. E-poçt ad.soyad_ataadi@gmail.com olmalıdır.'}
              </p>
              {error ? <div className="mt-4 sm:col-span-2"><FormError message={error} /></div> : null}
              <form onSubmit={submit} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input label="Qrup" value={preview.groupName} readOnly disabled />
                </div>
                <Input label="Ad" name="firstName" required value={form.firstName} onChange={onChange} />
                <Input label="Soyad" name="lastName" required value={form.lastName} onChange={onChange} />
                <div className="sm:col-span-2">
                  <Input label="Ata adı" name="fatherName" required value={form.fatherName} onChange={onChange} />
                </div>
                <div className="sm:col-span-2">
                  <Input label="Valideynin WhatsApp nömrəsi" name="phone" required value={form.phone} onChange={onChange} placeholder="0501234567" />
                  <p className="mt-1.5 text-xs text-[var(--hp-muted)]">İmtahan bitəndə ətraflı nəticə bu nömrəyə açılır.</p>
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
                  <p className="mt-1.5 text-xs text-[var(--hp-muted)]">
                    {suggestedEmail
                      ? `Giriş ünvanı: ${suggestedEmail}`
                      : 'Ad, soyad və ata adı yazın. Ünvan belə yaranır: nigar.eliyeva_veli@gmail.com'}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Select
                    label="Hədəflədiyin universitet"
                    name="dreamUniversity"
                    value={form.dreamUniversity}
                    onChange={onChange}
                  >
                    <option value="">Azərbaycan universitetlərindən seç</option>
                    {AZERBAIJAN_UNIVERSITIES.map((row) => (
                      <option key={row.id} value={row.id}>{row.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="İxtisas"
                    name="dreamMajor"
                    value={form.dreamMajor}
                    onChange={onChange}
                    placeholder="Arzu etdiyiniz ixtisas"
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
                <p className="sm:col-span-2 text-xs text-[var(--hp-muted)]">
                  {openJoin
                    ? 'Şifrəni yadda saxlayın. Bu qrupda «Giriş ver» gözlənilmir.'
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
