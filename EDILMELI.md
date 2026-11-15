# ExamPulse — edilməli olanlar

## Növbəti sessiya (şəkilli suallar → Android → iOS)

Plan (istifadəçi 2026-11-12): imtahandan sonra davam.

1. [x] **Yarımçıq fiqurlar təmizlə** (2026-11-13 local) — 782 PNG silindi; 33 bank sətiri silindi; 425-dən fiqur bayrağı təmizləndi; **230** usable qaldı. Backup: `_collector/backup_figure_cleanup_20261113_010048`. Live SQL: `deploy/cleanup_incomplete_figures.sql` (əvvəl ROLLBACK).
2. [x] **Tam sual şəkilləri** — lokal classify + enhance (Sonnet 5.5); `out/import_rows.csv` + `out/figures/` (~1081). Live import + CDN hələ açıq.
3. [x] **AI analiz (lokal)** — Sonnet 5.5 classify 414/414; LaTeX→text; dedup (−35); GPT quality (−1082, qaldı 2740). Live reimport + CDN qalır.
4. [~] **Müəllim quiz / PDF** — `preferFigures` + cavablar səhifəsi + səhifə № + meta. Live təmizlik/reimport + full-image CDN-dən sonra son yoxlanış.
5. [ ] **Android** — build / Internal testing / yerləşdirmə
6. [ ] **Sabah iOS** — Mac-ə son mərhələ (dostun Mac + sahibin Apple Developer); TestFlight

Qeyd: iPhone-da PDF.js extract yox; şagird kartlarla imtahan verir. Şəkil kartda/PDF-də URL ilə göstərilir — köhnə iOS qadağasına zidd deyil.

**Live hələ:** `cleanup_incomplete_figures.sql` + yenilənmiş CSV reimport + Exam.dll (UseCount və s.) SmarterASP-ə.

**LaTeX → plain (2026-11-13):** lokal `questions_dim.csv` plain text-ə çevrildi (`npm run bank:latex-to-plain`). UI fallback: `latexText.js` → `latexToPlain`. Live banka yenidən import lazımdır.

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
