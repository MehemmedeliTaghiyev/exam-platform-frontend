import LeaderboardTable from './LeaderboardTable';
import { Card } from './ui';

export default function DualExamRanking({ ownRows = [], generalRows = [] }) {
  return (
    <div className="space-y-6">
      <Card className="overflow-x-auto p-0">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
          <h3 className="font-bold">Öz şagirdlər (sıralama)</h3>
          <p className="mt-1 text-sm text-gray-500">Yalnız bu müəllimin öz uşaqları. Bal, sonra bitirmə müddəti.</p>
        </div>
        <LeaderboardTable rows={ownRows} emptyText="Öz şagirdlərdən hələ iştirakçı yoxdur." />
      </Card>
      <Card className="overflow-x-auto p-0">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-slate-800">
          <h3 className="font-bold">Ümumi sıralama</h3>
          <p className="mt-1 text-sm text-gray-500">İmtahana daxil olan bütün iştirakçılar — öz şagirdlər və kənardan gələnlər.</p>
        </div>
        <LeaderboardTable rows={generalRows} emptyText="Hələ iştirakçı yoxdur." />
      </Card>
    </div>
  );
}
