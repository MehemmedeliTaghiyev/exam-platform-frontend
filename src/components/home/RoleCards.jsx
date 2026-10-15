import { GraduationCap, PenLine } from 'lucide-react';

export default function RoleCards({ onTeacher, onStudent }) {
  return (
    <section className="hp-section pt-0">
      <div className="mx-auto grid max-w-[1120px] gap-5 px-5 min-[720px]:grid-cols-2">
        <article className="hp-card hp-lift p-[30px]">
          <span className="hp-icon">
            <PenLine size={22} aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold">Müəllim</h2>
          <p className="mt-2 text-[var(--hp-muted)]">İmtahan yarat, sual kartı əlavə et. Məşq rejimində servərə getmir.</p>
          <button type="button" onClick={onTeacher} className="hp-btn hp-btn-primary hp-lift mt-6">Müəllim kimi başla</button>
        </article>
        <article
          className="hp-lift rounded-[24px] p-[30px] text-white"
          style={{ background: 'linear-gradient(135deg, #4a3df0, #7c5cff)' }}
        >
          <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-white/20">
            <GraduationCap size={22} aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold">Şagird</h2>
          <p className="mt-2 text-white/85">Hazır sınaqları aç, A–E seç, nəticəyə bax.</p>
          <button type="button" onClick={onStudent} className="hp-btn hp-btn-white hp-lift mt-6">Məşqə başla</button>
        </article>
      </div>
    </section>
  );
}
