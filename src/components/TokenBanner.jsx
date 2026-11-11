import { Coins } from 'lucide-react';
import { Card } from './ui';
import { TOKEN_COSTS, WEEKLY_TOKENS, useTeacherTokens } from '../lib/tokens';

export default function TokenBanner({ user }) {
  const account = useTeacherTokens(user);
  if (!user || (user.role !== 'Teacher' && user.role !== 'Admin')) return null;
  if (user.practice) return null;
  const low = !account.unlimited && account.balance < TOKEN_COSTS.asan;

  return (
    <Card className="mb-6 border-[var(--line)] bg-[var(--card)]">
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[16px] bg-[linear-gradient(135deg,#ffb84a,#f5a623)] text-[#3a2200]">
          <Coins size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--text)]">Qəpik hesabı</p>
          <p className={`mt-1 text-2xl font-extrabold ${low ? 'text-[var(--danger-text)]' : 'text-[var(--text)]'}`}>
            {account.unlimited ? 'Limitsiz' : `${account.balance} qəpik`}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
            Asan {TOKEN_COSTS.asan} · Orta {TOKEN_COSTS.orta} · Çətin {TOKEN_COSTS.çətin} / quiz.
            Hər həftə {WEEKLY_TOKENS} qəpik düşür. Quiz götürəndə silinir.
          </p>
          <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
            Paket ödənişi tezliklə açılacaq.
          </p>
        </div>
      </div>
    </Card>
  );
}
