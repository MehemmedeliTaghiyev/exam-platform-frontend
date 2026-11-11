import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, ChevronRight, Copy, CreditCard, Flame, Gavel, Globe, Lock, LogOut, Moon, Shield, Ticket, Trash2, Wallet } from 'lucide-react';
import AppShell from '../components/AppShell';
import PaymentCheckoutModal from '../components/PaymentCheckoutModal';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LanguageSwitch, useLocale } from '../context/LocaleContext';
import { findProfileConflict, fetchStudentHistory, updateStudentProfile } from '../lib/examApi';
import { errorMessage } from '../lib/utils';
import { Button, Input } from '../components/ui';
import { ACCOUNT_DELETE_PATH, PRIVACY_PATH } from '../lib/contact';
import { studentDuelCode } from '../lib/studentCode';
import { getStudentPhoto, saveStudentPhoto } from '../lib/studentPhoto';
import { readDreamImage } from '../lib/dreamUniversity';
import { examSubject } from '../lib/publicExams';
import { localDb } from '../lib/localDb';
import { TEACHER_TICKET_EVENT } from '../lib/teacherReveal';
import { topUpWallet, useStudentWallet, WALLET_PACKS } from '../lib/studentWallet';
import { formatManat } from '../lib/teacherAccess';

const MEDALS = [
  { days: 3, label: '3 gün' },
  { days: 7, label: '7 gün' },
  { days: 15, label: '15 gün' },
  { days: 30, label: '30 gün' },
];

function dayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function streakFromHistory(history = []) {
  const days = new Set(
    history
      .map((row) => dayKey(row.submittedAt || row.SubmittedAt))
      .filter(Boolean),
  );
  if (!days.size) return 0;
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = dayKey(cursor);
    if (!days.has(key)) {
      if (streak === 0) {
        cursor.setDate(cursor.getDate() - 1);
        if (!days.has(dayKey(cursor))) return 0;
        continue;
      }
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function favoriteSubject(history = []) {
  const counts = new Map();
  history.forEach((row) => {
    const name = examSubject(row) || row.subjectName || row.SubjectName || '';
    if (!name || name === 'Fənn') return;
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  let best = '';
  let max = 0;
  counts.forEach((n, name) => {
    if (n > max) {
      max = n;
      best = name;
    }
  });
  return best;
}

function Row({ children, to, onClick }) {
  const className = 'profile-tile flex w-full items-center gap-3 text-left no-underline text-[var(--text)]';
  if (to) {
    return <Link to={to} className={className}>{children}</Link>;
  }
  if (onClick) {
    return <button type="button" onClick={onClick} className={className}>{children}</button>;
  }
  return <div className={className}>{children}</div>;
}

export default function StudentAccount() {
  const { user, logout, patchUser } = useContext(AuthContext);
  const { dark, toggle } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [tickets, setTickets] = useState(() => localDb.ticketsForStudent(user?.id));
  const duelCode = studentDuelCode(user);
  const wallet = useStudentWallet(user);
  const [pick, setPick] = useState(5);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupMsg, setTopupMsg] = useState('');
  const [profile, setProfile] = useState(() => ({
    firstName: user?.firstName || String(user?.fullName || '').trim().split(/\s+/)[0] || '',
    lastName: user?.lastName || String(user?.fullName || '').trim().split(/\s+/).slice(1).join(' ') || '',
    fatherName: user?.fatherName || '',
    email: user?.email || '',
  }));
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchStudentHistory(user.id).then(setHistory).catch(() => setHistory([]));
    const refresh = () => setTickets(localDb.ticketsForStudent(user.id));
    refresh();
    window.addEventListener(TEACHER_TICKET_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(TEACHER_TICKET_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [user?.id]);

  const streak = useMemo(() => streakFromHistory(history), [history]);
  const drills = history.filter((row) => row.submittedAt || row.SubmittedAt).length;
  const subject = useMemo(() => favoriteSubject(history), [history]);
  const initial = String(user?.fullName || user?.email || 'Ş').trim().charAt(0).toUpperCase();
  const photo = user?.photo || getStudentPhoto(user?.id);
  const opened = MEDALS.filter((row) => streak >= row.days).length;

  const signOut = () => {
    logout();
    navigate('/', { replace: true });
  };

  const onPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user?.id) return;
    try {
      const dataUrl = await readDreamImage(file);
      saveStudentPhoto(user.id, dataUrl);
      patchUser?.({ photo: dataUrl });
    } catch {
      /* ignore invalid file */
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const firstName = String(profile.firstName || '').trim();
    const lastName = String(profile.lastName || '').trim();
    const fatherName = String(profile.fatherName || '').trim();
    const email = String(profile.email || '').trim();
    const fullName = [firstName, lastName, fatherName].filter(Boolean).join(' ');
    if (!firstName || !email) {
      setProfileErr('Ad və e-poçt boş ola bilməz.');
      setProfileMsg('');
      return;
    }
    setSavingProfile(true);
    setProfileErr('');
    setProfileMsg('');
    try {
      const clash = await findProfileConflict({ userId: user.id, fullName, email });
      if (clash.emailTaken) {
        setProfileErr('Bu e-poçt artıq istifadə olunur.');
        return;
      }
      if (clash.nameTaken) {
        setProfileErr('Bu ad artıq qeydiyyatdadır.');
        return;
      }
      const saved = await updateStudentProfile(user.id, { firstName, lastName, fatherName, email }).catch(() => null);
      patchUser?.({
        ...(saved || {}),
        firstName,
        lastName,
        fatherName,
        email,
        fullName: saved?.fullName || fullName,
      });
      setProfileMsg('Məlumatlar yadda saxlanıldı.');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) setProfileErr('Bu ad və ya e-poçt artıq var.');
      else setProfileErr(errorMessage(err, 'Məlumat saxlanılmadı.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const copyCode = async () => {
    if (!duelCode) return;
    try {
      await navigator.clipboard.writeText(duelCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AppShell title="Profil">
      <div className="desk-page space-y-4 pb-4">
        <div className="desk-split desk-split-profile">
          <div className="space-y-4">
            <div className="profile-tile flex flex-col items-center text-center min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:text-left min-[1024px]:gap-5">
              <label className="relative cursor-pointer shrink-0">
                <span className="grid h-[clamp(76px,22vw,108px)] w-[clamp(76px,22vw,108px)] place-items-center overflow-hidden rounded-full border-[3px] border-[var(--accent)] bg-[var(--card)] text-[clamp(1.4rem,5vw,2.25rem)] font-black text-[var(--accent)]">
                  {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initial}
                </span>
                <span className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-[#3a2200] shadow">
                  <Camera size={16} />
                </span>
                <input type="file" accept="image/*" className="sr-only" onChange={onPhoto} />
              </label>
              <div className="min-w-0">
                <p className="mt-2 text-xs font-semibold text-[var(--muted)] min-[1024px]:mt-0">Şəkil yüklə (istəyə bağlı)</p>
                <h2 className="mt-2 text-[clamp(1.15rem,4.4vw,1.5rem)] font-extrabold leading-tight">{user?.fullName || 'Şagird'}</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{user?.email}</p>
              </div>
            </div>

            <div className="profile-tile">
              <div className="flex items-center justify-between">
                <p className="font-extrabold">Medallar</p>
                <p className="text-xs font-bold text-[var(--muted)]">{opened}/{MEDALS.length} açıq</p>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {MEDALS.map((row) => {
                  const on = streak >= row.days;
                  return (
                    <div key={row.days} className="text-center">
                      <span className={`medal-hex ${on ? 'on' : ''}`}>
                        {on ? <Flame size={18} /> : <Lock size={14} />}
                      </span>
                      <p className="mt-2 text-[11px] font-extrabold leading-tight">{row.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="profile-tile">
              <p className="flex items-center gap-1 text-xs font-bold text-[var(--muted)]">
                <Wallet size={13} /> Pul hesabı
              </p>
              <p className="mt-2 text-[clamp(1.2rem,4.5vw,1.5rem)] font-black tabular-nums">{formatManat(wallet.balance)}</p>
              <p className="mt-2 text-[11px] font-semibold text-[var(--accent)]">Balans artırma tezliklə açılacaq</p>
              <p className="mt-4 text-xs font-extrabold">Hesabı artır</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {WALLET_PACKS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setPick(amount)}
                    className={`rounded-xl px-1 py-2 text-center text-xs font-black ${
                      pick === amount ? 'bg-[var(--accent)] text-[#3a2200]' : 'bg-[var(--bg)]'
                    }`}
                  >
                    {formatManat(amount)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setTopupOpen(false); setTopupMsg('Balans artırma tezliklə açılacaq.'); }}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#ffb84a,#f5a623)] px-4 text-sm font-extrabold text-[#3a2200]"
              >
                <CreditCard size={15} /> Tezliklə
              </button>
              {topupMsg ? <p className="mt-2 text-xs font-bold text-[var(--accent)]">{topupMsg}</p> : null}
              <button
                type="button"
                onClick={() => navigate('/student/wallet')}
                className="mt-2 text-xs font-bold text-[var(--muted)] underline-offset-2 hover:underline"
              >
                Hərəkətlərə bax
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="profile-tile">
                <p className="text-xs font-bold text-[var(--muted)]">Ən uzun seriya</p>
                <p className="mt-2 flex items-center gap-1 text-[clamp(1.2rem,4.5vw,1.5rem)] font-black">
                  {streak} <Flame size={18} className="text-[#f0b429]" />
                </p>
              </div>
              <div className="profile-tile">
                <p className="text-xs font-bold text-[var(--muted)]">Sevimli fənn</p>
                <p className="mt-2 text-lg font-black leading-tight">{subject || 'hələ yoxdur'}</p>
                <p className="mt-2 text-[11px] font-semibold text-[var(--muted)]">{drills} imtahan həll edilib</p>
              </div>
            </div>
            {tickets.length ? (
              <div className="profile-tile">
                <p className="flex items-center gap-2 font-extrabold">
                  <Ticket size={16} className="text-[var(--accent)]" /> Müəllim endirim biletləri
                </p>
                <div className="mt-3 space-y-2">
                  {tickets.map((item) => (
                    <div key={item.id || item.code} className="rounded-xl bg-[var(--bg)] px-3 py-2">
                      <p className="font-mono text-sm font-black">{item.code}</p>
                      <p className="mt-0.5 text-xs font-semibold text-[var(--muted)]">
                        {item.teacherName || 'Müəllim'}
                        {item.usedAt ? ' · istifadə olunub' : ' · aktiv'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">Məlumat</p>
            <form onSubmit={saveProfile} className="profile-tile space-y-3">
              <div className="grid gap-3 min-[1024px]:grid-cols-2">
                <Input label="Ad" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} required />
                <Input label="Soyad" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
              </div>
              <Input label="Ata adı" value={profile.fatherName} onChange={(e) => setProfile({ ...profile, fatherName: e.target.value })} />
              <Input label="E-poçt" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required />
              {profileErr ? <p className="text-sm font-bold text-[#fb7185]">{profileErr}</p> : null}
              {profileMsg ? <p className="text-sm font-bold text-[#2ee07a]">{profileMsg}</p> : null}
              <Button type="submit" disabled={savingProfile} className="w-full min-[1024px]:w-auto">
                {savingProfile ? 'Yoxlanır...' : 'Yadda saxla'}
              </Button>
            </form>
            <div className="grid gap-3 min-[1100px]:grid-cols-2">
              {duelCode ? (
                <Row onClick={copyCode}>
                  <Copy size={18} className="text-[var(--accent)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-[var(--muted)]">Abituriyent kodu</span>
                    <span className="font-mono text-lg font-black tracking-wide">{duelCode}</span>
                  </span>
                  <span className="text-xs font-extrabold text-[var(--accent)]">{copied ? 'Kopyalandı' : 'Kopyala'}</span>
                </Row>
              ) : null}
            </div>

            <p className="px-1 pt-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">{t('common.settings')}</p>
            <div className="grid gap-3">
              <Row>
                <Globe size={18} className="shrink-0 text-[var(--accent)]" />
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{t('account.language')}</span>
                  <LanguageSwitch compact className="mt-2" />
                </span>
              </Row>
              <Row onClick={toggle}>
                <Moon size={18} className="shrink-0 text-[var(--accent)]" />
                <span className="min-w-0 flex-1 font-extrabold">{dark ? t('common.darkTheme') : t('common.lightTheme')}</span>
                <span className={`relative h-7 w-12 shrink-0 rounded-full ${dark ? 'bg-[var(--accent)]' : 'bg-[#d9d3c8]'}`}>
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-[#F2EDE0] transition ${dark ? 'right-0.5' : 'left-0.5'}`} />
                </span>
              </Row>
            </div>

            <p className="px-1 pt-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">Tətbiq</p>
            <div className="grid gap-3">
              <Row to={PRIVACY_PATH}>
                <Shield size={18} className="text-[var(--accent)]" />
                <span className="flex-1 font-extrabold">Məxfilik</span>
                <ChevronRight size={16} className="text-[var(--muted)]" />
              </Row>
              <Row to="/terms">
                <Gavel size={18} className="text-[var(--accent)]" />
                <span className="flex-1 font-extrabold">İstifadə şərtləri</span>
                <ChevronRight size={16} className="text-[var(--muted)]" />
              </Row>
              <Row onClick={signOut}>
                <LogOut size={18} />
                <span className="font-extrabold">{t('common.logout')}</span>
              </Row>
              <Row to={ACCOUNT_DELETE_PATH}>
                <Trash2 size={18} className="text-[#e11d48]" />
                <span className="flex-1 font-extrabold text-[#e11d48]">Hesabı sil</span>
                <ChevronRight size={16} className="text-[var(--muted)]" />
              </Row>
            </div>
          </div>
        </div>
      </div>
      <PaymentCheckoutModal
        open={topupOpen}
        busy={topupBusy}
        plan={{
          id: 'wallet',
          title: 'Hesabı artır',
          price: pick,
          hint: 'Kartla ExamPulse hesabınız doldurulur. Sonra ödənişlər bu balansdan keçir.',
        }}
        onClose={() => setTopupOpen(false)}
        onConfirm={() => {
          setTopupOpen(false);
          setTopupMsg('Balans artırma tezliklə açılacaq.');
        }}
      />
    </AppShell>
  );
}
