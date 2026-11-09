import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, FormError, Input, Select } from './ui';
import { GRADES, LANGS, SUBJECTS, WEEKLY_BANDS, isoWeek } from '../lib/pipeline/contract';
import { useTeacherQuizOrder, useWeeklyPapers } from '../lib/pipeline/hooks';

export default function DimBankPanel() {
  const navigate = useNavigate();
  const language = 'az'; // hələlik yalnız Azərbaycan
  const [grade, setGrade] = useState('11');
  const [subject, setSubject] = useState('math');
  const [count, setCount] = useState(10);
  const [level, setLevel] = useState('medium');
  const [topics, setTopics] = useState('');
  const teacher = useTeacherQuizOrder();
  const weekly = useWeeklyPapers({ grade, groupId: 'general', subject, language });
  const live = SUBJECTS.find((s) => s.code === subject)?.live;

  const orderQuiz = async (event) => {
    event.preventDefault();
    if (!live) return;
    try {
      const exam = await teacher.order({ language, grade, subject, count, level, topics });
      if (exam?.exam_id) navigate(`/teacher/dim/${exam.exam_id}?lang=${language}`);
    } catch {
      /* error on hook */
    }
  };

  const pair = weekly.payload?.pair || {};

  return (
    <div className="mb-8 grid gap-5 lg:grid-cols-2">
      <Card>
        <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">DİM bankı · müəllim sifarişi</p>
        <h2 className="mt-1 text-lg font-extrabold">Öz quiz-inizi yığın</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Fənn, dil, sinif, çətinlik və fəsillər. Unikallıq və dublikat kəsimi bankda qalır.
        </p>
        <form onSubmit={orderQuiz} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Fənn" value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => (
                <option key={s.code} value={s.code}>{s.label}{s.live ? '' : ' (tezliklə)'}</option>
              ))}
            </Select>
            <Select
              label="Dil"
              value={language}
              onChange={(e) => {
                if (e.target.value !== 'az') return;
              }}
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code} disabled={l.code !== 'az'}>
                  {l.label}{l.code !== 'az' ? ' (tezliklə)' : ''}
                </option>
              ))}
            </Select>
            <Select label="Sinif" value={grade} onChange={(e) => setGrade(e.target.value)}>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
            <Select label="Çətinlik" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="easy">Asan</option>
              <option value="medium">Orta</option>
              <option value="hard">Çətin</option>
            </Select>
          </div>
          <Input
            label="Sual sayı"
            type="number"
            min={1}
            max={40}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 10)}
          />
          <Input
            label="Fəsillər (nöqtəli vergül ilə)"
            placeholder="Üçbucaqlar;Faiz"
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            required
          />
          <FormError message={teacher.error} />
          {!live && <p className="text-sm text-[var(--muted)]">Bu fənn hələ bankda yoxdur — əvvəl riyaziyyat.</p>}
          <Button type="submit" disabled={teacher.busy || !live}>
            {teacher.busy ? 'Yığılır…' : 'Quiz sifariş et'}
          </Button>
        </form>
      </Card>

      <Card>
        <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">Həftəlik ümumi qrup</p>
        <h2 className="mt-1 text-lg font-extrabold">Asan + orta · {weekly.week || isoWeek()}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Eyni ISO həftə, qrup və sinif üçün hamı eyni arxiv imtahan nömrəsini alır. Keçmiş həftə yenidən yığılmır.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {WEEKLY_BANDS.map((band) => {
            const paper = pair[band.code];
            return (
              <button
                key={band.code}
                type="button"
                disabled={!paper?.exam_id}
                onClick={() => paper?.exam_id && navigate(`/teacher/dim/${paper.exam_id}?lang=${language}`)}
                className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-4 text-left disabled:opacity-50"
              >
                <p className="text-sm font-extrabold">{band.label}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {paper?.exam_id ? `İmtahan #${paper.exam_id}` : 'Hələ yığılmayıb'}
                </p>
              </button>
            );
          })}
        </div>
        <FormError message={weekly.error} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => weekly.generateThisWeek().catch(() => {})} disabled={weekly.busy || !live}>
            {weekly.busy ? 'Gözləyin…' : 'Bu həftənin cütünü yığ'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => weekly.loadArchive(isoWeek()).then(() => weekly.setWeek(isoWeek())).catch(() => {})}
            disabled={weekly.busy}
          >
            Arxivə bax
          </Button>
        </div>
        {(weekly.payload?.action === 'archive' || weekly.payload?.generated === false) && (
          <p className="mt-3 text-xs text-[var(--muted)]">
            {weekly.payload?.complete
              ? 'Arxiv kağızları hazırdır — yeni sual yığılmayıb.'
              : `Arxiv natamam (${(weekly.payload?.missing || []).join(', ') || 'boş'}). Keçmiş həftə üçün yeni sual yığılmır.`}
          </p>
        )}
      </Card>
    </div>
  );
}
