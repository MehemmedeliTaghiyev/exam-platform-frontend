import { Link } from 'react-router-dom';
import { ArrowRight, Check, GraduationCap, Play } from 'lucide-react';

const TOPICS = [
  { name: 'Funksiyalar', value: 92, color: '#2f9e62' },
  { name: 'Triqonometriya', value: 74, color: '#e2a31a' },
  { name: 'Həndəsə', value: 41, color: '#e15b4a' },
];

const CHOICES = [
  ['A', '(1, 2)'],
  ['B', '(2, 3)'],
  ['C', '(3, 2)'],
  ['D', '(4, 1)'],
  ['E', '(0, 3)'],
];

export default function Hero({ onPractice }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-4 py-8 min-[980px]:grid-cols-[0.92fr_1.08fr] min-[980px]:px-6 min-[980px]:py-14">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#eadfce] bg-[#fffdf9] px-3 py-1.5 text-sm font-bold text-[#3d6b4a]">
            <GraduationCap size={16} aria-hidden="true" />
            Daha yaxşı nəticələr üçün
          </p>
          <h1 className="hp-h1 mt-5">
            Hər şey tək bir kliklə{' '}
            <span className="whitespace-nowrap">əlinin altındadır!</span>
          </h1>
          <p className="mt-5 max-w-[520px] text-[17px] text-[var(--hp-muted)]">
            Artıq kağız sınaqlar arasında azmaq və ya qarmaqarışıq Excel cədvəlləri ilə vaxt itirmək keçmişdə qaldı. ExamPulse həm müəllimlər, həm də şagirdlər üçün bütün hazırlıq prosesini sadələşdirir.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="hp-btn hp-btn-primary hp-lift">
              <ArrowRight size={18} aria-hidden="true" />
              Pulsuz başla
            </Link>
            <button type="button" onClick={onPractice} className="hp-btn hp-btn-secondary hp-lift">
              <Play size={16} aria-hidden="true" />
              Girişsiz məşq et
            </button>
          </div>
          <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#3d6b4a]">
            <Check size={16} aria-hidden="true" />
            Öz tempində öyrən, hər gün bir addım irəlilə.
          </p>
        </div>

        <div className="hp-hero-art">
          <img src="/hero-study.jpg" alt="Şagird pəncərənin qarşısında dərs hazırlayır" />
          <article className="hp-float right-3 top-6 w-[250px] p-4 min-[980px]:right-0" aria-label="Nümunə nəticə">
            <span className="absolute right-3 top-3 rounded-full bg-[#fff4d6] px-2 py-0.5 text-[11px] font-extrabold text-[#8a5a00]">Nümunə</span>
            <div className="flex items-center gap-3">
              <div className="hp-ring"><span>78%</span></div>
              <div>
                <p className="text-sm font-extrabold">Ümumi nəticə</p>
                <p className="text-xs text-[var(--hp-muted)]">Riyaziyyat sınağı</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {TOPICS.map((topic) => (
                <div key={topic.name}>
                  <div className="mb-1 flex justify-between text-xs font-semibold">
                    <span>{topic.name}</span>
                    <span>{topic.value}%</span>
                  </div>
                  <div className="hp-bar"><i style={{ width: `${topic.value}%`, background: topic.color }} /></div>
                </div>
              ))}
            </div>
          </article>
          <p className="absolute right-2 top-[46%] hidden text-sm font-extrabold text-[#3d6b4a] min-[980px]:block">İrəliləyişini gör!</p>
          <article className="hp-float bottom-4 right-2 w-[270px] p-4 min-[980px]:bottom-6" aria-label="Nümunə sual">
            <p className="text-sm font-extrabold">f(x) = x² − 4x + 3 funksiyasının minimum nöqtəsi hansı nöqtədədir?</p>
            <div className="mt-2 space-y-1">
              {CHOICES.map(([letter, pair]) => (
                <div key={letter} className={letter === 'B' ? 'hp-choice hp-choice-on' : 'hp-choice'}>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white/80 text-xs">{letter}</span>
                  {pair}
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
