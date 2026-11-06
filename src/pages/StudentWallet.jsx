import { useContext, useState } from 'react';
import { CreditCard, Wallet } from 'lucide-react';
import AppShell from '../components/AppShell';
import { AuthContext } from '../context/AuthContext';
import { formatManat } from '../lib/teacherAccess';
import { formatDateTime } from '../lib/utils';
import {
  useStudentWallet,
  WALLET_PACKS,
} from '../lib/studentWallet';

export default function StudentWallet() {
  const { user } = useContext(AuthContext);
  const wallet = useStudentWallet(user);
  const [pick, setPick] = useState(5);
  const [msg, setMsg] = useState('');

  return (
    <AppShell title="Pul hesabı">
      <div className="desk-page space-y-4">
        <section className="rounded-[28px] bg-[var(--card)] p-5 ring-1 ring-white/10 min-[768px]:flex min-[768px]:items-center min-[768px]:justify-between min-[768px]:gap-6 min-[768px]:p-7">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-white/60">
              <Wallet size={16} /> ExamPulse hesabı
            </p>
            <p className="mt-3 text-5xl font-black tabular-nums tracking-tight">{formatManat(wallet.balance)}</p>
            <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-white/70">
              Bank kartı hər dəfə yanınızda olmasa belə, buraya yüklədiyiniz məbləğ proqramda qalır. Respublika sınağı kimi ödənişlər bu hesabdan düşür.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMsg('Balans artırma tezliklə açılacaq.')}
            className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#ffb84a,#f5a623)] px-6 text-sm font-extrabold text-[#3a2200] min-[768px]:mt-0"
          >
            <CreditCard size={16} /> Tezliklə
          </button>
        </section>

        <section className="rounded-[22px] bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
          <p className="font-extrabold">Yükləmə məbləği</p>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Kart yalnız hesabı doldurmaq üçündür.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 min-[768px]:grid-cols-4">
            {WALLET_PACKS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setPick(amount)}
                className={`rounded-[18px] px-3 py-4 text-center font-black ${
                  pick === amount ? 'bg-[var(--accent)] text-[#3a2200]' : 'bg-[var(--bg)] text-[var(--text)]'
                }`}
              >
                {formatManat(amount)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMsg('Balans artırma tezliklə açılacaq.')}
            className="mt-4 w-full rounded-full bg-[#111] py-3.5 text-sm font-extrabold text-white dark:bg-white dark:text-[#111] min-[768px]:w-auto min-[768px]:px-8"
          >
            Tezliklə
          </button>
          {msg ? <p className="mt-3 text-sm font-bold text-[var(--accent)]">{msg}</p> : null}
        </section>

        <section className="rounded-[22px] bg-[var(--card)] p-4 ring-1 ring-[var(--line)]">
          <p className="font-extrabold">Hərəkətlər</p>
          {wallet.history.length ? (
            <ul className="mt-3 space-y-2">
              {wallet.history.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--bg)] px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-extrabold">{row.note}</p>
                    <p className="mt-0.5 text-xs font-semibold text-[var(--muted)]">
                      {row.at ? formatDateTime(row.at) : ''}
                      {row.method ? ` · ${row.method}` : ''}
                    </p>
                  </div>
                  <p className={`shrink-0 font-black tabular-nums ${row.kind === 'debit' ? 'text-[#be123c]' : 'text-[#176b38]'}`}>
                    {row.kind === 'debit' ? '−' : '+'}{formatManat(row.amount)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm font-semibold text-[var(--muted)]">Hələ yükləmə yoxdur.</p>
          )}
        </section>
      </div>

    </AppShell>
  );
}
