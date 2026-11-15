# Wspólne loty — opinia recenzenta

Data: 2026-11-15 · Recenzowany: `2026-11-15-loty.md` · Kod: `origin/main` `ac37e25` (czytany przez `git show origin/main:...`) · Spec: `2026-11-14-wyjazd-ze-znajomymi-design.md` (części 1, 2, 4, 6, bezpieczeństwo) i `2026-11-11-przepustka-na-wyjazd-design.md` · Briefy obok: termin, zaproszenia, plan, rozliczenia, strona główna.

Odwołania do briefu to numery linii pliku `2026-11-15-loty.md` (Lxx) i nazwy sekcji. Nie podważam decyzji Kacpra (jedno lotnisko, brak zakupu w aplikacji, dwa sposoby kupna, wydatek do rozliczeń, brak alertów, brak imion z dowodów i kodów rezerwacji, goście bez konta). Gdzie ich skutki są kosztowne, piszę to jako skutek.

## Co sprawdziłem i się zgadza

- L26–28: nic nie woła `/api/real-flights` (jedyne trafienia to sam plik trasy), nic nie ustawia `bestOffer` (`generate/route.ts:181` przepisuje `destination.bestOffer` z ciała żądania), `FlightCard` zwraca `null` bez `affiliateUrl` (`PartnerLinks.tsx:62–64`), `buildAviasalesUrl` jest wołany tylko w testach.
- L39: `FLIGHT_CACHE_TTL_MS = 12 h` (`constants.ts:29`) i używany jest w trzech miejscach: zapis L2 (`rapidapi.ts:249`), odczyt L2 wpisuje do pamięci na 12 h (`:393`), zapis L1 (`:401`). Odczyt cache w `fetchDatePair` (`:384–396`) nie ma żadnej flagi „pomiń”.
- L40: `candidateDates` bierze dni 10, 15, 20, 25 (`:83`), a `searchFlightForDates` (`:413`) to jedna para dat.
- L41: `canCallApi()` to zmienna modułu `dailyCallCount` (`:178`, `:187–199`). Dodatkowo alert e-mail odpala się tylko, gdy jedna instancja doliczy dokładnie 8 480 (`:195`), czyli praktycznie nigdy.
- L35 i L47: `SkyLeg.segments` ma tylko `marketingCarrier.name` (`:38–43`), `splitPrice` zakłada cenę całej rezerwacji (`:147–155`), TODO w kodzie jest.
- Cron: `flight_data->>departureDate` (`pre-trip-email/route.ts:87`), `.ics` bierze `bestOffer?.departureDate` (`plan/[tripId]/page.tsx:182`), noclegi też (`:473–474`).
- Drobna nieścisłość: `SKY_IDS` ma 65 lotnisk, nie 67 (67 to liczba linii ze słowem `skyId`, razem z interfejsem i komentarzem).

## Uwagi

### Krytyczne

**1. [Krytyczna] Karta, `.ics` i noclegi nie czytają `trips.flight_data`, więc „zapis w `flight_data` odblokowuje FlightCard” jest nieprawdą**
Miejsce: L25–29, L46 („zapisuje `FlightOffer` w `flight_data`. To odblokowuje `FlightCard`, `.ics`, mail i noclegi”), kryterium 2 (L212).
Problem: plan czyta `currentTrip.destination?.bestOffer` (`plan/[tripId]/page.tsx:182, 469, 473–474`), a `destination` to `trips.destination_data`. `GET /api/trips/[tripId]` wprawdzie wybiera `flight_data` (`:21`), ale w odpowiedzi go nie zwraca (`:31–38`). `/api/share/[tripId]` w ogóle nie wybiera `flight_data` (`:18`). Jedyny, kto czyta `flight_data`, to cron. Samo dopisanie oferty do `flight_data` nie zapali żadnej z czterech rzeczy z L29. Kryterium 2 („`flight_data` zawiera … `FlightCard` renderuje się”) przejdzie tylko dzięki dodatkowej zmianie, której brief nie opisuje. Są też dwa magazyny (`destination_data.bestOffer` od klienta i `flight_data`) i brief nie mówi, który wygrywa.
Poprawka: dopisać w 2.4 jawną decyzję: jedyne źródło to `trips.flight_data` (serwerowe). Trasy `GET /api/trips/[id]` i `/api/share/[id]` zwracają `flight` (dla share: okrojone, bez pól wewnętrznych), `plan/[tripId]/page.tsx` czyta `flight` zamiast `dest.bestOffer`, `destination_data.bestOffer` zostaje tylko jako odczyt dla starych zapisów (fallback, jeśli `flight_data` puste). Dodać kryterium: „`GET /api/trips/{id}` zwraca `flight`; plan renderuje kartę z `flight`, nie z `destination_data`”. Zapisywać ofertę nie do `destination_data`, bo to pole czyta publiczna galeria (`api/gallery/route.ts:16`) i `/share`.

**2. [Krytyczna] Krok 2 („aktywacja lotów w planie”) jest niewykonalny w opisanej postaci: brak dat i brak kodu IATA celu**
Miejsce: L46 („po wyborze celu i dat serwer szuka lotu”), L55–56 (3A), L40.
Problem: (a) Zwykły quiz zbiera miesiąc i długość, nie daty (potwierdza brief terminu, L31 i L212). `candidateDates` wybiera dni 10/15/20/25 miesiąca bez względu na dzień tygodnia, więc „daty planu” byłyby przypadkowym wtorkiem. Sprzeczne z briefem terminu (weekendy, czw/pt–nd), który ma te daty dopiero ustalać. (b) Cele pochodzą z Gemini (`api/destinations/route.ts:20–60`): pola to `city`, `country`, `tags` itd., bez kodu IATA. Mapa miasto → IATA istnieje tylko w `catalog.ts` (56 pozycji z `iataWro`/`iataBer`, używana dziś do SEO) i dla `preferredCity`. `searchFlightOptions` wymaga `SKY_IDS[destCode]`, więc dla każdego celu spoza mapy wynik to `unknown_code` i „brak ceny”. L57 wspomina tylko brak *lotniska wylotu* w `SKY_IDS`. (c) Gdy miesiąc już minął lub trwa, `candidateDates` przeskakuje na rok następny (`:85–87`), czyli oferta na 9–11 miesięcy do przodu, gdzie linie zwykle nie sprzedają jeszcze biletów.
Poprawka: dopisać do warunków wstępnych osobny punkt „mapowanie miasta z planu na IATA” (katalog + zapytanie do Travelpayouts `CityInfo.code`, z fallbackiem „brak ceny”) i zmierzyć pokrycie na 6 celach z kilku quizów. Dla ścieżki bez ankiety opisać reguły dat (te same co w briefie terminu: weekend, nie wcześniej niż za X dni) zamiast `candidateDates`, albo przyznać, że „Wybierzcie lot” oferuje daty 10/15/20/25 i uzasadnić, czemu to ma sens dla ekipy. Dodać do 2.3 pułapkę o rocznym przeskoku.

