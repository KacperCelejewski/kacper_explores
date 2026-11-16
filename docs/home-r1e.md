# Home R1e — komunikator z ilustracjami

Data: 2026-11-16. Baza: `45294ab`, gałąź `feat/home-r1b-r2`, kontynuacja PR #48. Bez rebase, force, merge i wdrożenia produkcyjnego.

## Zmiany

- Cztery autorskie popiersia SVG A/M/T/K: Ania z długimi włosami i ceglastym ubraniem, Marek w czapce i granacie, Tomek w okularach i brązowej kurtce, Kuba z szalikiem i zielonym ubraniem. Wspólne symbole `<symbol>` oraz lokalne `<use>`, płaskie kolory marki, kropki oczu i prosta linia ust. Bez fotografii, rastrów, podobizn prawdziwych osób i nowych zależności.
- Panel telefonu z nagłówkiem „Grudniowy wyjazd”, czterema miniaturami i kropką online. Autor przy każdej wiadomości, imię przy pierwszej wiadomości danej osoby, neutralne godziny 18:02–18:04, reakcja Kuby „+1” i „dostarczono” przy ostatniej wiadomości. Godzina obok imienia ogranicza wysokość panelu bez zmniejszania tekstu.
- Przed każdą z czterech wiadomości trzy kropki przez 0,6 s; awatar pojawia się podczas pisania. Dymek wchodzi przez 0,25 s z `cubic-bezier(.16,1,.3,1)`, bez odbijania. Odpowiedzi zaczynają się po 0,45 s i są kompletne po 0,70 s od pytania. Pytania pozostają dokładnie tymi z briefu.
- Po prawej ta sama współdzielona karta przykładu produktu: kierunek, koszt na osobę i razem (szacunek), plan na 3 dni. Nagłówek Włóczykija, etykieta „Scenka”, cienkie strzałki w rytmie odpowiedzi. W tle poziomice i trasa Wrocław–Barcelona. „Przykład, nie Wasz wyjazd” pozostaje poza animowanym rysunkiem.
- Zachowano istniejący kontroler klienta bez zmian: Wstrzymaj/Odtwórz, cel minimum 44 px, `aria-pressed`, IntersectionObserver, ręczna pauza, zmiana reduced motion. Cykle CSS: 16 s × 3, dwa wygaszenia i końcowy kadr. Animacje kropek są skończone; ostatnia, przesunięta o 0,2 s, kończy się po 48,2 s, gdy wskaźnik jest już niewidoczny.
- Domyślne style pokazują kompletny końcowy kadr. Ruch występuje wyłącznie przy `prefers-reduced-motion: no-preference`, bez bramki zależnej od hydracji. Bez JS `<noscript><link rel="stylesheet" href="/home-chat-static.css"></noscript>` wyłącza ruch także przy normalnej preferencji. To mały lokalny arkusz, bez zewnętrznych żądań. Alternatywa tekstowa `sr-only` zachowana, rysunek `aria-hidden`.
- Od 1024 px dwie kolumny hero i dwie kolumny sceny; ograniczenie wysokości animacji `calc(100vh - 160px)` z progresywnym `svh`. 768–1023 px hero w jednej kolumnie, scena maks. 720 px. Poniżej 768 px telefon i karta jedno pod drugim, naturalna wysokość, bez wymuszonych proporcji i skalowania. Tekst sceny minimum 14 px. Geometria wymaga pomiarów opisanych niżej.
- Flagi grupowe pozostają false. Warunkowe pary mają osobne, stałe sloty w CSS: data 2 s, bilety 3 s, rozliczenie 8,2 s; w bieżącym HTML ich nie ma. Zastąpiono dawną kompresję czasu stałymi slotami, aby cała oś była statycznym CSS. Ich przyszłe włączenie wymaga odbioru większego panelu.
- Nie zmieniano API, webhooka, auth, admina, cronów, analityki, quizu, rzeczywistego planu, flag ani zależności.

## Safari — audyt kodu i ograniczenie potwierdzenia

Zgłoszenia właściciela o surowym tekście **nie odtworzono w Safari**, więc przyczyna pozostaje niepotwierdzona. Usunięto wskazane ryzyka:

