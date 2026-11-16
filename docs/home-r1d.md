# Home R1d — animacja D

Data: 2026-11-16. Gałąź `feat/home-r1b`, baza `3cdd27d`. Bez rebase, force, PR i merge.

## Wykonanie

- `HomeChatAnimation` jest Server Componentem przekazanym przez slot z `page.tsx` do `HomeClient`. Rysunek, teksty, oś czasu i podsumowanie nie trafiają do grafu modułów klienta. Hero nie importuje już `HomePoster`; plakat pozostaje w niezmienionych kartach `HomeDreams` pod hero.
- Czat po lewej, karta po prawej, ilustracyjna mapa Europy, kropkowana trasa Wrocław → Barcelona, inicjały A/M/T/K. Bez pinezki, samolotu, obrazów rastrowych, nowych fontów i zależności. Ziarno to powtarzana tekstura SVG 16 × 16 w data URI, bez filtra na animowanej warstwie.
- Jedna konfiguracja `HOME_ANIMATION` i kolejność par w `src/lib/homeAnimation.ts`: cykl 16 s, pytania 1/4/7 s, odpowiedzi 1,45/4,45/7,45 s, wejście 0,25 s. Pełna odpowiedź po 0,70 s, czyli poniżej 1 s. Czat przygasa od 10 s. Od 13,5 s karta jest kompletna; wygaszenie od 15 do 16 s występuje tylko w pierwszych dwóch przebiegach. Trzeci przebieg pozostawia pełny kadr odpowiadający 13,5 s; po 48 s nie ma czynnych animacji.
- Oś czasu i skończona liczba powtórzeń to CSS `@keyframes`. Domyślny styl pokazuje końcowy kadr. Ruch włącza wyłącznie `prefers-reduced-motion: no-preference`, od pierwszej klatki ukrywając wiadomości i odpowiedzi, bez czekania na hydrację. Reduced motion wyłącza wszystkie animacje, również po zmianie preferencji. `noscript` wymusza statyczny kadr końcowy także przy zwykłej preferencji ruchu (wg aktualnego briefu R1d).
- Jedyny nowy Client Component `HomeAnimationControl` przełącza `animation-play-state` przez `data-paused`, obserwuje widoczność i preferencję ruchu oraz synchronizuje stan przycisku po zakończeniu CSS. Bez timerów, RAF, sterowania czasem animacji i licznika pętli w JS. Pauza ręczna pozostaje po wyjściu/powrocie w widok. Obserwator i listener mają cleanup; bez IntersectionObserver pozostaje ręczna pauza i skończone trzy przebiegi.
- Przycisk Wstrzymaj/Odtwórz: minimum 92 × 44 px, globalny widoczny fokus, `aria-pressed`; poza rysunkiem `aria-hidden`, razem ze stałym podpisem „Przykład, nie Wasz wyjazd”. Przed hydracją, przy reduced motion i po zakończeniu przycisk jest nieaktywny. Czytnik dostaje dokładne zdanie alternatywne z briefu, bez czytania zmieniających się dymków.
- `HomeExampleSummary` współdzieli kartę kierunku/kosztu/nagłówek planu między końcem animacji i istniejącym przykładem planu. Usunięto sprzeczną z nowym przykładem dawną kwotę „Łącznie 2 200 zł” z nagłówka tej sekcji; teraz mówi „Przykład dla 4 osób”. Nie zmieniono układu rzeczywistego planu, zgodnie z zakazem briefu.
- Wszystkie flagi w `features.ts` pozostają **false**. Warunkowe pary `datePoll`, `groupFlights`, `settlements` są gotowe w modelu: chip pt–nd, jawnie przykładowa cena, jawnie przykładowe rozliczenie. Nie ma ich w bieżącym HTML ani osi CSS. Większa liczba par automatycznie ściska odstępy przed 10 s, zachowując 16 s cyklu. Ich przyszłe włączenie wymaga wdrożenia odpowiednich ekranów produktu i odbioru rozbudowanej karty na telefonach.
- H1, meta, FAQ/schema, dokładne CTA i sześć linków quizu w SSR zachowane. Rezerwa siódmego dla globalnego menu. API, quiz, webhook, auth, admin, cron, analityka i rzeczywisty plan bez zmian.

## Kwoty i ekran produktu

450 zł to **ilustracyjny szacunek całego wyjazdu na osobę**, zatwierdzony w briefie strony głównej §3.4 i aktualnym briefie R1d, nie sprawdzona oferta ani cena lotu. 1 800 zł = 4 × 450 zł. Imiona i inicjały są postaciami scenariusza, nie danymi użytkowników. Wszystkie te liczby są oznaczone przykładem; kwota na osobę dodatkowo „(szacunek)”.

