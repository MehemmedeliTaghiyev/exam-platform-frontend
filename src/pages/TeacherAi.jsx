import { useContext } from 'react';
import { Sparkles } from 'lucide-react';
import AppShell from '../components/AppShell';
import TeacherAiPanel from '../components/TeacherAiPanel';
import { AuthContext } from '../context/AuthContext';
import { normalizeRole } from '../lib/utils';

export default function TeacherAi() {
  const { user } = useContext(AuthContext);
  const role = normalizeRole(user?.role);
  const unlocked = role === 'Admin' || role === 'Teacher';

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
                <h2 className="mt-1 text-2xl font-black">Mövzudan avtomatik imtahan</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">
                  Mövzunu yazın, AI sualları hazırlasın. PDF-dən sual çıxarma imtahan vərəqindədir — orada orijinal PDF-i də görürsünüz.
                </p>
              </div>
            </div>
            <TeacherAiPanel />
          </div>
        ) : (
          <p className="p-10 text-center text-sm text-indigo-100">AI yalnız müəllim hesabı üçündür.</p>
        )}
      </div>
    </AppShell>
  );
}
