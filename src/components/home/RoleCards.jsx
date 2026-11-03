import { GraduationCap, PenLine } from 'lucide-react';

export default function RoleCards() {
  return (
    <section id="imkanlar" className="hp-section scroll-mt-24 pt-0">
      <div className="mx-auto grid max-w-[1180px] gap-4 px-4 min-[640px]:grid-cols-2 min-[980px]:px-6">
        <article className="hp-role">
          <div className="hp-role-head">
            <span className="hp-icon" aria-hidden="true">
              <PenLine size={22} />
            </span>
            <div>
              <h2>Müəllim</h2>
              <p>İmtahan yarat, sual kartı əlavə et, qruplarını idarə et.</p>
            </div>
          </div>
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
        </article>
      </div>
    </section>
  );
}
