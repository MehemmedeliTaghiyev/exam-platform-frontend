import { NavLink, useNavigate } from 'react-router-dom';
import { useContext, useEffect } from 'react';
import {
  BookOpen,
  Users,
  LogOut,
  Moon,
  Sun,
  Zap,
  Shield,
  KeyRound,
  Mail,
  Sparkles,
  UserPlus,
  MapPin,
  LayoutGrid,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AI_FEATURE_OPEN } from '../lib/driveLinks';
import { normalizeRole, classNames } from '../lib/utils';
import { releaseOpenGroupStudents } from '../lib/examApi';

const navByRole = {
  Teacher: [
    { to: '/teacher', label: 'İmtahanlar', icon: BookOpen, end: true },
    { to: '/teacher/new-students', label: 'Yeni şagirdlər', icon: UserPlus },
    { to: '/teacher/users', label: 'Giriş hüquqları', icon: KeyRound },
    { to: '/teacher/cabinet', label: 'Kabinet', icon: Users },
    { to: '/teacher/ai', label: 'AI özəlliyi', icon: Sparkles },
  ],
  Student: [
    { to: '/student', label: 'İmtahanlarım', icon: BookOpen, end: true },
    { to: '/student/public', label: 'Ümumi zona', icon: LayoutGrid },
    { to: '/student/teachers', label: 'Müəllim tap', icon: MapPin },
  ],
  Admin: [
    { to: '/admin', label: 'İdarə paneli', icon: Shield, end: true },
    { to: '/admin/new-teachers', label: 'Yeni müəllimlər', icon: UserPlus },
    { to: '/admin/teachers', label: 'Müəllim qeydiyyatı', icon: Mail },
    { to: '/admin/users', label: 'Giriş hüquqları', icon: KeyRound },
    { to: '/teacher', label: 'İmtahanlar', icon: BookOpen },
    { to: '/teacher/cabinet', label: 'Kabinet', icon: Users },
    { to: '/teacher/ai', label: 'AI özəlliyi', icon: Sparkles },
  ],
};

function roleLabel(role) {
  if (role === 'Teacher') return 'Müəllim';
  if (role === 'Student') return 'Şagird';
  if (role === 'Admin') return 'Admin';
  return '';
}

export default function AppShell({ title, children, mainClassName = '', action = null }) {
  const { user, logout } = useContext(AuthContext);
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const role = normalizeRole(user?.role);
  useEffect(() => {
    if (!user || user.practice || (role !== 'Teacher' && role !== 'Admin')) return;
    releaseOpenGroupStudents().catch(() => {});
  }, [user, role]);
  const links = (navByRole[role] || navByRole.Student).filter((item) => {
    if (!AI_FEATURE_OPEN && item.to === '/teacher/ai') return false;
    if (user?.practice) {
      return item.to === '/teacher' || item.to === '/student' || item.to === '/student/public' || item.to === '/student/teachers';
    }
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate(user?.practice ? '/' : '/login');
  };

  const initial = String(user?.fullName || user?.email || 'E').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col border-r border-[var(--line)] bg-[var(--card)] p-5 min-[860px]:flex">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[linear-gradient(135deg,#5b4cf5,#22d3ee)] text-white">
            <Zap size={18} fill="currentColor" aria-hidden="true" />
          </div>
          <div>
            <p className="font-extrabold leading-tight">ExamPulse</p>
            <p className="text-xs text-[var(--muted)]">İnkişaf izləmə</p>
          </div>
        </div>
        <nav className="space-y-1">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `ep-focus flex h-[46px] items-center gap-3 rounded-[14px] px-3 text-sm font-semibold ${
                    isActive
                      ? 'bg-[linear-gradient(135deg,#5b4cf5,#7c5cff)] text-white shadow-[0_10px_24px_var(--glow)]'
                      : 'text-[var(--muted)] hover:bg-[var(--accent-soft)]'
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-3 pt-6">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--accent-soft)] font-extrabold text-[var(--accent)]">{initial}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">{user?.fullName || user?.email}</p>
            <p className="text-xs text-[var(--muted)]">{roleLabel(role)}</p>
          </div>
        </div>
      </aside>

      <div className="min-[860px]:pl-[268px]">
        <header
          className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] px-4 backdrop-blur min-[860px]:px-8"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-[22px] font-extrabold">{title}</h1>
            {user?.practice ? (
              <span className="rounded-full bg-[var(--warning-bg)] px-2.5 py-0.5 text-xs font-extrabold text-[var(--warning-text)]">Məşq rejimi</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {action}
            <button type="button" onClick={toggle} className="ep-focus grid h-11 w-11 place-items-center rounded-[14px]" aria-label="Tema">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button type="button" onClick={handleLogout} className="ep-focus inline-flex h-11 items-center gap-2 rounded-[14px] px-3 text-sm font-semibold">
              <LogOut size={16} />
              <span className="max-[860px]:sr-only">Çıxış</span>
            </button>
          </div>
        </header>
        <main className={classNames('mx-auto max-w-[1240px] px-4 py-7 pb-28 min-[860px]:px-8 min-[860px]:pb-7', mainClassName)}>{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-[var(--line)] bg-[var(--card)] min-[860px]:hidden"
        style={{ gridTemplateColumns: `repeat(${Math.max(links.length, 1)}, minmax(0, 1fr))`, paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Kabinet menyusu"
      >
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `ep-focus flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
