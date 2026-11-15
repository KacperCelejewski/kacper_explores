# Strona główna R1a (teksty, dwa CTA, parametry quizu, metadane, FAQ) — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strona główna mówi uczciwie „Wyjazd ze znajomymi: dokąd, za ile i jaki plan” z dwiema ścieżkami (ekipa / solo i para), a wybór „ekipa” otwiera quiz od razu na „Znajomi” z licznikiem osób.

**Architecture:** R1a zmienia tylko teksty i dane, nie układ (układ szeroki to R1b, animacja to R1c). Teksty hero, metadane i FAQ trafiają do czystych modułów w `src/lib/` (testowalnych w vitest w środowisku node), a komponenty tylko je renderują. Stan funkcji części 2–6 trzyma `src/lib/features.ts` (wszystkie klucze wyłączone), a teksty zapowiadające inne części pokazują się tylko przy włączonym kluczu.

**Tech Stack:** Next.js 16 App Router (przed pisaniem kodu przeczytaj `node_modules/next/dist/docs/`, według CLAUDE.md to nie jest znany Next), React 19, Zustand, vitest.

**Spec:** `docs/superpowers/feature-briefs/2026-11-15-strona-glowna.md` (sekcje 1, 2, 4 „Metadane”, „FAQ”, reguła `features.ts`, 8 kryteria 9, 12, 14, 16, 19). Opinie: `…-strona-glowna-review.md`, `…-ux-review*.md`. Kod czytaj z `origin/main` (checkout `wloczykij-app` bywa na starej gałęzi).

## Global Constraints

- Gałąź od `origin/main` (np. `feat/strona-glowna-r1a`), nigdy commity na `main`. `docs/superpowers/` nie jest commitowane. `PRODUCT.md` jest commitowany (Task 7).
- Teksty po polsku, głos z `BRAND.md`: bez emoji, bez wykrzykników, bez „platforma”, „innowacyjny”, zmyślonych opinii i liczników, bez pinezki i samolotu jako motywu. Dozwolone liczby: „6 pytań”, „2 plany za darmo co miesiąc”, „7 polskich lotnisk”, „4 kroki”, „3 okazje”.
- Zero form „-łem/-łeś/-ła/-ł” i odmienionych imion w tekstach interfejsu (reguła głosu produktu).
- Żadnego tekstu o terminie, lotach, zaproszeniach, rozliczeniach ani „bez konta” (części 2–6 nie istnieją): takie zdania tylko za kluczem w `features.ts`.
- Układ i hero (plakat, karuzela, klasa `is-home`) zostają bez zmian w R1a. Nowy JS klienta ≤ 1 KB poza treścią tekstów, zero nowych zależności.
- Parametry URL walidowane z listy dozwolonych; nic z URL nie trafia do bazy ani do UI bez walidacji.
- `npm test`, `npm run typecheck`, `npm run lint` przechodzą po każdym zadaniu.

## Review Focus

- `/quiz?companion=friends` przy zapisanym stanie quizu z poprzedniej wizyty (krok ≠ 0, inna `companion`, `group`): start od kroku 0, `Znajomi` zaznaczeni, `GroupSizePicker` widoczny, bez auto-advance; przy `?src=home-solo` stan quizu nietknięty.
- Nieznany lub złośliwy `src` (`<script>`, długi ciąg, inne `companion`): ignorowany, quiz działa jak dziś; `companion=family` albo `solo` z URL nic nie ustawia.
- Zbieg z istniejącymi parametrami: `drop` (link ze zrzutu), `afterLogin=1`, `city`. Żaden nie jest psuty.
- Wszystkie widoczne i metadane teksty przechodzą skan zakazanych fraz; FAQPage bierze treść z tej samej tablicy co widoczne FAQ.
- `features.ts`: przy wszystkich kluczach wyłączonych nigdzie nie ma „termin”, „bilet”, „rozliczen”, „bez konta”, „zaproś”.
- Nieudany zapis zdarzenia (`/api/track`) nie blokuje startu quizu.

---

### Task 0: Gałąź, punkt wyjścia i pomiar bazowy

**Files:** brak zmian w kodzie

- [ ] **Step 1:** W `wloczykij-app`: `git fetch origin && git worktree add ../wloczykij-app-r1a -b feat/strona-glowna-r1a origin/main`, potem `npm ci && npm test && npm run typecheck`. Oczekiwane: zielono na czystym `main`.
- [ ] **Step 2 (decyzja i dostęp Kacpra, nie agenta):** zapisać pomiar bazowy przed zmianą tekstów: liczba zapisów na Czwartkowy zrzut na dobę z ostatnich 14 dni (tabela zapisów, z UTM) oraz liczba wizyt `/` w tym samym oknie (Vercel Analytics albo logi). Wynik trafia do opisu PR. Agent oznacza krok jako wymagający dostępu do produkcji i go nie wykonuje.