Odpowiedniki w produkcie (weryfikacja kodu 2026-11-16):

| Odpowiedź | Ekran i kod |
|---|---|
| Barcelona | `/destinations`: karta kierunku; `/plan/[tripId]`: nagłówek miasta z wygenerowanego planu |
| Koszt na osobę i razem, szacunek | `/plan/[tripId]`, grupa znajomych/rodzina: sekcja „Szacowany całkowity koszt”, `src/app/plan/[tripId]/page.tsx:464–480`; `plan.totalBudgetEstimate`, `totalForGroup`, etykiety „na osobę”, „razem”, „(szacunek)” |
| Plan na 3 dni, godzina po godzinie | `/plan/[tripId]`: długość planu i lista dni/aktywności z godzinami; przykład 3 dni odpowiada długości wybranej w quizie |

Animacja nie pokazuje rozbicia lot/nocleg ani aktywnej mapy. W realnym planie wartości pochodzą z jego danych; nie musi tam wystąpić akurat 450 zł. Nie odczytywano prywatnego planu z produkcji, więc tabela wskazuje rzeczywisty ekran i implementację formatu, a nie zrzut zweryfikowanego wyjazdu.

## Układ i ograniczenie odbioru

Karta rezerwuje stałe 16:10. Od 1024 px: tekst 5/12 i scena 7/12, szerokość sceny ograniczona tak, aby wysokość karty nie przekraczała `100svh - 160px`. Poniżej 1024 px: scena pod tekstem i CTA, maksymalnie 720 px. Zmniejszono tabletowy górny odstęp do 88 px, H1 do 44 px; na 320 px przy niskim ekranie H1 ma 32 px, podnagłówek 14 px. Tekst sceny pozostaje minimum 14 px; najwęższy wariant ma ciaśniejsze odstępy, bez skalowania tekstu transformacją.

**Nie potwierdzono pomiarów przeglądarkowych.** Headless Chrome zakończył się przed otwarciem strony (`Target page, context or browser has been closed`); host przeglądarkowy był niedostępny, a Computer Use zwrócił `Computer Use was not approved to use Google Chrome`. Nie wykonano zrzutów, pomiarów overflow/CLS/LCP/TBT, testu prawdziwym czytnikiem, pauzy klawiaturą ani IntersectionObserver w przeglądarce. Wyniki testów HTML nie zastępują tych kontroli.

**Telefon:** zachowano kolejność z briefu źródłowego §3.3: H1 → oba CTA → mikrotekst/odnośniki → animacja. Cała karta na pierwszym ekranie 320 × 568 / 375 × 667, razem z pełną treścią hero i minimalnym tekstem 14 px, nie jest wymuszona. Literalne wymaganie R1d „cała karta na pierwszym ekranie” dla telefonów pozostaje niespełnione; kompresja poniżej czytelnego rozmiaru nie została zastosowana. Odbiór musi też potwierdzić brak obcięcia tekstu wewnątrz najmniejszej karty.

| Viewport | Góra/dół karty, H1, oba CTA, mikrotekst |
|---|---|
| 1512 × 686 | brak pomiaru |
| 1280 × 650 | brak pomiaru |
| 1024 × 640 | brak pomiaru |
| 1440 × 800 | brak pomiaru |
| 768 × 1024 | brak pomiaru |
| 375 × 667 | brak pomiaru; scena pod CTA |
| 320 × 568 | brak pomiaru; scena pod CTA |

## Waga

Pomiar lokalnego produkcyjnego `next build` z atrapami env, 2026-11-16. Gzip: Python `gzip.compress(..., mtime=0)`, poziom 9, KB = 1000 B. Nowy moduł klienta wyodrębniono z granic modułów Turbopack w skrypcie zawierającym `home-chat-animation`: **1 125 B / 633 B gzip (0,633 KB)**. React i runtime były już zależnościami aplikacji. Limit ≤10 KB gzip nowego JS jest zachowany. Brak nowych zależności i żądań obrazów.

Pełne artefakty `/` (to nie sam komponent):

| Artefakt | B | gzip B |
|---|---:|---:|
| `.next/server/app/index.html` | 81 297 | 16 423 |
| Unikalne JS wskazane przez HTML | 1 024 124 | 304 773 |
| Unikalne CSS wskazane przez HTML | 56 416 | 10 800 |
| Inline SVG, już wliczone w HTML | 8 363 | 2 140 |

