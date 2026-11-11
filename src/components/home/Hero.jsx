import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  Clock,
  FlaskConical,
  Languages,
  Shield,
  Target,
  Users,
  Brain,
} from 'lucide-react';
import ExamProgressCard from '../ExamProgressCard';

const SAMPLE_PROGRESS = [
  { id: 's1', title: 'Sınaq 1', subject: 'Riyaziyyat', at: new Date(2026, 9, 8), percent: 58, label: 'S1', delta: 0 },
  { id: 's2', title: 'Sınaq 2', subject: 'Riyaziyyat', at: new Date(2026, 10, 5), percent: 65, label: 'S2', delta: 7 },
  { id: 's3', title: 'Sınaq 3', subject: 'Riyaziyyat', at: new Date(2026, 10, 12), percent: 74, label: 'S3', delta: 9 },
];

const CHOICES = [
  ['A', '(1, 2)'],
  ['B', '(2, 3)'],
  ['C', '(3, 2)'],
  ['D', '(4, 1)'],
  ['E', '(0, 3)'],
];

const SUBJECTS = ['Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Kimya', 'Fizika'];

const STRIP = [
  {
    icon: Target,
    tint: '#163a28',
    color: '#4ade80',
    title: 'Zəif və güclü tərəflərini gör',
    text: 'Nələrdə güclü olduğunu kəşf et, daha çox məşq etməli olduğun mövzuları müəyyənləşdir.',
  },
  {
    icon: Brain,
    tint: '#3a2a18',
    color: '#e07a3d',
    title: 'Məhz sənə uyğun öyrənmə planı',
    text: 'Öz ehtiyaclarına uyğun hazırlaş və hədəfinə doğru inamla irəlilə.',
  },
  {
    icon: Users,
    tint: '#2a2158',
    color: '#9d8cff',
    title: 'Sənə ən uyğun müəllimi kəşf et',
    text: 'Öyrənmə yolunda sənə dəstək olacaq müəllimi tap.',
  },
  {
    icon: Shield,
    tint: '#163a38',
    color: '#4ecdc4',
    title: 'Tam güvenli təhsil mühiti',
    text: 'Məlumatlarının qorunmasına və etibarlı öyrənmə təcrübəsinə önəm veririk.',
  },
];

