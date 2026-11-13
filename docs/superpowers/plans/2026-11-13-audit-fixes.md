# Wdrożenie poprawek z audytu UI/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Wdrożyć wszystkie poprawki z audytu 2026-11-13 tak, żeby każda ścieżka klienta kończyła się e-mailem (zrzut), kontem albo pieniędzmi (klik partnerski, Pack, Pro), a UI trzymał się BRAND.md.

**Architecture:** Zmiany w istniejących komponentach Next.js (App Router) na branchu `audit-ui-ux-fixes` z `origin/main`. Logikę dającą się przetestować (odmiana „plan/plany”, domyślny budżet zrzutu, kolejność sekcji) wyciągam do małych funkcji w `src/lib/` z testami vitest. Reszta to zmiany markupu i tekstu.

**Tech Stack:** Next.js 16 (zmiany łamiące, patrz AGENTS.md), React 19, Tailwind 4 + zmienne CSS z `globals.css`, vitest, Supabase.

**Spec:** `docs/audits/2026-11-13-audyt-ui-ux.md` (numery P0-1…P2-8 i lejki A–G odnoszą się do niego).

## Global Constraints

- Paleta tylko z `globals.css`: piasek `--bg-primary #F5EFE0`, `--bg-surface`, `--accent #A04B20`, `--green #2D5A27`, `--water #5C7A78`, `--error #B91C1C`; nowe tokeny: `--success`, `--success-bg`, `--error-bg`, `--info`.
- Teksty po polsku, formy bezosobowe zamiast męskich („Gotowe na wyjazd?”), bez „AI” jako nagłówka, bez emoji jako ikon w UI (ikony z `Icons.tsx`).
- Nazwa produktu wszędzie: „Czwartkowy zrzut”, podtytuł „okazje na weekend”.
- Nie zmieniamy cennika, Przepustki ani funkcji planu.
- Nie wysyłamy nic do zewnętrznych usług; nie ruszamy bazy ani env.
- Trzy decyzje Kacpra zostają otwarte i **nie** są wdrażane: 6 kierunków bez konta, mail „nic w budżecie”, los starej listy `newsletter`.

## Review Focus

- Zapis na zrzut z lotniskiem spoza listy w `localStorage.deals_origin` → ma wrócić do WRO, nie zepsuć formularza.
- `formatPlans` dla 0, 1, 2–4, 5, 12–14, 22–24 → poprawna odmiana.
- Strona główna bez danych okazji (pusta baza) → bez pustej sekcji i bez skoku układu, zapis na zrzut nadal widoczny.
- `/okazje/xyz` (zły slug) → 404 z nawigacją.
- `/payment/success` bez `session_id` → przekierowanie na `/pricing`.

---

### Task 1: Fundament (tokeny, odmiana, nazwy linii, domyślne ustawienia zrzutu)

**Files:**
- Modify: `src/app/globals.css`, `src/lib/flights/airlines.ts`
- Create: `src/lib/formatPlans.ts`, `src/lib/formatPlans.test.ts`, `src/lib/drop/defaults.ts`, `src/lib/drop/defaults.test.ts`

**Interfaces:**
- Produces: `formatPlans(n: number): string`; `pickDefaultMaxPrice(cheapest: number | null): 200 | 300 | 500`; `resolveOrigin(code: string | null | undefined): string` (WRO gdy nieznane); tokeny CSS.

- [ ] Test `formatPlans`: `0→"0 planów"`, `1→"1 plan"`, `2→"2 plany"`, `4→"4 plany"`, `5→"5 planów"`, `12→"12 planów"`, `14→"14 planów"`, `22→"22 plany"`.
- [ ] Test `pickDefaultMaxPrice`: `null→500`, `348→500`, `180→200`, `250→300`, `500→500`, `501→500`.
- [ ] Test `resolveOrigin`: `"KRK"→"KRK"`, `"xyz"→"WRO"`, `null→"WRO"`, `"wro"→"WRO"`.
- [ ] Zaimplementować trzy funkcje, dodać tokeny i uzupełnić `AIRLINE_NAMES` (MW Mavi Air, RR Ryanair UK, FR Ryanair, W6 Wizz Air, ENT Enter Air, BA, SK, DY, D8, VY, EW Eurowings, TO Transavia, HV, PC Pegasus, TK Turkish, A3 Aegean, AZ ITA, LX Swiss, SN Brussels, EI Aer Lingus, LS Jet2, BT airBaltic).
- [ ] `npx vitest run src/lib` → PASS; commit.

