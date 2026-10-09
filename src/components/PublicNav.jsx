import { Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function PublicNav({ darkOnNavy = false }) {
  const { dark, toggle } = useTheme();
  const link = darkOnNavy
    ? 'rounded-xl px-3 py-2 text-sm font-medium text-indigo-100 hover:bg-white/10'
    : 'rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800';
  const primary = darkOnNavy
    ? 'rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-indigo-50'
    : 'rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500';

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <button
        type="button"
        onClick={toggle}
        className={darkOnNavy ? 'rounded-xl p-2 text-indigo-200 hover:bg-white/10' : 'rounded-xl p-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}
        title="Tema"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <Link to="/login" className={link}>
        Daxil ol
      </Link>
      <Link to="/register" className={primary}>
        Qeydiyyat
      </Link>
    </div>
  );
}
