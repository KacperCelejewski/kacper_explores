# Mapa świata `/swiat` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Podstrona `/swiat` z globusem 3D, na którym użytkownik zaznacza kraje, w których był, i widzi procent świata, procent kontynentów i liczbę krajów oraz pobiera obrazek do udostępnienia.

**Architecture:** Czysta logika w `src/lib/world/` (lista krajów, liczenie, zapis, wyszukiwanie, tekst obrazka), testowana Vitestem. Interfejs w `src/app/swiat/`: strona serwerowa i komponent klienta, a globus (`react-globe.gl`) ładowany leniwie przez `next/dynamic` z `ssr: false`. Dane tylko w `localStorage`, nic nie idzie na serwer.

**Tech Stack:** Next 16 (App Router), React 19, TypeScript, Vitest, `react-globe.gl` (three.js), `world-atlas` i `topojson-client` (tylko skrypt generujący dane), Tailwind 4 i zmienne CSS z `globals.css`.

**Spec:** `docs/superpowers/specs/2026-11-13-mapa-swiata-design.md`

## Global Constraints

- Adres strony: `/swiat`. Obrazek: 1080×1920, stopka `wloczykij.me/swiat`.
- Liczymy 195 państw: 193 członków ONZ plus Watykan i Palestyna. Procenty po liczbie krajów, osobno dla świata i dla każdego kontynentu. Sześć kontynentów (Antarktyda nie ma krajów).
- Przypisanie kontynentów: Rosja do Europy, Turcja, Gruzja, Armenia, Azerbejdżan i Kazachstan do Azji, Egipt do Afryki, Cypr do Europy, Meksyk, Ameryka Środkowa i Karaiby do Ameryki Północnej.
- Polskie nazwy krajów z `new Intl.DisplayNames(["pl"], { type: "region" })`, bez własnej tabeli tłumaczeń.
- Klucz `localStorage`: `visited_countries` (lista kodów ISO 3166-1 alfa-2). Wszystkie odczyty i zapisy w `try/catch`.
- Terytoria zależne rysowane, ale nie do zaznaczenia i nie liczone.
- Globus ładowany tylko na `/swiat` (`next/dynamic`, `ssr: false`). Przy `prefers-reduced-motion` globus się nie obraca. Kolory ze zmiennych CSS (`--accent` dla odwiedzonych).
- Przed pisaniem kodu Next czytamy odpowiednią dokumentację w `node_modules/next/dist/docs/` (AGENTS.md). Komentarze w kodzie po polsku, commity po angielsku, bez linii z atrybucją.
- TDD dla całej logiki: najpierw test, uruchomienie z czerwonym wynikiem, potem implementacja.

## Review Focus

1. Zapisane dane, które nie są listą (liczba, obiekt, uszkodzony JSON) albo zawierają nieznane kody: odczyt zwraca tylko poprawne kody i nigdy nie rzuca (Task 3).
2. Szukanie „  WŁOCHY ” (wielkie litery, spacje, polskie znaki) i „wlochy” znajduje Włochy (Task 4).
3. Zaznaczone wszystkie 195 krajów: świat i każdy kontynent pokazują 100% (Task 2).
4. Przełączenie kodu spoza listy (np. terytorium `GL`) niczego nie zmienia (Task 3).
5. Przeglądarka bez obsługi udostępniania plików albo z zablokowanym udostępnianiem: obrazek się pobiera, strona nie rzuca błędu (Task 6).

---

### Task 1: Lista krajów

**Files:**
- Create: `src/lib/world/countries.ts`
- Test: `src/lib/world/countries.test.ts`

**Interfaces:**
- Produces: `type Continent = "africa" | "asia" | "europe" | "north-america" | "south-america" | "oceania"`; `interface Country { iso: string; continent: Continent }`; `const COUNTRIES: readonly Country[]` (195 pozycji); `const CONTINENTS: readonly Continent[]`; `function countryName(iso: string, locale?: string): string` (polska nazwa z `Intl.DisplayNames`, a gdy API jest niedostępne albo nie zna kodu, zwraca sam kod); `const CONTINENT_LABELS: Record<Continent, string>` (polskie nazwy: Afryka, Azja, Europa, Ameryka Północna, Ameryka Południowa, Oceania).

