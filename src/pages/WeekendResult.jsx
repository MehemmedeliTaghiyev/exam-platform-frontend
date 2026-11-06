import { useContext, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, MinusCircle, XCircle } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Button, Card } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { formatHms } from '../lib/utils';
import { weekendResultFor } from '../lib/weekendWeakExam';

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

export default function WeekendResult() {
  const { week } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const row = useMemo(() => weekendResultFor(user?.id, week), [user?.id, week]);
  const [filter, setFilter] = useState('all');

  if (!row) {
    return (
      <AppShell title="Nəticə">
        <Card className="text-center">
          <p className="font-extrabold">Nəticə tapılmadı</p>
          <Button className="mt-4" onClick={() => navigate('/student/weekend')}>Geri</Button>
        </Card>
      </AppShell>
    );
  }

  const paper = row.review || [];
  const visible = paper.filter((q) => filter === 'all' || statusOf(q) === filter);

  return (
    <AppShell title="">
      <div className="desk-page space-y-4">
        <div className="desk-split">
          <Card className="text-center min-[768px]:text-left">
            <p className="text-sm font-bold text-[var(--muted)]">{row.label || row.week}</p>
            <p className="mt-3 text-5xl font-black">{row.percent}%</p>
            <p className="mt-2 text-sm font-extrabold">
              Vaxt: {formatHms(row.durationSeconds ?? 0)} / {formatHms(row.durationLimit || 0)}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-[#d7f3e0] px-3 py-3 text-[#176b38]">
                <p className="text-[11px] font-black uppercase">Düzgün</p>
                <p className="mt-1 text-2xl font-black">{row.correct}</p>
              </div>
              <div className="rounded-2xl bg-[#ffe4e8] px-3 py-3 text-[#be123c]">
                <p className="text-[11px] font-black uppercase">Səhv</p>
                <p className="mt-1 text-2xl font-black">{row.wrong}</p>
              </div>
              <div className="rounded-2xl bg-[var(--bg)] px-3 py-3">
                <p className="text-[11px] font-black uppercase text-[var(--muted)]">Cavabsız</p>
                <p className="mt-1 text-2xl font-black">{row.blank}</p>
              </div>
            </div>
            <Button variant="secondary" className="mt-5 min-[768px]:w-auto" onClick={() => navigate('/student/weekend')}>
              Geri
            </Button>
          </Card>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                ['all', 'Hamısı'],
                ['correct', 'Düzgün'],
                ['wrong', 'Səhv'],
                ['blank', 'Cavabsız'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${
                    filter === id ? 'bg-[var(--accent)] text-[#3a2200]' : 'bg-[var(--card)] text-[var(--muted)] ring-1 ring-[var(--line)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {visible.map((q) => {
              const status = statusOf(q);
              return (
                <article key={q.questionId} className="rounded-[22px] bg-[var(--card)] p-4 ring-1 ring-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white/50">Sual {q.index}{q.subject ? ` · ${q.subject}` : ''}</p>
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
                          <span>{String.fromCharCode(65 + oi)}) {opt.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