export default function Hero({ onPractice, onTeacherPractice }) {
  const [sampleId, setSampleId] = useState('s3');
  const [feat, setFeat] = useState(0);
  const featRef = useRef(null);
  const pauseUntil = useRef(0);
  const glideRef = useRef(0);

  const goFeat = (index) => {
    const el = featRef.current;
    if (!el) return;
    const next = ((index % STRIP.length) + STRIP.length) % STRIP.length;
    const from = el.scrollLeft;
    const to = next * el.clientWidth;
    const dist = Math.abs(to - from);
    if (dist < 2) {
      setFeat(next);
      return;
    }
    window.cancelAnimationFrame(glideRef.current);
    el.classList.add('is-gliding');
    const start = performance.now();
    const dur = Math.min(3400, Math.max(2400, dist * 3.6));
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      el.scrollLeft = from + (to - from) * ease(t);
      if (t < 1) {
        glideRef.current = window.requestAnimationFrame(step);
        return;
      }
      el.classList.remove('is-gliding');
    };
    glideRef.current = window.requestAnimationFrame(step);
    setFeat(next);
  };

  const holdFeat = () => {
    pauseUntil.current = Date.now() + 7000;
    window.cancelAnimationFrame(glideRef.current);
    featRef.current?.classList.remove('is-gliding');
  };

  const onFeatScroll = () => {
    const el = featRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    setFeat(Math.max(0, Math.min(STRIP.length - 1, i)));
  };

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mobile.matches || reduce.matches) return undefined;
    const id = window.setInterval(() => {
      if (Date.now() < pauseUntil.current) return;
      const el = featRef.current;
      if (!el || el.clientWidth < 40) return;
      const current = Math.round(el.scrollLeft / el.clientWidth);
      goFeat(current + 1);
    }, 6200);
    return () => {
      window.clearInterval(id);
      window.cancelAnimationFrame(glideRef.current);
    };
  }, []);

  return (
    <>
      <section className="hp-hero" aria-label="İmtahana hazırlıq">
        <div className="hp-hero-inner">
          <div className="hp-hero-copy">
            <p className="hp-hero-badge">Abituriyent və müəllimlər üçün</p>
            <h1 className="hp-h1">
              İmtahana<br />hazırlığı <em>ölç, anla,<br />irəlilə.</em>
            </h1>
            <p className="hp-hero-lead">
              ExamPulse test nəticələrini anlamağa, zəif mövzularını kəşf etməyə və hədəfinə addım-addım çatmağa kömək edir.
            </p>
            <div className="hp-hero-actions">
              <button type="button" onClick={onPractice} className="hp-btn hp-btn-gold hp-lift">
                Şagird kimi test et
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              {onTeacherPractice ? (
                <button type="button" onClick={onTeacherPractice} className="hp-btn hp-btn-ghost hp-lift">
                  Müəllim kimi sınaq iştirakı et
                </button>
              ) : null}
              <button
                type="button"
                disabled
                title="Tezliklə"
                className="hp-btn hp-btn-ghost hp-lift opacity-55 cursor-not-allowed"
              >
                Magistratura · tezliklə
              </button>
            </div>
            <div className="hp-chips" aria-label="Fənlər">
              {SUBJECTS.map((name) => (
                <span key={name} className="hp-chip">
                  {name === 'Riyaziyyat' ? <Calculator size={13} aria-hidden="true" /> : null}
                  {name === 'Azərbaycan dili' ? <BookOpen size={13} aria-hidden="true" /> : null}
                  {name === 'İngilis dili' ? <Languages size={13} aria-hidden="true" /> : null}
                  {name === 'Kimya' ? <FlaskConical size={13} aria-hidden="true" /> : null}
                  {name}
                </span>
              ))}
              <span className="hp-chip hp-chip-more">+ digər fənlər</span>
              <span className="hp-chip opacity-50" title="Tezliklə">Magistratura · tezliklə</span>
            </div>
            <div id="imkanlar" className="hp-features-wrap scroll-mt-24">
              <div
                ref={featRef}
                className="hp-features"
                aria-label="Əsas imkanlar"
                onScroll={onFeatScroll}
                onPointerDown={holdFeat}
                onTouchStart={holdFeat}
              >
                {STRIP.map((item) => {
                  const Icon = item.icon;
                  return (
                    <article key={item.title}>
                      <span className="hp-strip-icon" style={{ background: item.tint, color: item.color }}>
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <div>
                        <h2>{item.title}</h2>
                        <p>{item.text}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="hp-features-dots" aria-hidden="true">
                {STRIP.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    className={index === feat ? 'is-on' : undefined}
                    onClick={() => {
                      holdFeat();
                      goFeat(index);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="hp-hero-cards">
            <article className="hp-glass hp-result-card" aria-label="Nümunə irəliləyiş">
              <ExamProgressCard rows={SAMPLE_PROGRESS} selectedId={sampleId} onSelect={setSampleId} />
            </article>

            <article className="hp-glass" aria-label="Nümunə sual">
              <div className="hp-quiz-top">
                <p className="hp-quiz-subject">
                  <Calculator size={16} aria-hidden="true" />
                  Riyaziyyat
                </p>
                <p>Sual 3 / 10</p>
                <p className="hp-quiz-time">
                  <Clock size={14} aria-hidden="true" />
                  02:34
                </p>
              </div>
              <p className="hp-quiz-q">
                f(x) = x² − 4x + 5 funksiyasının minimum nöqtəsi hansı nöqtədədir?
              </p>
              <div className="hp-quiz-options">
                {CHOICES.map(([letter, pair]) => (
                  <p key={letter} className={letter === 'B' ? 'is-on' : undefined}>
                    <b>{letter}</b>
                    {pair}
                  </p>
                ))}
              </div>
              <div className="hp-quiz-nav">
                <span><ArrowLeft size={14} aria-hidden="true" /> Əvvəlki</span>
                <span className="is-next">Növbəti <ArrowRight size={14} aria-hidden="true" /></span>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
