import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Download, History, Trophy } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Button, Input } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import RepublicTopTen from '../components/RepublicTopTen';
import RepublicProgressChart from '../components/RepublicProgressChart';
import {
  applyRepublicCoupon,
  canTryRepublic,
  hasFreeNextRepublic,
  hasPaidRepublic,
  openRepublicRankingPdf,
  payRepublic,
  REPUBLIC_DURATION_MIN,
  REPUBLIC_PRICE,
  republicMonthKey,
  republicQuestionCount,
  isRepublicWinner,
  republicHistoryForUser,
  republicResults,
  republicMonthBadge,
  republicMonthLabel,
  republicWinners,
} from '../lib/republicExam';
import { getMonthlyQuizPaper } from '../lib/monthlyQuizRam';
import { applicantCode } from '../lib/studentCode';
import { formatManat } from '../lib/teacherAccess';
import { useStudentWallet } from '../lib/studentWallet';
import { formatDateTime, formatHms } from '../lib/utils';

function StatBox({ label, value, hint }) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl bg-[var(--bg)] px-3 py-2.5 text-center ring-1 ring-[var(--line)]">
      <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-1 whitespace-nowrap text-base font-black leading-none">
        [{value}] <span className="text-sm font-extrabold">{hint}</span>
      </p>
    </div>
  );
}

function Fold({ title, icon: Icon, open, onToggle, children }) {
  return (
    <div className="card-vector overflow-hidden rounded-[22px] bg-[var(--card)] ring-1 ring-[var(--line)]">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-4 text-left">
        <Icon size={18} className="text-[#f0b429]" />
        <span className="flex-1 font-extrabold">{title}</span>
        <ChevronDown size={18} className={`text-[var(--muted)] transition ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`${open ? 'block' : 'hidden'} border-t border-[var(--line)] px-4 py-4`}>
        {children}
      </div>
    </div>
  );
}

export default function RepublicExam() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [couponOpen, setCouponOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const myCode = applicantCode(user);
  const [coupon, setCoupon] = useState(() => applicantCode(user) || '');
  const [msg, setMsg] = useState('');
  const paid = hasPaidRepublic(user);
  const freePass = hasFreeNextRepublic(user);
  const canEnter = canTryRepublic(user);
  const wallet = useStudentWallet(user);
  const winners = useMemo(() => republicWinners(), [paid, msg]);
  const mine = winners.find((row) => String(row.userId) === String(user?.id));
  const myResults = useMemo(
    () => republicHistoryForUser(user?.id),
    [user?.id, msg, paid],
  );

  useEffect(() => {
    getMonthlyQuizPaper().catch(() => {});
  }, []);

  const startOrPay = () => {
    if (canEnter) {
      if (freePass && !paid) payRepublic(user, 'winner-free');
      navigate('/student/republic/take');
      return;
    }
    setMsg('Aylıq imtahan ödənişi tezliklə açılacaq.');
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
        <div className="desk-split republic-desk">
        <div className="republic-left">
        <div className="republic-hero card-vector rounded-[28px] bg-[var(--card)] p-5 ring-1 ring-[var(--line)] min-[768px]:p-7">
          <p className="text-sm font-semibold text-[var(--muted)]">{republicMonthBadge()}</p>
          <h2 className="mt-2 text-[clamp(1.35rem,5vw,2.25rem)] font-black leading-tight tracking-tight">Respublika sınağı</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
            Ay sonu sillabus mövzularından qarışıq sınaq. Hər ay bir dəfə keçirilir.
          </p>
          <div className="mt-5 flex gap-2">
            <StatBox label="Müddət" value={REPUBLIC_DURATION_MIN} hint="dəq" />
            <StatBox label="Suallar" value={republicQuestionCount()} hint="sual" />
            <StatBox label="Giriş" value={REPUBLIC_PRICE} hint="₼" />
          </div>
          <p className="mt-5 text-sm font-semibold leading-6">
            🏆 Birinci yerə çıxan növbəti ayın imtahanına pulsuz daxil olur.
          </p>
          <p className="mt-4 text-sm font-semibold text-[var(--muted)]">Hesab: {formatManat(wallet.balance)}</p>
          <Button className="mt-6 w-full text-base min-[768px]:w-auto min-[768px]:min-w-[240px]" onClick={startOrPay}>
            {canEnter
              ? (freePass && !paid ? 'Pulsuz daxil ol →' : 'İmtahana başla →')
              : 'Tezliklə'}
          </Button>
          {!canEnter ? (
            <p className="mt-3 text-center text-xs font-bold text-[#f0b429]">
              Aylıq imtahan ödənişi tezliklə açılacaq.
            </p>
          ) : freePass && !paid ? (
            <p className="mt-3 text-center text-xs font-bold text-[#f0b429]">
              Keçən ay birinci oldunuz — bu ay pulsuzdur.
            </p>
          ) : null}
          {msg ? <p className="mt-3 text-center text-sm font-bold text-[#8fd4a4]">{msg}</p> : null}
        </div>
        <RepublicProgressChart
          history={myResults}
          onRegister={startOrPay}
          registerLabel={canEnter ? undefined : 'Aylıq imtahan · Tezliklə'}
        />
        </div>

        <div className="space-y-3">
        <RepublicTopTen month={republicMonthKey()} highlightId={user?.id} padPractice={Boolean(user?.practice)} />
        <button
          type="button"
          onClick={() => openRepublicRankingPdf(republicMonthKey(), { highlightUserId: user?.id, padPractice: Boolean(user?.practice) })}
          className="card-vector flex w-full items-center justify-center gap-2 rounded-full bg-[var(--card)] py-3 text-sm font-extrabold ring-1 ring-[var(--line)]"
        >
          <Download size={16} /> Tam siyahını yüklə
        </button>
        <div className="republic-folds">
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
              {myResults.map((row) => {
                const place = republicResults(row.month).findIndex((item) => String(item.userId) === String(row.userId));
                return (
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
                        Nəticə: {row.percent}%{place >= 0 ? ` · Yer: #${place + 1}` : ''}
                        {row.correct != null ? ` · ${row.correct}/${row.total} düzgün` : ''}
                        {row.durationSeconds != null ? ` · vaxt ${formatHms(row.durationSeconds)}` : ''}
                        {row.at ? ` · ${formatDateTime(row.at)}` : ''}
                      </span>
                    </span>
                    <span className="font-black">{row.percent}%</span>
                    <ChevronRight size={16} className="text-[var(--muted)]" />
                  </button>
                </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">Hələ nəticə yoxdur. İmtahanı bitirəndən sonra burada görünəcək.</p>
          )}
        </Fold>
        </div>
        </div>
        </div>
      </div>
    </AppShell>
  );
}
