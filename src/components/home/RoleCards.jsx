import { GraduationCap, PenLine } from 'lucide-react';

export default function RoleCards({ onStudent, onTeacher }) {
  return (
    <section id="nece" className="hp-section hp-roles scroll-mt-24">
      <div className="mx-auto max-w-[1180px] px-5 min-[980px]:px-8">
        <h2 className="hp-h2">Necə istifadə etmək istəyirsən?</h2>
        <div className="hp-roles-grid">
          <article className="hp-role">
            <div className="hp-role-head">
              <span className="hp-role-gold" aria-hidden="true">
                <GraduationCap size={22} />
              </span>
              <div>
                <h3>Şagird</h3>
                <p>Hazır sınaqları aç, A–E seç, nəticəyə bax.</p>
              </div>
            </div>
            <button type="button" onClick={onStudent} className="hp-btn hp-btn-gold hp-lift">
              Məşqə başla
            </button>
          </article>
          <article className="hp-role">
            <div className="hp-role-head">
              <span className="hp-icon" aria-hidden="true">
                <PenLine size={22} />
              </span>
              <div>
                <h3>Müəllim</h3>
                <p>İmtahan yarat, sual kartı əlavə et, qruplarını idarə et.</p>
              </div>
            </div>
            <button type="button" onClick={onTeacher} className="hp-btn hp-btn-ghost hp-lift">
              Müəllim kimi başla
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}
