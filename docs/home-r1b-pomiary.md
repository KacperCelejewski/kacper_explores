# Home R1b — układ i weryfikacja

Data: 2026-11-15. Gałąź: `feat/home-r1b`, punkt wyjścia: `1faebee` (main po PR #41).

## Wykonanie

- `page.tsx` renderuje kontener `data-page="home"` na serwerze. `main.app-shell:has(> …)` usuwa ograniczenie 448 px przed hydracją. Usunięto efekt dodający `body.is-home`.
- Wspólne zmienne `--page-width` / `--page-gutter`: poniżej 768 px jedna kolumna, margines 16 px przy 320–374 px i 20 px od 375 px; 768–1023 px jedna kolumna do 720 px; 1024–1279 px dwie kolumny, kontener do 960 px; od 1280 px kontener 1120 px i co najmniej 48 px marginesu.
- Przyszły układ planu może użyć znacznika `data-layout="wide"`, tych samych zmiennych i `.home-container` jako wzoru szerokości. Żadna obecna trasa planu nie otrzymała tego znacznika.
- Hero: tekst i statyczna lista ośmiu kierunków z usuniętej karuzeli. Zachowane nazwy miast i kraje, bez sztywnych cen, zdjęć i ośmiu dodatkowych CTA. Usunięto `galleryPhotos`, osiem wywołań Unsplash, `next/image`, stan przewijania, przyciski kropek, plakat hero i jego pętlę CSS. Istniejący statyczny `DuskPoster` w finale pozostał.
- Okazje i zapis pozostają zaraz pod hero; na komputerze są obok siebie, jeśli pasek ma dane. Bez danych zapis zajmuje szerokość kontenera. Pobieranie okazji, wybór lotniska, `localStorage` i `cheapestHint` bez zmian.
- Kroki są w rzędzie od 1024 px, opis przykładu i karta planu stoją obok siebie, FAQ ma nagłówek obok pytań. To zmiana układu istniejącego przykładu, bez interaktywnego demo z sekcji 3.5 briefu.
- Sekcje nie zaczynają od `opacity: 0`, więc są czytelne bez JS, bez obserwatora i przy reduced motion. Emoji przykładu zastąpiono istniejącymi ikonami. Cele CTA i nawigacji mają minimum 44 px; globalny focus i reduced motion pozostają.
- `homeCopy.ts`, `features.ts`, quiz, FAQ i schema bez zmian treści. Zachowane dwa dokładne adresy: `/quiz?companion=friends&src=home-ekipa` i `/quiz?src=home-solo`.

## Linki do quizu — wynik potwierdzony

Test Vitest renderuje rzeczywiste `HomePage`, z atrapą wyłącznie odczytu danych okazji, w wariantach z danymi i bez danych. W obu HTML zawiera **6** linków do `/quiz`: hero 2, kroki 1, przykład planu 1, finał 2. Stopka na stronie głównej pomija dodatkowe CTA (na pozostałych stronach zachowuje je domyślnie). Rezerwujemy siódmy link dla otwartego globalnego Menu, którego kod zawiera jeden link do `/quiz`; stan otwartego menu wymaga jeszcze sprawdzenia w przeglądarce. Nawigacja główna nie ma dodatkowego linku do quizu. Każda ze ścieżek z `src` występuje dwa razy. Test sprawdza też obecność znacznika SSR, H1 i mikrotekstu oraz brak zdjęć karuzeli i treści ukrytej przez początkowe `opacity: 0`.

## Pomiary przeglądarkowe — NIEPOTWIERDZONE

| Viewport | H1 (góra/dół) | CTA ekipa (góra/dół) | CTA solo (góra/dół) | Mikrotekst (góra/dół) | Widoczność i baner cookies |
|---|---|---|---|---|---|
| 375 × 667 | brak pomiaru | brak pomiaru | brak pomiaru | brak pomiaru | do sprawdzenia |
| 1280 × 650 | brak pomiaru | brak pomiaru | brak pomiaru | brak pomiaru | do sprawdzenia |

Środowisko odmówiło dostępu Computer Use do Google Chrome (`Computer Use was not approved to use Google Chrome`), a host dostępu przeglądarkowego był niedostępny. Próba uruchomienia lokalnego headless Chrome również zakończyła się przed otwarciem strony (`SIGABRT` / `Operation not permitted`). **Nie wykonano zrzutów ani pomiarów współrzędnych, CLS, overflow, porównania JS/no-JS czy Lighthouse.** Wartości kontenera powyżej opisują reguły CSS, nie wynik pomiaru przeglądarki. Kryteria wizualne wymagają domknięcia przed wdrożeniem.

Przygotowano `scripts/measure-home-r1b.mjs` (sprawdzona składnia), który na produkcyjnym serwerze lokalnym:

- mierzy 320, 375, 767, 768, 1023, 1024, 1279, 1280, 1440 i 1920 px, z JS i bez JS;
- zapisuje współrzędne H1, obu CTA i mikrotekstu, szerokości kontenera/nawigacji, liczbę linków (także po otwarciu menu), CLS oraz błędy wykonania;
- sprawdza pełną widoczność wymaganych elementów przy obu wymaganych viewportach, także względem banera cookies; sprawdza overflow i zgodność geometrii przed/po hydracji;
- zapisuje pełne PNG i `results.json` do `/tmp/home-r1b-pomiary`; działa z `prefers-reduced-motion: reduce`.

Uruchomienie (Playwright jako narzędzie QA poza zależnościami aplikacji):

```sh
npm install --prefix /tmp/wloczykij-r1b-qa --cache /tmp/wloczykij-npm-cache playwright
# Terminal 1, po buildzie z lokalnymi atrapami opisanymi niżej:
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=local-placeholder SUPABASE_SERVICE_ROLE_KEY=local-placeholder STRIPE_SECRET_KEY=sk_test_placeholder npm run start -- --port 3100
# Terminal 2, na macOS z zainstalowanym Chrome:
PLAYWRIGHT_MODULE=/tmp/wloczykij-r1b-qa/node_modules/playwright/index.mjs CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node scripts/measure-home-r1b.mjs
```

Skrypt nie wysyła formularzy ani nie wywołuje generowania planu. Atrapy env pozwalają sprawdzić wariant bez ofert. Zestaw z realnymi ofertami, zmianą lotniska i zapamiętanym wyborem trzeba dodatkowo sprawdzić w środowisku testowym z danymi. Ręcznie należy też przejść klawiaturą, rozwinąć FAQ, wejść obiema ścieżkami quizu, wrócić na stronę główną i sprawdzić zwykłe ustawienie ruchu. Wyniki JSON należy przepisać do tabeli powyżej; nie należy zastępować ich szacunkiem z CSS.

## Kontrole lokalne

- `npm test`: 86 plików, 827 testów, PASS (w tym trzy nowe testy HTML strony i stopki).
- `npm run typecheck`: PASS.
- `npm run lint`: 0 błędów, 27 ostrzeżeń.
- `npm run build`: PASS z atrapami zmiennych wyłącznie w powłoce, bez `.env` i bez sekretów w repo:

```sh
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=local-placeholder SUPABASE_SERVICE_ROLE_KEY=local-placeholder STRIPE_SECRET_KEY=sk_test_placeholder npm run build
```

Build raportuje brak połączenia z atrapą Supabase i zastane ostrzeżenie Next o Edge Runtime. Nie stanowi to testu danych produkcyjnych, płatności ani API lotów.

## Przekazanie i produkcja

Próba commita `feat(home): add SSR-safe wide layout and replace carousel with static destinations` została zablokowana przy utworzeniu `.git/worktrees/wloczykij-app-home-r1b/index.lock` (`Operation not permitted`). Zgodnie z briefem zmiany pozostają **niezacommitowane**; push nie został wykonany. Nie utworzono PR ani merge. Lead może po przeglądzie wykonać commit zmian kodu, drugi commit dokumentu/skryptu QA, następnie `git push -u origin feat/home-r1b` bez force.

Produkcja: brak nowych zmiennych, migracji i zależności; użyć istniejącej konfiguracji env (nie atrap). Szeroki układ wymaga obsługi `:has()`; starsze przeglądarki zachowują wąski shell. Przed wdrożeniem domknąć pomiary i ocenę wizualną. Poza zakresem: R1c / animacja D, kierunki wizualne `sitedesign`, szeroki układ planu, interaktywna sekcja 3.5 i części 2–6 grupy. Następny etap: wybór kierunku wizualnego, R1c i osobna zmiana układu planu.
