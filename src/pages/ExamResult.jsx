import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../api/axios';
import AppShell from '../components/AppShell';
import { Button, Card, Skeleton, StatCard } from '../components/ui';
import { localDb } from '../lib/localDb';
import { CheckCircle2, Percent, XCircle, Award } from 'lucide-react';

export default function ExamResult() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await API.get(`/Submissions/result/${submissionId}`);
        setResult(response.data);
      } catch {
        const local = localDb.getSubmissions().find((s) => String(s.id) === String(submissionId));
        setResult(local);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [submissionId]);

  if (loading) {
    return (
      <AppShell title="Nəticə">
        <Skeleton className="h-64" />
      </AppShell>
    );
  }

  if (!result) {
    return (
      <AppShell title="Nəticə">
        <Card>Nəticə tapılmadı.</Card>
      </AppShell>
    );
  }

  const total = result.totalQuestions || 1;
  const correct = result.correctAnswersCount ?? result.score ?? 0;
  const scorePercentage = Math.round((correct / total) * 100);
  const isPassed = scorePercentage >= 50;

  return (
    <AppShell title="İmtahan nəticəsi">
      <Card className="mx-auto max-w-2xl text-center">
        <p className="text-sm text-gray-500">{result.examTitle || `İmtahan #${result.examId}`}</p>
        <div
          className={`mt-5 rounded-2xl px-4 py-5 text-lg font-bold ${
            isPassed
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
          }`}
        >
          {isPassed ? 'Təbriklər, imtahanı keçdiniz' : 'Təəssüf, kəsildiniz'}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <StatCard icon={Award} label="Toplanan bal" value={result.score ?? correct} />
          <StatCard icon={Percent} label="Uğur faizi" value={`${scorePercentage}%`} />
          <StatCard icon={CheckCircle2} label="Düzgün" value={`${correct} / ${total}`} />
          <StatCard icon={XCircle} label="Səhv" value={total - correct} />
        </div>
        <Button className="mt-8" onClick={() => navigate('/student')}>
          Panelə qayıt
        </Button>
      </Card>
    </AppShell>
  );
}
