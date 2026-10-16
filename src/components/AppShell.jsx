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
  Bookmark,
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
    { to: '/student/saved', label: 'Saxlanılanlar', icon: Bookmark },
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
      return item.to === '/teacher' || item.to === '/student' || item.to === '/student/saved' || item.to === '/student/public' || item.to === '/student/teachers';
    }
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate(user?.practice ? '/' : '/login');
  };

  const initial = String(user?.fullName || user?.email || 'E').trim().charAt(0).toUpperCase();
  const fullLabel = String(user?.fullName || user?.email || 'istifadəçi').trim();
  const welcomeName = fullLabel.length <= 28 ? fullLabel : fullLabel.split(/\s+/)[0];

  const itemClass = ({ isActive }) => classNames('ep-focus shell-link', isActive && 'shell-link-active');

  return (
    <div className="shell-page">
      <div className="shell-frame">
        <aside className="shell-side">
          <div className="shell-logo">
            <span className="shell-mark">
              <Zap size={18} fill="currentColor" aria-hidden="true" />
            </span>
            <p className="text-base font-extrabold leading-tight">ExamPulse</p>
          </div>
          <nav className="shell-nav" aria-label="Kabinet menyusu">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} end={item.end} className={itemClass}>
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="shell-user">
            <span className="shell-avatar">{initial}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{user?.fullName || user?.email}</p>
              <p className="text-xs text-white/70">{roleLabel(role)}</p>
            </div>
          </div>
        </aside>

        <div className="shell-main">
          <header className="shell-top" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
            <div className="flex min-w-0 items-center gap-2">
              <p className="shell-welcome">Xoş gəldiniz, {welcomeName}</p>
              {user?.practice ? <span className="rounded-full bg-[var(--warning-bg)] px-2 py-0.5 text-[11px] font-extrabold text-[var(--warning-text)]">Məşq</span> : null}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              {action}
              <p className="shell-identity hidden min-[980px]:flex">
                <span className="max-w-[180px] truncate">{user?.email || user?.fullName}</span>
                <span className="shell-avatar">{initial}</span>
              </p>
              <button type="button" onClick={toggle} className="ep-focus shell-icon-btn" aria-label="Tema">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button type="button" onClick={handleLogout} className="ep-focus shell-logout">
                <LogOut size={15} />
                <span className="max-[860px]:sr-only">Çıxış</span>
              </button>
            </div>
          </header>
          <h1 className="shell-title">{title}</h1>
          <main className={classNames('shell-content', mainClassName)}>{children}</main>
        </div>
      </div>

      <nav
        className="shell-bottom"
        style={{ gridTemplateColumns: `repeat(${Math.max(links.length, 1)}, minmax(0, 1fr))` }}
        aria-label="Kabinet menyusu"
      >
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={`m-${item.to}`} to={item.to} end={item.end} className={itemClass}>
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
