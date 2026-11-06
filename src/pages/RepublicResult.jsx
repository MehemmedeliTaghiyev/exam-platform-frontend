import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Download, MinusCircle, XCircle } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Button, Card } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import RepublicTopTen from '../components/RepublicTopTen';
import {
  REPUBLIC_DURATION_MIN,
  openRepublicRankingPdf,
  republicMonthLabel,
  republicResultFor,
  republicResults,
  republicReviewPaper,
} from '../lib/republicExam';
import { formatDateTime, formatHms } from '../lib/utils';
import { rememberExamOutcome } from '../lib/examOutcomes';

function optionLabel(opt, index) {
  const letter = String.fromCharCode(65 + index);
  const text = String(opt.text ?? '').trim();
  if (!text || text.toUpperCase() === letter) return letter;
  return `${letter}) ${text}`;
}

function statusOf(q) {
  if (q.unanswered) return 'blank';
  return q.isCorrect ? 'correct' : 'wrong';
}

function StatusBadge({ status }) {
  if (status === 'correct') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#d7f3e0] px-3 py-1 text-xs font-black text-[#176b38]">
        <CheckCircle2 size={14} /> Düzgün
      </span>
    );
  }
  if (status === 'wrong') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#ffe4e8] px-3 py-1 text-xs font-black text-[#be123c]">
        <XCircle size={14} /> Səhv
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/70">
      <MinusCircle size={14} /> Cavabsız
    </span>
  );
}