**3. [Krytyczna] Hamulce kosztu z L199 nie działają na Vercelu, a „blokada na wyjazd” opisana jako „porównanie `refreshing_at`” jest wyścigiem**
Miejsce: L70–73 (3E), L41, L199 (§8), kryteria 11–13.
Problem: (a) `canCallApi()` żyje w pamięci instancji i nie jest eksportowane (`rapidapi.ts:187`, brak `export`), więc trasa odświeżania nie może go „wołać” (L70), a każda zimna instancja liczy od zera. Brief słusznie to widzi (L41), ale proponuje tylko „oparte na bazie zamiast pamięci” w §8 i jako pytanie 4, bez umieszczenia tego w kolejności prac z 2.4. Bez licznika w bazie odświeżanie kart nie powinno wejść. (b) „Jedno odświeżanie naraz, np. porównanie `refreshing_at`” to odczyt i zapis w dwóch krokach. Czterech znajomych, którzy otwierają kartę w tej samej sekundzie na różnych instancjach, dostanie cztery wyszukiwania. Kryterium 13 („czterech równoczesnych otwarć daje jedno wyszukiwanie”) z mockiem w jednym procesie tego nie sprawdzi. (c) Brak wygasania blokady: funkcja, która padnie lub przekroczy czas po ustawieniu `refreshing_at`, zablokuje odświeżanie na zawsze. (d) Trasa odświeżania nie ma `maxDuration` (`real-flights/route.ts` też nie). Wyszukiwanie to 2 zapytania z 1 s przerwy plus porównanie, więc trzeba je ustawić (inne trasy z AI mają 30–60 s).
Poprawka: do 2.4 dodać krok „licznik zapytań w bazie” przed kartą grupową: tabela `api_call_counter(day date primary key, count int)` i funkcja SQL `consume_api_call(p_cap int) returns boolean` jednym `insert ... on conflict do update set count = count + 1 where count < p_cap returning`. Blokada: pojedynczy `update trips set flight_refresh_lock_until = now() + interval '60 seconds' where id = $1 and (flight_refresh_lock_until is null or flight_refresh_lock_until < now()) returning ...`; zero wierszy znaczy „ktoś już odświeża”, odpowiedź to zapisana oferta. Eksportować wynik z rozróżnieniem stanów (patrz uwaga 6). Kryterium 13 zastąpić testem na poziomie funkcji SQL/mockowanego klienta, który wykonuje cztery równoległe „claim” i oczekuje jednego zwycięzcy. Dodać `export const maxDuration = 30` w trasie.

**4. [Krytyczna] Wniosek kosztowy w §8 („setki zapytań”) jest policzony źle, a krok aktywacji „dla wszystkich” nie ma żadnego szacunku**
Miejsce: L199, L239 (pyt. 1), L46.
Problem: Sky Scrapper wg komentarza w kodzie (`:320`) „always needs two calls”, więc nieodświeżone wyszukiwanie to 2 zapytania, a nie „do 2”. Z blokadą 6 h jedna grupa odświeża najwyżej 4 razy na dobę: 4 × 2 = 8 zapytań na dobę, z porównaniem z jedną osobą 16. Tydzień to 56–112 („setki” to zawyżenie), ale brief nie ogranicza *początku* okna: grupa, która ma lot za 4 miesiące, odświeża co 6 h przez 120 dni, czyli 960–1920 zapytań na jeden wyjazd, i jedyne zatrzymanie to „wszyscy mają bilet” albo data wylotu (L72). Do tego krok 2 wlicza w każde generowanie planu każdego użytkownika (solo, para) `searchFlightOptions`: 3 daty × 2 zapytania = 6 zapytań na plan (+2 z porównaniem), a Pytanie 1 prosi o zgodę bez podania liczby. Wątek z `admin/page.tsx:3` („RapidAPI flight search removed — real-flight stats are legacy”) każe też sprawdzić, czy abonament w ogóle jest dziś aktywny i ile kosztuje; `DAILY_CAP = 10600` powtórzony w adminie to kopia stałej, nie dowód limitu planu.
Poprawka: dodać do §8 tabelkę kosztu: zapytania na plan (solo), na odświeżenie, na wyjazd w pełnym cyklu (przy oknie 14 dni i bez), oraz zapytania dziennie przy 100 / 1000 planów dziennie. Wprowadzić okno odświeżania (np. tylko w ciągu 21 dni przed wylotem i nie częściej niż co 6 h, a poza oknem zapisana cena z datą) i wpisać je do reguł 3E i kryteriów. Przy aktywacji dla wszystkich przyjąć jedno wyszukiwanie pary dat (nie trzy) albo wykonywać je dopiero po tym, jak użytkownik kliknie lot. Pytanie 4 zamienić na decyzję z liczbą: „ile zapytań dziennie, ile kosztuje plan RapidAPI, czy limit jest twardy czy z dopłatą”.

### Ważne

**5. [Ważna] Brak pamięci wyników „brak ceny”: karta bez ceny odpytuje Sky Scrappera przy każdym otwarciu, 2 zapytania naraz**
Miejsce: L179 (stan „brak ceny”), L70–71.
Problem: `fetchDatePair` zapisuje do cache tylko niepuste wyniki (`:400`), a `fetchForDate` przy pustej odpowiedzi robi drugie zapytanie (`:321–331`). Nie ma więc `checkedAt` ani żadnego śladu próby. Reguła „starsza niż 6 h → szukaj” zadziała przy każdym otwarciu karty przez każdego z czterech znajomych, dla tras i dat, na których Sky nie ma lotów (np. odległy termin, mała trasa), i nic tego nie zatrzyma poza limitem.
Poprawka: zapisywać `lastAttemptAt` i `lastResult` (`ok` / `empty` / `limit` / `error`) osobno od `checkedAt`; po `empty` nie próbować wcześniej niż po 24 h (dla `error` i `limit` po 1–2 h). Kryterium: „karta w stanie brak ceny nie robi zapytania częściej niż co 24 h”.

