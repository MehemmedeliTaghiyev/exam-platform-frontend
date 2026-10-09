import { GraduationCap, BookOpen, Users, Mail, LayoutGrid, Shield, Smartphone } from 'lucide-react';
import { useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import PublicNav from '../components/PublicNav';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../lib/contact';

const FEATURES = [
  {
    icon: LayoutGrid,
    title: 'Sual kartları',
    text: 'İmtahan sualları karta çevrilir. Şagird telefonda və kompüterdə eyni kartları görür.',
  },
  {
    icon: Users,
    title: 'Müəllim paneli',
    text: 'İmtahan yarat, Drive PDF bağla, özəl və ya açıq dərc et, nəticələrə bax.',
  },
  {
    icon: BookOpen,
    title: 'Şagird axını',
    text: 'Qrup linki və ya bölgə müəllimləri ilə açıq imtahanlara qoşul, A–E seç, nəticəyə bax.',
  },
  {
    icon: Smartphone,
    title: 'Telefon və kompüter',
    text: 'PDF cihazda açılmır. Ağır iş serverdə gedir; şagird yalnız kartları görür.',
  },
  {
    icon: Shield,
    title: 'Özəl və açıq',
    text: 'Özəl imtahan yalnız müəllimin şagirdlərinə. Açıq imtahan ümumi zonada fənn və tarixə görə görünür.',
  },
  {
    icon: Mail,
    title: 'Dəstək',
    text: 'Sualınız varsa yazın. Cavab e-poçtla gəlir.',
  },
];

export default function Home() {
  const { enterPractice, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const id = String(location.hash || '').replace('#', '');
    if (!id) return;
    const node = document.getElementById(id);
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

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
    <div className="min-h-screen bg-[#0b1220] text-white">
      <PublicNav darkOnNavy />

      <div className="mx-auto max-w-4xl px-4 py-10">
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

        <section id="features" className="scroll-mt-24 pt-16">
          <h2 className="text-2xl font-bold">İmkanlar</h2>
          <p className="mt-2 text-sm text-indigo-100/80">ExamPulse müəllim və şagird üçün eyni platformadır.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <Icon className="text-indigo-300" size={22} />
                  <p className="mt-3 font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm text-indigo-100/75">{item.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="contact" className="scroll-mt-24 mt-16 mb-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Əlaqə</h2>
              <p className="mt-2 text-sm text-indigo-100/80">
                Qeydiyyat, giriş və ya imtahan barədə yazın. E-poçt:
              </p>
              <a
                href={CONTACT_MAILTO}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-indigo-50"
              >
                <Mail size={16} />
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
