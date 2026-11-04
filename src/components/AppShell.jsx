import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useContext, useEffect } from 'react';
import {
  Archive,
  BookOpen,
  Home,
  TrendingDown,
  Users,
  LogOut,
  KeyRound,
  Mail,
  Sparkles,
  UserPlus,
  MapPin,
  Trophy,
  ListTree,
  UserRound,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { AI_FEATURE_OPEN } from '../lib/driveLinks';
import { isNativeApp } from '../lib/runtime';
import { normalizeRole, classNames } from '../lib/utils';
import { releaseOpenGroupStudents, releasePendingTeachers } from '../lib/examApi';
import { useTeacherTokens } from '../lib/tokens';
import BrandLogo from './BrandLogo';
import MonthlyExamAd from './MonthlyExamAd';

function isAdminExamNav(pathname) {
  return (
    pathname === '/teacher'
    || pathname.startsWith('/teacher/exams')
    || pathname.startsWith('/admin/exams')
  );
}

const navByRole = {
  Teacher: [
    { to: '/teacher', label: 'İmtahanlar', icon: BookOpen, end: true },
    { to: '/teacher/storage', label: 'Anbar', icon: Archive },
    { to: '/teacher/weak', label: 'Zəif suallar', icon: TrendingDown },
    { to: '/teacher/new-students', label: 'Yeni şagirdlər', icon: UserPlus },
    { to: '/teacher/users', label: 'Giriş hüquqları', icon: KeyRound },
    { to: '/teacher/cabinet', label: 'Kabinet', icon: Users },
    { to: '/teacher/ai', label: 'AI özəlliyi', icon: Sparkles },
  ],
  Student: [
    { to: '/student', label: 'Ev', icon: Home, end: true },
    { to: '/student/syllabus', label: 'Sillabus', icon: ListTree },
    { to: '/student/public', label: 'İmtahan yeri', icon: BookOpen },
    { to: '/student/teachers', label: 'Müəllim tap', icon: MapPin },
    { to: '/student/republic', label: 'Respublika', icon: Trophy },
    { to: '/student/account', label: 'Profil', icon: UserRound },
  ],
  Admin: [
    { to: '/admin', label: 'Ev', icon: Home, end: true },
    { to: '/admin/teachers', label: 'Müəllim qeydiyyatı', icon: Mail },
    { to: '/admin/users', label: 'Hesablar', icon: KeyRound },
    { to: '/teacher', label: 'İmtahanlar', icon: BookOpen, end: true, activeWhen: isAdminExamNav },
    { to: '/teacher/storage', label: 'Anbar', icon: Archive },
    { to: '/teacher/weak', label: 'Zəif suallar', icon: TrendingDown },
    { to: '/teacher/cabinet', label: 'Kabinet', icon: Users },
    { to: '/teacher/ai', label: 'AI özəlliyi', icon: Sparkles },
  ],
};

const studentMobileNav = [
  { to: '/student', label: 'Ev', icon: Home, end: true },
  { to: '/student/syllabus', label: 'Sillabus', icon: ListTree },
  { to: '/student/republic', label: 'Ay', icon: Trophy, featured: true },
  { to: '/student/public', label: 'İmtahan', icon: BookOpen },
  { to: '/student/account', label: 'Profil', icon: UserRound },
];

const teacherMobileNav = [
  { to: '/teacher', label: 'İmtahan', icon: BookOpen, end: true },
  { to: '/teacher/storage', label: 'Anbar', icon: Archive },
  { to: '/teacher/weak', label: 'Zəif', icon: TrendingDown },
  { to: '/teacher/new-students', label: 'Şagird', icon: UserPlus },
  { to: '/teacher/cabinet', label: 'Kabinet', icon: Users },
];

const adminMobileNav = [
  { to: '/admin', label: 'Ev', icon: Home, end: true },
  { to: '/admin/teachers', label: 'Müəllim', icon: Mail },
  { to: '/admin/users', label: 'Hesab', icon: KeyRound },
  { to: '/teacher', label: 'İmtahan', icon: BookOpen, end: true, activeWhen: isAdminExamNav },
  { to: '/teacher/cabinet', label: 'Kabinet', icon: Users },
];

function roleLabel(role) {
  if (role === 'Teacher') return 'Müəllim';
  if (role === 'Student') return 'Şagird';
  if (role === 'Admin') return 'Admin';
  return '';
}

function QepikMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#e8b84a" />
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="#c4921f" strokeWidth="1.15" />
      <text x="12" y="16.2" textAnchor="middle" fontSize="11" fontWeight="800" fill="#6b4a08">q</text>
    </svg>
  );
}

