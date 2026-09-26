import { useContext } from 'react';
import { FileText, Lock, ScanLine, Sparkles, Wand2 } from 'lucide-react';
import AppShell from '../components/AppShell';
import { AuthContext } from '../context/AuthContext';
import { localDb } from '../lib/localDb';
import { isAiEnabled } from '../lib/utils';

const COMING_SOON = [
  {
    icon: Wand2,
    title: 'Avtomatik imtahan yaratma',
    text: 'Mövzu, sinif və çətinliyi yazın — suallar və A–E variantları hazırlansın.',
  },
  {
    icon: ScanLine,
    title: 'PDF-dən sual çıxarma',
    text: 'İmtahan PDF-i yükləyin, hər sualın altında variantlar mətnə çevrilsin.',
  },
  {
    icon: FileText,
    title: 'Çətinlik dərəcəsi və mövzu anlayışı',
    text: 'Hər sualın çətinliyi və şagirdin mövzunu nə dərəcədə başa düşdüyü aydın görünsün.',
  },
];

export default function TeacherAi() {
  const { user } = useContext(AuthContext);
  const unlocked = isAiEnabled(user) || localDb.getTeacherAi(user?.id);

  return (
    <AppShell title="AI özəlliyi">
      {unlocked ? (
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-800 via-violet-800 to-slate-900 p-6 text-white shadow-lg sm:p-10">
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-indigo-950 shadow-md">
              <Sparkles size={26} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Tezliklə</p>
              <h2 className="mt-1 text-2xl font-black">AI funksionallıqları yolda</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">
                Paketiniz açıqdır. Aşağıdakı alətlər yaxın günlərdə bu səhifədə görünəcək — hazırda onları bir-bir əlavə edirik.
              </p>
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {COMING_SOON.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className="rounded-2xl bg-indigo-950/40 p-5 ring-1 ring-white/15"
                >
                  <Icon className="text-amber-300" size={22} />
                  <p className="mt-3 font-bold">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-indigo-200">{item.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="mx-auto max-w-lg rounded-3xl bg-gradient-to-br from-slate-800 via-indigo-950 to-violet-950 px-6 py-14 text-center text-white shadow-lg sm:px-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-amber-300 ring-1 ring-white/15">
            <Lock size={36} />
          </div>
          <h2 className="mt-6 text-2xl font-black">AI bölməsi kilidlidir</h2>
          <p className="mt-3 text-sm leading-7 text-indigo-100">
            Bura daxil olmaq üçün <span className="font-semibold text-amber-300">Premium paket</span> tövsiyə olunur.
            Premium ilə avtomatik imtahan, PDF-dən sual çıxarma və şagirdin mövzu anlayışını izləmək bir yerdə olacaq.
          </p>
          <p className="mt-4 text-xs text-indigo-300">Paketi aktivləşdirmək üçün ExamPulse admininə müraciət edin.</p>
        </div>
      )}
    </AppShell>
  );
}
