import { useContext } from 'react';
import LeaderboardTable from './LeaderboardTable';
import { Card } from './ui';
import { AuthContext } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { leaderboardRowIsUser } from '../lib/examOutcomes';

function RankStack({ rows = [] }) {
  const { user } = useContext(AuthContext);
  const { t } = useLocale();
  return (
    <div>
      <h3 className="mb-3 px-1 text-lg font-black">{t('result.ranking')}</h3>
      {rows.length === 0 ? (
        <p className="px-1 text-sm text-[var(--muted)]">{t('result.empty')}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const mine = leaderboardRowIsUser(row, user) || Boolean(row.highlight);
            const name = mine ? t('result.you') : (row.studentName || `Tələbə #${row.studentId}`);
            const score = Math.round(Number(row.percent ?? row.score ?? 0));
            return (
              <div
                key={row.id || row.studentExamId || row.studentId}
                className={`flex items-center justify-between rounded-2xl bg-[var(--card)] px-4 py-3.5 ${mine ? 'rank-you' : ''}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 text-sm font-black text-[var(--muted)]">{row.rank || '—'}</span>
                  <span className="truncate font-extrabold">{name}</span>
                </div>
                <span className="shrink-0 font-black text-[var(--accent)]">{score}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DualExamRanking({
  ownRows = [],
  generalRows = [],
  generalOnly = false,
  generalLimit,
}) {
  const general = generalLimit ? generalRows.slice(0, generalLimit) : generalRows;
  if (generalOnly) {
    return <RankStack rows={general} />;
  }
  return (
    <div className="space-y-6">
      <Card className="overflow-x-auto p-0">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h3 className="font-bold">Öz şagirdlər (sıralama)</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Yalnız bu müəllimin öz uşaqları. Bal, sonra bitirmə müddəti.</p>
        </div>
        <LeaderboardTable rows={ownRows} emptyText="Öz şagirdlərdən hələ iştirakçı yoxdur." />
      </Card>
      <Card className="overflow-x-auto p-0">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h3 className="font-bold">Ümumi sıralama</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">İmtahana daxil olan bütün iştirakçılar — öz şagirdlər və kənardan gələnlər.</p>
        </div>
        <LeaderboardTable rows={general} emptyText="Hələ iştirakçı yoxdur." />
      </Card>
    </div>
  );
}
