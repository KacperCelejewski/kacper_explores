# Grupa w quizie, lotach i kosztach — plan wdrożenia (część 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gdy ktoś zaznacza w quizie znajomych albo rodzinę, loty, linki, plan i budżet liczą się pod całą grupę (na osobę i razem), a solo i para działają jak dziś.

**Architecture:** Nowy moduł `src/lib/group.ts` z czystymi funkcjami (skład grupy, pasażerowie, skalowanie kwot) jest jedynym źródłem prawdy o grupie. Quiz zapisuje `quizAnswers.group`, a loty, linki, prompt Gemini i interfejs planu czytają go przez ten moduł. Brak `group` w starych zapisach znaczy solo albo para według `companion`.

**Tech Stack:** Next.js 16 App Router (przed pisaniem kodu przeczytaj `node_modules/next/dist/docs/`, według CLAUDE.md to nie jest znany Next), React 19, Zustand, Sky Scrapper (RapidAPI), Supabase `flight_cache`, vitest.

**Spec:** `docs/superpowers/specs/2026-11-14-wyjazd-ze-znajomymi-design.md`, część 1 (sekcje 1.1–1.5). Spec pisana pod `origin/main`.

**Odstępstwo od spec (sprawdzone w kodzie `origin/main`, do potwierdzenia przez Kacpra):** spec 1.2 zakłada ceny celów z Travelpayouts na kartach `/destinations`. Na `main` karty celów nie pokazują żadnej ceny lotu: cele wybiera Gemini (`src/app/api/destinations/route.ts`), a cenę lotu widać dopiero w `FlightCard` na planie (`offer.price`). Dlatego zadanie 5 pokazuje „na osobę / razem” w `FlightCard`, a osobnej ceny na karcie celu nie dodajemy.

## Global Constraints

- Branch od `origin/main` (np. `feat/grupa-w-planie`), nigdy commity na `main`. Lokalna gałąź `homepage-critique-fixes` jest daleko za `main`.
- Pliki w `docs/superpowers/` nie są commitowane (spec i plany zostają lokalne).
- Bez odwołań do literatury w docstringach i komentarzach nowego kodu.
- Teksty w interfejsie po polsku, w głosie z `BRAND.md`: bez wykrzykników i emoji, bez „Niestety”. Kwoty w PLN, np. `159 zł`.
- Komentarze w kodzie po polsku, tak jak w sąsiednich plikach.
- Solo i para: żadnego nowego pola w quizie, wyniki identyczne jak dziś. Klucz `flight_cache` dla jednego dorosłego bez zmian: `sky-{origin}-{dest}-{departDate}-{returnDate}`.
- Dziecko poniżej 2 lat to niemowlę, od 2 do 11 lat dziecko, od 12 lat dorosły. Niemowlęta nie zajmują miejsca i nie liczą się do sum.
- `npm test`, `npm run typecheck` i `npm run lint` muszą przechodzić po każdym zadaniu.

## Review Focus

- Stary zapis bez `group` (localStorage, `trips.quiz_answers`) czyta się jak solo albo parę i nic się nie psuje.
- `group` z poza zakresu w `/api/destinations` i `/api/generate` (0 dorosłych, ponad `MAX_GROUP`, wiek ujemny albo ułamkowy, nie tablica) daje `400`, a nie błąd w Sky Scrapperze.
- Samotny rodzic: 1 dorosły z dziećmi jest dozwolony. Grupa z samymi niemowlętami i jednym dorosłym szuka lotu dla 1 miejsca.
- Gdy `canCallApi()` odmawia, plan i karta działają bez porównania z jedną osobą.
- Tekst budżetu bez cyfr („Free”, pusty) nie psuje „razem”.
- Zmiana składu grupy po wyborze celu nie podaje starej ceny jako aktualnej.

---

### Task 0: Gałąź i punkt wyjścia

**Files:** brak zmian w kodzie

