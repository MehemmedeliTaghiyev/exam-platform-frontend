import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { republicMonthTitle } from '../../lib/republicExam';

function untilMonthEnd(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const ms = Math.max(0, end.getTime() - now.getTime());
  return {
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
  };
}

export default function RepublicBanner() {
  const [left, setLeft] = useState(() => untilMonthEnd());

  useEffect(() => {
    const timer = setInterval(() => setLeft(untilMonthEnd()), 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="hp-republic" aria-label="Respublika sınağı">
      <div className="hp-republic-inner">
        <div className="hp-republic-copy">
          <span className="hp-republic-mark" aria-hidden="true">
            <Trophy size={18} />
          </span>
          <div>
            <p className="hp-republic-title">{republicMonthTitle()}</p>
            <p className="hp-republic-meta">
              Bağlanmasına {left.d} gün {left.h} saat qalıb
            </p>
          </div>
        </div>
        <Link to="/student/republic" className="hp-btn hp-btn-sm hp-btn-gold hp-lift">
          Sınağa bax
        </Link>
      </div>
    </section>
  );
}