**6. [Ważna] Stany z §7 (limit, błąd HTTP, brak lotów) są dziś nieodróżnialne: kod zwraca w każdym `null`**
Miejsce: L179–181, kryterium 14, kryterium 18 (`flight_refresh` z wynikiem `limit`/`error`).
Problem: `fetchForDate` zwraca `null` dla odmowy `canCallApi` (`:309`), HTTP nie-ok (`:312–315`, `:325–328`) i pustych wyników (`:333`); `fetchDatePair` łapie wyjątki i też daje `null` (`:406–409`); `searchFlightForDates` daje `null` także bez klucza i dla nieznanego IATA (`:423`). Komunikaty „Teraz nie możemy sprawdzić nowej” i „Nie udało się sprawdzić ceny” oraz zdarzenie `flight_refresh` mają różne wartości, a kod nie ma jak ich rozdzielić. Brief tego nie wymienia w 2.3.
Poprawka: dodać do 2.4 pracę „wynik dyskryminowany”: `{ status: "ok", flights } | { status: "limit" } | { status: "error", httpStatus } | { status: "empty" } | { status: "unconfigured" }` zwracany z `fetchDatePair`/`searchFlightForDates` (stare sygnatury zostają jako cienkie opakowania, żeby `real-flights` i testy się nie rozjechały).

**7. [Ważna] `checkedAt` nie może być chwilą odświeżenia, jeśli dane przyszły z cache; brak parametru obejścia cache w 2.3 jest opisany, ale nie jego skutek**
Miejsce: L39, L45–47 (krok 3), L70.
Problem: gdy odświeżanie zadziała w oknie 6–12 h bez flagi „pomiń cache”, `fetchDatePair` zwróci wpis z L1/L2 sprzed np. 11 h, a karta zapisze `checkedAt = teraz` i powie „sprawdzone 2 h temu”. To nieprawda, widoczna dla użytkownika. `RealFlight` nie niesie czasu pobrania, a zapis L2 ustawia tylko `expires_at`.
Poprawka: doprecyzować w 2.3: parametr `{ bypassCache: true }` (omija L1 i odczyt L2, ale zapis L2 zostaje, żeby inne wyjazdy skorzystały), a `checkedAt` pochodzi z momentu zapytania do API (`new Date()` w gałęzi po `fetch`), nie z momentu żądania klienta. Dla wyniku z cache pole `source: "cache"` i `checkedAt` z `expires_at - TTL`. Kryterium: „po odświeżeniu z `bypassCache` `checkedAt` nie jest starszy niż 5 s, a odpowiedź z cache nie podnosi `checkedAt`”.

**8. [Ważna] Zaufanie do `flight_data` od klienta: `generate` zapisuje `destination.bestOffer` z ciała żądania**
Miejsce: L46, L204 (§8 „Dane w `trips.flight_data`”).
Problem: `validateDestination` sprawdza tylko `city` i `country` (`validate.ts:42–50`), a `generate/route.ts:181` zapisuje `destination.bestOffer` z żądania bez zmian, więc dziś każdy zalogowany może wpisać dowolną cenę, daty i `affiliateUrl` (`flightLink` akceptuje każdy adres z `aviasales.` w nazwie hosta i uznaje `marker` za płatny, `affiliate.ts:90–91`). Po wprowadzeniu karty grupowej ta oferta wypełnia domyślną kwotę wydatku i kartę, którą widzą znajomi. Brief mówi „serwer składa `affiliateUrl`”, ale nie mówi, że wartość z klienta ma przestać być przyjmowana.
Poprawka: w 2.4 krok 2 dopisać: „`generate` ignoruje `destination.bestOffer` z żądania (usuwa pole z `destination_data` i nie zapisuje go do `flight_data`); jedyny zapis oferty to serwer po własnym wyszukiwaniu”. Kryterium: „żądanie z podrobionym `bestOffer` nie zmienia `flight_data`”.

**9. [Ważna] Aktywacja „dla wszystkich” włącza masową wysyłkę maili przed wyjazdem, z tematem sprzecznym z BRAND.md; brief opisuje to jako zaletę**
Miejsce: L29 (skutek uboczny), kryterium 3 (L212).
Problem: cron `pre-trip-email` jest dziś martwy, bo żaden wyjazd nie ma `departureDate`. Po kroku 2 zacznie wysyłać do każdego właściciela maila z tematem `Za 3 dni lecisz do ${city}! ✈️ Twój plan podróży` (`route.ts:106`), czyli z wykrzyknikiem i emoji, wbrew regule bez emoji i wykrzykników, którą brief stosuje do własnych tekstów. Mail jest też wejściem w bramkę `email` z Przepustki. To zmiana widoczna dla użytkowników i dla deliverability, której nikt świadomie nie zatwierdził. Kryterium 3 („mail trafia do wyjazdu z `flight_data`”) nie jest sprawdzalne w tej formie.
Poprawka: wyjąć mail z korzyści i potraktować osobno: albo wyłączyć cron flagą do czasu przeglądu tekstu i bramki `email`, albo dopisać do kroku 2 poprawkę tematu i treści. Kryterium 3 zamienić na: „zapytanie crona `flight_data->>departureDate = D+3` zwraca wyjazd z kroku 2 (test na fixture)”. Decyzja Kacpra (uwaga w liście na końcu).

**10. [Ważna] Cena „dla brakujących miejsc” (L188) jest sprzeczna z wyszukiwaniem „dla całej grupy”; link i cena dotyczą stałej liczby osób, niezależnie od tego, kto już kupił**
Miejsce: L65–66, L67, L188 („cena dotyczy tylko brakujących miejsc”).
Problem: wyszukiwanie jest dla pełnego składu (`toFlightPassengers(group)`), więc cena i link „Szukaj dla całej grupy” zawsze liczą 4 osoby, także gdy dwie mają już bilet. Zdanie z L188 opisuje zachowanie, którego żaden z dwóch linków nie ma: dla dwóch pozostałych osób nie ma linku ani ceny. Wersja „domyślnie odznaczony” w formularzu (L67) odznacza osobę, ale kwota nadal jest „cena razem” (636 zł) mimo zaznaczonych 2 osób.
Poprawka: wybrać jedno: (a) cena i link zawsze dla pełnego składu, a karta mówi „2 z 4 mają bilet”; zdanie z L188 usunąć, kwotę w formularzu liczyć jako `price × liczba zaznaczonych miejsc` (a nie „cena razem”), albo (b) trzeci link „Szukaj dla pozostałych (2)” z liczbą z `members − ticketStatus`. Rekomendacja: (a) plus przeliczana kwota. Kryterium: „po odznaczeniu osoby w formularzu kwota domyślna zmienia się proporcjonalnie”.