### Task 2: Nawigacja, menu, sitemap, „Odkryj” (P0-3, P1-7)

**Files:** `src/app/components/SiteNav.tsx`, `GlobalMenu.tsx`, `src/app/sitemap.ts`, `src/app/odkryj/page.tsx`, `src/app/destinations/page.tsx` (licznik).

- [ ] SiteNav: „Okazje” (→ `/okazje/{resolveOrigin(localStorage.deals_origin)}`) zamiast „Odkryj”; licznik przez `formatPlans`, czerwony `--error`/`--error-bg` tylko dla 0.
- [ ] GlobalMenu: dodać „Okazje na weekend” i „Czwartkowy zrzut” (`/#zrzut`).
- [ ] Sitemap: usunąć `/odkryj`, dodać 7 stron `/okazje/{kod}`.
- [ ] `/odkryj`: pusty stan z linkiem do okazji; `noindex`.
- [ ] Commit.

### Task 3: DropSignup (P0-2, P0-1 pkt 4)

**Files:** `DropSignup.tsx`, `DropPrefsFields.tsx`

**Interfaces:** `DropSignup({ defaultAirports?: string[]; defaultMaxPrice?: number; cheapestHint?: { city: string; price: number } | null; variant?: "full" | "compact"; id?: string })`.

- [ ] Domyślny budżet 500 (gdy brak propsa), lotnisko z propsa, podpowiedź „W tym tygodniu z {miasto} od {price} zł”, ekran sukcesu na tokenach + link „W międzyczasie: okazje z {lotnisko} →”, nagłówek eyebrow „CZWARTKOWY ZRZUT” w skali sekcji (`text-3xl`), błąd `--error`.
- [ ] Commit.

### Task 4: Strona główna (P0-1, P1-1, P1-6)

**Files:** `src/app/page.tsx`, `HomeClient.tsx`, `DealsStrip.tsx`, `src/lib/cityPhotos.ts`

- [ ] `page.tsx` pobiera `getDealsForOrigin("WRO", 3)` po stronie serwera (try/catch → `[]`) i podaje `initialDeals` do `DealsStrip`; zmiana lotniska dalej klientowo.
- [ ] `DealsStrip`: eyebrow „OKAZJE NA WEEKEND”, podpis z datą sprawdzenia, link „Dostawaj to co czwartek →” `#zrzut`, token `--bg-surface`, karta → `/okazje/{kod}#{city_code}`.
- [ ] `HomeClient`: sekcja `#zrzut` zaraz pod `DealsStrip`; w hero trzecia linia „Albo co czwartek 3 okazje z Twojego lotniska”; `DropSignup` dostaje lotnisko z `localStorage.deals_origin`; ceny kart karuzeli opisane „cały wyjazd, szacunek”; redukcja linków do `/quiz` poza hero i finałem.
- [ ] Commit.

### Task 5: Strona okazji (P1-2)

**Files:** `src/app/okazje/[lotnisko]/page.tsx`

- [ ] Dwa równe przyciski „Lot {cena} zł ↗” i „Nocleg na 2 noce ↗”, „Plan na ten weekend →”, `id={deal.city_code}` na karcie, zwinięty `DropSignup` po 3. karcie (`variant="compact"`), pełny na końcu z `defaultAirports=[origin]` i `cheapestHint`, `--bg-surface` zamiast `--surface`.
- [ ] Commit.

### Task 6: Quiz → login (P0-4)

