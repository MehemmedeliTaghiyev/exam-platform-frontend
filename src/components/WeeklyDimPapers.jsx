import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, FormError, Select } from './ui';
import { GRADES, LANGS, WEEKLY_BANDS, isoWeek, isPastWeek } from '../lib/pipeline/contract';
import { useWeeklyPapers } from '../lib/pipeline/hooks';

export default function WeeklyDimPapers() {
  const navigate = useNavigate();
  const [grade, setGrade] = useState('11');
  const [language, setLanguage] = useState('az');
  const weekly = useWeeklyPapers({
    grade, groupId: 'general', subject: 'math', language, ensureOnLoad: true,
  });
  const pair = weekly.payload?.pair || {};
  const current = isoWeek();

  const openPaper = (examId) => {
    if (!examId) return;
    navigate(`/student/dim/${examId}?lang=${language}`);
  };

  const pickWeek = (next) => {
    weekly.setWeek(next);
  };

  return (
    <Card className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">DİM · həftəlik riyaziyyat</p>
          <h2 className="mt-1 text-lg font-extrabold">Hər həftə iki imtahan: asan və orta</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Hamı eyni kağızı alır. Köhnə həftəni açsanız arxiv gəlir — suallar yenidən yığılmır.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select label="Sinif" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
          <Select label="Dil" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => pickWeek(current)}
          className={`rounded-full px-3 py-1.5 text-sm font-extrabold ${
            weekly.week === current
              ? 'bg-[linear-gradient(135deg,#5b4cf5,#7c5cff)] text-white'
              : 'border border-[var(--line)] text-[var(--muted)]'
          }`}
        >
          Bu həftə {current}
        </button>
        {(weekly.weeks || []).filter((w) => w !== current).slice(0, 8).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => pickWeek(w)}
            className={`rounded-full px-3 py-1.5 text-sm font-extrabold ${
              weekly.week === w
                ? 'bg-[linear-gradient(135deg,#5b4cf5,#7c5cff)] text-white'
                : 'border border-[var(--line)] text-[var(--muted)]'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {weekly.busy && <p className="mt-3 text-sm text-[var(--muted)]">Kağızlar yüklənir…</p>}
      <FormError message={weekly.error} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {WEEKLY_BANDS.map((band) => {
          const paper = pair[band.code];
          return (
            <div key={band.code} className="rounded-2xl border border-[var(--line)] p-4">
              <p className="text-sm font-extrabold">{band.label}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {paper?.exam_id
                  ? `Arxiv #${paper.exam_id}${paper.title ? ` · ${paper.title}` : ''}`
                  : isPastWeek(weekly.week)
                    ? 'Bu həftə arxivdə yoxdur (yeni sual yığılmayacaq).'
                    : 'Hələ yığılmayıb.'}
              </p>
              <Button
                className="mt-3"
                size="sm"
                disabled={!paper?.exam_id}
                onClick={() => openPaper(paper?.exam_id)}
              >
                Aç
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