### Task 1: `features.ts` i moduł tekstów strony głównej

**Files:**
- Create: `src/lib/features.ts`, `src/lib/homeCopy.ts`
- Test: `src/lib/features.test.ts`, `src/lib/homeCopy.test.ts`

**Interfaces:**
- Produces:
  - `type FeatureKey = "invites" | "datePoll" | "groupFlights" | "groupPlan" | "settlements" | "tripMap"`
  - `const FEATURES: Record<FeatureKey, boolean>` (wszystkie `false`)
  - `isOn(key: FeatureKey): boolean`
  - `const HOME = { badge, h1, subtitle, ctaTeam, ctaSolo, micro, quickLink, dropLink, ... }` oraz `homeSubtitle(features?: Record<FeatureKey, boolean>): string`
  - `const FORBIDDEN_COPY: RegExp[]` (używana przez testy tekstów): `/!/`, emoji (`\p{Extended_Pictographic}`), `/\b\w*(łem|łeś|łam|łaś)\b/i`, `platform`, `innowacyjn`.

- [ ] **Step 1: Testy.** `features.test.ts`: wszystkie sześć kluczy `false`; `isOn` zwraca wartość z `FEATURES`. `homeCopy.test.ts`: `HOME.h1 === "Wyjazd ze znajomymi: dokąd, za ile i jaki plan."` (48 znaków); `homeSubtitle()` przy wyłączonym `invites` zwraca `"Powiedz, kto jedzie. Dostaniesz kierunki w Waszym budżecie i plan godzina po godzinie."`; przy włączonym `invites` zwraca wariant z linkiem na grupę (tekst z briefu, tabela `features.ts`); żaden string z `HOME` nie pasuje do żadnego wzorca z `FORBIDDEN_COPY`; przy wszystkich kluczach wyłączonych żaden string z `HOME` nie zawiera `termin|bilet|rozliczen|bez konta|zaproś` (case-insensitive).
- [ ] **Step 2:** `npx vitest run src/lib/features.test.ts src/lib/homeCopy.test.ts`, oczekiwane FAIL.
- [ ] **Step 3:** Zaimplementuj oba moduły. Teksty z briefu: badge „Dla ekipy i dla tych, co jadą sami”; CTA „Jedziemy ekipą →” (`/quiz?companion=friends&src=home-ekipa`) i „Solo albo we dwoje →” (`/quiz?src=home-solo`); mikrotekst „6 pytań · darmowe konto · bez karty”; wiersz „Wiem już dokąd: 4 kroki” (`/quick`) i „Co czwartek 3 okazje: zapisz się” (`#zrzut`).
- [ ] **Step 4:** PASS, `npm run typecheck`.
- [ ] **Step 5:** commit `feat(home): feature flags and homepage copy module`.

### Task 2: Parametry `companion` i `src` w quizie

**Files:**
- Create: `src/lib/homeParams.ts`
- Test: `src/lib/homeParams.test.ts`
- Modify: `src/app/quiz/page.tsx` (`QuizPageInner`, efekt startowy ok. linii 229–259; przy `dropPrefill` jest wzorzec resetu kroku do naśladowania), ewentualnie `src/app/api/track/route.ts`, jeśli lista dozwolonych zdarzeń wymaga nowego wpisu

**Interfaces:**
- Produces: `parseHomeParams(params: { get(name: string): string | null }): { companion: "friends" | null; src: "home-ekipa" | "home-solo" | null }`. Tylko dokładne wartości z listy dozwolonych; wszystko inne daje `null`.

