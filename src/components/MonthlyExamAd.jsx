import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import HomePromoCarousel from './HomePromoCarousel';
import { REPUBLIC_PRICE, republicMonthTitle } from '../lib/republicExam';
import { formatManat } from '../lib/teacherAccess';

function untilMonthEnd(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const ms = Math.max(0, end.getTime() - now.getTime());
  return {
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
  };
}

export default function MonthlyExamAd({ compact = false }) {
  const location = useLocation();
  const [left, setLeft] = useState(() => untilMonthEnd());
  const path = String(location.pathname || '');
  const hidden = path.startsWith('/student/republic')
    || path.startsWith('/student/account')
    || path.startsWith('/teacher')
    || path.startsWith('/admin');
  const slim = compact || path !== '/student';

  useEffect(() => {
    const timer = setInterval(() => setLeft(untilMonthEnd()), 30000);
    return () => clearInterval(timer);
  }, []);

  if (hidden) return null;
  if (!slim) return <HomePromoCarousel />;

  return (
    <Link
      to="/student/republic"
      className="mb-6 flex items-start gap-3 rounded-2xl border border-[#ead9a8] bg-[#fff8e8] px-4 py-3 text-[#3a2a00] no-underline shadow-sm dark:border-[#3d4a32] dark:bg-[#1c2818] dark:text-[#f4e6c2]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f0b429] text-[#3a2a00]">
        <Trophy size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold">{republicMonthTitle()}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 opacity-90">
          Bağlanır: {left.d}g {left.h}s · {formatManat(REPUBLIC_PRICE)}
        </span>
      </span>
    </Link>
  );
}
