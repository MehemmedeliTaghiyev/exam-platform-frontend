import { Link } from 'react-router-dom';

export default function CtaBand() {
  return (
    <section id="elaqe" className="hp-section hp-cta scroll-mt-24">
      <div className="mx-auto max-w-[1180px] px-5 min-[980px]:px-8">
        <div className="hp-cta-band">
          <h2 className="hp-h2">İlk sınağını bu gün həll et</h2>
          <p>
            Qeydiyyat pulsuzdur. Telefonda da, kompüterdə də işləyir.
          </p>
          <Link to="/register" className="hp-btn hp-btn-gold hp-lift">
            Qeydiyyatdan keç
          </Link>
        </div>
      </div>
    </section>
  );
}