- [ ] **Step 1: Testy.** `companion=friends` → `"friends"`; `companion=family`, `solo`, `FRIENDS`, pusty, `<script>`, ciąg 500 znaków → `null`; `src=home-ekipa`/`home-solo` → ta wartość; `src=home-ekipa<img>`, `src=x`, brak → `null`; ten sam wynik dla `URLSearchParams` i dla mocka z `get`.
- [ ] **Step 2:** FAIL, implementacja, PASS.
- [ ] **Step 3: Podłącz do quizu.** Gdy `companion === "friends"` i nie ma `dropPrefill`: w efekcie startowym `setCurrentQuizStep(0)`, ustaw `companion = "friends"` i `group = groupFromCompanion("friends")` (ten sam krok, co `pickCompanion` robi dla „Znajomi”), bez uruchamiania auto-advance; stan wizyty (`currentQuizStep`, `maxVisitedStep`) liczony tak, żeby pierwszy render był już na kroku 0 (jak `dropStepReset`). Przy `src === "home-solo"` i braku `companion` nie zmieniaj żadnych odpowiedzi. Istniejące gałęzie `dropPrefill`, `afterLogin`, `city` zostają bez zmian i mają pierwszeństwo przed `companion`.
- [ ] **Step 4:** Zdarzenie startu ze `src`: `trackEvent("home_cta_click", { src })` oraz zapis po stronie serwera istniejącym mechanizmem `track` (nazwa zdarzenia z prefiksem `home_`; sprawdź w `/api/track` i migracji `quiz_events`, czy lista dozwolonych nazw wymaga dopisku, i dopisz tylko jeśli tak). Błąd zapisu nie przerywa startu (try/catch, bez UI).
- [ ] **Step 5:** `npm run dev`, w przeglądarce: (a) `/quiz?companion=friends&src=home-ekipa` przy świeżym stanie: krok „Kto jedzie?”, „Znajomi” zaznaczeni, licznik osób widoczny, brak auto-advance; (b) to samo po wcześniejszym przejściu quizu do kroku 3 (stan w `localStorage` ustawiony): wraca na krok 0; (c) `/quiz?src=home-solo`: stan niezmieniony; (d) `/quiz?companion=<script>`: quiz jak dziś. Zrób zrzuty ekranu (375 px). Brak błędów w konsoli.
- [ ] **Step 6:** `npm test && npm run typecheck && npm run lint`, commit `feat(quiz): start from friends via home params`.

### Task 3: Hero strony głównej (teksty i dwa CTA)

**Files:**
- Modify: `src/app/components/HomeClient.tsx` (hero ok. linii 296–400: badge „Loty z 7 polskich lotnisk”, H1 „Masz wolny weekend…”, podtytuł, CTA, mikrotekst; dolny finał ok. linii 894–907 dostaje te same dwa CTA)

**Interfaces:** Consumes `HOME`, `homeSubtitle`, `isOn` z zadania 1.

- [ ] **Step 1:** Zamień teksty hero na `HOME.*`: badge, H1 (zachowaj `<h1>` i obecny styl, bez rozbijania `<br />` na trzy linie z kursywą, bo H1 ma 48 znaków i `clamp` sam go złoży; sprawdź, że H1 nie przekracza viewportu na 320 px), podtytuł z `homeSubtitle()`, dwa CTA (główny przycisk „Jedziemy ekipą →”, drugi link „Solo albo we dwoje →”), mikrotekst, jeden dyskretny wiersz („Wiem już dokąd: 4 kroki” i „Co czwartek 3 okazje: zapisz się”). Zachowaj `#zrzut`, plakat i układ hero.
- [ ] **Step 2:** Finał na dole ma tytuł „W piątek rano możesz już być w drodze.” i te same dwa CTA (linki z `HOME`). Liczba linków do `/quiz` na stronie ≤ 7: policz w przeglądarce.
- [ ] **Step 3:** Obejrzyj stronę na 375, 768 i 1280 px: H1, oba CTA i mikrotekst bez poziomego scrolla, kontrast tekstu ≥ 4,5:1 (`--accent`, nie `--accent-poster`). Zrób zrzuty. Sprawdź, że linki mają dokładnie: `/quiz?companion=friends&src=home-ekipa` i `/quiz?src=home-solo`.
- [ ] **Step 4:** `npm test && npm run typecheck && npm run lint`, commit `feat(home): hero copy and two paths`.

### Task 4: Metadane, schema i manifest

**Files:**
- Modify: `src/app/page.tsx` (`metadata`, `webAppSchema`), `src/app/layout.tsx` (`title.default`, OG, Twitter, `description`), `public/manifest.webmanifest`, `src/app/opengraph-image.tsx` (tylko jeśli tekst zawiera nieprawdziwe hasła)
- Modify: `src/lib/homeCopy.ts` (dodaj `META` z title/description)
- Test: `src/lib/homeCopy.test.ts` (dopisz)

