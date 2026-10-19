import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  Check,
  Clock,
  FlaskConical,
  GraduationCap,
  Hexagon,
  Landmark,
  Languages,
  Leaf,
  Play,
  Shield,
  Target,
  TriangleAlert,
  Users,
  Brain,
} from 'lucide-react';

const TOPICS = [
  { name: 'Funksiyalar', value: 92, color: '#2f9e62', icon: Check, tint: '#e5f6ea' },
  { name: 'Triqonometriya', value: 74, color: '#e2a31a', icon: TriangleAlert, tint: '#fff4d6' },
  { name: 'Həndəsə', value: 41, color: '#e15b4a', icon: Hexagon, tint: '#fde8e4' },
];

const CHOICES = [
  ['A', '(1, 2)'],
  ['B', '(2, 3)'],
  ['C', '(3, 2)'],
  ['D', '(4, 1)'],
  ['E', '(0, 3)'],
];

const BOOKS = [
  { name: 'Riyaziyyat', icon: Calculator, tone: 'b1' },
  { name: 'Azərbaycan dili', icon: BookOpen, tone: 'b2' },
  { name: 'İngilis dili', icon: Languages, tone: 'b3' },
  { name: 'Kimya', icon: FlaskConical, tone: 'b4' },
  { name: 'Biologiya', icon: Leaf, tone: 'b5' },
  { name: 'Tarix', icon: Landmark, tone: 'b6' },
];

const STRIP = [
  {
    icon: Target,
    tint: '#e5f6ea',
    color: '#2f7a45',
    title: 'Zəif və güclü tərəflərini gör',
    text: 'Nələrdə güclü olduğunu kəşf et, daha çox məşq etməli olduğun mövzuları müəyyənləşdir.',
  },
  {
    icon: Brain,
    tint: '#fff1df',
    color: '#e07a3d',
    title: 'Məhz sənə uyğun öyrənmə planı',
    text: 'Öz ehtiyaclarına uyğun hazırlaş və hədəfinə doğru inamla irəlilə.',
  },
  {
    icon: Users,
    tint: '#eee9fb',
    color: '#6d63e8',
    title: 'Sənə ən uyğun müəllimi kəşf et',
    text: 'Öyrənmə yolunda sənə dəstək olacaq müəllimi tap.',
  },
  {
    icon: Shield,
    tint: '#e5f0fb',
    color: '#3d78e0',
    title: 'Tam güvenli təhsil mühiti',
    text: 'Məlumatlarının qorunmasına və etibarlı öyrənmə təcrübəsinə önəm veririk.',
  },
];

export default function Hero({ onPractice }) {
  return (
    <>
      <section className="hp-hero" aria-label="İmtahana hazırlıq">
        <img className="hp-hero-bg" src="/hero-room.jpg" alt="" />
        <div className="hp-hero-shade" aria-hidden="true" />
        <div className="hp-hero-inner">
          <div className="hp-hero-copy">
            <p className="hp-hero-badge">
              <GraduationCap size={16} aria-hidden="true" />
              Daha yaxşı nəticələr üçün
            </p>
            <h1 className="hp-h1">İmtahana hazırlığı ölç, anla, irəlilə.</h1>
            <p className="hp-hero-lead">
              ExamPulse test nəticələrini anlamağa, zəif mövzularını kəşf etməyə və hədəfinə addım-addım çatmağa kömək edir.
            </p>
            <div className="hp-hero-actions">
              <Link to="/register" className="hp-btn hp-btn-primary hp-lift">
                <ArrowRight size={18} aria-hidden="true" />
                Pulsuz başla
              </Link>
              <button type="button" onClick={onPractice} className="hp-btn hp-btn-secondary hp-lift">
                <Play size={16} aria-hidden="true" />
                Girişsiz məşq et
              </button>
            </div>
            <p className="hp-hero-check">
              <Check size={16} aria-hidden="true" />
              Öz tempində öyrən, hər gün bir addım irəlilə.
            </p>
            <div className="book-stack" aria-hidden="true">
              {BOOKS.map((book) => {
                const Icon = book.icon;
                return (
                  <div key={book.name} className={`book ${book.tone}`}>
                    <span>{book.name}</span>
                    <Icon size={16} aria-hidden="true" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hp-hero-cards">
            <article className="hp-glass" aria-label="Nümunə nəticə">
              <div className="hp-result">
                <div className="hp-result-score">
                  <div className="hp-ring" aria-hidden="true"><span>78%</span></div>
                  <p>Ümumi nəticə</p>
                  <p className="hp-sample">Nümunə</p>
                </div>
                <div className="hp-topics">
                  <p className="hp-topics-title">Mövzular üzrə nəticələr</p>
                  {TOPICS.map((topic) => {
                    const Icon = topic.icon;
                    return (
                      <div key={topic.name}>
                        <div className="hp-topic-row">
                          <span className="hp-topic-icon" style={{ background: topic.tint, color: topic.color }}>
                            <Icon size={14} aria-hidden="true" />
                          </span>
                          <span>{topic.name}</span>
                          <b>{topic.value}%</b>
                        </div>
                        <div className="hp-bar"><i style={{ width: `${topic.value}%`, background: topic.color }} /></div>
                      </div>
                    );
                  })}
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
                f(x) = x² − 4x + 3 funksiyasının minimum nöqtəsi hansı nöqtədədir?
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

      <section className="hp-strip" aria-label="Əsas imkanlar">
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
