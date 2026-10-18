const STEPS = [
  { n: '1', title: 'Yarat', text: 'Müəllim suallarla imtahan hazırlayır.' },
  { n: '2', title: 'Paylaş', text: 'Link və ya qrup vasitəsilə şagirdlərə göndərir.' },
  { n: '3', title: 'Təhlil et', text: 'Nəticə və mövzu hesabatı avtomatik hazır olur.' },
];

export default function Steps() {
  return (
    <section id="nece" className="hp-section scroll-mt-24 pt-0">
      <div className="mx-auto max-w-[1180px] px-4 min-[980px]:px-6">
        <h2 className="hp-h2 text-center">3 addımda başla</h2>
        <p className="mt-3 text-center text-[var(--hp-muted)]">Qeydiyyatdan sonra ilk imtahan bir neçə dəqiqəyə hazırdır.</p>
        <div className="mt-8 grid gap-5 min-[720px]:grid-cols-3">
          {STEPS.map((step) => (
            <article key={step.n} className="hp-card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#2f7a45] font-extrabold text-white">
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
