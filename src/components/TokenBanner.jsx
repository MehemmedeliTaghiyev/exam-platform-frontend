import { Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
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
        <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[16px] bg-[linear-gradient(135deg,#f0b429,#2f7a45)] text-white">
          <Coins size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--text)]">Jeton hesabı</p>
          <p className={`mt-1 text-2xl font-extrabold ${low ? 'text-[var(--danger-text)]' : 'text-[var(--text)]'}`}>
            {account.unlimited ? 'Limitsiz' : `${account.balance} jeton`}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
            Asan {TOKEN_COSTS.asan} · Orta {TOKEN_COSTS.orta} · Çətin {TOKEN_COSTS.çətin}.
            Jeton yalnız «Quiz tələb et» düyməsində düşür.
          </p>
          <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
            {account.subscribed
              ? 'Paket aktivdir. Bir dəfəlik ödəniş — avtomatik yenilənmir.'
              : `İlk ${WEEKLY_TOKENS} jeton pulsuzdur. Bitəndə kabinetdə paketi bir dəfəlik alın.`}
            {' '}
            <Link to="/teacher/cabinet#odenis" className="font-extrabold text-[#1f7a3a] underline decoration-2 underline-offset-2 dark:text-[#4ade80]">
              Ödənişə keç
            </Link>
          </p>
        </div>
      </div>
    </Card>
  );
}
