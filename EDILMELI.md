# ExamPulse — edilməli olanlar

Ödəniş hələ bağlanmayıb. Aşağıdakılar növbə ilə.

## Web Push (VAPID)

- [ ] VAPID **private** açarı yoxdur; yadda da qalmır. Sayt onsuz işləyir.
- [ ] Brauzerdə təcili bildiriş lazım olanda: `npx web-push generate-vapid-keys`
- [ ] Public açarı `src/lib/pushKeys.js` və `api/vapid.js` ilə eyni tut
- [ ] Private açarı **yalnız** Vercel env: `VAPID_PRIVATE_KEY` (git-ə yazma)
- Müəllimin həftəlik quiz bildirişi Capacitor lokal bildirişdir — VAPID istəmir

## Domain və API

- [ ] `exampulse.az` al, HTTPS/SSL
- [ ] DNS-i SmarterASP-ə yönəlt
- [ ] `LIVE_API` / `LIVE_WEB` və Android deep link-ləri `exampulse.az` et
- [ ] SmarterASP CORS: sayt + Capacitor origin

## Ödəniş (sonra)

- [ ] F/S + VOEN + F/S bank hesabı
- [ ] Operator (ePoint / Payriff / GoldenPay) — hazır ödəniş linki
- [ ] Proqramda real ödəniş: aylıq imtahan və balans artırma «Tezliklə» əvəzinə
- Kassanı vebdə + VOEN saxla; App Store IAP ayrı qərardır

## Tətbiq mağazası (sonra)

- [ ] Android AAB / Play
- [ ] iOS TestFlight (Mac + 99 USD/il)
- Mağaza tətbiqində VOEN kart düyməsi olmasın