Metoda: z HTML zebrać unikalne `src`/`href` `/_next/*.js` i `*.css`, odczytać odpowiadające pliki `.next/static`, zsumować bajty i gzip każdego pliku. SVG skompresować łącznie, nie dodawać drugi raz do HTML. To nie pomiar transferu sieciowego, TBT ani kosztu GPU. Zastany build R1c miał 304 500 B gzip JS; przyrost względem tego artefaktu wynosi 273 B netto, ale nie jest to czyste porównanie dwóch buildów poprzedniego commita i R1d, dlatego budżet oceniamy po nowym module 633 B.

## Kontrole i odtworzenie

- `npm test`: **88 plików, 844 testy PASS**. Nowe testy: kompletność końcowego SSR, trzy pary przy false, copy, kolejność/czasy/limit odpowiedzi, dwa wygaszenia/trzy przebiegi i warunkowe pary po włączeniu poszczególnych flag. Test strony nadal sprawdza sześć linków i oba dokładne adresy CTA, z okazjami i bez.
- `npm run lint`: **0 błędów, 27 zastanych ostrzeżeń**.
- `npm run typecheck`: **PASS**.
- `npm run build`: **PASS z atrapami env**. Ostrzeżenie o Edge Runtime oraz błędy odczytu atrapy Supabase są zastane/oczekiwane. Pierwsza próba bez env zatrzymała się na braku klucza Stripe; właściwy build z poniższym zestawem przeszedł.
- `git diff --check` oraz `node --check scripts/measure-home-r1d.mjs`: PASS.

```sh
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=local-placeholder SUPABASE_SERVICE_ROLE_KEY=local-placeholder STRIPE_SECRET_KEY=sk_test_placeholder npm run build
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=local-placeholder SUPABASE_SERVICE_ROLE_KEY=local-placeholder STRIPE_SECRET_KEY=sk_test_placeholder npm run start -- --port 3100
# W osobnym terminalu, Playwright zainstalowany poza repo, jak w R1b:
PLAYWRIGHT_MODULE=/tmp/wloczykij-r1b-qa/node_modules/playwright/index.mjs CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node scripts/measure-home-r1d.mjs
```

Skrypt zapisuje JSON i PNG do `/tmp/home-r1d-pomiary`: siedem viewportów z JS/bez JS i reduced motion, geometrię karty i tekstów, przycisku, liczbę linków i overflow; sprawdza też pauzę ze Spacji, stan odtwarzania poza widokiem i zmianę preferencji. Zrzuty osi CSS obejmują 0/1,8/4,8/7,8/13,5/15,9/29,5/45,5/48,1 s (przestawianie czasu wyłącznie w skrypcie QA). Skrypt ma sprawdzoną składnię, **nie uzyskał tu wyniku przeglądarkowego**. Weryfikuje pełną kartę nad foldem od 768 px, a na telefonie widoczność H1/CTA/mikrotekstu zgodnie z §3.3 źródła; literalnego wymagania całej karty na telefonie nie uznaje za spełnione.

Odbiór ręczny: cel dotyku/fokus Tab/Enter/Spacja, stop po trzecim przebiegu, brak mignięcia przy wolnej hydracji, baner cookies wobec CTA, 200% tekstu, powrót w widok po ręcznej pauzie, oba wejścia do quizu i powrót. Porównać szerokość/pozycje przed i po hydracji, zmierzyć CLS i LCP/TBT; próby z prawdziwymi okazjami wymagają środowiska testowego z danymi. Nie wysyłać formularzy na atrapach.

## Produkcja

Nie dodano env, usług, migracji ani pakietów. Produkcja korzysta z dotychczasowej konfiguracji, **nie atrap**. Flagi pozostają false. Przed wdrożeniem: zielone CI, odbiór wizualny Kacpra, pomiary i rozstrzygnięcie wymagania całej karty na pierwszym ekranie telefonu. Ten etap nie publikuje aplikacji i nie tworzy PR/merge; commit i push wyłącznie na istniejącą gałąź.

Próba `git add` plików R1d została zablokowana przy utworzeniu `/Users/kacpercelejewski/Documents/Code/travel apka/wloczykij-app/.git/worktrees/wloczykij-app-home-r1b/index.lock`: `Operation not permitted`. **Nie powstał commit, push nie został wykonany.** Zgodnie z briefem pliki pozostają niezacommitowane dla leada. Proponowany commit: `feat(home): replace hero poster with CSS chat animation D`; następnie `git push origin feat/home-r1b`, bez force.
