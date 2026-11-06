import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, CreditCard, HelpCircle } from 'lucide-react';
import { formatManat } from '../lib/teacherAccess';

const METHODS = [
  { id: 'paypal', label: 'PayPal', kind: 'paypal' },
  { id: 'card', label: 'Kredit kartı', kind: 'card' },
  { id: 'apple', label: 'Apple Pay', kind: 'apple' },
];

function PaypalMark() {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#003087]/10 text-[11px] font-extrabold tracking-tight text-[#003087] dark:bg-[#003087]/25 dark:text-[#79a7ff]">
      Pay
      <span className="text-[#009cde]">Pal</span>
    </span>
  );
}

function AppleMark() {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#111]/8 text-lg font-black text-[#111] dark:bg-white/10 dark:text-white">
      
    </span>
  );
}

function digitsOnly(value, max) {
  return String(value || '').replace(/\D/g, '').slice(0, max);
}

function formatCardNumber(value) {
  return digitsOnly(value, 16).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(value) {
  const raw = digitsOnly(value, 4);
  if (raw.length <= 2) return raw;
  return `${raw.slice(0, 2)}/${raw.slice(2)}`;
}

export default function PaymentCheckoutModal({
  open,
  plan,
  busy = false,
  onClose,
  onConfirm,
}) {
  const [step, setStep] = useState('method');
  const [method, setMethod] = useState('');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });

  const cardReady = useMemo(() => {
    const number = digitsOnly(card.number, 16);
    const expiry = digitsOnly(card.expiry, 4);
    const cvv = digitsOnly(card.cvv, 4);
    return number.length >= 15 && card.name.trim().length >= 2 && expiry.length === 4 && cvv.length >= 3;
  }, [card]);

  if (!open || !plan) return null;

  const resetAndClose = () => {
    setStep('method');
    setMethod('');
    setCard({ number: '', name: '', expiry: '', cvv: '' });
    onClose?.();
  };

  const pickMethod = (id) => {
    setMethod(id);
    if (id === 'card') {
      setStep('card');
      return;
    }
    onConfirm?.({ method: id, plan });
  };

  const submitCard = () => {
    if (!cardReady || busy) return;
    onConfirm?.({ method: 'card', plan, card: { ...card } });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="Bağla" onClick={resetAndClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-[var(--bg)] text-[var(--text)] shadow-2xl sm:rounded-[28px]">
        {step === 'method' ? (
          <div className="overflow-y-auto px-5 pb-6 pt-4">
            <button
              type="button"
              onClick={resetAndClose}
              className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-[var(--card)] text-[var(--text)]"
              aria-label="Geri"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-center text-2xl font-extrabold tracking-tight">Ödəniş üsulunu seçin</h2>
            <p className="mt-2 text-center text-sm font-semibold text-[var(--muted)]">
              {plan.title} · {formatManat(plan.price)}
              {plan.untilLabel ? ` · ${plan.untilLabel}` : plan.days ? ` · ${plan.days} gün` : ''}
            </p>

            <div className="mt-6 space-y-3">
              {METHODS.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  disabled={busy}
                  onClick={() => pickMethod(row.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-4 text-left transition hover:border-[var(--accent)]"
                >
                  {row.kind === 'paypal' ? <PaypalMark /> : null}
                  {row.kind === 'card' ? (
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--bg)] text-[var(--text)]">
                      <CreditCard size={20} />
                    </span>
                  ) : null}
                  {row.kind === 'apple' ? <AppleMark /> : null}
                  <span className="flex-1 text-base font-extrabold">{row.label}</span>
                  <ChevronRight size={18} className="text-[var(--muted)]" />
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm font-extrabold text-[var(--muted)]">Abunə şərtləri</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                {plan.hint || 'Bu ödəniş bir dəfəlikdir. Avtomatik yenilənmir. Paket bitənə qədər Anbar açıq qalır.'}
              </p>
              <p className="mt-4 text-xs font-semibold text-[var(--muted)]">Məlumatlar təhlükəsiz ötürülür</p>
            </div>

            <button
              type="button"
              className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-4 text-left"
              onClick={() => window.open('mailto:exampulse.az@gmail.com', '_blank')}
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--bg)]">
                <HelpCircle size={18} />
              </span>
              <span className="flex-1 text-sm font-extrabold">Ödəniş üsulu tapa bilmirsiniz?</span>
              <ChevronRight size={18} className="text-[var(--muted)]" />
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto px-5 pb-6 pt-4">
            <button
              type="button"
              onClick={() => setStep('method')}
              className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-[var(--card)]"
              aria-label="Geri"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-2xl font-extrabold tracking-tight">Ödəniş üsulu əlavə et</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Kartı indi əlavə etmək ödənişi daha rahat edir. {formatManat(plan.price)} tutulacaq.
            </p>

            <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]">
              <label className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                  placeholder="Kart nömrəsi"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={card.number}
                  onChange={(e) => setCard((prev) => ({ ...prev, number: formatCardNumber(e.target.value) }))}
                />
                <span className="shrink-0 text-xs font-extrabold text-[#315efb]">Kartı skan et</span>
              </label>
              <label className="block border-b border-[var(--line)] px-4 py-3">
                <input
                  className="w-full bg-transparent text-sm font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                  placeholder="Kart sahibinin adı"
                  autoComplete="cc-name"
                  value={card.name}
                  onChange={(e) => setCard((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <div className="grid grid-cols-2">
                <label className="border-r border-[var(--line)] px-4 py-3">
                  <input
                    className="w-full bg-transparent text-sm font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                    placeholder="AA/İİ"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={card.expiry}
                    onChange={(e) => setCard((prev) => ({ ...prev, expiry: formatExpiry(e.target.value) }))}
                  />
                </label>
                <label className="px-4 py-3">
                  <input
                    className="w-full bg-transparent text-sm font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                    placeholder="CVV"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={card.cvv}
                    onChange={(e) => setCard((prev) => ({ ...prev, cvv: digitsOnly(e.target.value, 4) }))}
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">Faktura ünvanı</p>
                <p className="mt-0.5 text-sm font-bold">Kabinetdəki konumdan götürülür</p>
              </div>
              <ChevronRight size={18} className="text-[var(--muted)]" />
            </div>

            <button
              type="button"
              disabled={!cardReady || busy}
              onClick={submitCard}
              className={`mt-6 flex h-14 w-full items-center justify-center rounded-2xl text-base font-extrabold transition ${
                cardReady && !busy
                  ? 'bg-[#111] text-white dark:bg-white dark:text-[#111]'
                  : 'cursor-not-allowed bg-[#e8e8e8] text-[#8a8a8a] dark:bg-[#2a3140] dark:text-[#7a8494]'
              }`}
            >
              {busy ? 'Ödənilir...' : 'Ödəniş üsulu əlavə et'}
            </button>
            <button
              type="button"
              className="mt-3 w-full py-2 text-center text-sm font-extrabold text-[#315efb]"
              onClick={() => {
                if (busy) return;
                onConfirm?.({ method: method || 'card', plan, skippedCard: true });
              }}
            >
              Bu addımı keç, sonra əlavə edərəm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
