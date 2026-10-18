import { GraduationCap, PenLine } from 'lucide-react';

export default function RoleCards({ onTeacher, onStudent }) {
  return (
    <section className="hp-section pt-0">
      <div className="mx-auto grid max-w-[1180px] gap-4 px-4 min-[640px]:grid-cols-2 min-[980px]:px-6">
        <article className="hp-role">
          <div className="hp-role-head">
            <span className="hp-icon" aria-hidden="true">
              <PenLine size={22} />
            </span>
            <div>
              <h2>Müəllim</h2>
              <p>İmtahan yarat, sual kartı əlavə et. Məşq rejimində serverə getmir.</p>
            </div>
          </div>
          <button type="button" onClick={onTeacher} className="hp-btn hp-btn-primary hp-lift">
            Müəllim kimi başla
          </button>
        </article>
        <article className="hp-role">
          <div className="hp-role-head">
            <span className="hp-role-gold" aria-hidden="true">
              <GraduationCap size={22} />
            </span>
            <div>
              <h2>Şagird</h2>
              <p>Hazır sınaqları aç, A–E seç, nəticəyə bax.</p>
            </div>
          </div>
          <button type="button" onClick={onStudent} className="hp-btn hp-btn-gold hp-lift">
            Məşqə başla
          </button>
        </article>
      </div>
    </section>
  );
}
