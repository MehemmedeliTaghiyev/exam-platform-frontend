import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';

const SCENES = [
  { id: 'intro', ms: 5500, kicker: 'ExamPulse', title: 'İmtahan telefonda.', sub: 'Müəllim hazırlayır. Şagird kartlarla həll edir.' },
  { id: 'dash', ms: 6500, kicker: 'Müəllim', title: 'Qruplar və imtahanlar bir yerdə', sub: 'Yeni imtahan, şagirdlər, statistika.' },
  { id: 'group', ms: 6000, kicker: 'Müəllim', title: 'Şagirdi dəvət linki ilə əlavə et', sub: 'Qrup kodu — telefonla qoşulur.' },
  { id: 'pdf', ms: 7000, kicker: 'Müəllim', title: 'Drive PDF səhifə-səhifə açılır', sub: 'Böyüt, yoxla, sonra AI-yə ver.' },
  { id: 'ai', ms: 7500, kicker: 'Müəllim', title: 'AI ilə kartlara çevir', sub: 'Mətnli PDF suallara çevrilir. Şagird PDF görmür.' },
  { id: 'photo', ms: 6500, kicker: 'Müəllim', title: 'Şəkilli sual', sub: 'Şəkil çək — kartda sağda, toxunanda böyüyür.' },
  { id: 'stats', ms: 6000, kicker: 'Müəllim', title: 'Dərc et, nəticəyə bax', sub: 'Ballar, səhv/düzgün, reytinq.' },
  { id: 'exam', ms: 9000, kicker: 'Şagird', title: 'Telefonda yalnız kartlar', sub: 'A–E, açıq cavab, taymer. PDF yoxdur.' },
  { id: 'result', ms: 6500, kicker: 'Şagird', title: 'Nəticə dərhal', sub: 'Düzgün cavab, bal, təkrar baxış.' },
  { id: 'end', ms: 8000, kicker: 'ExamPulse', title: 'Kağız yox. İmtahan var.', sub: 'Müəllim və şagird — eyni platforma.' },
];

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
        <GraduationCap size={18} />
      </div>
      <span className="text-base font-bold text-white">ExamPulse</span>
    </div>
  );
}

function FakeCard({ n, text, opts, pick, img }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-gray-400">Sual {n}</p>
        <p className="mt-1 text-sm font-medium text-gray-900">{text}</p>
        <div className="mt-2 space-y-1.5">
          {opts.map((o) => (
            <div
              key={o.l}
              className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-xs ${
                pick === o.l ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
              }`}
            >
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold ${
                pick === o.l ? 'bg-indigo-600 text-white' : 'bg-gray-100'
              }`}>{o.l}</span>
              {o.t}
            </div>
          ))}
        </div>
      </div>
      {img ? (
        <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-amber-100 to-indigo-200 ring-1 ring-gray-200" />
      ) : null}
    </div>
  );
}

