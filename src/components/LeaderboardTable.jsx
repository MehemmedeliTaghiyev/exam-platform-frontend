import { Badge } from './ui';
import { durationSecondsBetween, formatDateTime, formatHms } from '../lib/utils';

function finishDuration(row) {
  if (row.durationSeconds != null && row.durationSeconds !== '') {
    return formatHms(row.durationSeconds);
  }
  if (row.startedAt && row.submittedAt) {
    return formatHms(durationSecondsBetween(row.startedAt, row.submittedAt));
  }
  return '—';
}

export default function LeaderboardTable({ rows = [], emptyText = 'Hələ iştirakçı yoxdur.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500 dark:border-slate-800">
            <th className="px-5 py-3 font-medium">Yer</th>
            <th className="px-5 py-3 font-medium">Tələbə</th>
            <th className="px-5 py-3 font-medium">Bal</th>
            <th className="px-5 py-3 font-medium">Düzgün</th>
            <th className="px-5 py-3 font-medium">Bitirmə vaxtı</th>
            <th className="px-5 py-3 font-medium">Müddət</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-8 text-gray-400">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id || row.studentExamId}
                className={`border-b border-gray-100 last:border-0 dark:border-slate-800 ${
                  row.highlight ? 'bg-brand-50/70 dark:bg-brand-950/30' : ''
                }`}
              >
                <td className="px-5 py-3 font-bold text-brand-600">#{row.rank || '—'}</td>
                <td className="px-5 py-3 font-medium">{row.studentName || `Tələbə #${row.studentId}`}</td>
                <td className="px-5 py-3">
                  <Badge tone={(row.percent ?? row.score ?? 0) >= 50 ? 'success' : 'danger'}>
                    {Math.round(Number(row.percent ?? row.score ?? 0))}%
                  </Badge>
                </td>
                <td className="px-5 py-3 text-gray-500">
                  {row.correctAnswersCount ?? 0}/{row.totalQuestions ?? '—'}
                </td>
                <td className="px-5 py-3 text-gray-500">{formatDateTime(row.submittedAt)}</td>
                <td className="px-5 py-3 font-medium tabular-nums">{finishDuration(row)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
