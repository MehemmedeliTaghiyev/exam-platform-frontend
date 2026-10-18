import { Link } from 'react-router-dom';
import { ArrowRight, Brain, Globe, LineChart, Target, Users, Zap } from 'lucide-react';

const ITEMS = [
  {
    icon: Zap,
    tint: '#f8e7b0',
    color: '#e0a31a',
    title: 'Saniyələr içində imtahan hazırla',
    text: 'Suallarını seç, sınağı formalaşdır və linki paylaş. Şagirdlər tək bir kliklə imtahana daxil olur.',
    href: '/register',
  },
  {
    icon: Brain,
    tint: '#d7f3ec',
    color: '#1aa58a',
    title: 'Zəif və güclü tərəflərini kəşf et',
    text: 'Hər sınaqdan sonra hansı mövzuda güclü olduğunu, hansı mövzunu yenidən işləməli olduğunu dərhal görürsən.',
    href: '/#nece',
  },
  {
    icon: Target,
    tint: '#e6e4fb',
    color: '#6d63e8',
    title: 'Hesab açmadan, sərbəst məşq et',
    text: 'Qeydiyyatsız özünü yoxlamaq istəyirsən? Məşq rejimində cavablar serverə getmir.',
    action: 'practice',
  },
  {
    icon: Globe,
    tint: '#fde4d4',
    color: '#e07a3d',
    title: 'Hər kəsə açıq sınaqlara qoşul',
    text: 'Şəxsi repetitorun olmasa belə, müəllimlərin paylaşdığı açıq imtahanlarda iştirak et və səviyyəni ölç.',
    href: '/exams',
  },
  {
    icon: Users,
    tint: '#dce8fb',
    color: '#3d78e0',
    title: 'Müəllimin və qrupunla sinxron ol',
    text: 'Müəllimin ExamPulse istifadə edirsə, ondan qrup linkini istə. Sinif yoldaşların eyni mühitdə işləyir.',
    href: '/register',
  },
  {
    icon: LineChart,
    tint: '#fde0ea',
    color: '#e05b8a',
    title: 'İnkişafını addım-addım izlə',
    text: 'Hər imtahanın nəticəsini izləyərək hədəfinə nə qədər yaxınlaşdığını görürsən.',
    href: '/register',
  },
];

export default function Features({ onPractice }) {
  return (
    <section id="imkanlar" className="hp-section scroll-mt-24">
      <div className="mx-auto max-w-[1180px] px-4 min-[980px]:px-6">
        <h2 className="hp-h2 text-center">Sənin uğurun üçün bütün imkanlar</h2>
        <div className="mt-10 grid gap-5 min-[720px]:grid-cols-2 min-[1080px]:grid-cols-3">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="hp-card hp-lift flex flex-col p-6">
                <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: item.tint, color: item.color }}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold">{item.title}</h3>
                <p className="mt-2 flex-1 text-[var(--hp-muted)]">{item.text}</p>
                <div className="mt-5 flex justify-end">
                  {item.action === 'practice' ? (
                    <button type="button" onClick={onPractice} className="hp-arrow" aria-label={item.title}>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <Link to={item.href} className="hp-arrow" aria-label={item.title}>
                      <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
