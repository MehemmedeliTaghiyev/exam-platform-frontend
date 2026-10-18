import { Link } from 'react-router-dom';

export default function CtaBand() {
  return (
    <section id="elaqe" className="hp-section scroll-mt-24 pt-0">
      <div className="mx-auto max-w-[1180px] px-4 min-[980px]:px-6">
        <div className="rounded-[32px] bg-[#2f7a45] px-6 py-14 text-center text-white">
          <h2 className="hp-h2">İlk sınağını bu gün həll et</h2>
          <p className="mx-auto mt-3 max-w-[520px] text-white/90">
            Qeydiyyat pulsuzdur. Telefonda da, kompüterdə də işləyir.
          </p>
          <Link to="/register" className="hp-btn hp-btn-gold hp-lift mt-8">Qeydiyyatdan keç</Link>
        </div>
      </div>
    </section>
  );
}