**11. [Ważna] Link partnerski zapisany w `affiliateUrl` zestarzeje się przy zmianie składu, a zmiana składu wymusza odświeżenie, które może się nie udać**
Miejsce: L46, L73, L188, `droppedPassengersNote`.
Problem: `buildAviasalesUrl` koduje liczbę osób w ścieżce (`search-url.ts:35–38, 52`). Jeśli link jest składany raz przy wyszukiwaniu i trzymany w `flight_data`, po dołączeniu piątej osoby (spec 2.4) aż do udanego odświeżenia otwiera wyszukiwarkę z 4 osobami. Przy odmowie limitu (L180) tak zostanie. Marker (`TRAVELPAYOUTS_MARKER`) też zostaje „zamrożony” w chwili zapisu: jeśli zmienna była pusta, link zostaje bezpłatny na zawsze.
Poprawka: nie przechowywać `affiliateUrl`; składać link przy odczycie (trasa `GET` albo komponent) z aktualnych: lotniska, dat z oferty, `toFlightPassengers(group)`, `process.env.TRAVELPAYOUTS_MARKER`. `flightLink` zostaje, bo i tak rozpoznaje adres. Dodać kryterium: „po zmianie składu link ma nową liczbę osób bez odświeżania ceny”. Przy okazji wyzwalacz „skład się zmienił” liczyć, nie flagować: `offer.passengers` różni się od aktualnego `toFlightPassengers(group)` (obejmuje dołączenie, usunięcie wolnego miejsca z briefu zaproszeń, pkt 7, i zmianę wieku dziecka, a nie wymaga zapisu flagi).

**12. [Ważna] Skutek dzieci i niemowląt dla statusu „ma bilet” i „Wszyscy mają bilet”**
Miejsce: L66, L136 („wszyscy mają bilet”), L156, kryterium 8.
Problem: `ticketStatus(members, expenses)` widzi tylko dorosłych z `trip_members`. Dla rodziny karta napisze „Wszyscy mają bilet. Zostaje spakować plecak”, choć nikt nie potwierdził biletu dla 4-latka i niemowlęcia (a niemowlę w Sky też wymaga biletu, zwykle osobnej opłaty). Dodatkowo `toFlightPassengers` przenosi 12–17-latków do `adults` (`group.ts:29–39`), więc liczba dorosłych w wyszukiwaniu to nie liczba wierszy `trip_members`; opis „dopisek, jeśli są dzieci” (L66) nie rozwiązuje tej rozbieżności. Wzorzec „kupiłem swój i dziecka” nie ma jak zapisać dziecka: lista „kupiłem też dla” zawiera tylko członków. Podział po równo na dorosłych (L66) przy dwóch rodzinach z różną liczbą dzieci nie odpowiada rzeczywistym kosztom; wagi (`expense_shares.weight`) są w schemacie, ale skład nie mówi, które dziecko jest czyje.
Poprawka: dla składu z dziećmi nie używać słowa „wszyscy” w stanie zbiorczym, tylko „Dorośli mają bilet. Dzieci: sprawdź w koszyku”, albo osobny wiersz „Dzieci (2) · bilet na osobnych zasadach” z ręcznym znacznikiem „mają bilety” zapisywanym przy wydatku (pole `covers_children` albo wpis w `meta`). W „Kupiłem swój” dodać pole „w tym dla dzieci: liczba”. Pytanie 5 uzupełnić o wagi: czy w rodzinach kupujący może wpisać „dzielimy po osobach z dziećmi”. W kryteriach dodać przypadek: rodzina 2+2, kupuje jedna osoba za wszystkich, status zbiorczy nie mówi „wszyscy”, jeśli dzieci nie zostały potwierdzone.

**13. [Ważna] Migracja części 4 musi nieść wymagania briefu rozliczeń, a brief lotów o nich nie wspomina**
Miejsce: L50, L217–221 (kryteria 6, 10), L205.
Problem: `2026-11-15-rozliczenia.md` (§7, pyt. 11) mówi, że jego zmiany schematu (`updated_at`, `updated_by_member_id`, `source` z unikalnym indeksem `(trip_id, source)`, opcjonalnie `pln_minor` nullable, tabela `expense_changes`, `trips.settle_enabled`) wchodzą do migracji części 4, bo to ona tworzy `expenses` i `expense_shares`. Brief lotów ani tego nie przyjmuje, ani nie odrzuca, a kryterium 10 (`pln_minor` = `amount_minor`) zakłada pole niepuste. Bez `source` zapis „Zapisz” klikany dwa razy na wolnym łączu da dwa wydatki `flights`.
Poprawka: dodać w §8 zależność „migracja części 4 = schemat z briefu rozliczeń po decyzji Kacpra (pyt. 11 tam)” oraz klucz idempotencji: klient generuje UUID zapisu, serwer wstawia `source = 'flight:' || uuid`; powtórka zwraca ten sam wydatek. Kryterium: „dwa identyczne żądania z tym samym kluczem tworzą jeden wydatek”. Kryterium 10 doprecyzować: „dla `currency = PLN` pole `pln_minor` jest równe `amount_minor`, `fx_rate`/`fx_date` puste, niezależnie od ewentualnego nullable”.

**14. [Ważna] „Cofnij” przy wierszu osoby usuwa cały wydatek, a nie jej status**
Miejsce: L92–93 (ekran), L158 (tekst), L107 (menu na telefonie), L75 (F).
Problem: wiersz „Ty ma bilet · 159 zł [Cofnij]” sugeruje cofnięcie *swojego* biletu, a tekst potwierdzenia mówi „Wszyscy stracą status” (po „Kupuję za wszystkich”). Wiersze Ani i Michała nie mają „Cofnij”, więc nie wiadomo, kto i jak ma zdjąć status komuś, kto się pomylił. Rozliczenia (L130 tamtego briefu) mają inny tekst („Usunięcie zabierze Ani ‘ma bilet’”). Dodatkowo spec 6.2 pozwala każdemu poprawiać każdy wydatek: edycja udziałów lub kategorii tego samego wpisu cicho zmienia statusy.
Poprawka: pokazać „Zapisane: 636 zł, płacił Michał, dla 4 osób [Usuń wpis]” jako osobny wiersz pod listą (jeden wpis = jeden przycisk), a w wierszach osób tylko status. Jedna wspólna treść potwierdzenia z liczbą dotkniętych osób: „Usunąć wpis 636 zł? Ania, Ola i Michał stracą status ‘ma bilet’.” `ticketStatus` ma liczyć wyłącznie wydatki z `category = 'flights'` i `deleted_at is null`, z udziałami aktualnych członków; dodać test na zmianę kategorii i na wykluczenie osoby z udziałów po edycji. Sygnatura w kryterium 8 musi też przyjmować udziały (`ticketStatus(members, expenses, shares)`).