- [ ] **Step 1: Testy.** `META.title` to `"Wyjazd ze znajomymi: dokąd, za ile i jaki plan"` (sufiks „| Włóczykij” dodaje szablon z `layout.tsx`); `META.description` zawiera „6 pytań”, „plan godzina po godzinie” i „7 polskich lotnisk”, nie zawiera „solo w Europie”, „budżetowy weekend solo” ani żadnego z fraz z części 2–6; wszystkie stringi META przechodzą `FORBIDDEN_COPY`.
- [ ] **Step 2:** FAIL, potem zastosuj `META` w `page.tsx` (title, description, `webAppSchema.description`) i `layout.tsx` (`title.default` „Włóczykij: wyjazd ze znajomymi, dokąd, za ile i jaki plan”, OG i Twitter z tym samym sensem), `manifest.webmanifest.description`. Sprawdź `opengraph-image.tsx`; jeśli tekst mówi „budżetowy weekend solo” albo podobnie, zmień na zgodny z `META`.
- [ ] **Step 3:** `npm run build`, w wyniku `curl` na lokalny serwer: `<title>`, `<meta name="description">`, `og:title`, JSON-LD `WebApplication` i `FAQPage` mają nowe teksty, bez „solo w Europie”. Opisz w PR, co sprawdziłeś.
- [ ] **Step 4:** commit `feat(home): metadata and schema for group trips`.

### Task 5: FAQ

**Files:**
- Modify: `src/app/components/HomeFAQ.tsx` (tablica `FAQS`; JSON-LD w `page.tsx` bierze z niej)
- Test: `src/app/components/HomeFAQ.test.ts` (test czysty na tablicy `FAQS`; jeśli import komponentu w środowisku node nie działa, przenieś tablicę do `src/lib/homeFaq.ts` i testuj ją tam)

- [ ] **Step 1: Testy.** `FAQS` zawiera pytanie „Jedziemy ekipą, co dostajemy?” z odpowiedzią o: kierunkach w Waszym budżecie, szacunku kosztu na osobę i razem, planie godzina po godzinie, udostępnieniu linkiem do podglądu; zawiera pytanie „Kto płaci?” z opisem dzisiejszego modelu (2 plany w miesiącu za darmo, Pack i Pro jak w istniejącym pytaniu o darmowość; nic o Przepustce); żadna odpowiedź nie zawiera `termin|bilet|rozliczen|bez konta` przy wyłączonych kluczach; wszystkie przechodzą `FORBIDDEN_COPY`; ceny w odpowiedziach pochodzą z `PRICES` (`src/lib/prices.ts`), nie z literałów.
- [ ] **Step 2:** FAIL, dopisz dwa pytania (tekst konkretny, w głosie z `BRAND.md`, bez wykrzykników), PASS.
- [ ] **Step 3:** `npm test && npm run typecheck`, commit `feat(home): FAQ for group trips`.

### Task 6: `PRODUCT.md`

**Files:**
- Modify: `PRODUCT.md` (sekcje „Users”, „Positioning”, liczba darmowych planów)

- [ ] **Step 1:** „Users”: grupy znajomych i rodzin przestają być „secondary”; opisz dwie ścieżki (ekipa pierwsza, solo i para obok). „Positioning”: organizacja wyjazdu ze znajomymi (dokąd, za ile, jaki plan) jako nisza, bez obietnic funkcji z części 2–6. Zastąp „5 free plans on sign-up” zdaniem o 2 planach w miesiącu (zgodnie z `FREE_PLANS_PER_MONTH` w kodzie, sprawdź nazwę stałej). Zasady marki (`Brand Commitments`) bez zmian.
- [ ] **Step 2:** `git diff PRODUCT.md` sprawdź, że zmieniły się tylko wskazane sekcje; commit `docs(product): reposition for group trips`.

### Task 7: Weryfikacja końcowa

- [ ] **Step 1:** `npm test && npm run typecheck && npm run lint && npm run build` (build może wymagać zmiennych środowiskowych: ustaw zastępcze tylko w powłoce, żadnych plików env w commicie; opisz to w PR).
- [ ] **Step 2:** Ręcznie na `npm run dev` (375, 768, 1280 px): strona główna (hero, finał, FAQ, pasek okazji i zapis bez zmian), oba CTA, quiz z oboma parametrami i z nieznanymi parametrami. Zapisz zrzuty i listę sprawdzonych przypadków w opisie PR.
- [ ] **Step 3:** Skan tekstów: `git diff origin/main -- src | grep -nE "[!]|łem|łeś"` w dodanych liniach tekstu interfejsu nie daje nowych trafień (poza kodem, np. `!==`; oceń ręcznie).
- [ ] **Step 4:** Otwórz PR do `main` (po zgodzie Kacpra), w opisie: pomiar bazowy z Task 0, zrzuty, co jest poza zakresem (R1b, R1c), lista decyzji z briefu, które ten PR wdraża.
