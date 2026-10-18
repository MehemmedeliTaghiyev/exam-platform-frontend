import { GraduationCap, PenLine } from 'lucide-react';

export default function RoleCards({ onTeacher, onStudent }) {
  return (
    <section className="hp-section pt-0">
      <div className="mx-auto grid max-w-[1180px] gap-5 px-4 min-[720px]:grid-cols-2 min-[980px]:px-6">
        <article className="hp-card hp-lift p-7">
          <span className="hp-icon">
            <PenLine size={22} aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold">Müəllim</h2>
          <p className="mt-2 text-[var(--hp-muted)]">İmtahan yarat, sual kartı əlavə et. Məşq rejimində serverə getmir.</p>
          <button type="button" onClick={onTeacher} className="hp-btn hp-btn-primary hp-lift mt-6">Müəllim kimi başla</button>
        </article>
        <article className="hp-card hp-lift p-7">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff4d6] text-[#a87408]">
            <GraduationCap size={22} aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold">Şagird</h2>
          <p className="mt-2 text-[var(--hp-muted)]">Hazır sınaqları aç, A–E seç, nəticəyə bax.</p>
          <button type="button" onClick={onStudent} className="hp-btn hp-btn-gold hp-lift mt-6">Məşqə başla</button>
        </article>
      </div>
    </section>
  );
}