**15. [Ważna] Kolizja z bramką `flight` z Przepustki: ta sama chwila powrotu z wyszukiwarki ma dwa wyskakujące okna**
Miejsce: L68 („Kupione? Zaznacz”), L170 („Funkcje grupy są darmowe”).
Problem: spec Przepustki (2.4, tabela bramek) każe po kliknięciu w kartę lotu i powrocie na kartę (`visibilitychange`) otworzyć `PassSheet` „Lecisz do {miasto}? Weź plan ze sobą” raz na wyjazd i urządzenie. Brief lotów używa tego samego wyzwalacza dla własnej podpowiedzi. Nie ma ustalonej kolejności ani tego, czy gość bez konta (L170 mówi: funkcje grupy za darmo) widzi w tym momencie ofertę 4,99 zł tuż przed zaznaczeniem biletu.
Poprawka: dopisać w §6 regułę: najpierw „Kupione? Zaznacz”, bramka `flight` pokazuje się dopiero po zamknięciu tej podpowiedzi lub po zaznaczeniu zakupu, nigdy równocześnie. Albo (decyzja) wyłączyć bramkę `flight` dla uczestników z rolą `member`, bo Przepustka wyjazdu i tak jest wspólna.

**16. [Ważna] Brak zdefiniowanych danych wejściowych odświeżania: skąd serwer bierze daty, lotnisko i skład, gdy `flight_data` jest puste**
Miejsce: L70–73, L55 (3A.1), brief terminu L177 (retry „przy otwarciu karty lotu (część 4)”).
Problem: brief terminu mówi, że po nieudanym wyszukiwaniu przy zamknięciu ankiety termin jest zapisany, a ponowna próba następuje „przy otwarciu karty lotu”. Brief lotów mówi, że serwer „odpowiada zapisaną ofertą, jeśli `checkedAt` ma mniej niż 6 h”, ale w tym przypadku oferty nie ma. Nigdzie nie napisano, że daty idą z `date_polls.chosen_option_id`, a w ścieżce bez ankiety z wybranej oferty „Wybierzcie lot”, ani że lotnisko jest `airports[0]` z quizu (quiz pozwala wybrać kilka, `QuizAnswers.airports: string[]`; `destinations/page.tsx:32, 42` bierze `airports[0]`). Brak miejsca na zapis „wybrane daty i lotnisko” poza ofertą.
Poprawka: dodać sekcję „Dane karty”: `trips.flight_data = { origin, destinationCode, departDate, returnDate, passengers, offer?, checkedAt?, lastAttemptAt?, lastResult? }`. Daty i lotnisko zapisuje zamknięcie ankiety (termin) lub wybór oferty (loty) *przed* wyszukiwaniem, więc retry ma co odpytać. Lotnisko: jedno, wskazuje organizator w momencie startu karty, jeśli quiz miał kilka (zgodnie z pytaniem 7 w briefie terminu).

**17. [Ważna] „Cena wzrosła / spadła po zakupie” działa jak mini-śledzenie cen i wywiera presję, wbrew duchowi decyzji z braku alertów**
Miejsce: L183–184, L163 (tekst „Michał kupił za 159 zł, dziś jest 189 zł”).
Problem: (a) Wiersz „spadła” w drugą stronę to dokładnie komunikat „przepłaciłeś”, o którym L184 mówi, że go nie będzie („Michał kupił za 189 zł, dziś jest 159 zł” widzi też Michał). (b) Porównuje kwotę wydatku (może zawierać bagaż, wybór miejsca, ubezpieczenie, zakup „innego lotu”) z ceną wyszukiwarki. „Kupił za 159” bywa kwotą całą z dopłatami i wynik jest fałszywy. W przypadku „inny lot” (L185) porównanie jest bezsensowne. (c) Dla osób bez biletu to komunikat „drożeje, kupuj”, czyli presja, której spec i brief terminu świadomie unikają. (d) Wykres zmian ceny w czasie to wprost funkcja alertów Pro. Brief wyklucza *powiadomienia*, ale pokazywanie na karcie historii różnic jest ich bliskim substytutem; skutek dla Pro trzeba nazwać.
Poprawka: usunąć wiersz „spadła”; pozostawić „Michał kupił za 159 zł” jako informację bez „dziś jest”, albo pokazywać różnicę tylko gdy wydatek jest oznaczony jako dokładnie ten lot i kwota jest ≤ 1,5 × cena karty. Decyzja Kacpra (lista na końcu).

**18. [Ważna] Teksty zawierają twierdzenia, których brief nie może udowodnić**
Miejsce: L102–103 i L154 (bagaż), L152 (dowód), L87 (ekran: „bezpośredni”).
Problem: (a) „Przy dwóch osobach często taniej wychodzi jeden większy bagaż rejestrowany niż dwa osobne” to twierdzenie o cenach, o którym L244 (pytanie 8) przyznaje, że nie ma danych. Spec 4.3 mówi „bez cen” i nie mówi „często taniej”. Zasada „Honest by default” z PRODUCT.md i brief strony głównej (L180) wymagają, by obietnice miały pokrycie. (b) „Do rezerwacji potrzebujesz imion i nazwisk jak w dowodzie, a przy dzieciach także dat urodzenia” jest uproszczeniem: loty poza Schengen wymagają paszportu, a daty urodzenia podają zwykle wszyscy. Zdanie bywa nieprawdą dla konkretnej linii. (c) Makieta pokazuje „bezpośredni”, ale model `RealFlight` i `SkyLeg` nie zawierają liczby przesiadek ani nazwy segmentów; najtańszy wynik z `results.sort((a,b)=>a.price-b.price)` (`rapidapi.ts:363`) może mieć przesiadkę, a karta powie „bezpośredni” tylko jeśli typ zostanie rozszerzony. (d) Karta wyświetla konkretny lot „FR 1234”, ale link prowadzi do Aviasales (inny agregator niż źródło ceny) bez nośnika konkretnego lotu; użytkownik może tam nie znaleźć ani tego lotu, ani tej ceny. L184 i tekst „Cena z wyszukiwarki, przy zakupie może się zmienić” tylko częściowo to pokrywają.
Poprawka: bagaż: „Przy dwóch osobach sprawdź w koszyku, czy opłaca się jeden większy bagaż rejestrowany zamiast dwóch” (odpowiada pytaniu 8 w wersji „bez ‘często taniej’”). Dowód: „Do rezerwacji zwykle potrzebujesz imion i nazwisk jak w dokumencie podróży. Tych danych u nas nie zostawiasz.” (pominąć daty urodzenia, jeśli nie ma pokrycia). „Bezpośredni”: rozszerzyć `RealFlight` o `stops` dopiero po teście z 2.4 pkt 1, do tego czasu nie pokazywać. Pod ceną: „Najtańszy lot, jaki widzimy. W wyszukiwarce wyniki mogą się różnić.”

