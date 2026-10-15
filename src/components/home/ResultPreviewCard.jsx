const TOPICS = [
  { name: 'Funksiyalar', value: 92, color: 'var(--hp-success)' },
  { name: 'Triqonometriya', value: 74, color: 'var(--hp-success)' },
  { name: 'Həndəsə', value: 41, color: 'var(--hp-error)' },
];

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export default function ResultPreviewCard() {
  return (
    <div className="hp-card relative p-6 shadow-[0_24px_60px_var(--hp-glow)]" aria-hidden="true">
      <span className="absolute right-5 top-5 rounded-full bg-[var(--hp-accent-2)] px-2.5 py-0.5 text-xs font-extrabold text-[#06323a]">
        Nümunə
      </span>
      <div className="flex items-center gap-4 pr-16">
        <div className="hp-ring">
          <span>78%</span>
        </div>
        <div>
          <p className="text-lg font-extrabold">Riyaziyyat – Sınaq 3</p>
          <p className="text-sm text-[var(--hp-muted)]">Nəticə təhlili</p>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {TOPICS.map((topic) => (
          <div key={topic.name}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{topic.name}</span>
              <span className="font-extrabold">{topic.value}%</span>
            </div>
            <div className="hp-bar">
              <i style={{ width: `${topic.value}%`, background: topic.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-5 gap-2">
        {LETTERS.map((letter) => (
          <div key={letter} className={letter === 'B' ? 'hp-choice hp-choice-on' : 'hp-choice'}>
            {letter}
          </div>
        ))}
      </div>
    </div>
  );
}
