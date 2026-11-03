import { useMemo, useState } from 'react';
import { Check, Coins } from 'lucide-react';
import { Button, Card, Textarea } from './ui';
import PaymentCheckoutModal from './PaymentCheckoutModal';
import {
  planUntilLabel,
  STORAGE_PLANS,
  storageTotal,
  WATERMARK_PRICE,
} from '../lib/storageAccess';
import { formatManat } from '../lib/teacherAccess';
import { completeTokenPayment, TOKEN_COSTS, WEEKLY_TOKENS, useTeacherTokens } from '../lib/tokens';

export default function TokenPaymentCard({ user }) {
  const account = useTeacherTokens(user);
  const [busy, setBusy] = useState(false);
  const [planId, setPlanId] = useState(account.subscription?.planId || 'buraxilis');
  const [watermark, setWatermark] = useState(Boolean(account.subscription?.watermark));
  const [watermarkText, setWatermarkText] = useState(account.subscription?.watermarkText || '');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [note, setNote] = useState('');
  const plan = STORAGE_PLANS.find((row) => row.id === planId) || STORAGE_PLANS[0];
  const total = storageTotal(plan.id, watermark);
  const checkoutPlan = useMemo(() => ({
    ...plan,
    price: total,
    untilLabel: `${planUntilLabel(plan.id)}${watermark ? ` · watermark +${WATERMARK_PRICE} ₼` : ''}`,
  }), [plan, total, watermark]);
  if (!user || user.practice || (user.role !== 'Teacher' && user.role !== 'Admin')) return null;

  const finishPay = () => {
    if (busy) return;
    if (watermark && !String(watermarkText || '').trim()) {
      setNote('Watermark üçün mətni yazın.');
      return;
    }
    setBusy(true);
    setNote('');
    try {
      completeTokenPayment(user, {
        planId: plan.id,
        amount: total,
        watermark,
        watermarkText,
      });
      setCheckoutOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const openCheckout = () => {
    if (watermark && !String(watermarkText || '').trim()) {
      setNote('Watermark üçün mətni yazın.');
      return;
    }
    setNote('');
    setCheckoutOpen(true);
  };

  const sub = account.subscription;
  const activePlan = STORAGE_PLANS.find((row) => row.id === sub?.planId);

  return (
    <>
      <Card id="odenis" className="mb-8 overflow-hidden border-[var(--line)] bg-[var(--card)] p-0">
        <div className="bg-[linear-gradient(135deg,#2f7a45,#1f5c34)] px-5 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/15">
              <Coins size={22} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white/80">Anbar ödənişi</p>
              <p className="text-2xl font-extrabold">
                {account.unlimited ? 'Limitsiz' : `${account.balance} jeton`}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <ul className="space-y-2 text-sm font-semibold text-[var(--text)]">
            {[
              `İlk girişdə ${WEEKLY_TOKENS} pulsuz jeton`,
              `Asan ${TOKEN_COSTS.asan} · Orta ${TOKEN_COSTS.orta} · Çətin ${TOKEN_COSTS.çətin} jeton`,
              'Jeton bitəndə paket bir dəfəlik alınır, həftəlik yenilənmir',
              `Watermark istəsəniz əlavə ${formatManat(WATERMARK_PRICE)}`,
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e7f6ea] text-[#1f7a3a] dark:bg-[#1f3d2a] dark:text-[#4ade80]">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="grid gap-3 sm:grid-cols-2">
            {STORAGE_PLANS.map((row) => {
              const on = planId === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setPlanId(row.id)}
                  className={`relative rounded-2xl border px-4 py-4 text-left transition ${
                    on
                      ? 'border-[#2f7a45] bg-[#eef8f1] dark:border-[#4cae6e] dark:bg-[#163022]'
                      : 'border-[var(--line)] bg-[var(--bg)]'
                  }`}
                >
                  <p className="font-extrabold text-[var(--text)]">{row.title}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{row.blurb}</p>
                  <p className="mt-3 text-2xl font-extrabold text-[var(--text)]">{formatManat(row.price)}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                    {planUntilLabel(row.id)} tarixinədək
                  </p>
                </button>
              );
            })}
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[#2f7a45]"
              checked={watermark}
              onChange={(e) => setWatermark(e.target.checked)}
            />
            <span>
              <span className="block font-extrabold text-[var(--text)]">
                Watermark · +{formatManat(WATERMARK_PRICE)}
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-[var(--muted)]">
                Sınaq ekranında sizin yazdığınız mətn görünür.
              </span>
            </span>
          </label>

          {watermark ? (
            <Textarea
              label="Watermark mətni"
              rows={3}
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="məs. Riyaziyyat · Aysel müəllimə"
            />
          ) : null}

          <p className="text-sm font-extrabold text-[var(--text)]">Cəmi: {formatManat(total)}</p>

          {account.subscribed ? (
            <p className="text-sm font-extrabold text-[#1f7a3a] dark:text-[#4ade80]">
              {activePlan?.title || 'Abunə'} aktivdir
              {sub?.endsAt ? ` · ${new Date(sub.endsAt).toLocaleDateString('az-AZ')} tarixinədək` : ''}.
              {sub?.watermark && sub?.watermarkText ? ` Watermark: «${sub.watermarkText}».` : ''}
            </p>
          ) : null}

          {note ? <p className="text-sm font-semibold text-red-600">{note}</p> : null}

          <Button className="w-full bg-[#2f7a45] hover:brightness-110" disabled={busy} onClick={openCheckout}>
            {account.subscribed ? 'Paketi yenilə' : 'Ödənişə keç'} · {formatManat(total)}
          </Button>
        </div>
      </Card>

      <PaymentCheckoutModal
        open={checkoutOpen}
        plan={checkoutPlan}
        busy={busy}
        onClose={() => setCheckoutOpen(false)}
        onConfirm={finishPay}
      />
    </>
  );
}
