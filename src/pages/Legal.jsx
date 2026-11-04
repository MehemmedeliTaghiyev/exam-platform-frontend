import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CreditCard, Database, Pencil, Shield, Users } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../lib/contact';

const PAGES = {
  '/privacy': {
    title: 'Məxfilik siyasəti',
    intro: 'Hansı məlumatı niyə saxladığımızı sadə dildə izah edirik.',
    checks: ['Reklam izləməsi yoxdur', 'Kart məlumatı saxlanılmır'],
    cards: [
      {
        icon: Database,
        tone: 'green',
        title: 'Nə saxlanılır?',
        text: 'Şagird və müəllimlərin imtahan, qrup və nəticə məlumatları tətbiqin işləməsi üçün saxlanılır.',
      },
      {
        icon: Shield,
        tone: 'green',
        title: 'Hesab üçün istifadə olunur',
        text: 'Ad, e-poçt, fənn, qrup və imtahan nəticələri. Reklam izləməsi yoxdur.',
      },
      {
        icon: CreditCard,
        tone: 'gold',
        title: 'Ödəniş məlumatı',
        text: 'Kart nömrəsi kimi məlumat tətbiqdə saxlanılmır. Ödənişi ödəniş provayderi emal edir.',
      },
      {
        icon: Pencil,
        tone: 'gold',
        title: 'Sizin hüquqlarınız',
        text: 'Məlumatınızı görmək, düzəltmək və ya silinməsini istəmək üçün bizə e-poçt yazın.',
      },
      {
        icon: Users,
        tone: 'green',
        title: 'Uşaqlar üçün',
        text: 'Uşaqların hesabını valideyn və ya məktəb nəzarəti ilə açmaq tövsiyə olunur.',
      },
    ],
  },
  '/terms': {
    title: 'İstifadə şərtləri',
    intro: 'ExamPulse-dan necə istifadə olunduğunu qısa yazırıq.',
    checks: ['Hesab məlumatı düzgün olmalıdır'],
    cards: [
      {
        icon: Shield,
        tone: 'green',
        title: 'Nə üçündür',
        text: 'ExamPulse imtahan hazırlamaq, həll etmək və nəticəyə baxmaq üçündür.',
      },
      {
        icon: Pencil,
        tone: 'gold',
        title: 'Məzmun hüququ',
        text: 'İmtahan məzmununun hüququ müəllimə və ya məktəbə məxsusdur.',
      },
      {
        icon: Users,
        tone: 'green',
        title: 'Qadağalar',
        text: 'Tətbiqi sui-istifadə, başqasının hesabına girmək və ya imtahanı pozmaq qadağandır.',
      },
      {
        icon: CreditCard,
        tone: 'gold',
        title: 'Ödənişlər',
        text: 'Mağaza abunəlikləri platforma qaydalarına tabedir. Jeton və anbar xidməti ödənişli ola bilər.',
      },
    ],
  },
  '/support': {
    title: 'Dəstək',
    intro: 'Giriş, ödəniş, qrup və imtahan sualları üçün bizə yazın.',
    checks: ['Cavab e-poçtla göndərilir'],
    cards: [
      {
        icon: Pencil,
        tone: 'gold',
        title: 'Necə yazmaq',
        text: 'Aşağıdakı ünvana e-poçt göndərin. Telefon zəngi yoxdur.',
      },
    ],
  },
  '/delete-account': {
    title: 'Hesabı sil',
    intro: 'Hesabın silinməsini e-poçtla istəyə bilərsiniz.',
    checks: ['Mövzu: «Hesabı sil»'],
    cards: [
      {
        icon: Pencil,
        tone: 'gold',
        title: 'Nə yazmalısınız',
        text: 'E-poçtda qeydiyyat ünvanınızı və rolunuzu (şagird / müəllim) yazın.',
      },
      {
        icon: Shield,
        tone: 'green',
        title: 'Nə silinir',
        text: 'Tələbdən sonra hesab, imtahan nəticələri və qrup əlaqəsi silinir. Qanuni saxlanılmalı qeydlər istisna ola bilər.',
      },
    ],
  },
};

const TONE = {
  green: 'bg-[#e7f3ea] text-[#1f6f4a]',
  gold: 'bg-[#f8e7b8] text-[#8a6a12]',
};

export default function Legal() {
  const { pathname, key } = useLocation();
  const navigate = useNavigate();
  const page = PAGES[pathname] || PAGES['/privacy'];

  const goBack = () => {
    if (key !== 'default') navigate(-1);
    else navigate('/');
  };

  return (
    <div className="min-h-screen w-full bg-[#F6F3EC] px-5 py-6 text-[#1d2430] min-[768px]:px-10 min-[1100px]:px-16">
      <div className="mx-auto w-full max-w-[420px] pb-8 min-[768px]:max-w-[820px] min-[1100px]:max-w-[960px]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Geri"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#1d2430] shadow-[0_1px_4px_rgba(28,40,28,0.08)]"
          >
            <ArrowLeft size={18} />
          </button>
          <Link to="/" className="min-w-0">
            <BrandLogo size={28} />
          </Link>
        </div>

        <h1 className="mt-8 text-[32px] font-extrabold tracking-tight">{page.title}</h1>
        {page.intro ? (
          <p className="mt-2 text-[15px] leading-6 text-[#6d756c]">{page.intro}</p>
        ) : null}

        {page.checks?.length ? (
          <ul className="mt-5 space-y-2.5">
            {page.checks.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[15px] font-semibold text-[#1f6f4a]">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#e7f3ea]">
                  <Check size={13} strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 grid gap-3 min-[768px]:grid-cols-2">
          {page.cards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="rounded-[22px] bg-white px-4 py-4 shadow-[0_1px_0_rgba(28,40,28,0.04)] ring-1 ring-black/[0.04]">
                <div className="flex gap-3">
                  <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${TONE[card.tone] || TONE.green}`}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-[16px] font-extrabold">{card.title}</h2>
                    <p className="mt-1 text-[14px] leading-6 text-[#6d756c]">{card.text}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <section className="mt-5 rounded-[24px] bg-[#1c3d28] px-5 py-5 text-white min-[768px]:flex min-[768px]:items-center min-[768px]:justify-between min-[768px]:gap-6 min-[768px]:px-8 min-[768px]:py-7">
          <div>
            <h2 className="text-[18px] font-extrabold min-[768px]:text-[22px]">Sualınız var?</h2>
            <p className="mt-1 text-[14px] leading-6 text-white/75">
              Məlumatla bağlı istənilən sorğu üçün bizə yazın.
            </p>
          </div>
          <a
            href={CONTACT_MAILTO}
            className="mt-4 flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#f0b429] px-5 text-[15px] font-extrabold text-[#3a2a00] min-[768px]:mt-0"
          >
            {CONTACT_EMAIL}
          </a>
        </section>

        <nav className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-semibold text-[#8a9188]" aria-label="Hüquqi səhifələr">
          <Link className={pathname === '/privacy' ? 'text-[#1d2430]' : ''} to="/privacy">Məxfilik</Link>
          <Link className={pathname === '/terms' ? 'text-[#1d2430]' : ''} to="/terms">Şərtlər</Link>
          <Link className={pathname === '/support' ? 'text-[#1d2430]' : ''} to="/support">Dəstək</Link>
          <Link className={pathname === '/delete-account' ? 'text-[#1d2430]' : ''} to="/delete-account">Hesabı sil</Link>
        </nav>
      </div>
    </div>
  );
}
