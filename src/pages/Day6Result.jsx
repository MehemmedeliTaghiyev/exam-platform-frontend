import { useContext, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, MinusCircle, XCircle } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Button, Card } from '../components/ui';
import { AuthContext } from '../context/AuthContext';
import { formatHms } from '../lib/utils';
import { day6ResultFor } from '../lib/day6ReviewQuiz';

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

export default function Day6Result() {
  const { cycleKey } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const row = useMemo(() => day6ResultFor(user?.id, cycleKey), [user?.id, cycleKey]);
  const [filter, setFilter] = useState('all');

  if (!row) {
    return (
      <AppShell title="Nəticə">
        <Card className="text-center">
          <p className="font-extrabold">Nəticə tapılmadı</p>
          <Button className="mt-4" onClick={() => navigate('/student/day6')}>Geri</Button>
        </Card>
      </AppShell>
    );
  }

  const paper = row.review || [];
  const visible = paper.filter((q) => filter === 'all' || statusOf(q) === filter);

  return (
    <AppShell title="">
      <div className="desk-page space-y-4">
        <Card className="text-center min-[768px]:text-left">
          <p className="text-sm font-bold text-[var(--muted)]">{row.label || row.cycleKey}</p>
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
          <Button variant="secondary" className="mt-5" onClick={() => navigate('/student/day6')}>Geri</Button>
        </Card>
        <div className="flex flex-wrap gap-2">
          {[
            ['all', 'Hamısı'],
            ['correct', 'Düzgün'],
            ['wrong', 'Səhv'],
            ['blank', 'Cavabsız'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-extrabold ${
                filter === key ? 'bg-[var(--accent)] text-[#3a2200]' : 'bg-[var(--card)] text-[var(--muted)] ring-1 ring-[var(--line)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {visible.map((q) => (
            <Card key={q.questionId || q.index}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-extrabold">{q.index}. {q.text}</p>
                <StatusBadge status={statusOf(q)} />
              </div>
              <p className="mt-2 text-sm font-semibold text-[var(--muted)]">Sənin: {q.selectedText}</p>
              <p className="mt-1 text-sm font-semibold text-[#22c55e]">Düzgün: {q.correctText}</p>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