**19. [Ważna] Wyjazd grupowy bez wiersza organizatora (bez „Zaproś ekipę”) nie ma kupującego**
Miejsce: L60, L170 („tylko dla wyjazdów, w których użytkownik ma rolę”), L19 (solo i para „zwykła karta”).
Problem: spec 2.3 zakłada wiersz organizatora dopiero po pierwszym „Zaproś ekipę”. Wyjazd „rodzina” albo „znajomi”, w którym nikogo nie zaproszono, nie ma `trip_members`, więc `paid_by_member_id not null` (spec 6.1) i `ticketStatus` nie mają na czym działać. Brief nie mówi, czy taka karta ma przyciski kupna.
Poprawka: w §6: bez wierszy `trip_members` karta pokazuje tylko ofertę i link (jak solo), a przyciski kupna pojawiają się po założeniu grupy; alternatywnie pierwszy zapis wydatku zakłada wiersz organizatora (spójnie z briefem zaproszeń). Dopisać kryterium.

**20. [Ważna] Uczestnik „płaci” tylko za siebie: brak wyboru „kto płacił”, a organizator często zapisuje zakup za kogoś**
Miejsce: L63–67 (D), formularz L131–134.
Problem: spec 6.2 ma pole „kto płacił (domyślnie ja)”, a formularz lotu go nie ma. Typowy przypadek: Ania kupiła bilety, organizator zapisuje to za nią, bo ona nie otworzyła planu (albo jest „miejscem czekającym na osobę” bez telefonu, do którego odnosi się też brief rozliczeń). Wtedy status „ma bilet” i ewentualny dług ma przypisać się do właściwej osoby.
Poprawka: dodać w formularzu zwinięte pole „Kto płacił: Ty ▾” z listą członków (domyślnie „Ty”), z autorstwem zapisanym w `created_by_member_id`. Kryterium: wydatek zapisany przez Michała jako „płaciła Ania” ma `paid_by = Ania`, `created_by = Michał`.

**21. [Ważna] Wymuszone odświeżenie „niezależnie od 6 h” bez odstępu da się wywołać wielokrotnie**
Miejsce: L73, L188.
Problem: każde dołączenie przez „Nie ma mnie na liście” (każdy z linkiem zaproszenia) i każde dodanie lub usunięcie wolnego miejsca (brief zaproszeń, pkt 7) wymusza kolejne wyszukiwanie. Brief nie ogranicza częstotliwości wymuszeń; organizator może w pętli dodawać i usuwać miejsca. Jedno „wymuszenie” to 2–4 zapytania.
Poprawka: dolny próg odstępu także dla wymuszeń (np. nie częściej niż co 15 minut; jeśli skład zmienił się wcześniej, karta pokazuje „cena sprzed zmiany składu” i odświeża po upływie progu). Dodać kryterium.

**22. [Ważna] Plan layoutu i kolejności kart rozjeżdża się z briefami planu, terminu i zaproszeń**
Miejsce: L79 (wąska kolumna `max-w-lg`), L82 (ekran „Komputer min. 1280 px”), L168 („nad noclegami”).
Problem: brief planu (L80–103) zmienia plan na układ dwukolumnowy od `lg` z prawą kolumną na mapę, historię, czat i „ekipę”; brief lotów twierdzi, że plan to jedna wąska kolumna i „nie projektuję nowego rozkładu”, ale rysuje wersję komputerową z wierszami „obok siebie” i kwotami do prawej. Gdzie karta stoi w układzie dwukolumnowym, nie wiadomo. Brief zaproszeń (L44–46) zostawia lot zaraz po karcie kosztu (audyt P1-5), a brief terminu stawia kartę „Kiedy lecimy?” na szczycie. Brief planu w ogóle nie wspomina o lotach. Odświeżanie planu co 60 s w briefie planu (kryterium 12) nie obejmuje statusów biletów, więc „wszyscy widzą to samo” (L59) nie ma mechanizmu.
Poprawka: w §4 zastąpić „zachowuje układ” zdaniem „karta dostaje szerokość kolumny, w której ją umieści brief planu; kolejność kart na szczycie: pasek ekipy, ‘Kiedy lecimy?’, koszt, lot, noclegi” oraz zdefiniować, kiedy klient pobiera statusy biletów (przy wejściu na plan i przy powrocie do karty; nie przy każdym cyklu 60 s). Doprecyzować, że „otwarcie karty” (L70) to pierwsze wejście na plan w sesji albo powrót do widoczności po > X min, nie każdy sync.

### Drobne

**23. [Drobna] Obietnica „cena nie jest starsza niż pół dnia” (L17) nie jest spełniona przez projekt**
Pół dnia to 12 h, a próg to 6 h (L70). Poza tym „nie starsza niż” nie trzyma się przy limicie, błędzie, braku klucza, wyjazdach bez wejść na kartę i w oknie po wylocie. Poprawka: „Cena z wyszukiwarki, odświeżana przy otwarciu karty, jeśli ma więcej niż 6 godzin”. To samo w kryteriach: usunąć sformułowania absolutne.

**24. [Drobna] L35–36 mówi „brak klucza”, a pytanie 2 (L240) „jest klucz w produkcji”**
Sprzeczność wewnątrz briefu, do tego komentarz w `admin/page.tsx:3` sugeruje, że wyszukiwanie RapidAPI zostało „removed”. Poprawka: napisać wprost: „Lokalnie brak klucza. Produkcja: do potwierdzenia przez Kacpra (klucz ustawiony? plan RapidAPI aktywny? limit?)” i przenieść to do warunków wstępnych jako pierwszy krok.

**25. [Drobna] Typ `FlightOffer` ma wymagane pola legacy, których nowa oferta nie ma**
L47: „rozszerzenie `FlightOffer`”. `FlightOffer` wymaga `id`, `origin: Airport`, `destination: Airport`, `realCost`, `isBerlinAlternative`, `savingsVsWro` (`types/index.ts:57–76`), których wyszukiwanie nie dostarcza (brak nazw miast lotnisk w `SKY_IDS`; nazwa miasta wylotu potrzebna jest do `offer.origin.city` w `FlightCard`, L85). Poprawka: wprowadzić nowy typ `FlightQuote`/`FlightState` (daty, kod lotnisk, `passengers`, `price`, `totalPrice`, `soloPrice`, `segments`, `checkedAt`) z parserem starego `bestOffer`, zamiast dopisywać pola do typu z wymaganym `realCost`.

