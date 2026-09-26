import { NavLink, useNavigate } from 'react-router-dom';
import { useContext, useState } from 'react';
import {
  BookOpen,
  Users,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  GraduationCap,
  Shield,
  KeyRound,
  Mail,
  Sparkles,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { normalizeRole } from '../lib/utils';

const navByRole = {
  Teacher: [
    { to: '/teacher', label: 'İmtahanlar', icon: BookOpen, end: true },
    { to: '/teacher/users', label: 'Giriş hüquqları', icon: KeyRound },
    { to: '/teacher/cabinet', label: 'Kabinet', icon: Users },
    { to: '/teacher/ai', label: 'AI özəlliyi', icon: Sparkles },
  ],
  Student: [
    { to: '/student', label: 'İmtahanlarım', icon: BookOpen, end: true },
  ],
  Admin: [
    { to: '/admin', label: 'İdarə paneli', icon: Shield, end: true },
    { to: '/admin/teachers', label: 'Müəllim qeydiyyatı', icon: Mail },
    { to: '/admin/users', label: 'Giriş hüquqları', icon: KeyRound },
    { to: '/teacher', label: 'İmtahanlar', icon: BookOpen },
    { to: '/teacher/cabinet', label: 'Kabinet', icon: Users },
    { to: '/teacher/ai', label: 'AI özəlliyi', icon: Sparkles },
  ],
};

export default function AppShell({ title, children }) {
  const { user, logout } = useContext(AuthContext);
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const role = normalizeRole(user?.role);
  const links = navByRole[role] || navByRole.Student;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface text-ink dark:bg-[#0b1220] dark:text-gray-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-gray-200 bg-white p-5 transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <GraduationCap size={18} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">ExamPulse</p>
            <p className="text-xs text-gray-400">İnkişaf izləmə</p>
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
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-900'
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-5 right-5">
          <p className="truncate text-sm font-medium">{user?.fullName || user?.email}</p>
          <p className="text-xs text-gray-400">{role}</p>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-gray-500 transition-colors duration-200 hover:bg-gray-100 lg:hidden dark:hover:bg-slate-800"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <h1 className="text-lg font-bold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="rounded-xl p-2.5 text-gray-500 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-slate-800"
              title="Tema"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Çıxış</span>
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
