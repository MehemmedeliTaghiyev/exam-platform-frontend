import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
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
  Bell,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { AI_FEATURE_OPEN } from '../lib/driveLinks';
import { isNativeApp } from '../lib/runtime';
import { normalizeRole, classNames } from '../lib/utils';
import { useLocale } from '../context/LocaleContext';
import { releaseOpenGroupStudents, releasePendingTeachers } from '../lib/examApi';
import { useTeacherTokens } from '../lib/tokens';
import { useStudentWallet } from '../lib/studentWallet';
import BrandLogo from './BrandLogo';
import MonthlyExamAd from './MonthlyExamAd';
import StudentAlerts from './StudentAlerts';
import { enableUrgentPush, notificationPermission } from '../lib/pushNotify';

function isAdminExamNav(pathname) {
  return (
    pathname === '/teacher'
    || pathname.startsWith('/teacher/exams')
    || pathname.startsWith('/admin/exams')
  );
}

const navByRole = {
  Teacher: [
    { to: '/teacher', labelKey: 'nav.exams', icon: BookOpen, end: true },
    { to: '/teacher/storage', labelKey: 'nav.storage', icon: Archive },
    { to: '/teacher/weak', labelKey: 'nav.weak', icon: TrendingDown },
    { to: '/teacher/new-students', labelKey: 'nav.newStudents', icon: UserPlus },
    { to: '/teacher/users', labelKey: 'nav.access', icon: KeyRound },
    { to: '/teacher/cabinet', labelKey: 'nav.cabinet', icon: Users },
    { to: '/teacher/ai', labelKey: 'nav.ai', icon: Sparkles },
  ],
  Student: [
    { to: '/student', labelKey: 'nav.home', icon: Home, end: true },
    { to: '/student/syllabus', labelKey: 'nav.syllabus', icon: ListTree },
    { to: '/student/public', labelKey: 'nav.exams', icon: BookOpen },
    { to: '/student/teachers', labelKey: 'nav.findTeacher', icon: MapPin },
    { to: '/student/republic', labelKey: 'nav.republic', icon: Trophy },
    { to: '/student/account', labelKey: 'nav.profile', icon: UserRound },
  ],
  Admin: [
    { to: '/admin', labelKey: 'nav.home', icon: Home, end: true },
    { to: '/admin/teachers', labelKey: 'nav.teacherReg', icon: Mail },
    { to: '/admin/users', labelKey: 'nav.accounts', icon: KeyRound },
    { to: '/teacher', labelKey: 'nav.exams', icon: BookOpen, end: true, activeWhen: isAdminExamNav },
    { to: '/teacher/storage', labelKey: 'nav.storage', icon: Archive },
    { to: '/teacher/weak', labelKey: 'nav.weak', icon: TrendingDown },
    { to: '/teacher/cabinet', labelKey: 'nav.cabinet', icon: Users },
    { to: '/teacher/ai', labelKey: 'nav.ai', icon: Sparkles },
  ],
};

const studentMobileNav = [
  { to: '/student', labelKey: 'nav.home', icon: Home, end: true },
  { to: '/student/syllabus', labelKey: 'nav.syllabus', icon: ListTree },
  { to: '/student/republic', labelKey: 'nav.month', icon: Trophy, featured: true },
  { to: '/student/public', labelKey: 'nav.exams', icon: BookOpen },
  { to: '/student/account', labelKey: 'nav.profile', icon: UserRound },
];

const teacherMobileNav = [
  { to: '/teacher', labelKey: 'nav.exam', icon: BookOpen, end: true },
  { to: '/teacher/storage', labelKey: 'nav.storage', icon: Archive },
  { to: '/teacher/weak', labelKey: 'nav.weakShort', icon: TrendingDown },
  { to: '/teacher/new-students', labelKey: 'nav.students', icon: UserPlus },
  { to: '/teacher/cabinet', labelKey: 'nav.cabinet', icon: Users },
];

const adminMobileNav = [
  { to: '/admin', labelKey: 'nav.home', icon: Home, end: true },
  { to: '/admin/teachers', labelKey: 'nav.teacher', icon: Mail },
  { to: '/admin/users', labelKey: 'nav.account', icon: KeyRound },
  { to: '/teacher', labelKey: 'nav.exam', icon: BookOpen, end: true, activeWhen: isAdminExamNav },
  { to: '/teacher/cabinet', labelKey: 'nav.cabinet', icon: Users },
];

function roleLabel(role, t) {
  if (role === 'Teacher') return t('role.teacher');
  if (role === 'Student') return t('role.student');
  if (role === 'Admin') return t('role.admin');
  return '';
}

function greeting(t) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return t('greet.morning');
  if (hour >= 12 && hour < 17) return t('greet.afternoon');
  if (hour >= 17 && hour < 22) return t('greet.evening');
  return t('greet.night');
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

