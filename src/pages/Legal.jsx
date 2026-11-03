import { Link, useLocation } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../lib/contact';

const PAGES = {
  '/privacy': {
    title: 'Məxfilik siyasəti',
    lines: [
      'ExamPulse şagird və müəllimlərin imtahan, qrup və nəticə məlumatlarını tətbiqin işləməsi üçün saxlayır.',
      'Hesab üçün ad, e-poçt, fənn, qrup və imtahan nəticələri istifadə olunur. Reklam izləməsi yoxdur.',
      'Ödəniş məlumatı kart nömrəsi kimi tətbiqdə saxlanılmır; ödəniş provayderi tərəfindən emal olunur.',
      'Məlumatınızı görmək, düzəltmək və ya silinməsini istəmək üçün e-poçt yazın.',
      'Uşaqların hesabını valideyn və ya məktəb nəzarəti ilə açmaq tövsiyə olunur.',
    ],
  },
  '/terms': {
    title: 'İstifadə şərtləri',
    lines: [
      'ExamPulse imtahan hazırlamaq, həll etmək və nəticəyə baxmaq üçündür.',
      'Hesab məlumatı düzgün olmalıdır. İmtahan məzmununun hüququ müəllimə və ya məktəbə məxsusdur.',
      'Tətbiqi sui-istifadə, başqasının hesabına girmək və ya imtahanı pozmaq qadağandır.',
      'Mağaza abunəlikləri platforma qaydalarına tabedir. Jeton və anbar xidməti ödənişli ola bilər.',
    ],
  },
  '/support': {
    title: 'Dəstək',
    lines: [
      'Giriş, ödəniş, qrup və imtahan sualları üçün bizə yazın.',
      'Cavab e-poçtla göndərilir. Telefon zəngi yoxdur.',
    ],
  },
  '/delete-account': {
    title: 'Hesabı sil',
    lines: [
      'Hesabın silinməsini istəmək üçün aşağıdakı ünvana e-poçt yazın. Mövzu: «Hesabı sil».',
      'E-poçtda qeydiyyat ünvanınızı və rolunuzu (şagird / müəllim) yazın.',
      'Silinmə tələbindən sonra hesab, imtahan nəticələri və qrup əlaqəsi silinir. Qanuni saxlanılmalı qeydlər istisna ola bilər.',
    ],
  },
};

export default function Legal() {
  const { pathname } = useLocation();
  const page = PAGES[pathname] || PAGES['/privacy'];
  return (
    <div className="min-h-screen bg-[#FDFBF7] px-5 py-8 text-[#1d2430]">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="inline-flex items-center gap-2 font-extrabold">
          <BrandLogo size={28} />
        </Link>
        <h1 className="mt-8 text-3xl font-extrabold tracking-tight">{page.title}</h1>
        <div className="mt-5 space-y-4 text-sm leading-6 text-[#4b524c]">
          {page.lines.map((line) => <p key={line}>{line}</p>)}
        </div>
        <a className="mt-6 inline-block font-extrabold text-[#1f6f4a] underline" href={CONTACT_MAILTO}>
          {CONTACT_EMAIL}
        </a>
        <p className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
          <Link to="/privacy">Məxfilik</Link>
          <Link to="/terms">Şərtlər</Link>
          <Link to="/support">Dəstək</Link>
          <Link to="/delete-account">Hesabı sil</Link>
        </p>
      </div>
    </div>
  );
}