- [ ] **Step 1: Write the failing test** `countries.test.ts`: `COUNTRIES` ma dokładnie 195 pozycji; kody unikalne i dwuliterowe wielkimi literami; każdy kontynent z `CONTINENTS` ma co najmniej jeden kraj, a suma po kontynentach daje 195. Sprawdzenia punktowe: PL i RU to `europe`, TR i KZ to `asia`, EG to `africa`, MX to `north-america`, BR to `south-america`, AU to `oceania`, VA i PS są na liście, a GL, HK, PR i TW nie. `countryName("PL")` zawiera „Polska”, a `countryName("ZZ")` zwraca `"ZZ"`.
- [ ] **Step 2: Run** `npx vitest run src/lib/world/countries.test.ts`. Expected: FAIL (moduł nie istnieje).
- [ ] **Step 3: Implement** w `countries.ts` według reguł z Global Constraints. Lista wpisana ręcznie jako tablica par kod–kontynent, posortowana po kodzie.
- [ ] **Step 4: Run** ten sam test. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/world/countries.ts src/lib/world/countries.test.ts && git commit -m "Add the list of 195 countries with continents"`.

### Task 2: Liczenie statystyk

**Files:**
- Create: `src/lib/world/stats.ts`
- Test: `src/lib/world/stats.test.ts`

**Interfaces:**
- Consumes: `COUNTRIES`, `CONTINENTS`, `Continent` (Task 1).
- Produces: `interface ContinentStat { continent: Continent; visited: number; total: number; percent: number }`; `interface Stats { visited: number; total: number; percent: number; continents: ContinentStat[] }`; `function countryStats(visited: Iterable<string>): Stats` (kody spoza listy i duplikaty ignorowane, `percent` to dokładny stosunek razy 100, bez zaokrąglania); `function formatPercent(percent: number): string`.

- [ ] **Step 1: Write the failing test** `stats.test.ts`: pusty zbiór daje `visited 0`, `percent 0` i sześć kontynentów po zero; wszystkie 195 kodów daje `percent 100` i 100 dla każdego kontynentu (Review Focus 3); kod `GL`, `ZZ` i duplikat `PL` liczą się odpowiednio jako zero, zero i jeden kraj; suma `visited` po kontynentach równa się `visited` świata. `formatPercent`: `0` daje `"0%"`, `0.51` daje `"<1%"`, `21.02` daje `"21%"`, `99.6` daje `"100%"`, `100` daje `"100%"`.
- [ ] **Step 2: Run** `npx vitest run src/lib/world/stats.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `countryStats` i `formatPercent` w `stats.ts`; zaokrąglenie do liczby całkowitej tylko w `formatPercent`.
- [ ] **Step 4: Run** ten sam test. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/world/stats.ts src/lib/world/stats.test.ts && git commit -m "Count visited countries per world and continent"`.

### Task 3: Stan odwiedzonych krajów i zapis

**Files:**
- Create: `src/lib/world/storage.ts`
- Test: `src/lib/world/storage.test.ts`

**Interfaces:**
- Consumes: `COUNTRIES` (Task 1).
- Produces: `const VISITED_KEY = "visited_countries"`; `type KeyValueStorage = Pick<Storage, "getItem" | "setItem">`; `function loadVisited(storage?: KeyValueStorage | null): string[]` (poprawne, unikalne kody z listy; w razie błędu `[]`); `function saveVisited(codes: readonly string[], storage?: KeyValueStorage | null): boolean` (`false`, gdy zapis się nie udał); `function toggleVisited(codes: readonly string[], iso: string): string[]` (dodaje albo usuwa kod; kod spoza listy zwraca bez zmian).

- [ ] **Step 1: Write the failing test** `storage.test.ts` z prostym fałszywym magazynem: poprawna lista wraca bez zmian i bez duplikatów; `"nie json"`, `"42"`, `"{\"a\":1}"`, `null` dają `[]`; lista z `["PL", "XX", 5, null]` daje `["PL"]` (Review Focus 1); `getItem` rzucające wyjątek daje `[]`; `saveVisited` z magazynem, którego `setItem` rzuca, zwraca `false`; `toggleVisited(["PL"], "DE")` daje `["PL", "DE"]`, `toggleVisited(["PL", "DE"], "PL")` daje `["DE"]`, `toggleVisited(["PL"], "GL")` daje `["PL"]` (Review Focus 4).
- [ ] **Step 2: Run** `npx vitest run src/lib/world/storage.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** w `storage.ts`; domyślny magazyn to `window.localStorage`, jeśli dostępny, a każdy dostęp w `try/catch`.
- [ ] **Step 4: Run** ten sam test. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/world/storage.ts src/lib/world/storage.test.ts && git commit -m "Persist visited countries in the browser"`.

### Task 4: Wyszukiwanie krajów po polsku

**Files:**
- Create: `src/lib/world/search.ts`
- Test: `src/lib/world/search.test.ts`

**Interfaces:**
- Consumes: `COUNTRIES`, `countryName`, `Continent` (Task 1).
- Produces: `function normalize(text: string): string` (małe litery, bez znaków diakrytycznych, bez spacji z brzegów); `function filterCountries(query: string, locale?: string): Country[]` (kraje, których polska nazwa zawiera zapytanie po normalizacji; puste zapytanie zwraca wszystkie, w kolejności alfabetycznej po nazwie).

- [ ] **Step 1: Write the failing test** `search.test.ts`: `normalize("  WŁOCHY ")` daje `"wlochy"`; `filterCountries("wlochy")` i `filterCountries("  WŁOCHY ")` zawierają `IT` (Review Focus 2); `filterCountries("pol")` zawiera `PL`; zapytanie bez wyników daje `[]`; puste zapytanie zwraca 195 krajów posortowanych według `countryName`.
- [ ] **Step 2: Run** `npx vitest run src/lib/world/search.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** w `search.ts`; normalizacja przez `String.prototype.normalize("NFD")` i usunięcie znaków diakrytycznych, osobna obsługa `ł` (nie rozkłada się w NFD).
- [ ] **Step 4: Run** ten sam test. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/world/search.ts src/lib/world/search.test.ts && git commit -m "Search countries by Polish name ignoring diacritics"`.

### Task 5: Granice krajów (GeoJSON)

**Files:**
- Create: `scripts/build-world-geojson.mjs`, `public/world/countries.geojson`
- Modify: `package.json` (devDependencies: `world-atlas`, `topojson-client`, `i18n-iso-countries`; skrypt `world:build`)
- Test: `src/lib/world/geojson.test.ts`

**Interfaces:**
- Consumes: `COUNTRIES` (Task 1).
- Produces: plik `public/world/countries.geojson` z `FeatureCollection`; każda cecha ma `properties: { iso: string | null; sovereign: boolean }`, gdzie `sovereign` jest `true` tylko dla kodów z `COUNTRIES`. Kraje bez kształtu w danych 110 m (np. Watykan) są dostępne tylko z listy.

- [ ] **Step 1: Write the failing test** `geojson.test.ts`: plik istnieje i jest poprawnym JSON-em; każda cecha ma `properties.sovereign` typu boolean; każda cecha z `sovereign: true` ma `iso` z `COUNTRIES`; liczba cech z `sovereign: true` wynosi co najmniej 170; kody z `COUNTRIES` bez kształtu to podzbiór listy `NO_SHAPE_EXPECTED` zapisanej w teście (Watykan, Monako, San Marino, Liechtenstein, Andora, Malta i inne państwa mniejsze niż granica rozdzielczości, uzupełnij na podstawie wyniku skryptu).
- [ ] **Step 2: Run** `npx vitest run src/lib/world/geojson.test.ts`. Expected: FAIL (brak pliku).
- [ ] **Step 3: Implement** `scripts/build-world-geojson.mjs`: wczytuje `world-atlas/countries-110m.json`, zamienia przez `topojson-client` na GeoJSON, mapuje numeryczne kody ISO na alfa-2 przez `i18n-iso-countries`, ustawia `sovereign` według `COUNTRIES` (lista kodów odczytana z `countries.ts` przez prosty parser albo zduplikowana z komentarzem pilnującym zgodności) i zapisuje plik. Uruchomić raz: `npm run world:build`.
- [ ] **Step 4: Run** `npx vitest run src/lib/world/geojson.test.ts`. Expected: PASS; sprawdzić rozmiar pliku (`ls -l public/world/countries.geojson`), oczekiwane poniżej 400 kB.
- [ ] **Step 5: Commit** `git add scripts/build-world-geojson.mjs public/world/countries.geojson package.json package-lock.json src/lib/world/geojson.test.ts && git commit -m "Add simplified country borders for the globe"`.

### Task 6: Obrazek do udostępnienia

**Files:**
- Create: `src/lib/world/shareCard.ts`
- Test: `src/lib/world/shareCard.test.ts`

**Interfaces:**
- Consumes: `Stats`, `formatPercent` (Task 2), `CONTINENT_LABELS` (Task 1).
- Produces: `const SHARE_CARD_SIZE = { width: 1080, height: 1920 }`; `interface ShareCardLines { brand: string; headline: string; subline: string; bars: { label: string; fraction: number; text: string }[]; footer: string }`; `function shareCardLines(stats: Stats): ShareCardLines`; `function drawShareCard(ctx: CanvasRenderingContext2D, lines: ShareCardLines, globe: CanvasImageSource | null): void` (rysuje według rozmiaru z `SHARE_CARD_SIZE`); `function chooseShareMethod(nav: { canShare?: (data: { files: File[] }) => boolean; share?: unknown }, file: File): "native" | "download"`; `function shareMap(canvas: HTMLCanvasElement, nav?: Navigator): Promise<"native" | "download" | "cancelled">`.

- [ ] **Step 1: Write the failing test** `shareCard.test.ts`: dla 41 odwiedzonych krajów `headline` to `"21% świata"`, `subline` to `"41 z 195 krajów"`, `brand` to `"Włóczykij"`, `footer` to `"wloczykij.me/swiat"`, `bars` ma sześć pozycji z `fraction` w zakresie 0–1; dla zera krajów `headline` to `"0% świata"`. `chooseShareMethod`: obiekt z `canShare` zwracającym `true` daje `"native"`; bez `canShare`, z `canShare` zwracającym `false` albo bez `share` daje `"download"` (Review Focus 5).
- [ ] **Step 2: Run** `npx vitest run src/lib/world/shareCard.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** w `shareCard.ts`: czyste funkcje tekstowe i wyboru metody, rysowanie na kontekście 2D (kolory ze stałych zgodnych z `globals.css`, bo na canvasie nie ma zmiennych CSS), a `shareMap` robi blob, próbuje `navigator.share({ files })` i przy odmowie albo błędzie (poza anulowaniem przez użytkownika) pobiera plik `moja-mapa-swiata.png` przez link z atrybutem `download`.
- [ ] **Step 4: Run** ten sam test. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/world/shareCard.ts src/lib/world/shareCard.test.ts && git commit -m "Compose the share image and pick how to share it"`.

### Task 7: Komponent globusu

**Files:**
- Create: `src/app/swiat/WorldGlobe.tsx`
- Modify: `package.json` (dependencies: `react-globe.gl`)

**Interfaces:**
- Consumes: `countryName`, `COUNTRIES` (Task 1); `/world/countries.geojson` (Task 5).
- Produces: `default function WorldGlobe(props: { visited: ReadonlySet<string>; onToggle: (iso: string) => void; onSnapshot: (capture: () => HTMLCanvasElement | null) => void; onError: () => void })` (komponent klienta; zgłasza `onError`, gdy nie ma WebGL albo nie wczyta się GeoJSON).

- [ ] **Step 1: Read** dokumentację Next 16 o `next/dynamic` i komponentach klienta (`node_modules/next/dist/docs/01-app/`), potem `npm install react-globe.gl` i sprawdzić, że `npm run typecheck` przechodzi.
- [ ] **Step 2: Implement** `WorldGlobe.tsx`: warstwa wielokątów z GeoJSON; kolor odwiedzonego kraju z `--accent`, pozostałych państw neutralny, terytoriów (`sovereign: false`) neutralny i bez reakcji na klik; podpowiedź z `countryName` albo „terytorium zależne”; klik wywołuje `onToggle(iso)` tylko dla państw; automatyczny obrót wyłączony przy `prefers-reduced-motion`; renderer z `preserveDrawingBuffer`, a `onSnapshot` przekazuje funkcję zwracającą canvas renderera; kolory odczytane przez `getComputedStyle` dla `--accent` i tła strony; opis tekstowy dla czytników ekranu.
- [ ] **Step 3: Verify** w podglądzie (nowa konfiguracja w `.claude/launch.json` na porcie 3111, nie do commita): `/swiat` pokazuje obracający się globus, klik w Polskę zapala ją, najechanie pokazuje nazwę. Zrzut ekranu jako dowód.
- [ ] **Step 4: Commit** `git add src/app/swiat/WorldGlobe.tsx package.json package-lock.json && git commit -m "Add the 3D globe component"`.

### Task 8: Strona, lista, panel i udostępnianie

**Files:**
- Create: `src/app/swiat/page.tsx`, `src/app/swiat/WorldClient.tsx`, `src/lib/world/dealsLink.ts`
- Test: `src/lib/world/dealsLink.test.ts`

**Interfaces:**
- Consumes: wszystkie moduły z Tasków 1–7, `trackEvent` z `src/lib/analytics.ts`, `SiteNav`, `SiteFooter`, `originFromSlug` z `src/lib/drop/read.ts`.
- Produces: `function dealsLinkFor(origin: string | null | undefined): string` (poprawny kod polskiego lotniska daje `/okazje/<małe litery>?utm_source=swiat&utm_medium=web&utm_campaign=world`, a pusty albo niepoprawny `/okazje/wro` z tymi samymi UTM); strona `/swiat`.

- [ ] **Step 1: Write the failing test** `dealsLink.test.ts`: `dealsLinkFor("KRK")` i `dealsLinkFor("krk")` dają `/okazje/krk?utm_source=swiat&utm_medium=web&utm_campaign=world`; `null`, `""`, `"BER"` i `"xyz"` dają `/okazje/wro?...` z tymi samymi UTM.
- [ ] **Step 2: Run** `npx vitest run src/lib/world/dealsLink.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `dealsLinkFor`, potem `page.tsx` (komponent serwerowy z `generateMetadata`: tytuł „Mapa świata: gdzie już byłeś”, opis, `canonical` na `https://wloczykij.me/swiat`) i `WorldClient.tsx`: stan z `loadVisited`, zapis przez `saveVisited` przy każdej zmianie, `toggleVisited`, panel z `countryStats` (duża liczba świata, „X z 195 krajów”, sześć pasków kontynentów), lista z polem wyszukiwania i grupami po kontynentach (`filterCountries`, pola wyboru, obsługa klawiaturą), przycisk „Udostępnij” (rysuje kartę na canvasie przez `drawShareCard`, wywołuje `shareMap`, zdarzenie `world_share`), zdarzenie przy pierwszej akcji z liczbą zaznaczonych krajów, link do okazji przez `dealsLinkFor(localStorage "deals_origin")`, globus ładowany przez `next/dynamic` z `ssr: false`; zapytanie `?bez3d=1`, brak WebGL, błąd `onError` albo zablokowany zapis przełączają stronę na tryb samej listy z krótkim komunikatem.
- [ ] **Step 4: Run** `npx vitest run src/lib/world/dealsLink.test.ts`. Expected: PASS.
- [ ] **Step 5: Verify** w podglądzie: zaznaczenie krajów z listy i z globusa zmienia liczby i kolory; odświeżenie strony zachowuje zaznaczenie; `?bez3d=1` pokazuje tylko listę i panel; szerokość telefonu (375 px) jest czytelna; przycisk udostępniania pobiera obrazek 1080×1920 z poprawnymi liczbami. Zrzuty ekranu jako dowód.
- [ ] **Step 6: Commit** `git add src/app/swiat src/lib/world/dealsLink.ts src/lib/world/dealsLink.test.ts && git commit -m "Add the /swiat page with stats, country list and share"`.

### Task 9: Sprawdzenie całości i PR

**Files:** brak nowych plików.

- [ ] **Step 1: Run** `npm run typecheck`, `npm run lint` i `npm test`. Expected: typy czyste, 0 błędów lintu, wszystkie testy zielone.
- [ ] **Step 2: Measure** rozmiar paczki: `npm run build` z atrapami zmiennych środowiskowych jak w podglądzie, potem `gzip -c` na plikach w `.next/static/chunks` zawierających `three` i `globe.gl`; zapisać liczbę do opisu PR. Dodatkowo sprawdzić, że strona główna i `/pricing` nie pobierają tych plików (karta Network w podglądzie).
- [ ] **Step 3: Push** gałąź i przygotować opis PR: co dodaje, zrzuty z podglądu, rozmiar paczki, ograniczenia (bez kont, terytoria zależne, małe państwa tylko z listy).
- [ ] **Step 4: Report** użytkownikowi, że PR czeka na jego merge. Po wdrożeniu sprawdzić `https://wloczykij.me/swiat` (status 200, tytuł) i zaznaczyć kraj na produkcji.