- [ ] **Step 1:** W katalogu `kacper-explores` wykonaj `git fetch origin && git switch -c feat/grupa-w-planie origin/main`. Jeśli są niezacommitowane zmiany na obecnej gałęzi, nie ruszaj ich, tylko utwórz worktree: `git worktree add ../kacper-explores-grupa -b feat/grupa-w-planie origin/main` i pracuj tam.
- [ ] **Step 2:** `npm ci && npm test && npm run typecheck`. Oczekiwane: wszystko przechodzi na czystym `main`.

### Task 1: Moduł `group.ts`

**Files:**
- Create: `src/lib/group.ts`
- Test: `src/lib/group.test.ts`
- Modify: `src/types/index.ts` (dodaj `GroupComposition`, pole `group?: GroupComposition` w `QuizAnswers`)

**Interfaces:**
- Produces:
  - `interface GroupComposition { adults: number; childrenAges: number[] }`
  - `interface FlightPassengers { adults: number; children: number; infants: number }`
  - `const MAX_GROUP = 9` (liczba miejsc; decyzja Claude'a, bo to typowy limit pojedynczej rezerwacji; zadanie 4 potwierdza z dokumentacją Sky Scrappera)
  - `groupFromCompanion(companion: Companion | null, group?: GroupComposition): GroupComposition`
  - `groupSize(group: GroupComposition): number` (miejsca w samolocie)
  - `toFlightPassengers(group: GroupComposition): FlightPassengers`
  - `isValidGroup(value: unknown): value is GroupComposition`
  - `scaleBudgetText(text: string, factor: number): string | null` (mnoży liczby w tekście typu `"1200-1500 PLN"` i zwraca `"3 600–4 500 PLN"` albo `null` bez cyfr)
  - `groupLabel(group: GroupComposition): string` („4 osoby”, „2 dorosłych, dzieci: 4 i 7 lat”)

- [ ] **Step 1: Napisz testy.** `groupFromCompanion`: `("solo")` daje `{adults:1,childrenAges:[]}`, `("couple")` daje 2, `("friends")` bez `group` daje 4, `("family")` bez `group` daje 2 dorosłych, `(null)` daje solo, a przekazane `group` wygrywa. `toFlightPassengers({adults:2,childrenAges:[1,2,11,12]})` daje `{adults:3,children:2,infants:1}` (granice 1, 2, 11, 12). `groupSize` z tego samego wejścia daje 5. `isValidGroup`: odrzuca `adults:0`, `adults:10`, wiek `-1`, `18`, `4.5`, `childrenAges` nie będące tablicą i `null`; przyjmuje `{adults:1,childrenAges:[3]}` i `{adults:9,childrenAges:[]}`, a odrzuca `{adults:9,childrenAges:[5]}` (razem ponad `MAX_GROUP`). `scaleBudgetText("1200-1500 PLN", 4)` daje `"4 800–6 000 PLN"`, `("~300 PLN", 2)` daje `"600 PLN"`, `("Free", 4)` i `("", 4)` dają `null`.
- [ ] **Step 2:** `npx vitest run src/lib/group.test.ts`. Oczekiwane: FAIL (moduł nie istnieje).
- [ ] **Step 3:** Zaimplementuj funkcje powyżej w `src/lib/group.ts`. Spacja tysięcy w `scaleBudgetText` to zwykła spacja, tak jak w `BudgetTracker`; myślnik zamieniany na półpauzę.
- [ ] **Step 4:** Ten sam test, oczekiwane PASS, potem `npm run typecheck`.
- [ ] **Step 5:** `git add src/lib/group.ts src/lib/group.test.ts src/types/index.ts && git commit -m "feat(group): add group composition helpers"`

### Task 2: Walidacja, store, podsumowanie quizu

**Files:**
- Modify: `src/lib/validate.ts:10-37` (`validateQuizAnswers` przyjmuje `group` przez `isValidGroup`)
- Modify: `src/lib/store.ts` (`defaultQuizAnswers.group` zostaje nieustawione; podnieś `version` do 4 i dodaj gałąź `migrate` dla `version < 4`, która nic nie zmienia, ale zostawia stary zapis czytelny)
- Modify: `src/lib/quizSummary.ts` (dopisz `groupLabel` zamiast samego „Znajomi”/„Rodzina”, gdy `group` jest ustawione)
- Test: `src/lib/validate.test.ts` (utwórz, jeśli nie ma), `src/lib/quizSummary.test.ts` (utwórz, jeśli nie ma)

**Interfaces:** Consumes `isValidGroup`, `groupLabel` z zadania 1.

- [ ] **Step 1: Testy.** `validateQuizAnswers({group:{adults:0,childrenAges:[]}})` jest `false`; `({group:{adults:4,childrenAges:[]}})` jest `true`; brak `group` nadal `true`. `quizSummary({companion:"friends",group:{adults:4,childrenAges:[]},...})` zawiera `"4 osoby"`; bez `group` zostaje `"Znajomi"`.
- [ ] **Step 2:** `npx vitest run src/lib/validate.test.ts src/lib/quizSummary.test.ts`, oczekiwane FAIL.
- [ ] **Step 3:** Implementacja jak wyżej.
- [ ] **Step 4:** Oczekiwane PASS, `npm run typecheck`.
- [ ] **Step 5:** Commit `feat(group): validate and summarise group size`.

### Task 3: Quiz i szybka ścieżka

**Files:**
- Modify: `src/app/quiz/page.tsx` (`StepCompanion`, ok. linia 566, wywołanie `setQuizAnswer` ok. linii 433)
- Modify: `src/app/quick/page.tsx` (`StepCompanion`, ok. linia 659, stan `companion` ok. linii 238 i budowa odpowiedzi ok. linii 308)
- Create: `src/app/components/GroupSizePicker.tsx` (wspólny komponent dla obu ścieżek, żeby nie duplikować)

**Interfaces:**
- Produces: `GroupSizePicker({ companion, group, onChange }: { companion: Companion | null; group: GroupComposition | undefined; onChange: (g: GroupComposition) => void })`. Dla „Znajomi” renderuje licznik osób 3–`MAX_GROUP` (domyślnie 4). Dla „Rodzina” liczniki dorosłych (1–`MAX_GROUP`, domyślnie 2) i dzieci, a przy każdym dziecku wybór wieku 0–17. Dla „Sam/a” i „Para” zwraca `null`.

- [ ] **Step 1:** Zbuduj `GroupSizePicker` w stylu istniejących `OptionCard` i klas `option-card` (przyciski + i − z `aria-label`, tap area co najmniej 44 px, bez emoji). Łączna liczba miejsc (dorośli + dzieci od 2 lat) nie przekracza `MAX_GROUP`; przy limicie przycisk + jest `disabled` z `aria-describedby` do podpowiedzi „Do 9 osób w jednej rezerwacji”.
- [ ] **Step 2:** Pod `StepCompanion` w quizie pokaż picker dla wybranego „Znajomi”/„Rodzina”. Zmiana pickera woła `setQuizAnswer("group", g)`; zmiana `companion` na solo albo parę woła `setQuizAnswer("group", undefined)`. Krok „Kto jedzie?” dziś przechodzi dalej po jednym kliknięciu (`pick(0, …)` w `quiz/page.tsx`): dla „Znajomi” i „Rodzina” zamień to na przycisk „Dalej” pod pickerem, żeby nie przeskakiwać przed ustawieniem liczby osób.
- [ ] **Step 3:** To samo w `quick/page.tsx` (stan lokalny `group`, wpis do odpowiedzi przy budowie `quizAnswers`).
- [ ] **Step 4:** `npm run dev`, w przeglądarce przejdź quiz dla czterech wyborów. Sprawdź: solo i para bez pola, znajomi z licznikiem, rodzina z wiekiem dzieci, zapis w `localStorage` pod `quizAnswers.group`. Zrób zrzut ekranu quizu na telefonie (375 px).
- [ ] **Step 5:** `npm run typecheck && npm run lint`, commit `feat(group): ask how many people travel in the quiz`.

### Task 4: Loty dla całej grupy

**Files:**
- Modify: `src/lib/flights/rapidapi.ts` (`fetchForDate` ok. linii 195, `searchFlightOptions` ok. 286, `searchCheapestFlight` ok. 352; typ `RealFlight` na górze)
- Modify: `src/app/api/real-flights/route.ts` (parametry `adults`, `children`, `infants`)
- Modify: `src/types/index.ts` (`FlightOffer`: `passengers?: FlightPassengers`, `totalPrice?: number`)
- Test: `src/lib/flights/rapidapi.test.ts` (utwórz; testuje tylko czyste funkcje wyciągnięte do `buildFlightCacheKey` i `buildSearchParams`)

**Interfaces:**
- Consumes: `FlightPassengers`, `MAX_GROUP` z zadania 1.
- Produces: `buildFlightCacheKey(origin: string, dest: string, departDate: string, returnDate: string, p: FlightPassengers): string`; `searchFlightOptions(origin, dest, month, duration, maxResults = 3, passengers?: FlightPassengers)`; `RealFlight.passengers`; `RealFlight.totalPrice`.

- [ ] **Step 1: Sprawdź dokumentację Sky Scrappera** (RapidAPI, endpoint `searchFlights`): nazwy parametrów dla dzieci i niemowląt (spec zakłada `adults`, `childrens`, `infants`), czy `price.raw` w odpowiedzi jest ceną za osobę czy za całą rezerwację, maksymalną liczbę pasażerów, czy segmenty niosą numer lotu (potrzebne w części 4). Zapisz wnioski jako komentarz nad `fetchForDate` (jedno zdanie na punkt) i, jeśli limit pasażerów jest inny niż 9, popraw `MAX_GROUP` w `group.ts`. Gdy dokumentacja jest niedostępna, zrób jedno zapytanie testowe z 2 dorosłymi i porównaj cenę z zapytaniem dla 1 dorosłego.
- [ ] **Step 2: Testy.** `buildFlightCacheKey("WRO","BCN","2026-02-20","2026-02-22",{adults:1,children:0,infants:0})` jest równe `"sky-WRO-BCN-2026-02-20-2026-02-22"` (bez zmiany). Dla `{adults:4,children:0,infants:0}` jest `"sky-WRO-BCN-2026-02-20-2026-02-22-a4c0i0"`. `buildSearchParams` dla `{adults:2,children:1,infants:1}` ustawia liczby zgodnie z nazwami z kroku 1.
- [ ] **Step 3:** Oczekiwane FAIL, potem zaimplementuj. `price` w `RealFlight` zostaje ceną **za osobę** (jeśli API zwraca cenę za rezerwację, podziel przez liczbę płacących pasażerów: dorośli plus dzieci plus niemowlęta, jeśli API je wlicza; zapisz to w komentarzu), a `totalPrice` to cena razem.
- [ ] **Step 4:** `real-flights` czyta `adults`, `children`, `infants` z query, domyślnie `1/0/0`, i zwraca `400` przy wartościach spoza zakresu lub gdy suma miejsc przekracza `MAX_GROUP`. Dodaj test tej walidacji jako czystą funkcję `parsePassengers(searchParams): FlightPassengers | null`.
- [ ] **Step 5:** Wszystkie miejsca, które woła `/api/real-flights` (`grep -rn "real-flights" src`) przekazują skład z `quizAnswers.group`. `FlightOffer.passengers` ustawiane tam, gdzie powstaje `bestOffer`.
- [ ] **Step 6:** `npm test && npm run typecheck`, commit `feat(group): search flights for the whole group`.

### Task 5: Cena na osobę i razem, porównanie z jedną osobą

**Files:**
- Modify: `src/app/components/PartnerLinks.tsx:60-91` (`FlightCard`)
- Create: `src/lib/flights/soloComparison.ts`
- Test: `src/lib/flights/soloComparison.test.ts`
- Modify: `src/app/api/real-flights/route.ts` (opcjonalny parametr `compare=1`)

**Interfaces:**
- Produces: `soloComparisonNote(groupPerPerson: number, soloPerPerson: number | null, groupSeats: number): string | null`. Zwraca `"Jedna osoba poleci za {solo} zł, ale w tej cenie nie ma już {groupSeats} miejsc."` tylko gdy `groupSeats > 1` i `soloPerPerson` jest niższe od `groupPerPerson` o co najmniej 5 zł; inaczej `null`.

- [ ] **Step 1: Testy.** Różnica 5 zł daje tekst, różnica 4 zł `null`; `groupSeats` równe 1 daje `null`; `soloPerPerson` równe `null` daje `null`; w tekście liczby są całkowite bez groszy.
- [ ] **Step 2:** FAIL, implementacja, PASS.
- [ ] **Step 3:** `FlightCard` pokazuje przy grupie większej niż 1 `{price} zł za osobę · {totalPrice} zł razem · {n} osoby` oraz, jeśli jest, linijkę z `soloComparisonNote`. Dla jednej osoby wygląda dokładnie jak dziś. Zachowaj dopisek „cena z ostatnich wyszukiwań, może się zmienić”.
- [ ] **Step 4:** Drugie zapytanie (1 dorosły, te same daty) idzie tylko dla najlepszej oferty, tylko przy `groupSeats > 1` i tylko gdy `canCallApi()` pozwala (funkcja jest w `rapidapi.ts`); w innym razie porównanie jest pomijane bez błędu. Wynik trafia do `FlightOffer` jako opcjonalne `soloPrice`.
- [ ] **Step 5:** `npm test && npm run typecheck`, commit `feat(group): show per person and total flight price`.

### Task 6: Linki dla grupy

**Files:**
- Modify: `src/lib/flights/search-url.ts` (`buildSkyscannerUrl`, `buildAviasalesUrl`)
- Modify: `src/lib/affiliate.ts:43-58` (`bookingLink`, `hostelworldLink`)
- Modify: `src/app/components/PartnerLinks.tsx:17-40` (`HotelLinks` dostaje `group`)
- Modify: `src/app/destinations/page.tsx:41` (lokalny `buildSkyscannerUrl` używa wspólnej funkcji z `search-url.ts`, jeśli to nie psuje zachowania; inaczej tylko zostaw)
- Test: `src/lib/flights/search-url.test.ts`, `src/lib/affiliate.test.ts` (dopisz przypadki)

**Interfaces:** Consumes `GroupComposition`, `toFlightPassengers`. `bookingLink` dostaje opcjonalne `group?: GroupComposition` w obiekcie wejściowym; `buildSkyscannerUrl(origin, dest, depart?, return?, passengers?: FlightPassengers)`; `buildAviasalesUrl(..., marker, passengers?)`.

- [ ] **Step 1: Testy.** Skyscanner dla `{adults:2,children:1,infants:0}` ma `adultsv2=2&childrenv2=...` w formacie, który potwierdza dokumentacja Skyscannera (sprawdź przed pisaniem testu; jeśli format wieku nie jest znany, test pilnuje tylko `adultsv2` i `childrenv2` jako liczby). Booking dla grupy ma `group_adults`, `group_children`, `age` dla każdego dziecka i `no_rooms=1`. Aviasales: ostatnia cyfra ścieżki to liczba dorosłych, a dla dzieci i niemowląt sprawdź format wyszukiwarki Aviasales; jeśli się nie da, ścieżka podaje tylko dorosłych (decyzja ze spec). Dla `adults:1` wszystkie URL-e są identyczne jak dziś. W żadnym adresie nie ma imion ani e-maila.
- [ ] **Step 2:** FAIL, implementacja, PASS.
- [ ] **Step 3:** Jeśli Aviasales nie przyjmuje dzieci w ścieżce, `FlightCard` pokazuje pod ceną „Dzieci dodasz na stronie wyszukiwarki”.
- [ ] **Step 4:** `npm test && npm run typecheck`, commit `feat(group): pass group size to flight and hotel links`.

### Task 7: Plan: prompt, nagłówek budżetu, tracker

**Files:**
- Modify: `src/lib/gemini.ts` (`buildPlanPrompt`, sekcje `companionLabel` i `companionGuide`, linie 21–35 oraz blok `PROFIL PODRÓŻNIKA`)
- Modify: `src/app/plan/[tripId]/page.tsx` (nagłówek budżetu ok. linii 437, `BudgetTracker` ok. 692)
- Modify: `src/app/components/BudgetTracker.tsx` (`plannedTotal` dla całej grupy)
- Test: `src/lib/gemini.test.ts` (dopisz przypadki)

**Interfaces:** Consumes `groupLabel`, `groupSize`, `scaleBudgetText`, `groupFromCompanion`.

- [ ] **Step 1: Testy** w `gemini.test.ts` dla `buildPlanPrompt`: przy `group:{adults:4,childrenAges:[]}` prompt zawiera `"4 osoby"` (lub wynik `groupLabel`), słowa „za osobę” przy kosztach i „taksówka” albo „apartament” w wytycznych dla grupy; dla rodziny z `childrenAges:[4,7]` zawiera „4 i 7 lat” i „bilety rodzinne”; dla solo prompt jest identyczny jak przed zmianą (test snapshotu zdania `Kto podróżuje: solo (samotny podróżnik)`); w żadnym wariancie nie ma imion.
- [ ] **Step 2:** FAIL, potem zmień prompt: dopisz skład do `PROFIL PODRÓŻNIKA`, w zasadzie 5 zapisz, że wszystkie koszty są **za osobę**, a nocleg to udział jednej osoby w realnej opcji dla tej grupy (np. apartament dla czterech podzielony na czterech). W `companionGuide` dla znajomych i rodziny dopisz wskazówki, gdzie liczba osób zmienia rachunek: taksówka z lotniska zamiast N biletów, apartament zamiast łóżek w hostelu, bilety rodzinne i grupowe, darmowe wejścia dla dzieci, rezerwacja stolika dla dużej grupy. Zakaz zmyślania cen i godzin zostaje.
- [ ] **Step 3:** Nagłówek budżetu na planie dla grupy większej niż 1 pokazuje `{totalBudgetEstimate}` jako „na osobę” i pod spodem `scaleBudgetText(totalBudgetEstimate, groupSize(group))` jako „razem”, z dopiskiem „szacunek”. Gdy `scaleBudgetText` zwraca `null`, nie pokazuj drugiej linii. Skład grupy bierz z `currentTrip?.quizAnswers ?? quizAnswers` przez `groupFromCompanion`.
- [ ] **Step 4:** `BudgetTracker` dostaje `plannedTotal` już przeliczone dla grupy (oraz `plannedBreakdown` skalowane tą samą funkcją), a `localStorage` zostaje bez zmian.
- [ ] **Step 5:** `npm test && npm run typecheck`, uruchom dev server i wygeneruj plan dla czterech znajomych oraz dla solo; sprawdź nagłówek, kartę lotu i tracker na szerokości 375 px.
- [ ] **Step 6:** Commit `feat(group): plan prompt and budget for the whole group`.

### Task 8: Pomiar i weryfikacja końcowa

**Files:**
- Modify: `src/lib/analytics.ts` lub miejsce wysyłania `plan_generated` (grep `plan_generated`)

- [ ] **Step 1:** Zdarzenie `plan_generated` dostaje parametr `group_size` (`groupSize(group)`). Dopisz test tam, gdzie testowane są parametry zdarzeń (`src/lib/analytics.test.ts`).
- [ ] **Step 2:** `npm test && npm run typecheck && npm run lint && npm run build`. Oczekiwane: wszystko zielone.
- [ ] **Step 3:** Ręcznie: stary zapis (ustaw w `localStorage` `quizAnswers` bez `group`) otwiera plan bez błędów; `curl` na `/api/destinations` i `/api/generate` z `group:{adults:0,childrenAges:[]}` zwraca `400`.
- [ ] **Step 4:** Commit `feat(group): track group size on plan generation`. Otwórz PR (Kacper decyduje, kiedy); po otwarciu użyj narzędzi `ccd_pr`.
