import { Clock } from 'lucide-react';
import { Card } from './ui';
import { accessPeriodInfo } from '../lib/utils';

export default function AccessPeriodBanner({ user }) {
  if (!user || (user.role !== 'Teacher' && user.role !== 'Admin')) return null;
  if (user.practice) return null;
  const info = accessPeriodInfo(user);
  return (
    <Card className="mb-6 border-indigo-100 bg-indigo-50/80 dark:border-indigo-900/40 dark:bg-indigo-950/30">
      <div className="flex items-start gap-3">
        <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[16px] bg-[linear-gradient(135deg,#5b4cf5,#22d3ee)] text-white">
          <Clock size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-ink dark:text-white">{info.title}</p>
          <p className={`mt-1 text-sm ${info.ended ? 'font-semibold text-red-700 dark:text-red-300' : info.left.className}`}>
            {info.ended ? info.hint : info.left.text}
          </p>
          {info.ended ? null : <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{info.hint}</p>}
        </div>
      </div>
    </Card>
  );
}
