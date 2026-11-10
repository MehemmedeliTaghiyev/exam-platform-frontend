# ExamPulse — edilməli olanlar

Ödəniş hələ bağlanmayıb. Aşağıdakılar növbə ilə.

## Web Push (VAPID)

- [ ] VAPID **private** açarı yoxdur; yadda da qalmır. Sayt onsuz işləyir.
- [ ] Brauzerdə təcili bildiriş lazım olanda: `npx web-push generate-vapid-keys`
- [ ] Public açarı `src/lib/pushKeys.js` və `api/vapid.js` ilə eyni tut
- [ ] Private açarı **yalnız** Vercel env: `VAPID_PRIVATE_KEY` (git-ə yazma)
- Müəllimin həftəlik quiz bildirişi Capacitor lokal bildirişdir — VAPID istəmir

## Domain və API

- [x] SmarterASP-ə .NET publish (istifadəçi, 2026-11-08). SQL `QuestionBank` `db_ace530_exam`-də var.
- [x] Live `POST /api/question-bank/import` (415/200)
- [x] CSV import `questions_dim.csv` → QuestionBank (3890 sətir, 2026-11-08)
- [x] Fiqur PNG açıq URL: `figures/M000001.png` → `figures-cdn` branch (2026-11-08)
- [x] Noyabr həftəlik `from-bank` imtahan id 96 (10 sual)
- [x] Bank `Audience=weekly` asan/orta (blok/çətin boş). Noyabr asan **97**, orta **98**
- [x] `exampulse.az` alındı (online.az, 2026-11-09) — status hələ **pending**
- [x] Domen aktiv; frontend Vercel-də `https://exampulse.az`
- [x] Kodda `LIVE_WEB` / deep link → `https://exampulse.az`; `LIVE_API` / `VITE_API_URL` → `https://exampulse.az/api`
- [ ] **Vacib:** `exampulse.az/api` indilik Vercel SPA qaytarır — .NET API hələ `jtempurl`-dədir. Ya `api.exampulse.az` → SmarterASP, ya Vercel proxy.
- [ ] SmarterASP CORS: `https://exampulse.az` + Capacitor origin
- [ ] HTTPS/SSL (Vercel + API host)

## Ödəniş (sonra)

- [ ] F/S + VOEN + F/S bank hesabı
- [ ] Operator (ePoint / Payriff / GoldenPay) — hazır ödəniş linki
- [ ] Proqramda real ödəniş: aylıq imtahan və balans artırma «Tezliklə» əvəzinə
- Kassanı vebdə + VOEN saxla; App Store IAP ayrı qərardır

## Tətbiq mağazası

Yadda saxla (istifadəçi 2026-11-08):

- Play ictimai bu gün olmaz. Review ~1–3 gün; hesab təsdiqi 1–3 gün. Bu PC-də əvvəl debug APK / Internal testing.
- iOS: **dostun Mac-i kifayətdir.** Apple Developer (99 USD/il) **sahibin** adınadır, dostun ID-si yox. Dost yalnız Xcode maşınıdır: `ios` + Archive → TestFlight → App Store. Paket `az.exampulse.app`.
- Gözləmə: TestFlight saatlar–1 gün; App Review 24–48 saat, ilk 2–7 gün.
- Apple 4.2 WebView, demo müəllim+şagird, tətbiqdə kart/VOEN yox («Tezliklə»).
- [ ] Android AAB / Play
- [ ] iOS TestFlight (dostun Mac + 99 USD/il)
- Mağaza tətbiqində VOEN kart düyməsi olmasın