**Files:** `src/app/login/page.tsx`, `src/app/quiz/page.tsx`

- [ ] Nagłówek „Zaloguj się, a dobierzemy 6 kierunków pod te odpowiedzi”; zamiast zmyślonych kart podsumowanie odpowiedzi z quizu; korzyści konta; pod formularzem `DropSignup` w wersji zwiniętej z lotniskiem z quizu; link „← Wróć”; „Na końcu założysz darmowe konto” pod quizem; zdarzenie GA przy wejściu na `/login` z quizu.
- [ ] Commit.

### Task 7: Widok planu (P1-5)

**Files:** `src/app/plan/[tripId]/page.tsx`

- [ ] Kolejność: podsumowanie → lot + nocleg → dni → zrzut → feedback → baner Pack/Pro tylko dla `credits === 0`; „Zaplanuj nową podróż” → `/quiz`.
- [ ] Commit.

### Task 8: Cennik i lista mailowa (P1-4)

**Files:** `src/app/pricing/page.tsx`, `layout.tsx`, `NewsletterPopup.tsx`

- [ ] `PriceAlertSignup` → `DropSignup` z nagłówkiem „Nie chcesz płacić? Okazje co czwartek są za darmo”; popup wyłączony (`ALLOWED_PATHS = []`); zdanie, że okazje i zrzut są darmowe bez konta.
- [ ] Commit.

### Task 9: Ślepe zaułki (P1-9, P2-6)

**Files:** `not-found.tsx`, `zrzut/ustawienia/page.tsx`, `share/[tripId]/*`, `payment/success/page.tsx`, `start/page.tsx` (usunąć), `flights/` (usunąć), `quick/page.tsx`, `login/page.tsx`.

- [ ] 404 z `SiteNav`, tytułem „Nie znaleziono”, linkami do okazji i quizu; `/zrzut/ustawienia` bez tokenu z nawigacją i `DropSignup`, poprawny tytuł; `/share` rozróżnia „brak planu” od „prywatny”; `/payment/success` bez `session_id` → `redirect("/pricing")`; usunięte `/start` i `/flights`; `/quick` z własnym `<title>` i „Wstecz” → `/`.
- [ ] Commit.

### Task 10: Marka (P1-3)

**Files:** `public/brand/*`, `src/app/icon.tsx`, `opengraph-image.tsx`, `public/manifest.webmanifest`, `public/icon-192.png`, `icon-512.png`, `layout.tsx`

- [ ] Znak na piasku w favicon; OG: piasek `#F5EFE0`, Cormorant, „Obudź w sobie Włóczykija.”; ikony PWA 192/512 (maskable) z `wloczykij-znak-2048.png`; `theme_color #F5EFE0`.
- [ ] Commit.

### Task 11: Blog (P1-8)

**Files:** `src/app/blog/page.tsx`, `blog/[slug]/page.tsx`

- [ ] Akapity 16–17 px, interlinia 1,7; `DropSignup` po ok. 40% i na końcu; CTA „Twój weekend w 3 minuty: lot i plan z cenami”; „Gotowe na wyjazd?”.
- [ ] Commit.

### Task 12: Spójność wizualna i ton (P2-1…P2-5, P2-7, P2-8)

**Files:** pliki z audytu 4.1 P2 (kolory, emoji, anglicyzmy, typografia, `CookieBanner.tsx`, `PartnerLinks.tsx`).

- [ ] Literały kolorów spoza palety → tokeny; stary pomarańcz usunięty; emoji w UI → `Icons.tsx`; anglicyzmy i formy męskie; `/okazje` i pasek: linki ≥ 24 px; baner cookies nie zasłania CTA w hero.
- [ ] Commit.

### Task 13: Weryfikacja

- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` zielone.
- [ ] Przegląd w przeglądarce: `/`, `/okazje/wro`, `/login`, `/pricing`, 404, mobile 375 px.
- [ ] Dwa niezależne review (jakość kodu; zgodność z audytem punkt po punkcie), poprawki, podsumowanie.
