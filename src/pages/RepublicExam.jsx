import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, History, Trophy } from 'lucide-react';
import AppShell from '../components/AppShell';
import PaymentCheckoutModal from '../components/PaymentCheckoutModal';
import { Button, Input } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import {
  applyRepublicCoupon,
  canEnterRepublic,
  hasFreeNextRepublic,
  hasPaidRepublic,
  payRepublic,
  REPUBLIC_DURATION_MIN,
  REPUBLIC_PRICE,
  republicQuestionCount,
  isRepublicWinner,
  republicHistoryForUser,
  republicMonthBadge,
  republicMonthLabel,
  republicWinners,
} from '../lib/republicExam';
import { applicantCode } from '../lib/studentCode';
import { formatManat } from '../lib/teacherAccess';
import { formatDateTime, formatHms } from '../lib/utils';

const PLAN = {
  id: 'republic',
  title: 'Respublika sınağı',
  price: REPUBLIC_PRICE,
  days: 30,
};

function StatBox({ label, value, hint }) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl bg-black/25 px-3 py-3 text-center ring-1 ring-white/10">
      <p className="text-[11px] font-bold text-white/55">{label}</p>
      <p className="mt-1 text-lg font-black leading-tight">[{value}] {hint}</p>
    </div>
  );
}

function Fold({ title, icon: Icon, open, onToggle, children }) {
  return (
    <div className="overflow-hidden rounded-[22px] bg-[var(--card)] ring-1 ring-[var(--line)]">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-4 text-left min-[768px]:pointer-events-none">
        <Icon size={18} className="text-[#f0b429]" />
        <span className="flex-1 font-extrabold">{title}</span>
        <ChevronDown size={18} className={`text-[var(--muted)] transition min-[768px]:hidden ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`${open ? 'block' : 'hidden'} border-t border-[var(--line)] px-4 py-4 min-[768px]:block`}>
        {children}
      </div>
    </div>
  );
}

export default function RepublicExam() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [payOpen, setPayOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const myCode = applicantCode(user);
  const [coupon, setCoupon] = useState(() => applicantCode(user) || '');
  const [msg, setMsg] = useState('');
  const paid = hasPaidRepublic(user);
  const freePass = hasFreeNextRepublic(user);
  const canEnter = canEnterRepublic(user);
  const winners = useMemo(() => republicWinners(), [paid, msg]);
  const mine = winners.find((row) => String(row.userId) === String(user?.id));
  const myResults = useMemo(
    () => republicHistoryForUser(user?.id),
    [user?.id, msg, paid],
  );

  const startOrPay = () => {
    if (freePass && !paid) {
      payRepublic(user, 'winner-free');
      navigate('/student/republic/take');
      return;
    }
    if (!canEnter) {
      setPayOpen(true);
      setMsg('Əvvəlcə 2 ₼ ödəniş edilməlidir. Ödənişsiz imtahana girilmir.');
      return;
    }
    navigate('/student/republic/take');
  };

  const confirmPay = () => {
    setBusy(true);
    try {
      payRepublic(user);
      setPayOpen(false);
      setMsg('Ödəniş qəbul olundu. İndi «İmtahana başla» ilə daxil ola bilərsiniz.');
    } finally {
      setBusy(false);
    }
  };

  const refund = (e) => {
    e.preventDefault();
    setMsg('');
    try {
      applyRepublicCoupon(user, coupon || myCode);
      setMsg(`${formatManat(REPUBLIC_PRICE)} abituriyent kodu ilə geri qaytarıldı.`);
    } catch (err) {
      setMsg(err.message || 'Kupon işləmədi.');
    }
  };

  return (
    <AppShell title="Respublika">
      <div className="desk-page">
        <div className="desk-split">
        <div className="rounded-[28px] bg-[#151b24] p-5 text-white ring-1 ring-white/10 min-[768px]:p-7">
          <p className="text-sm font-semibold text-white/70">{republicMonthBadge()}</p>
          <h2 className="mt-2 text-[32px] font-black leading-none tracking-tight min-[768px]:text-4xl">Respublika sınağı</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/75">
            Ay sonu sillabus mövzularından qarışıq sınaq. Hər ay bir dəfə keçirilir.
          </p>
          <div className="mt-5 flex gap-2">
            <StatBox label="Müddət" value={REPUBLIC_DURATION_MIN} hint="dəq" />
            <StatBox label="Suallar" value={republicQuestionCount()} hint="sual" />
            <StatBox label="Giriş" value={REPUBLIC_PRICE} hint="₼" />
          </div>
          <p className="mt-5 text-sm font-semibold leading-6 text-white/80">
            🏆 Birinci yerə çıxan növbəti ayın imtahanına pulsuz daxil olur.
          </p>
          <Button className="mt-6 w-full bg-[#2f7a45] text-base min-[768px]:w-auto min-[768px]:min-w-[240px]" onClick={startOrPay}>
            {canEnter
              ? (freePass && !paid ? 'Pulsuz daxil ol →' : 'İmtahana başla →')
              : `${formatManat(REPUBLIC_PRICE)} ödə, sonra başla`}
          </Button>
          {!canEnter ? (
            <p className="mt-3 text-center text-xs font-bold text-[#f0b429]">
              Ödəniş edilmədən imtahana giriş bağlıdır.
            </p>
          ) : freePass && !paid ? (
            <p className="mt-3 text-center text-xs font-bold text-[#f0b429]">
              Keçən ay birinci oldunuz — bu ay pulsuzdur.
            </p>
          ) : null}
          {msg ? <p className="mt-3 text-center text-sm font-bold text-[#8fd4a4]">{msg}</p> : null}
        </div>

        <div className="space-y-3">
        <Fold
          title="Qalib kuponun var?"
          icon={Trophy}
          open={couponOpen}
          onToggle={() => setCouponOpen((v) => !v)}
        >
          {mine || isRepublicWinner(user) ? (
            <form onSubmit={refund} className="space-y-3">
              <p className="text-sm font-semibold leading-6 text-[var(--muted)]">
                Qalib olanda abituriyent kodun kupon kimidir. Kodu yazıb 2 ₼ geri al.
              </p>
              <p className="text-sm">Abituriyent kodun: <b className="font-mono">{mine?.coupon || myCode}</b></p>
              <div className="flex gap-2">
                <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Abituriyent kodu" />
                <Button type="submit">Geri al</Button>
              </div>
            </form>
          ) : (
            <p className="text-sm font-semibold leading-6 text-[var(--muted)]">
              Qalib olanda profilindəki abituriyent kodu kupon olur. Bu ay hələ qalib deyilsiniz.
            </p>
          )}
        </Fold>

        <Fold
          title="Keçmiş nəticələrim"
          icon={History}
          open={historyOpen}
          onToggle={() => setHistoryOpen((v) => !v)}
        >
          {myResults.length ? (
            <ul className="space-y-2">
              {myResults.map((row) => (
                <li key={`${row.month}-${row.at}`}>
                  <button
                    type="button"
                    onClick={() => navigate(`/student/republic/result/${encodeURIComponent(row.month)}`)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-[var(--bg)] px-3 py-3 text-left"
                  >
                    <History size={18} className="text-[#4cae6e]" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold">{republicMonthLabel(row.month)}</span>
                      <span className="text-xs font-semibold text-[var(--muted)]">
                        {row.correct}/{row.total} düzgün
                        {row.durationSeconds != null ? ` · vaxt ${formatHms(row.durationSeconds)}` : ''}
                        {row.at ? ` · ${formatDateTime(row.at)}` : ''}
                      </span>
                    </span>
                    <span className="font-black">{row.percent}%</span>
                    <ChevronRight size={16} className="text-[var(--muted)]" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">Hələ nəticə yoxdur. İmtahanı bitirəndən sonra burada görünəcək.</p>
          )}
        </Fold>
        </div>
        </div>
      </div>
      <PaymentCheckoutModal open={payOpen} plan={PLAN} busy={busy} onClose={() => setPayOpen(false)} onConfirm={confirmPay} />
    </AppShell>
  );
}
