/**
 * Anbar kağızı daxilində sual çətinliyi bölgüsü (cədvəllər).
 * Quiz tipi seçilmir (asan/orta/çətin yox) — hər tipin sabit daxili mix-i var.
 */

/** Adi sınaq — sabit standart (əvvəlki «orta») daxili mix (25 sual). */
export const SINAQ_LEVEL_MIX = {
  asan: { asan: 14, orta: 9, çətin: 2 }, // legacy
  orta: { asan: 8, orta: 11, çətin: 6 }, // default Sınaq
  çətin: { asan: 4, orta: 11, çətin: 10 }, // legacy
};

/** Buraxılış standart (25). */
export const BURAXILIS_MIX = { asan: 8, orta: 12, çətin: 5 }; // 8–9 / 11–12 / 4–5

/** Blok standart (30). */
export const BLOK_MIX = { asan: 9, orta: 14, çətin: 7 }; // 8–10 / 13–15 / 6–7

export const SINAQ_LEVEL_HINTS = [
  {
    key: 'mixed',
    title: 'Sınaq',
    asan: 8,
    orta: 11,
    çətin: 6,
    forWho: 'Hər kağızda suallar qarışır; imtahanın özü asan/orta/çətin deyil.',
  },
];

export function isBuraxilisKind(kind) {
  return /burax/i.test(String(kind || ''));
}

export function isStandardKind(kind) {
  return isBuraxilisKind(kind) || /blok|block|specialty/i.test(String(kind || ''));
}

/** Bir kağız üçün { asan, orta, çətin } sual sayı (daxili; UI-də seçilmir). */
export function questionMixForPaper(kind, _sınaqLevel = 'orta') {
  const raw = String(kind || '');
  if (/blok|block|specialty/i.test(raw)) return { ...BLOK_MIX };
  if (/burax/i.test(raw)) return { ...BURAXILIS_MIX };
  return { ...SINAQ_LEVEL_MIX.orta };
}

export function mixTotal(mix = {}) {
  return (Number(mix.asan) || 0) + (Number(mix.orta) || 0) + (Number(mix.çətin ?? mix.cetin) || 0);
}
