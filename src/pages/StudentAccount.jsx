import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, ChevronRight, Copy, Flame, Gavel, Globe, Lock, LogOut, Mail, Moon, Shield, Ticket, Trash2, User } from 'lucide-react';
import AppShell from '../components/AppShell';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchStudentHistory } from '../lib/examApi';
import { ACCOUNT_DELETE_PATH, PRIVACY_PATH } from '../lib/contact';
import { studentDuelCode } from '../lib/studentCode';
import { getStudentPhoto, saveStudentPhoto } from '../lib/studentPhoto';
import { readDreamImage } from '../lib/dreamUniversity';
import { examSubject } from '../lib/publicExams';
import { localDb } from '../lib/localDb';
import { TEACHER_TICKET_EVENT } from '../lib/teacherReveal';

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
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [tickets, setTickets] = useState(() => localDb.ticketsForStudent(user?.id));
  const duelCode = studentDuelCode(user);

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
    navigate(user?.practice ? '/' : '/login');
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
            <div className="profile-tile flex flex-col items-center text-center min-[768px]:flex-row min-[768px]:items-center min-[768px]:text-left min-[768px]:gap-5">
              <label className="relative cursor-pointer shrink-0">
                <span className="grid h-[108px] w-[108px] place-items-center overflow-hidden rounded-full border-[3px] border-[#2f7a45] bg-[var(--card)] text-4xl font-black text-[#4cae6e]">
                  {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initial}
                </span>
                <span className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full bg-[#2f7a45] text-white shadow">
                  <Camera size={16} />
                </span>
                <input type="file" accept="image/*" className="sr-only" onChange={onPhoto} />
              </label>
              <div className="min-w-0">
                <p className="mt-2 text-xs font-semibold text-[var(--muted)] min-[768px]:mt-0">Şəkil yüklə (istəyə bağlı)</p>
                <h2 className="mt-2 text-2xl font-extrabold">{user?.fullName || 'Şagird'}</h2>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="profile-tile">
                <p className="text-xs font-bold text-[var(--muted)]">Ən uzun seriya</p>
                <p className="mt-2 flex items-center gap-1 text-2xl font-black">
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
                  <Ticket size={16} className="text-[#4cae6e]" /> Müəllim endirim biletləri
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
            <div className="grid gap-3 min-[1100px]:grid-cols-2">
              <Row>
                <User size={18} className="text-[#4cae6e]" />
                <span>
                  <span className="block text-xs font-bold text-[var(--muted)]">Ad</span>
                  <span className="font-extrabold">{user?.fullName || 'Ad yoxdur'}</span>
                </span>
              </Row>
              <Row>
                <Mail size={18} className="text-[#4cae6e]" />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-[var(--muted)]">E-poçt</span>
                  <span className="break-all font-extrabold">{user?.email}</span>
                </span>
              </Row>
              {duelCode ? (
                <Row onClick={copyCode}>
                  <Copy size={18} className="text-[#4cae6e]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-[var(--muted)]">Abituriyent kodu</span>
                    <span className="font-mono text-lg font-black tracking-wide">{duelCode}</span>
                  </span>
                  <span className="text-xs font-extrabold text-[#4cae6e]">{copied ? 'Kopyalandı' : 'Kopyala'}</span>
                </Row>
              ) : null}
            </div>

            <p className="px-1 pt-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">Tənzimləmə</p>
            <div className="grid gap-3 min-[768px]:grid-cols-2">
              <Row>
                <Globe size={18} className="text-[#4cae6e]" />
                <span className="flex-1">
                  <span className="block font-extrabold">Dil</span>
                  <span className="text-xs font-semibold text-[var(--muted)]">Azərbaycan</span>
                </span>
              </Row>
              <Row onClick={toggle}>
                <Moon size={18} className="text-[#4cae6e]" />
                <span className="flex-1 font-extrabold">{dark ? 'Qaranlıq tema' : 'Açıq fon'}</span>
                <span className={`relative h-7 w-12 rounded-full ${dark ? 'bg-[#2f7a45]' : 'bg-[#d9d3c8]'}`}>
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${dark ? 'right-0.5' : 'left-0.5'}`} />
                </span>
              </Row>
            </div>

            <p className="px-1 pt-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">Tətbiq</p>
            <div className="grid gap-3 min-[768px]:grid-cols-2">
              <Row to={PRIVACY_PATH}>
                <Shield size={18} className="text-[#4cae6e]" />
                <span className="flex-1 font-extrabold">Məxfilik</span>
                <ChevronRight size={16} className="text-[var(--muted)]" />
              </Row>
              <Row to="/terms">
                <Gavel size={18} className="text-[#4cae6e]" />
                <span className="flex-1 font-extrabold">İstifadə şərtləri</span>
                <ChevronRight size={16} className="text-[var(--muted)]" />
              </Row>
              <Row onClick={signOut}>
                <LogOut size={18} />
                <span className="font-extrabold">Çıxış</span>
              </Row>
            </div>

            <Link
              to={ACCOUNT_DELETE_PATH}
              className="flex items-center justify-center gap-2 rounded-[18px] bg-[#fb7185] px-4 py-3.5 text-sm font-extrabold text-white no-underline min-[768px]:max-w-xs"
            >
              <Trash2 size={16} /> Hesabı sil
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