**26. [Drobna] Kolejność w 2.4: rozszerzenie typu (krok 3) po zapisie oferty (krok 2)**
Krok 2 zapisuje `FlightOffer` bez `checkedAt`, krok 3 dopiero go dodaje; wpisy z kroku 2 zostaną „nieświeże” (L203) i wszystkie dostaną odświeżenie od razu. Poprawka: scalić 2 i 3 (jeden PR z nowym typem, zapisem i odczytem z uwagi 1), a pomiar na żywo (krok 1) zrobić też dla pól segmentów (`flightNumber`, `stopCount`).

**27. [Drobna] Kryteria akceptacji: kilka nie jest sprawdzalnych albo brakuje najważniejszych**
- 3 („mail trafia do wyjazdu”): nie do przetestowania w tej formie (uwaga 9).
- 12 („dokładnie jedno wyszukiwanie”) koliduje z porównaniem z jedną osobą (drugie zapytanie, L180 i `real-flights/route.ts:48`). Doprecyzować: „jedno wyszukiwanie grupowe plus ewentualnie jedno porównawcze, razem ≤ 4 zapytania HTTP”.
- 13: patrz uwaga 3 (test z mockiem w jednym procesie niczego nie dowodzi).
- 16 („przegląd kodu”): nie test. Poprawić na „test: odświeżenie z inną ceną nie wywołuje funkcji wysyłki maila ani zapisu do tabeli alertów (mock rzuca przy wywołaniu)”.
- Brakuje: autoryzacji (obcy, `/share`, usunięty uczestnik dostaje 403 przy odświeżeniu i zapisie kupna); braku odświeżania z `/share`; idempotencji zapisu; limitu zapytań na wyjazd na dobę; zachowania po dacie wylotu; skład z dziećmi; zmiany składu (uwaga 11); kwoty ≥ 100 000 zł i „o ponad połowę” (są w §7, nie w kryteriach).
- 1 („udokumentowany wynik testu”): wskazać plik z surową odpowiedzią i fixture wykorzystywanym przez testy `splitPrice`.

**28. [Drobna] `POST /api/trips/{id}/flight/refresh` ma być zamknięty dla obcych, a zdarzenia nie mogą wychodzić z GA po stronie serwera**
L70, kryterium 18. Trasa musi wymagać roli z `getTripAccess` (obcy z `/share` nie może wywołać wyszukiwania, bo to byłby otwarty kran kosztów). `flight_refresh` z wynikiem (`fresh`, `cached`, `limit`, `error`) jest zdarzeniem serwera, a GA4 działa w kliencie, więc potrzebny jest zapis do `quiz_events` jak dla `affiliate_click` (`affiliateServerEvent`). Dopisać, które zdarzenia idą GA (klient), a które tabelą.

**29. [Drobna] `/api/real-flights` po aktywacji zostaje publicznym GET-em z limitem w pamięci**
Trasa (`real-flights/route.ts`) nie wymaga logowania, limit 5/godz./IP jest w pamięci procesu (`rateLimit.ts`), więc z `compare=1` każdy zapyta Sky Scrappera do 8 razy na żądanie. Dziś jest martwa; po tej pracy będzie jedyną publiczną drogą do płatnego API. Poprawka: w kroku 2 dopisać „trasa jest usuwana albo wymaga sesji i liczy się do licznika z bazy”.

**30. [Drobna] Teksty niezgodne z BRAND.md**
- „Nie udało się sprawdzić ceny. Zostaje ta z 14:20.” (L161): BRAND.md w tabeli „Źle” cytuje „Nie udało się wygenerować planu podróży” i ma w sekcji „Czym NIE jest” wzorzec przepraszający. Zamiast tego: „Cena zostaje z 14:20. Nowej teraz nie pobraliśmy.” albo „Coś poszło nie tak przy sprawdzaniu. Cena zostaje z 14:20.”
- „Nie mamy teraz ceny tego lotu. Sprawdź w wyszukiwarce, przyda się i tak.” (L159): „przyda się i tak” jest niejasne. Poprawka: „Ceny tego lotu teraz nie mamy. Sprawdź ją w wyszukiwarce.”
- „Cena z wtorku, 14:20” (L160): dzień tygodnia bez daty będzie mylący przy cenach sprzed tygodnia. Poprawka: „Cena z 11.02, 14:20”.
- „Wszyscy mają bilet. Zostaje spakować plecak.” (L156): OK, ale zależy od uwagi 12.
- L137: „status ‘ma bilet’ nie opiera się na samym kolorze” — dodać, że dla czytników tekst „ma bilet” jest w treści, nie tylko ikona.

**31. [Drobna] Waluta wydatku zawsze PLN**
Kryterium 10 i L134. Ktoś, kto kupił w EUR/GBP (zdarza się przy Skyscannerze i niektórych liniach), musi przeliczyć sam. Poprawka: w formularzu „zł” z linkiem „Zapłaciłem w innej walucie” do ogólnego formularza z części 6 (kurs NBP). Bez tego rozliczenia będą rozbieżne z wyciągiem.

**32. [Drobna] „Kupione? Zaznacz” opiera się na powrocie do karty, a link otwiera nowe okno**
L68. `target="_blank"` zostawia kartę planu w starej zakładce; „po powrocie” musi znaczyć `visibilitychange`/`focus`, jak w Przepustce. Dwa linki („dla całej grupy” i „tylko dla mnie”) powinny ustawić domyślny tryb pytania (`all` / `self`). Dopisać.

**33. [Drobna] Tytuł wydatku: ochrona przed kodem rezerwacji działa tylko przy tworzeniu**
L204, L133. Formularz lotu nie ma pola tytułu (więc „Nie wpisuj kodu rezerwacji” w L133 nie ma gdzie być wpisanym i brzmi dziwnie), ale część 6 pozwala każdemu poprawić tytuł każdego wydatku (spec 6.2; rozliczenia, 2.2). Kod rezerwacji i tak wpadnie do `title` (do 80 znaków) przez edycję. Poprawka: dla `category = 'flights'` serwer nadpisuje `title` wartością `Lot do {miasto}` i ignoruje tytuł z żądania (też w trasie edycji z części 6), a zdanie z L133 usunąć z formularza lub przenieść do ogólnego formularza wydatku.

