import { Trophy } from 'lucide-react';
import { republicRankingRows, republicTopHundred, republicTopTen } from '../lib/republicExam';
import { formatHms } from '../lib/utils';

export default function RepublicTopTen({
  month,
  highlightId,
  padPractice = false,
  limit = 10,
  title = 'İlk 10 abituriyent',
  hint = 'İmtahana daxil olanda ümumi sıralamanın başı',
  className = '',
}) {
  const rows = limit === 100
    ? republicTopHundred(month, { padPractice })
    : limit
      ? republicTopTen(month, { padPractice }).slice(0, limit)
      : republicRankingRows(month, { padPractice });

  return (
    <section className={`card-vector overflow-hidden rounded-[22px] bg-[var(--card)] ring-1 ring-[var(--line)] ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3">
        <Trophy size={16} className="text-[#f0b429]" />
        <div>
          <p className="font-extrabold">{title}</p>
          {hint ? <p className="text-xs font-semibold text-[var(--muted)]">{hint}</p> : null}
        </div>
      </div>
      {rows.length ? (
        <ol className={`${limit === 100 ? 'max-h-[70vh]' : 'republic-rank-five'} divide-y divide-[var(--line)] overflow-y-auto`}>
          {rows.map((row) => {
            const mine = String(row.userId) === String(highlightId);
            return (
              <li
                key={row.userId || row.rank}
                className={`flex items-center gap-3 px-4 py-2.5 ${mine ? 'rank-you' : ''}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${
                  row.rank === 1 ? 'bg-[#f0b429] text-[#3a2a00]' : 'bg-[var(--bg)] text-[var(--muted)]'
                }`}
                >
                  {row.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{row.fullName || 'Abituriyent'}</span>
                  <span className="text-[11px] font-semibold text-[var(--muted)]">
                    {row.correct ?? '—'}/{row.total ?? '—'}
                    {row.durationSeconds != null ? ` · ${formatHms(row.durationSeconds)}` : ''}
                  </span>
                </span>
                <span className="shrink-0 font-black tabular-nums">{row.percent}%</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="px-4 pb-4 text-sm font-semibold text-[var(--muted)]">
          Hələ iştirakçı yoxdur. İlk daxil olanlar burada görünəcək.
        </p>
      )}
    </section>
  );
}
