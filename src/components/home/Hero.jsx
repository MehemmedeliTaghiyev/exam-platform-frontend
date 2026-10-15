import { Link } from 'react-router-dom';
import ResultPreviewCard from './ResultPreviewCard';

export default function Hero({ onPractice }) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full"
        style={{ background: 'radial-gradient(circle, var(--hp-glow), transparent 68%)' }}
      />
      <div className="mx-auto grid max-w-[1120px] items-center gap-12 px-5 py-16 min-[900px]:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--hp-line)] bg-[var(--hp-card)] px-3 py-1 text-sm font-semibold">
            <span className="h-2 w-2 rounded-full bg-[var(--hp-success)]" aria-hidden="true" />
            Müəllim və şagird üçün eyni platforma
          </p>
          <h1 className="hp-h1 mt-5">
            İmtahana hazırlığı{' '}
            <span className="hp-highlight">ölç, anla, irəlilə.</span>
          </h1>
          <p className="mt-5 max-w-[520px] text-[18px] text-[var(--hp-muted)]">
            Müəllim imtahanı yaradır, şagird həll edir, ExamPulse isə hansı mövzuda güclü, hansında zəif olduğunu göstərir.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="hp-btn hp-btn-primary hp-lift">Pulsuz başla</Link>
            <button type="button" onClick={onPractice} className="hp-btn hp-btn-secondary hp-lift">Girişsiz məşq et</button>
          </div>
        </div>
        <ResultPreviewCard />
      </div>
    </section>
  );
}