**34. [Drobna] `Cofnij` na telefonie jest w menu, na komputerze widoczne; różna ochrona tej samej akcji**
L92 vs L107. Skoro potwierdzenie istnieje (L158), menu jest zbędne; ujednolicić (uwaga 14).

**35. [Drobna] Podgląd `/share/{id}` ujawnia liczbę osób i skład**
L171. Karta „4 osoby” plus cena razem to dane o grupie widoczne dla obcego (i dla galerii, jeśli `is_public`). Pytanie 7 pyta o cenę, ale nie o skład. Poprawka: w podglądzie bez składu, tylko trasa, daty i „cena za osobę”.

**36. [Drobna] Link „tylko dla mnie” i pytanie 6**
L90, L242. Skutek: nowy ruch z linkiem partnerskim bez kontekstu grupy (najczęściej solo, bez zapisu zakupu). Zbieżne z duchem dwóch trybów kupna (kupiłem swój), więc rekomendacja: zostawić, ale wyświetlać tylko dopóki zostały osoby bez biletu.

**37. [Drobna] Dodatki L72–73: „brak odświeżania, gdy wszyscy mają bilet”**
Warunek zależy od wszystkich członków, także od „miejsc czekających na osobę” (spec 2.3). Jeśli organizator zostawi puste miejsce, którego nikt nie zajął i na które nikt nie kupił, odświeżanie nie zatrzyma się nigdy. Poprawka: zatrzymać też po ostatnim kupnie „za wszystkich” (obejmuje czekające miejsca) i po upływie okna z uwagi 4.

**38. [Drobna] Zależności**
L50: „Zależności … `getTripAccess` (część 2)” dochodzi też brief zaproszeń, który poprawia `MAX_GROUP` na liczenie `groupSize` (pkt 6 tamtego briefu). L191 („Nie dochodzi do tego: dołączanie jest limitowane (spec 2.4)”) jest prawdą dopiero po tej poprawce, bo spec 2.4 mówi o „MAX_GROUP dorosłych”, a `parsePassengers` liczy dorosłych + dzieci (`rapidapi.ts:141`). Poprawka: wskazać zależność wprost.

## Zgodność ze specem i innymi briefami (skrót)

- Spec 4.2 („co 6 h … z kontrolą `canCallApi()`”) jest wiernie przeniesiony, ale spec nie wiedział, że licznik jest lokalny; to wada specu, brief ją odkrył i powinien przejąć decyzję (uwaga 3).
- Spec 4.3 „Stała wskazówka o jednym bagażu … bez cen” vs brief „często taniej” (uwaga 18).
- Rozliczenia: różne teksty usunięcia biletu (uwaga 14), wymagania migracji (13).
- Termin: retry po nieudanym zamknięciu (16), brak wspólnej funkcji „zapisz wynik wyszukiwania w `flight_data`” (jedna funkcja, dwóch wywołujących: zamknięcie ankiety i „Wybierzcie lot”). Warto wskazać właściciela tej funkcji w briefie lotów.
- Zaproszenia: wolne miejsce usunięte zmienia skład (11, 37).
- Przepustka: bramka `flight` (15).
- Plan: układ i synchronizacja (22).
- Strona główna: nie obiecuje „Waszej ceny lotu z rezerwacji” — zgodne z tym, że karta jest dziś uśpiona.

## Werdykt

**Z poprawkami.** Struktura briefu, stany błędów i decyzje produktowe są dobre, a diagnoza „łańcuch lotów jest uśpiony” zgadza się z kodem. Błędna jest jednak podstawa kroku 2 (uwagi 1, 2): zapis do `flight_data` niczego nie odblokuje, a daty i kod IATA celu nie istnieją. Hamulce kosztu (uwagi 3–5) nie wytrzymają Vercela. Przed oddaniem builderowi trzeba przepisać §2.3–2.4 (kolejność prac z licznikiem w bazie, wynikiem dyskryminowanym, bypassem cache, jednym źródłem prawdy), §3E i kryteria 11–16, oraz poprawić teksty z uwagi 18. Reszta to poprawki lokalne.

## Uwagi wymagające decyzji Kacpra

1. **Budżet zapytań i okno odświeżania** (uwagi 3, 4, 5, 21, 37): ile zapytań dziennie do Sky Scrappera, ile kosztuje plan RapidAPI i czy limit jest twardy; czy karta odświeża tylko w ostatnich X dniach przed wylotem; zgoda na licznik i blokadę w bazie jako warunek wydania karty.
2. **Aktywacja lotów dla wszystkich i jej koszt** (4, 9, 2): czy przy każdym planie solo i par robimy wyszukiwanie lotów (2–6 zapytań na plan), czy dopiero po kliknięciu użytkownika; czy włączamy przy tym pre-trip e-mail (dziś martwy; temat z wykrzyknikiem i emoji).
3. **Daty i cel w ścieżce bez ankiety** (2, 16): jakie daty proponuje „Wybierzcie lot” (dni 10/15/20/25 czy weekendy jak w terminie) i skąd bierzemy kod IATA celu; które lotnisko, gdy quiz miał kilka.
4. **Wiersze „cena wzrosła / spadła”** (17): zostawiamy, usuwamy „spadła”, czy rezygnujemy; skutek dla alertów Pro i presji.
5. **Dzieci w podziale kosztu i w „wszyscy mają bilet”** (12; pyt. 5 briefu): dzielimy po równo na dorosłych, czy dopuszczamy wagi/zaznaczenie dzieci.
6. **Cena i link po częściowych zakupach** (10): zawsze pełny skład z kwotą proporcjonalną do zaznaczonych osób, czy trzeci link dla pozostałych.
7. **Bramka `flight` Przepustki dla uczestników** (15): kolejność względem „Kupione? Zaznacz” i czy gość z rolą `member` ją widzi.
8. **Migracja części 4** (13): przyjmujemy schemat z briefu rozliczeń (pyt. 11 tam) i klucz idempotencji w tej samej migracji.
9. **Teksty** (18, 30): zgoda na usunięcie „często taniej” i dat urodzenia z pouczeń; zgoda na „Najtańszy lot, jaki widzimy”.
10. **Podgląd `/share`** (35; pyt. 7 briefu): cena i trasa bez liczby osób, czy tylko daty.
11. **Link „tylko dla mnie”** (36; pyt. 6 briefu): rekomendacja: zostaje, tylko dopóki ktoś nie ma biletu.
12. **Kto zapisuje zakup** (20): zgoda na pole „Kto płacił”, tak jak w części 6.
