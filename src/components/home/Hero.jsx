import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  Clock,
  FlaskConical,
  GraduationCap,
  Languages,
  Shield,
  Target,
  Users,
  Brain,
} from 'lucide-react';

const TOPICS = [
  { name: 'Funksiyalar', value: 92, color: '#3dcc78' },
  { name: 'Triqonometriya', value: 74, color: '#3dcc78' },
  { name: 'Həndəsə', value: 41, color: '#e07a3d' },
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
  return (
    <>
      <section className="hp-hero" aria-label="İmtahana hazırlıq">
        <div className="hp-hero-inner">
          <div className="hp-hero-copy">
            <p className="hp-hero-badge">
              <GraduationCap size={16} aria-hidden="true" />
              Daha yaxşı nəticələr üçün
            </p>
            <h1 className="hp-h1">
              İmtahana hazırlığı <span className="hp-gold-word">ölç</span>, anla, irəlilə.
            </h1>
            <p className="hp-hero-lead">
              ExamPulse test nəticələrini anlamağa, zəif mövzularını kəşf etməyə və hədəfinə addım-addım çatmağa kömək edir.
            </p>
            <div className="hp-hero-actions">
              <button type="button" onClick={onPractice} className="hp-btn hp-btn-gold hp-lift">
                Şagird kimi məşq et
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              {onTeacherPractice ? (
                <button type="button" onClick={onTeacherPractice} className="hp-btn hp-btn-ghost hp-lift">
                  Müəllim kimi sınaq iştirakı et
                </button>
              ) : null}
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
            </div>
          </div>

          <div className="hp-hero-cards">
            <article className="hp-glass hp-result-card" aria-label="Nümunə nəticə">
              <div className="hp-result">
                <div className="hp-result-score">
                  <div className="hp-ring" aria-hidden="true"><span>78%</span></div>
                </div>
                <div className="hp-topics">
                  <p className="hp-topics-title">Ümumi nəticə · mövzular üzrə</p>
                  {TOPICS.map((topic) => (
                    <div key={topic.name}>
                      <div className="hp-topic-row">
                        <span>{topic.name}</span>
                        <b>{topic.value}%</b>
                      </div>
                      <div className="hp-bar"><i style={{ width: `${topic.value}%`, background: topic.color }} /></div>
                    </div>
                  ))}
                </div>
              </div>
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

      <section id="imkanlar" className="hp-strip scroll-mt-24" aria-label="Əsas imkanlar">
        <div className="hp-strip-grid">
          {STRIP.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title}>
                <span className="hp-strip-icon" style={{ background: item.tint, color: item.color }}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