export default function AppShell({ title, children, mainClassName = '', action = null, onLeaveExam = null }) {
  const { user, logout } = useContext(AuthContext);
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const role = normalizeRole(user?.role);
  const tokens = useTeacherTokens(user);
  const wallet = useStudentWallet(user);
  const [pushAsk, setPushAsk] = useState(() => !onLeaveExam && notificationPermission() === 'default');
  useEffect(() => {
    if (!user || user.practice || (role !== 'Teacher' && role !== 'Admin')) return;
    releaseOpenGroupStudents().catch(() => {});
    if (role === 'Admin') releasePendingTeachers().catch(() => {});
  }, [user, role]);
  useEffect(() => {
    if (!user || onLeaveExam || user.practice) return;
    if (role !== 'Teacher' && role !== 'Admin') return;
    import('../lib/teacherQuizReminders').then(({ syncTeacherQuizReminders }) => {
      syncTeacherQuizReminders(user);
    }).catch(() => {});
  }, [user, role, onLeaveExam]);
  const links = (navByRole[role] || navByRole.Student).filter((item) => {
    if (!AI_FEATURE_OPEN && item.to === '/teacher/ai') return false;
    if (user?.practice) {
      return item.to === '/teacher' || item.to === '/teacher/storage' || item.to === '/teacher/weak' || item.to === '/teacher/cabinet' || item.to === '/teacher/new-students' || item.to === '/admin' || item.to === '/admin/teachers' || item.to === '/admin/users' || item.to === '/admin/exams' || item.to === '/student' || item.to === '/student/syllabus' || item.to === '/student/public' || item.to === '/student/teachers' || item.to === '/student/republic' || item.to === '/student/account' || item.to === '/student/wallet' || item.to === '/student/weekend';
    }
    return true;
  });

  const handleLogout = () => {
    if (onLeaveExam) {
      onLeaveExam();
      return;
    }
    logout();
    navigate(user?.practice ? '/' : '/login');
  };

  const guardNav = (event) => {
    if (!onLeaveExam) return;
    event.preventDefault();
    onLeaveExam();
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
      ? teacherMobileNav
      : role === 'Admin'
        ? adminMobileNav
        : links;

  return (
    <div className={classNames('shell-page', role === 'Student' && 'shell-student', (role === 'Teacher' || role === 'Admin') && 'shell-teacher')}>
      <div className="shell-frame">
        <aside className="shell-side">
          <div className="shell-logo">
            <BrandLogo size={32} nameClassName="text-white" />
          </div>
          <nav className="shell-nav" aria-label="Kabinet menyusu">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={guardNav} className={(state) => itemClass(item, state)}>
                  <Icon size={18} />
                  {t(item.labelKey)}
                </NavLink>
              );
            })}
          </nav>
          <div className="shell-user">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">{role === 'Admin' ? t('role.admin') : (user?.fullName || t('role.user'))}</p>
              <p className="text-xs text-white/70">{roleLabel(role, t)}</p>
            </div>
            <button type="button" onClick={handleLogout} className="ep-focus text-xs font-extrabold text-white/80">
              {t('common.logout')}
            </button>
          </div>
        </aside>

        <div className="shell-main">
          <header className="shell-top">
            <div className="shell-heading">
              <p className="shell-welcome">{greeting(t)}, {welcomeName}</p>
              {title ? <h1 className="shell-title">{title}</h1> : null}
            </div>
            <div className="shell-top-actions">
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
              {role === 'Student' ? (
                <>
                  {onLeaveExam ? null : <StudentAlerts />}
                  <button
                    type="button"
                    className="shell-jeton"
                    onClick={() => (onLeaveExam ? onLeaveExam() : navigate('/student/wallet'))}
                    aria-label="Pul hesabı"
                  >
                    <span>Balans: {Number(wallet.balance) || 0} manat</span>
                  </button>
                </>
              ) : null}
              {role === 'Teacher' || role === 'Admin' ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="shell-logout-btn"
                >
                  <LogOut size={16} />
                  <span className="max-[1023px]:sr-only">{t('common.logout')}</span>
                </button>
              ) : null}
              {action}
            </div>
          </header>
          {pushAsk && user && !onLeaveExam ? (
            <div className="mx-4 mb-2 flex flex-wrap items-center justify-between gap-2 rounded-[18px] bg-[#2a1c12] px-3 py-2.5 ring-1 ring-[#f0b429]/30">
              <p className="text-sm font-extrabold">{t('push.text')}</p>
              <button
                type="button"
                onClick={async () => {
                  await enableUrgentPush(user.id);
                  setPushAsk(notificationPermission() === 'default');
                }}
                className="inline-flex min-h-10 items-center gap-1 rounded-full bg-[#f0b429] px-3 text-xs font-extrabold text-[#3a2a00]"
              >
                <Bell size={14} /> {t('push.open')}
              </button>
            </div>
          ) : null}
          <main className={classNames('shell-content', mainClassName)}>
            {role === 'Admin' || onLeaveExam ? null : <MonthlyExamAd />}
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
              onClick={guardNav}
              className={(state) => classNames(itemClass(item, state), item.featured && 'shell-link-featured')}
            >
              <Icon size={18} />
              {t(item.labelKey)}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
