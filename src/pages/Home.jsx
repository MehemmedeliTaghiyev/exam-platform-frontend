import { GraduationCap, BookOpen, Users } from 'lucide-react';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import PublicNav from '../components/PublicNav';

export default function Home() {
  const { enterPractice, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const goTeacher = () => {
    enterPractice('Teacher');
    navigate('/teacher');
  };
  const goStudent = () => {
    enterPractice('Student');
    navigate('/student');
  };

  const real = user && !user.practice;

  return (
    <div className="min-h-screen bg-[#0b1220] px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
              <GraduationCap size={20} />
            </div>
            <div>
              <p className="text-lg font-bold">ExamPulse</p>
              <p className="text-xs text-indigo-200">Məşq edin və ya hesab açın</p>
            </div>
          </div>
          <PublicNav darkOnNavy />
        </div>

        {real ? (
          <button
            type="button"
            className="mb-8 w-full rounded-2xl bg-white/10 px-4 py-3 text-left text-sm"
            onClick={() => navigate(user.role === 'Admin' ? '/admin' : user.role === 'Teacher' ? '/teacher' : '/student')}
          >
            Davam et: {user.fullName || user.email}
          </button>
        ) : null}

        <h1 className="text-3xl font-black sm:text-4xl">Kim kimi məşq etmək istəyirsiniz?</h1>
        <p className="mt-3 max-w-2xl text-indigo-100/80">
          Giriş olmadan məşq edə bilərsiniz. Real imtahanlar üçün yuxarıdan daxil olun və ya qeydiyyatdan keçin.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <button
            type="button"
            onClick={goTeacher}
            className="rounded-3xl bg-white p-6 text-left text-slate-900 shadow-xl transition hover:-translate-y-0.5"
          >
            <Users className="text-indigo-600" />
            <p className="mt-4 text-xl font-bold">Müəllim</p>
            <p className="mt-2 text-sm text-gray-500">
              İmtahan yarat, sual kartı əlavə et. Məşq rejimində serverə getmir.
            </p>
          </button>
          <button
            type="button"
            onClick={goStudent}
            className="rounded-3xl bg-indigo-600 p-6 text-left shadow-xl transition hover:-translate-y-0.5"
          >
            <BookOpen />
            <p className="mt-4 text-xl font-bold">Şagird</p>
            <p className="mt-2 text-sm text-indigo-100">
              Hazır sınaqları aç, A–E seç, nəticəyə bax.
            </p>
          </button>
        </div>

        <div className="mt-10 grid gap-4 rounded-3xl bg-white/5 p-5 text-sm text-indigo-100 sm:grid-cols-2">
          <div>
            <p className="font-semibold text-white">Repetitorun var?</p>
            <p className="mt-2 text-indigo-100/80">
              Müəllimin ExamPulse istifadə edirsə, onunla əlaqə saxla. O sənə qrup linki verəcək və girişi açacaq.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white">Repetitorun yoxdur?</p>
            <p className="mt-2 text-indigo-100/80">
              Qeydiyyatdan keç, bölgələrdəki müəllimləri gör və açıq imtahanlarına qoşul.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
