import { useContext } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import AppShell from '../components/AppShell';
import TeacherAiPanel from '../components/TeacherAiPanel';
import { AuthContext } from '../context/AuthContext';
import { localDb } from '../lib/localDb';
import { isAiEnabled, normalizeRole } from '../lib/utils';

function Locked() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-amber-300 ring-1 ring-white/15">
        <Lock size={36} />
      </div>
      <h2 className="mt-6 text-2xl font-black">AI bölməsi kilidlidir</h2>
      <p className="mt-3 text-sm leading-7 text-indigo-100">
        Bura daxil olmaq üçün <span className="font-semibold text-amber-300">Premium paket</span> tövsiyə olunur.
        Premium ilə avtomatik imtahan, PDF-dən sual çıxarma və şagirdin mövzu anlayışını izləmək bir yerdə olacaq.
      </p>
      <p className="mt-4 text-xs text-indigo-300">Paketi aktivləşdirmək üçün ExamPulse admininə müraciət edin.</p>
    </div>
  );
}

export default function TeacherAi() {
  const { user } = useContext(AuthContext);
  const role = normalizeRole(user?.role);
  const unlocked = role === 'Admin' || isAiEnabled(user) || localDb.getTeacherAi(user?.id);

  return (
    <AppShell title="AI özəlliyi" mainClassName="!mx-0 !max-w-none !px-0 !py-0">
      <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-950 text-white">
        {unlocked ? (
          <div className="mx-auto max-w-5xl p-6 sm:p-10">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-indigo-950 shadow-md">
                <Sparkles size={26} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">AI studio</p>
                <h2 className="mt-1 text-2xl font-black">İmtahanı mətndən və ya PDF-dən yaradın</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">
                  Avtomatik imtahanda mövzunu yazın. PDF-də isə yalnız faylı yükləyin — suallar oxunur, istəsəniz dəyişirsiniz.
                </p>
              </div>
            </div>
            <TeacherAiPanel />
          </div>
        ) : (
          <Locked />
        )}
      </div>
    </AppShell>
  );
}
