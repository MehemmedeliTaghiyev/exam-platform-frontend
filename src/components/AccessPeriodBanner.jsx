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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Clock size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-ink dark:text-white">{info.title}</p>
          <p className={`mt-1 text-sm ${info.left.className}`}>{info.left.text}</p>
          <p className="mt-1 text-xs text-gray-500">{info.hint}</p>
        </div>
      </div>
    </Card>
  );
}