function RepublicPaper({ questions }) {
  const [filter, setFilter] = useState('all');
  const counts = useMemo(() => ({
    all: questions.length,
    correct: questions.filter((q) => statusOf(q) === 'correct').length,
    wrong: questions.filter((q) => statusOf(q) === 'wrong').length,
    blank: questions.filter((q) => statusOf(q) === 'blank').length,
  }), [questions]);
  const visible = questions.filter((q) => filter === 'all' || statusOf(q) === filter);
  const tabs = [
    { id: 'all', label: `Hamısı (${counts.all})` },
    { id: 'correct', label: `Düzgün (${counts.correct})` },
    { id: 'wrong', label: `Səhv (${counts.wrong})` },
    { id: 'blank', label: `Cavabsız (${counts.blank})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${
              filter === tab.id ? 'bg-[var(--accent)] text-[#3a2200]' : 'bg-[var(--card)] text-[var(--muted)] ring-1 ring-[var(--line)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q) => {
          const status = statusOf(q);
          const tone = status === 'correct'
            ? 'bg-[#2ee07a] text-[#062014]'
            : status === 'wrong'
              ? 'bg-[#e11d48] text-white'
              : 'bg-[#2a3340] text-white/80';
          return (
            <button
              key={q.questionId || q.index}
              type="button"
              onClick={() => document.getElementById(`republic-q-${q.index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-black ${tone}`}
            >
              {q.index}
            </button>
          );
        })}
      </div>
      {visible.map((q) => {
        const status = statusOf(q);
        const frame = status === 'correct'
          ? 'ring-[#2ee07a]/50'
          : status === 'wrong'
            ? 'ring-[#e11d48]/45'
            : 'ring-white/10';
        return (
          <article
            key={q.questionId || q.index}
            id={`republic-q-${q.index}`}
            className={`scroll-mt-24 rounded-[24px] bg-[var(--card)] p-4 ring-1 ${frame}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-white/50">
                  Sual {q.index}
                  {q.subject ? ` · ${q.subject}` : ''}
                  {q.topic ? ` · ${q.topic}` : ''}
                </p>
                <h3 className="mt-2 text-base font-extrabold leading-6">{q.text}</h3>
              </div>
              <StatusBadge status={status} />
            </div>
            <div className="mt-4 space-y-2">
              {(q.options || []).map((opt, oi) => {
                const chosenWrong = opt.isSelected && !opt.isCorrect;
                const tone = opt.isCorrect
                  ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100'
                  : chosenWrong
                    ? 'border-rose-400 bg-rose-500/15 text-rose-100'
                    : 'border-white/10 bg-white/5 text-white/80';
                return (
                  <div key={opt.id || oi} className={`flex items-start gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold ${tone}`}>
                    {opt.isCorrect ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : chosenWrong ? <XCircle size={16} className="mt-0.5 shrink-0" /> : <Circle size={16} className="mt-0.5 shrink-0 opacity-40" />}
                    <span className="min-w-0 flex-1">
                      {optionLabel(opt, oi)}
                      {opt.isCorrect ? <span className="ml-2 text-[11px] font-black uppercase tracking-wide">düzgün cavab</span> : null}
                      {opt.isSelected ? <span className="ml-2 text-[11px] font-black uppercase tracking-wide">sizin cavab</span> : null}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <p className={status === 'wrong' ? 'font-bold text-rose-200' : 'font-semibold text-white/70'}>
                Sizin cavab: {q.selectedText || 'Cavab verilməyib'}
              </p>
              <p className="font-extrabold text-emerald-300">
                Düzgün cavab: {q.correctText}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function RepublicResult() {
  const { month } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const row = useMemo(() => republicResultFor(user?.id, month), [user?.id, month]);
  const paper = useMemo(() => (row ? republicReviewPaper(row) : []), [row]);
  const rank = useMemo(() => {
    if (!row) return null;
    const list = republicResults(row.month);
    const index = list.findIndex((item) => String(item.userId) === String(user?.id));
    return index >= 0 ? index + 1 : null;
  }, [row, user?.id]);

  useEffect(() => {
    if (!row || !user?.id) return;
    rememberExamOutcome(user.id, `republic:${row.month}`, {
      percent: row.percent,
      rank,
      correct: row.correct,
      total: row.total,
    });
  }, [row, user?.id, rank]);

  if (!row) {
    return (
      <AppShell title="Nəticə">
        <Card className="text-center">
          <p className="font-extrabold">Nəticə tapılmadı</p>
          <Button className="mt-4" onClick={() => navigate('/student/republic')}>Geri</Button>
        </Card>
      </AppShell>
    );
  }

  const correct = paper.length ? paper.filter((q) => statusOf(q) === 'correct').length : Number(row.correct) || 0;
  const wrong = paper.length ? paper.filter((q) => statusOf(q) === 'wrong').length : Number(row.wrong) || 0;
  const blank = paper.length ? paper.filter((q) => statusOf(q) === 'blank').length : Number(row.blank) || 0;
  const total = paper.length || row.total || 0;

  return (
    <AppShell title="">
      <div className="desk-page space-y-4">
        <Card className="text-center min-[768px]:text-left">
          <p className="inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-extrabold text-[var(--accent)]">
            Sənin nəticən
          </p>
          <p className="mt-3 text-sm font-bold text-[var(--muted)]">{republicMonthLabel(row.month)} · Respublika sınağı</p>
          <p className="mt-3 text-5xl font-black">{row.percent}%</p>
          <p className="mt-2 text-lg font-black text-[var(--accent)]">
            {rank ? `Yer: #${rank}` : 'Sıra hesablanır'}
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
            {row.at ? formatDateTime(row.at) : ''}
          </p>
          <p className="mt-2 text-sm font-extrabold">
            Vaxt: {formatHms(row.durationSeconds ?? 0)} / {formatHms((row.durationLimit || REPUBLIC_DURATION_MIN * 60))}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-[#d7f3e0] px-3 py-3 text-[#176b38]">
              <p className="text-[11px] font-black uppercase">Düzgün</p>
              <p className="mt-1 text-2xl font-black">{correct}</p>
            </div>
            <div className="rounded-2xl bg-[#ffe4e8] px-3 py-3 text-[#be123c]">
              <p className="text-[11px] font-black uppercase">Səhv</p>
              <p className="mt-1 text-2xl font-black">{wrong}</p>
            </div>
            <div className="rounded-2xl bg-[var(--bg)] px-3 py-3">
              <p className="text-[11px] font-black uppercase text-[var(--muted)]">Cavabsız</p>
              <p className="mt-1 text-2xl font-black">{blank}</p>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-[var(--muted)]">{total} sual · imtahan vərəqi aşağıdadır</p>
          <Button variant="secondary" className="mt-5 min-[768px]:w-auto" onClick={() => navigate('/student/republic')}>Geri</Button>
        </Card>

        <RepublicTopTen
          month={row.month}
          highlightId={user?.id}
          padPractice={Boolean(user?.practice)}
          limit={100}
          title="Ümumi top 100"
          hint="Sənin nəticən yuxarıdadır. Tam siyahını PDF kimi yükləyə bilərsən."
        />
        <button
          type="button"
          onClick={() => openRepublicRankingPdf(row.month, { highlightUserId: user?.id, padPractice: Boolean(user?.practice) })}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--card)] py-3 text-sm font-extrabold ring-1 ring-[var(--line)] min-[768px]:w-auto min-[768px]:px-6"
        >
          <Download size={16} /> Tam siyahını yüklə
        </button>

        <h2 className="px-1 text-lg font-extrabold">İmtahan vərəqi</h2>
        {paper.length ? (
          <RepublicPaper questions={paper} />
        ) : (
          <Card>
            <p className="text-sm font-semibold leading-6 text-[var(--muted)]">Bu imtahanın sualları tapılmadı.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
