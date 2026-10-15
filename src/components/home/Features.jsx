import { ChartColumn, Globe, LineChart, Link2, Sparkles, Users } from 'lucide-react';

const ITEMS = [
  {
    icon: Link2,
    title: 'Asan imtahan yaratma',
    text: 'Sual kartlarını əlavə et, linki paylaş. Şagirdlər bir kliklə daxil olur.',
  },
  {
    icon: ChartColumn,
    title: 'Mövzu üzrə təhlil',
    text: 'Hər nəticədə güclü və zəif mövzular ayrıca göstərilir.',
  },
  {
    icon: Sparkles,
    title: 'Məşq rejimi',
    text: 'Giriş olmadan məşq et. Məşq cavabların serverə göndərilmir.',
  },
  {
    icon: Globe,
    title: 'Açıq imtahanlar',
    text: 'Repetitorun yoxdursa, bölgələrdəki müəllimlərin açıq imtahanlarına qoşul.',
  },
  {
    icon: Users,
    title: 'Qrup və repetitor',
    text: 'Müəllimin ExamPulse istifadə edirsə, qrup linkini al və giriş açılsın.',
  },
  {
    icon: LineChart,
    title: 'İrəliləyişin izlənməsi',
    text: 'Abituriyent öz inkişafını nəticələr üzrə addım-addım görür.',
  },
];

export default function Features() {
  return (
    <section id="imkanlar" className="hp-section scroll-mt-24">
      <div className="mx-auto max-w-[1120px] px-5">
        <h2 className="hp-h2">Hər şey bir yerdə</h2>
        <p className="mt-3 max-w-[640px] text-[var(--hp-muted)]">
          Kağız sınaqlardan və Excel cədvəllərindən yoruldunsa, ExamPulse işi sadələşdirir.
        </p>
        <div className="mt-8 grid gap-5 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="hp-card hp-lift p-6">
                <span className="hp-icon">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold">{item.title}</h3>
                <p className="mt-2 text-[var(--hp-muted)]">{item.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