export default function AppShell({ title, children, mainClassName = '', action = null }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const role = normalizeRole(user?.role);
  const tokens = useTeacherTokens(user);
  useEffect(() => {
    if (!user || user.practice || (role !== 'Teacher' && role !== 'Admin')) return;
    releaseOpenGroupStudents().catch(() => {});
    if (role === 'Admin') releasePendingTeachers().catch(() => {});
  }, [user, role]);
  const links = (navByRole[role] || navByRole.Student).filter((item) => {
    if (!AI_FEATURE_OPEN && item.to === '/teacher/ai') return false;
    if (item.to === '/teacher/storage' && !isNativeApp() && !import.meta.env.DEV) return false;
    if (user?.practice) {
      return item.to === '/teacher' || item.to === '/teacher/storage' || item.to === '/teacher/weak' || item.to === '/teacher/cabinet' || item.to === '/teacher/new-students' || item.to === '/admin' || item.to === '/admin/teachers' || item.to === '/admin/users' || item.to === '/admin/exams' || item.to === '/student' || item.to === '/student/syllabus' || item.to === '/student/public' || item.to === '/student/teachers' || item.to === '/student/republic' || item.to === '/student/account';
    }
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate(user?.practice ? '/' : '/login');
  };

  const fullLabel = role === 'Admin'
    ? 'Admin'
    : String(user?.fullName || user?.email || 'istifadəçi').trim();
  const welcomeName = fullLabel.length <= 28 ? fullLabel : fullLabel.split(/\s+/)[0];

  const itemClass = (item, { isActive }) => {
    const active = item.activeWhen ? item.activeWhen(location.pathname) : isActive;
    return classNames('ep-focus shell-link', active && 'shell-link-active');
  };
  const mobileNav = role === 'Student'
    ? studentMobileNav
    : role === 'Teacher'
      ? teacherMobileNav.filter((item) => {
        if (item.to === '/teacher/storage' && !isNativeApp() && !import.meta.env.DEV) return false;
        return true;
      })
      : role === 'Admin'
        ? adminMobileNav
        : links;

  return (
    <div className={classNames('shell-page', role === 'Student' && 'shell-student')}>
      <div className="shell-frame">
        <aside className="shell-side">
          <div className="shell-logo">
            <BrandLogo size={32} nameClassName="text-white" />
          </div>
          <nav className="shell-nav" aria-label="Kabinet menyusu">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} end={item.end} className={(state) => itemClass(item, state)}>
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="shell-user">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">{role === 'Admin' ? 'Admin' : (user?.fullName || 'İstifadəçi')}</p>
              <p className="text-xs text-white/70">{roleLabel(role)}</p>
            </div>
            <button type="button" onClick={handleLogout} className="ep-focus text-xs font-extrabold text-white/80">
              Çıxış
            </button>
          </div>
        </aside>

        <div className="shell-main">
          <header className="shell-top" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <p className="shell-welcome">Xoş gəldiniz, {welcomeName}</p>
            <div className="flex min-w-0 items-center gap-2">
              {role === 'Teacher' ? (
                <button
                  type="button"
                  className="shell-jeton"
                  onClick={() => navigate('/teacher/cabinet')}
                  aria-label="Qəpik hesabı"
                >
                  <QepikMark />
                  <span>{tokens.unlimited ? '∞' : tokens.balance}</span>
                </button>
              ) : null}
              {role === 'Teacher' || role === 'Admin' ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="ep-focus inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-extrabold text-[var(--muted)]"
                >
                  <LogOut size={16} />
                  <span className="max-[767px]:sr-only">Çıxış</span>
                </button>
              ) : null}
              {action}
            </div>
          </header>
          {title ? <h1 className="shell-title">{title}</h1> : null}
          <main className={classNames('shell-content', mainClassName)}>
            {role === 'Admin' ? null : <MonthlyExamAd />}
            {children}
          </main>
        </div>
      </div>

      <nav
        className={classNames(
          'shell-bottom',
          role === 'Student' && 'shell-bottom-pill',
          (role === 'Teacher' || role === 'Admin') && 'shell-bottom-teacher',
        )}
        style={{ gridTemplateColumns: `repeat(${Math.max(mobileNav.length, 1)}, minmax(0, 1fr))` }}
        aria-label="Kabinet menyusu"
      >
        {mobileNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={`m-${item.to}`}
              to={item.to}
              end={item.end}
              className={(state) => classNames(itemClass(item, state), item.featured && 'shell-link-featured')}
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