function SceneBody({ id }) {
  if (id === 'dash') {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {['Riyaziyyat sınaq', 'Kimya qrupu 11A', 'Fizika — 12 mart'].map((t) => (
          <div key={t} className="rounded-2xl bg-white p-4 shadow-lg">
            <p className="text-xs text-indigo-600">İmtahan</p>
            <p className="mt-1 font-semibold text-gray-900">{t}</p>
            <p className="mt-2 text-xs text-gray-500">24 şagird · 45 dəq</p>
          </div>
        ))}
      </div>
    );
  }
  if (id === 'group') {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-xl">
        <p className="text-sm font-semibold">11A Qrupu</p>
        <p className="mt-2 rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          Dəvət: exampulse.app/join/7K2M
        </p>
        <div className="mt-4 space-y-2 text-sm text-gray-700">
          <p>Nərgiz Həsənova — qoşuldu</p>
          <p>Elvin Məmmədov — qoşuldu</p>
          <p className="text-indigo-600">+ yeni şagird...</p>
        </div>
      </div>
    );
  }
  if (id === 'pdf') {
    return (
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
          <span>Bu imtahanın PDF-i · 3 səhifə</span>
          <span className="font-semibold text-indigo-600">120%</span>
        </div>
        <div className="space-y-2 bg-gray-200 p-3">
          <div className="mx-auto h-28 w-[70%] rounded bg-white shadow-sm" />
          <div className="mx-auto h-28 w-[70%] rounded bg-white shadow-sm" />
        </div>
      </div>
    );
  }
  if (id === 'ai') {
    return (
      <div className="space-y-3">
        <div className="inline-flex rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
          AI ilə kartlara çevir
        </div>
        <FakeCard n={1} text="Kvadrat tənliyin diskriminantı necə tapılır?" opts={[{ l: 'A', t: 'b²−4ac' }, { l: 'B', t: 'b²+4ac' }, { l: 'C', t: '2a' }]} pick="A" />
        <FakeCard n={2} text="Sinx-in törəməsi hansıdır?" opts={[{ l: 'A', t: 'cos x' }, { l: 'B', t: '−sin x' }]} pick="A" />
      </div>
    );
  }
  if (id === 'photo') {
    return (
      <FakeCard
        n={4}
        text="Şəkildəki üçbucağın sahəsini tapın."
        opts={[{ l: 'A', t: '12' }, { l: 'B', t: '18' }, { l: 'C', t: '24' }]}
        pick="C"
        img
      />
    );
  }
  if (id === 'stats') {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[['18', 'şagird'], ['86%', 'orta'], ['12', 'düzgün']].map(([n, l]) => (
          <div key={l} className="rounded-2xl bg-white p-4 text-center shadow-lg">
            <p className="text-2xl font-bold text-indigo-600">{n}</p>
            <p className="text-xs text-gray-500">{l}</p>
          </div>
        ))}
      </div>
    );
  }
  if (id === 'exam') {
    return (
      <div className="mx-auto w-[280px] rounded-[2rem] bg-slate-900 p-3 shadow-2xl ring-4 ring-white/20">
        <div className="rounded-[1.4rem] bg-white p-3">
          <p className="text-right text-xs font-bold text-indigo-600">12:40</p>
          <FakeCard n={1} text="Hansı ədəd sadədir?" opts={[{ l: 'A', t: '15' }, { l: 'B', t: '17' }, { l: 'C', t: '21' }]} pick="B" />
        </div>
      </div>
    );
  }
  if (id === 'result') {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-xl">
        <p className="text-3xl font-bold text-emerald-600">24 / 30</p>
        <p className="mt-1 text-sm text-gray-500">80% · Orta səviyyə</p>
        <div className="mt-4 space-y-2 text-sm">
          <p className="text-emerald-700">✓ Sual 1 düzgün</p>
          <p className="text-red-600">✗ Sual 2 səhv · düzgün: A</p>
        </div>
      </div>
    );
  }
  return (
    <div className="text-center">
      <p className="text-5xl font-black tracking-tight text-white drop-shadow">ExamPulse</p>
    </div>
  );
}

export default function PromoAd() {
  const [i, setI] = useState(0);
  const scene = SCENES[i];

  useEffect(() => {
    const t = setTimeout(() => setI((p) => (p + 1) % SCENES.length), scene.ms);
    return () => clearTimeout(t);
  }, [i, scene.ms]);

  const intro = scene.id === 'intro' || scene.id === 'end';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1220] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(79,70,229,0.35),_transparent_55%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-6">
        <header className="flex items-center justify-between">
          <Logo />
          <p className="text-xs uppercase tracking-widest text-indigo-200">{scene.kicker}</p>
        </header>
        <div className="mt-8 flex flex-1 flex-col justify-center gap-8 lg:flex-row lg:items-center">
          <div className={`max-w-lg ${intro ? 'mx-auto text-center' : ''}`}>
            <p className="text-sm font-semibold text-indigo-300">{scene.kicker}</p>
            <h1 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">{scene.title}</h1>
            <p className="mt-3 text-lg text-indigo-100/80">{scene.sub}</p>
          </div>
          {!intro && (
            <div className="w-full max-w-md">
              <SceneBody id={scene.id} />
            </div>
          )}
        </div>
        <div className="mt-8 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            key={scene.id}
            className="h-full bg-indigo-400"
            style={{
              width: '0%',
              animation: `promoBar ${scene.ms}ms linear forwards`,
            }}
          />
        </div>
      </div>
      <style>{`@keyframes promoBar { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );
}