1. Poprzedni `homeAnimationCss()` emitował `@media` i `@keyframes` w `<style>` w treści React. Generator został całkowicie usunięty; wszystkie reguły i osie czasu są w `globals.css`. Nie pozostały żadne dynamiczne reguły, zatem nie potrzeba też generatora opóźnień. Produkcyjny HTML nie zawiera `<style>`. Końcowy kadr bez JS używa zwykłego lokalnego arkusza zamiast `<style>` wewnątrz `noscript`.
2. Zastana reguła szerokości animacji używała `100svh` bez fallbacku, więc przeglądarka bez tej jednostki mogła odrzucić deklarację. Teraz `vh` występuje przed `svh`. Odrzucenie samej starej deklaracji nie tłumaczy utraty wszystkich ramek i dymków.
3. W stylach sceny nie ma `:has`, `@container`, `color-mix`, `text-wrap`, CSS nesting ani samodzielnych jednostek dvh/svh bez fallbacku. Użyte grid, flex, `:is`, `:where`, logical properties, SVG `<use>` i keyframes nie wymagają funkcji dodanych po Safari 15. Reset marginesów akapitów sceny jest własną regułą poza warstwami Tailwinda.
4. Poza sceną istnieją zastane selektory `:has` (m.in. globalny FAB i karty-marzenia) oraz Tailwind 4 generujący m.in. `@layer`/`@property`. Nie zmieniano frameworka ani nie deklarujemy zgodności całej aplikacji ze starym Safari. W skompilowanym CSS reguły `.home-chat-*` są zwykłymi regułami poza warstwami; brak obsługi pojedynczej nowej deklaracji nie powinien usuwać całej sceny. Do diagnozy całkowitego braku stylów trzeba sprawdzić też pobranie CSS i cache w dotkniętej przeglądarce.

Próby Chromium z Puppeteera (również systemowego Chrome) kończą się przed utworzeniem strony: `Failed to launch the browser process: Code: null`. Próba zainstalowanego WebKit przez Playwright kończy się `Abort trap: 6`, exit 134. Środowisko nie pozwoliło uruchomić przeglądarek; brak pomiaru ani zrzutu nie jest wynikiem PASS.

## Kontrole

- `npm test`: 93 pliki, 973 testy PASS. Testy komponentu: kompletny SSR, brak `<style>`, lokalny no-JS CSS, cztery symbole i miniatury, awatary autorów, imiona, trzy kropki, dostarczenie i łączniki, copy oraz wyłączone flagi.
- `homeAnimation.test.ts`: czasy modelu wobec statycznych keyframes w CSS, 0,6 s pisania, odpowiedź poniżej 1 s, trzy skończone przebiegi, media reduced motion, fallback i warunkowe sloty. Istniejące testy strony nadal weryfikują CTA.
- `npm run lint`: 0 błędów, 27 zastanych ostrzeżeń.
- `npm run typecheck`: PASS.
- `npm run build`: PASS z atrapami env; pierwsza próba bez env przerwała się na braku klucza Stripe. Zastane ostrzeżenie Edge Runtime i nieudane odczyty atrapy Supabase są spodziewane.
- `git diff --check`, `node --check scripts/measure-home-r1e.mjs`: PASS.
- Serwer produkcyjny lokalnie: HTTP 200 dla `/` i `/home-chat-static.css`; HTML zawiera scenę i arkusz bez JS. To nie test renderowania.
- Obliczenie kontrastu kolorów wg luminancji sRGB: granat/krem 11,38:1, ceglasty UI/krem 5,20:1, zieleń/krem po przygaszeniu opacity 0,96: 6,39:1. Pomarańczowy `#EB531E` jest wyłącznie kolorem ilustracji. Animowane wejścia/wygaszenia nie są stałym stanem tekstu.

## Pomiary przeglądarkowe — niewykonane

`scripts/measure-home-r1e.mjs` używa Puppeteera z katalogu biznesowego, bez instalowania zależności aplikacji. Sprawdza każdy viewport w trzech wariantach: JS + reduced motion, bez JS + reduced motion i bez JS + zwykła preferencja ruchu. Kontroluje overflow, tekst minimum 14 px, końcową widoczność, ramkę CSS, wymiary przycisku, H1/CTA, kolumny, układ telefonu, wysokość i pierwszy ekran desktopu; dodatkowo czasy pytań/pisania/odpowiedzi, pauzę ze Spacji, IntersectionObserver, zachowanie ręcznej pauzy, zakończenie i zmianę preferencji. Opcjonalne zrzuty: `HOME_SCREENSHOTS=1`.

