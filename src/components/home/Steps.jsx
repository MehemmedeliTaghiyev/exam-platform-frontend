const STEPS = [
  { n: '1', title: 'Yarat', text: 'Müəllim suallarla imtahan hazırlayır.' },
  { n: '2', title: 'Paylaş', text: 'Link və ya qrup vasitəsilə şagirdlərə göndərir.' },
  { n: '3', title: 'Təhlil et', text: 'Nəticə və mövzu hesabatı avtomatik hazır olur.' },
];

export default function Steps() {
  return (
    <section id="nece" className="hp-section scroll-mt-24">
      <div className="mx-auto max-w-[1120px] px-5">
        <h2 className="hp-h2">3 addımda başla</h2>
        <p className="mt-3 text-[var(--hp-muted)]">Qeydiyyatdan sonra ilk imtahan bir neçə dəqiqəyə hazırdır.</p>
        <div className="mt-8 grid gap-5 min-[720px]:grid-cols-3">
          {STEPS.map((step) => (
            <article key={step.n} className="rounded-[24px] border border-dashed border-[var(--hp-line)] bg-[var(--hp-card)] p-6">
              <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[var(--hp-accent)] font-extrabold text-white">
                {step.n}
              </span>
              <h3 className="mt-4 text-xl font-extrabold">{step.title}</h3>
              <p className="mt-2 text-[var(--hp-muted)]">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
