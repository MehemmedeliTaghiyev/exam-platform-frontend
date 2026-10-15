import { Link } from 'react-router-dom';

export default function CtaBand() {
  return (
    <section id="elaqe" className="hp-section scroll-mt-24">
      <div className="mx-auto max-w-[1120px] px-5">
        <div
          className="rounded-[28px] px-6 py-14 text-center text-white"
          style={{ background: 'linear-gradient(135deg, #4a3df0, #7c5cff, #22b8e0)' }}
        >
          <h2 className="hp-h2">İlk sınağını bu gün həll et</h2>
          <p className="mx-auto mt-3 max-w-[520px] text-white/90">
            Qeydiyyat pulsuzdur. Telefonda da, kompüterdə də işləyir.
          </p>
          <Link to="/register" className="hp-btn hp-btn-white hp-lift mt-8">Qeydiyyatdan keç</Link>
        </div>
      </div>
    </section>
  );
}