| Viewport | Wynik |
|---|---|
| 1440 × 800 | Brak pomiaru — przeglądarka nie wystartowała |
| 1280 × 650 | Brak pomiaru — przeglądarka nie wystartowała |
| 1024 × 640 | Brak pomiaru — przeglądarka nie wystartowała |
| 768 × 1024 | Brak pomiaru — przeglądarka nie wystartowała |
| 375 × 667 | Brak pomiaru — przeglądarka nie wystartowała |
| 320 × 568 | Brak pomiaru — przeglądarka nie wystartowała |

JSON `/tmp/home-r1e-pomiary/results.json`: 0 wykonanych przypadków, błąd `browser launch`, kod wyjścia 1. Druga próba z systemowym Chrome: `/tmp/home-r1e-chrome/results.json`. Brak potwierdzenia twardych kryteriów geometrii, Safari, powiększenia 200%, prawdziwego czytnika, CLS/LCP i obsługi klawiaturą w przeglądarce.

## Waga

Porównanie produkcyjnych buildów `45294ab` i R1e w **tym samym katalogu i z tymi samymi atrapami env**, 2026-11-16. Nie używano zastanego starego artefaktu jako bazy. Bazę zbudowano tymczasowo, przywracając potem wszystkie pliki R1e. Gzip poziom 9, mtime=0; sumy unikalnych JS/CSS z `src`/`href` w HTML strony `/`. To rozmiary plików, nie pomiar sieci, CPU ani GPU.

| Artefakt `/` | Baza B | Baza gzip B | R1e B | R1e gzip B |
|---|---:|---:|---:|---:|
| JS | 1032416 | 309225 | 1032416 | 309225 |
| CSS | 55577 | 10726 | 65467 | 12127 |
| HTML | 83509 | 16725 | 93387 | 18449 |

Przyrost JS: **0 B gzip**, limit ≤2 000 B zachowany. SVG w HTML: 12493 B / 2789 B gzip. Arkusz bez JS: 139 B / 123 B gzip.

Kod kliencki i importy klienta nie uległy zmianie; rysunek, model i CSS pozostają po stronie serwera/arkusza. SVG są już wliczone w HTML, nie należy doliczać ich ponownie. Arkusz `public/home-chat-static.css` jest pobierany tylko bez JS.

## Odtworzenie i produkcja

```sh
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=local-placeholder SUPABASE_SERVICE_ROLE_KEY=local-placeholder STRIPE_SECRET_KEY=sk_test_placeholder npm run build
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=local-placeholder SUPABASE_SERVICE_ROLE_KEY=local-placeholder STRIPE_SECRET_KEY=sk_test_placeholder npm run start -- --port 3100
# Drugi terminal, przeglądarka z uprawnieniami do uruchomienia:
node scripts/measure-home-r1e.mjs
# Opcjonalnie: CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

Produkcja: brak nowych env, usług, migracji, fontów i zależności; użyć istniejących prawdziwych env, nigdy atrap. Flagi pozostawić false. Przed merge/wdrożeniem: zielone CI, sześć pomiarów skryptem, wizualny odbiór w Chrome i Safari (JS oraz bez JS), potwierdzenie widoczności całego hero na trzech desktopach i czytelnego układu telefonu. Błąd Safari wymaga ponownego sprawdzenia w dotkniętej przeglądarce. Zadanie nie obejmuje wdrożenia ani merge.

## Przekazanie — commit zablokowany

Próba `git add` wszystkich ośmiu plików zakończyła się: `Unable to create .../wloczykij-app/.git/worktrees/wloczykij-app-home-r1b/index.lock: Operation not permitted`. Sandbox blokuje zapis indeksu. **Nie powstał commit; push nie został wykonany.** Zgodnie z briefem gotowe zmiany pozostają niezacommitowane w podanym worktree dla leada. Proponowany commit: `feat(home): illustrate messenger friends and ship static animation CSS`, następnie zwykły push `origin feat/home-r1b-r2`, bez force. Osiem plików: komponent i jego test, `homeAnimation.ts` i jego test, `globals.css`, `public/home-chat-static.css`, `scripts/measure-home-r1e.mjs`, ten raport.
