# Recenzja briefu: Wspólny termin (część 3)

Data: 2026-11-15 · Brief: `2026-11-15-termin.md` · Kod: `origin/main` (`ac37e25`, odczyt przez `git show origin/main:...`) · Spec: `2026-11-14-wyjazd-ze-znajomymi-design.md`
Inne briefy czytane: `loty`, `plan`, `zaproszenia`, `strona-glowna` (rozliczenia przejrzane tylko pod kątem terminu).
Decyzje Kacpra z listy zadania nie są podważane. Tam, gdzie mają skutki uboczne, jest to zaznaczone jako skutek.

Skróty wag: **K** = Krytyczna (nie da się zbudować tak, jak napisano, albo zbudowane będzie złe), **W** = Ważna (luka lub sprzeczność, którą builder musiałby zgadywać), **D** = Drobna.

## A. Weryfikacja twierdzeń o kodzie

| Twierdzenie briefu | Wynik |
|---|---|
| `prices_for_dates` woła dziś tylko `fetchWeekendOffers` (`src/lib/drop/deals.ts:17`), po lotnisku, bez celu | Potwierdzone. `git grep prices_for` na main trafia tylko tam. URL: `origin=…&departure_at=…&return_at=…&currency=pln&sorting=price&limit=1000`, bez `destination`. |
| Trzy warianty `czw-nd`, `pt-nd`, `pt-pn` (`weekendDates`) | Potwierdzone (`src/lib/drop/dates.ts:44-54`), liczone od najbliższego czwartku. |
| Wyniki trafiają do `drop_deals` raz na tydzień (cron `drop-prepare`) | Potwierdzone (`vercel.json`: `0 21 * * 3`). **Ale** `mergeVariants` (`deals.ts:123-130`) zostawia dla pary `origin\|city_code` tylko najtańszy z trzech wariantów. Brief mówi „jeden z trzech wariantów”, a w bazie jest jeden na miasto. Patrz uwaga 9. |
| Komentarz „100 zapytań na godzinę” | Jest w `drop-prepare/route.ts:13` (`PAUSE_MS = 300; // limit Travelpayouts: 100 zapytań/h`). Kod sam sobie przeczy: pauza 300 ms daje do ~160 zapytań w budżecie 50 s. Liczba jest niezweryfikowana. |
| `bestOffer` nigdzie nie jest ustawiane | Potwierdzone. Tylko odczyty: `generate/route.ts:181`, `plan/[tripId]/page.tsx:182,469,473`, `destinations/page.tsx:316`. To samo stwierdza brief `loty` (2.1). |
| `.ics`, `calcTripSchedule`, cron `pre-trip-email` zależą od dat | Częściowo. `.ics` i `FlightCard` czytają `destination.bestOffer` (`destination_data`), cron czyta `flight_data->>departureDate`. To dwa różne magazyny. `GET /api/trips/[tripId]` pobiera `flight_data`, ale nie zwraca go klientowi. Uwaga 2. |
| `calcTripSchedule` jest źródłem godzin dla planu | `calcTripSchedule(duration, FlightDetails)` (`tripSchedule.ts:100`) jest wołane tylko w `gemini.ts:56` przy generowaniu planu. `regenerate-day` go nie używa. Uwaga 1. |
| `searchFlightForDates` to jedna para dat | Potwierdzone (`rapidapi.ts:413`). Zwraca do 10 ofert posortowanych po cenie. Zwraca `null`, gdy kodu celu nie ma w `SKY_IDS` (67 wpisów). Jedno wywołanie to do 2 zapytań (`rapidapi.ts:320`: „always needs two calls”). |
| `DAILY_CAP` chroni przed kosztem | Fałsz w praktyce. `let dailyCallCount = 0` (`rapidapi.ts:178`) to licznik w pamięci procesu, więc na serverless każda instancja liczy osobno. Potwierdza to brief `loty` (2.3). Uwaga 12. |
| `checkRateLimit` | Też w pamięci procesu (`rateLimit.ts:1-3`: „resets on cold starts”). Nie jest realnym hamulcem kosztów. |
| `/api/real-flights` obsługuje `adults/children/infants` | Potwierdzone (`parsePassengers`). Ale `price.raw` jako cena całej rezerwacji to założenie bez testu na żywo (`rapidapi.ts:~155`, TODO), a brief `loty` robi z tego warunek wydania cen grupowych. Uwaga 17. |
| `trip_members`, `getTripAccess`, `groupMessage`, `system_dates` | Nie istnieją na main (to części 2 i 5). Brief słusznie to zaznacza jako zależność. |
| „✓ jest dozwolone w UI tylko z tekstem alt, jak w spec 3.4” (§3.1) | Fałsz. Spec 3.4 ma tylko makietę z ✓ ✗ ~ i nie zawiera żadnej reguły o tekście alternatywnym. Uwaga 20. |

## B. Uwagi

### Krytyczne

**1. K · §2 krok 6, §6 (wiersz „Lot ma inne godziny”), ryzyko 4, kryterium 10 · Dopasowanie planu przez `regenerate-day` nie zadziała i zniszczy zawartość dnia**
Brief i spec 3.5 mówią, że pierwszy i ostatni dzień „przegenerowuje się” z logiką `calcTripSchedule` i `regenerate-day`. W kodzie:
- `regenerate-day/route.ts:55`: prompt każe „Zaproponuj ZUPEŁNIE INNY motyw i inne aktywności”. Nie ma w nim godzin lotu ani `calcTripSchedule` (jedyne użycie: `gemini.ts:56`). To narzędzie do zmiany pomysłu na dzień, a nie do przesunięcia godzin.
- Trasa sprawdza `.eq("user_id", user.id)` (l. 35) i `guardAiCall(user.id)` (l. 45), więc dziś nie działa dla goście ani dla wywołania „systemowego”.
- Skutek: grupa, która zareagowała na dzień 1 (część 5, reakcje przypięte do `id` punktów), traci cały dzień 1 i ostatni dzień, bo model wymyśla je od nowa. Brief tego nie widzi.
- Do tego zamknięcie ankiety w jednym żądaniu to: zapis terminu, do 2 zapytań Sky Scrappera (z 1 s przerwą), 2 wywołania Gemini po do 45 s (`maxDuration = 45`). Sumarycznie to ponad limit jednej funkcji. Brief ma kryterium 11 tylko dla błędu lotu, nie dla błędu Gemini po zapisaniu jednego z dwóch dni.
- Dopasowanie opiera się na najtańszej ofercie z `searchFlightForDates` (posortowane po cenie), czyli na locie, którego grupa może nie kupić (część 4 pozwala kupić inny). Regenerujemy plan pod lot spekulatywny.
**Poprawka:** (a) Zamknięcie ma być krótkie: transakcyjnie `open -> closed` (warunkowy update, patrz uwaga 11), zapis `chosen_option_id`, zwrot. (b) Wyszukanie lotu i dopasowanie to osobne, idempotentne kroki wywoływane z klienta (np. `date_polls.flight_status`, `fit_status`: `pending/done/failed`), każdy z własnym komunikatem. (c) Dopasowanie to nowy tryb `fit_dates` (nowy endpoint albo parametr), z promptem zbudowanym z `calcTripSchedule(...).days[0]` i ostatniego dnia, który zachowuje motyw i aktywności i zmienia tylko to, co koliduje z godzinami; zapis idzie przez zapis dnia z części 5 (`apply_day_change`, rodzaj `system_dates`, wersja dnia, ID punktów zachowane). (d) Wynik nie jest „dopasowaniem do lotu”, tylko do wybranej oferty, i jest proponowany, gdy godziny różnią się o >1 h. **Wymaga decyzji Kacpra:** automatycznie po zamknięciu (spec 3.5) czy przyciskiem „Dopasuj plan do lotu” po wyborze oferty w części 4. Moja rekomendacja: przycisk, bo oszczędza Gemini i nie rusza dni, które ekipa już oceniła.

**2. K · §7 ryzyko 3, pytanie 1 · „Zapisać do `trips.flight_data`” nie uruchomi `.ics`, karty lotu ani noclegów z datami**
`handleICS` czyta `currentTrip.destination?.bestOffer?.departureDate` (`plan/[tripId]/page.tsx:182`), `FlightCard` i linki noclegów też `dest?.bestOffer` (l. 469, 473). `dest` to `destination_data`. `GET /api/trips/[tripId]` pobiera `flight_data`, ale nie zwraca go (`route.ts:21` kontra odpowiedź l. 35-42). Jedyny konsument `flight_data` to cron `pre-trip-email` (`route.ts:87`). Zapis do samego `flight_data` naprawia więc tylko mail, a nie to, co użytkownik widzi.
Dodatkowo brief `loty` (2.4 pkt 2, 3A pkt 1) przypisuje sobie ten sam zapis i osobny PR „aktywacja lotów”. Dwa briefy opisują tę samą operację z dwoma kształtami danych (`RealFlight` kontra `FlightOffer` z `checkedAt`).
**Poprawka:** jedna funkcja serwerowa, np. `saveTripFlight(tripId, offer)`, należąca do `loty`, zapisująca spójnie `flight_data` (płaskie `departureDate`, `returnDate`, `checkedAt`) i `destination_data.bestOffer` albo przepinająca odczyty klienta na `flight_data` (zwracać je w `GET`). Termin woła tę funkcję i nie ma własnego zapisu. Pytanie 1 odpada jako pytanie do Kacpra: odpowiedź to „tak, przez wspólną funkcję z `loty` (PR „aktywacja lotów”), a termin zależy od tego PR-u”. Dopisać to do §7 Zależności i do kolejności PR-ów. Brak `bestOffer` w planie bez dat (quick path: `flightDetails` wchodzą do promptu `generate/route.ts:51`, ale nie są nigdzie zapisywane) trzeba zapisać w §2.1 jako stan wyjściowy, a nie „przypadek”.

### Ważne

**3. W · §1 (obietnica), §3 (makiety), §5 · Obietnica „zobaczysz, ile mniej więcej kosztuje lot” jest mocniejsza niż to, co brief sam przewiduje**
Brief w §7 pisze, że „spodziewamy się dużo »brak ceny«” i że przy odległych terminach cache Aviasales często nic nie ma. Wszystkie makiety pokazują pełne ceny, a obietnica na górze jest bezwarunkowa. To dokładnie przypadek „Honest by default”. Dodatkowo `strona-glowna` (sekcja 151) już wpisuje do tekstów: „Ekipa głosuje na termin, a przy każdym widać cenę lotu.” To fałsz dla terminów bez ceny.
**Poprawka:** obietnica: „Zaproponujemy kilka terminów, każdy kliknie, kiedy mu pasuje, a Ty zobaczysz, który wygrywa. Tam, gdzie mamy szacunek ceny lotu, pokażemy go.” Poinformować właściciela `strona-glowna`, żeby nie obiecywał ceny „przy każdym” terminie. Makiety dodać w wariancie „bez żadnej ceny” (jest w §6, ale brak makiety).

**4. W · §3.1/§4 i spec 3.4 · „Jest najtaniej” to twierdzenie, którego dane nie niosą**
Etykieta „Wszyscy mogą. Jest najtaniej.” pojawia się przy terminie z ceną 159 zł, podczas gdy w tej samej makiecie trzeci termin ma „brak ceny”. „Najtaniej” wśród terminów, dla których akurat jest szacunek z cache, nie znaczy najtaniej. Brief w §5 sam zabrania „najtańszego terminu jako gwarancji”, a tekst to robi.
**Poprawka:** „Wszyscy mogą. Najniższy szacunek ceny.” i tylko wtedy, gdy wszystkie terminy w remisie głosów mają cenę. W pozostałych przypadkach „Wszyscy mogą.” Zmienić też wiersz „Najlepszy, wszyscy zgodni” w tabeli tekstów i kryterium 8.

**5. W · §2 krok 2-3 kontra kryterium 2 i §6 wiersz 1 · Maszyna stanów jest sprzeczna**
Krok 2: klik „Ustalmy termin” otwiera ekran z propozycjami, które organizator może odznaczyć i zmieniać. Krok 3: dopiero „Otwórz ankietę” zapisuje `status = open`. Kryterium 2: „Klik tworzy `date_polls` (`open`) i 3-5 `date_options`”. Schemat (spec 3.1) ma tylko `open/closed`, bez `draft`. Do tego §2.1 mówi „Mniej niż 2 się nie zamyka sensownie, ale organizator może zostawić jedną”, a kryterium 2 wymaga 3-5, a zdarzenie `date_poll_started` ma `options`.
**Poprawka:** wybrać jedno. Rekomendacja: propozycje są generowane bez zapisu (czysta funkcja, jest deterministyczna), organizator edytuje je po stronie klienta, a `POST` tworzy ankietę od razu jako `open` razem z opcjami w jednej transakcji. Liczba opcji: min. 2, maks. 5 (jedna opcja to nie ankieta, tylko pytanie „czy ten pasuje”, i da się je zadać na czacie). Kryterium 2 poprawić na „2-5”.

**6. W · §2.1 reguły generatora · Jednostka długości pomieszana, kryterium 2 sprzeczne z regułą**
- `QuizAnswers.duration` to dni (`types/index.ts:19`: „2-21 dni”; `candidateDates` liczy `departDate + (duration-1)`; `calcTripSchedule` liczy dni). Brief pisze o nocach: „Długość 1-4 noce… 5+ nocy”. Spec 3.2 mówi „do 4 dni”. Minimalna długość w quizie to 2 dni, więc „1 noc” nie istnieje.
- Reguła „5+ nocy: sobota do soboty” daje 8 dni, a kryterium 2 wymaga długości równej `duration` (±0). Dla `duration = 5` to jest sprzeczne.
- Makieta ma terminy o różnej długości (13-15 lut = 3 dni, 27 lut-1 mar oznaczone „pt-pn” = 4 dni), co łamie „±0”.
- Przykładowe daty to daty roku 2026. Dziś jest 2026-11-15, więc najbliższy luty to 2027, a 13 lut 2027 to sobota, a nie piątek. 27 lut-1 mar 2026 to pt-nd, nie pt-pn. Makiety mają dni tygodnia z niewłaściwego roku.
**Poprawka:** rozpisać regułę w dniach: długość = `duration` zawsze; start czw/pt gdy `duration <= 4`, sob gdy `duration >= 5`, poza tym zostaje najbliższy dzień tygodnia z regułą wyjątku; test jednostkowy dla `duration` 2, 3, 4, 5, 7, 8, 14 i dla końca roku. Poprawić makiety na daty 2027 z prawidłowymi dniami tygodnia. Uwzględnić `month` i `duration` równe `null` (typ na to pozwala) oraz strefę Warszawy (jest `warsawDay` w `dates.ts`).

**7. W · §2 krok 1 i §5 (próg „zajęte miejsce”) · Kto jest „członkiem ankiety”? Miejsca zarezerwowane bez osoby**
Część 2 tworzy wolne miejsca „Osoba 2…N” bez urządzenia. Brief nie mówi, czy w nagłówku „3 z 4 zagłosowało”, w „Czeka na” i w przypomnieniu liczą się miejsca, które nikt nie zajął. Efekt: „Czeka na: Osoba 3” i przypomnienie „Osoba 3: brakuje Waszych głosów”. Do tego `zaproszenia` (sekcja 144) dopuszcza dwie osoby na jednym telefonie, które nadpiszą sobie głosy jako jedno miejsce.
**Poprawka:** w ankiecie liczą się tylko miejsca z `joined_at` (i bez `removed_at`). Niezajęte miejsca: jedna linia „2 miejsca czekają na dołączenie”, bez imion w przypomnieniu. Jawnie dodać do kryterium 6. Przypadek „dwie osoby, jeden telefon” opisać w §6 jako znane ograniczenie.

**8. W · §3.4/§6 „Remis”, kryterium 4 i spec 3.4 · Ranking nagradza brak głosów**
Ranking: (1) bez „nie mogę”, (2) mniej „jak trzeba”, (3) cena. Termin, na który zagłosował tylko organizator (reszta jeszcze nie), nie ma żadnego „nie mogę”, więc wygrywa z terminem, na który wszyscy zagłosowali „pasuje”, jeśli jest tańszy. Tekst „Na razie wszyscy, którzy odpowiedzieli, mogą” przy 1 głosie z 4 jest technicznie prawdziwy, ale wprowadza w błąd. Kryterium 4 ten przypadek pomija.
**Poprawka:** kolejność: (1) liczba „nie mogę” rosnąco, (2) liczba brakujących odpowiedzi rosnąco, (3) liczba „jak trzeba” rosnąco, (4) cena (brak ceny na końcu), (5) wcześniejsza data. „Wszyscy mogą” tylko gdy odpowiedzieli wszyscy z listy z uwagi 7. Opis w makiecie: „Odpowiedziało 1 z 4” przy każdym terminie. Dopisać przypadek do testu `rankDateOptions`. Odnotować to jako odstępstwo od spec 3.4.

**9. W · §7 tabela cen, wiersz „Dziś, bez prac” · Ten wiersz w praktyce jest pusty, a architektura cen nie jest opisana**
- `mergeVariants` zostawia jedną ofertę na `origin\|city_code`, więc `drop_deals` nie ma „trzech wariantów”, tylko najtańszy. Tabela jest liczona na tydzień zrzutu (najbliższy czwartek), a ankieta proponuje terminy ≥7 dni od dziś, zwykle w innym miesiącu. Przecięcie jest zerowe. Do tego `groupDeals` odfiltrowuje czwartki przed 19:00 (`isEarlyThursday`, l. 68-72), a generator briefu proponuje właśnie „czw/pt rano wylot”.
- Brief nie mówi: kiedy pobieramy ceny (przy tworzeniu ankiety, przy dodaniu własnego terminu, przy otwarciu karty?), gdzie jest cache (24 h, „klucz: lotnisko + cel + daty”, ale w której tabeli? pamięć procesu na serverless nie wystarczy), czy cache jest wspólny między wyjazdami, ani co z błędem/pustą odpowiedzią (ujemny cache).
- Brief sugeruje funkcję „po `destination` i dokładnych datach”. Zapytanie o dokładną parę dni trafia w cache rzadko. **Do sprawdzenia w dokumentacji Travelpayouts:** `departure_at` w formacie miesiąca (`YYYY-MM`) z `destination` zwraca najtańsze bilety na każdy dzień miesiąca w jednej odpowiedzi. Jeśli tak, jedno zapytanie obsługuje wszystkie 4-5 terminów z jednego miesiąca, co obniża ruch 4-5 razy i zwiększa trafienia. Wiersz „Dziś, bez prac” usunąć albo zmienić na „praktycznie nic”.
**Poprawka:** dopisać w §7: tabela `date_price_cache(origin, dest, depart_date, return_date, price, fetched_at)` albo kolumny w `date_options` plus wspólny cache; ceny pobierane tylko przy tworzeniu ankiety i dodaniu terminu (nie przy każdym otwarciu karty), TTL 24 h, ujemny wynik też cache'owany (np. 6 h), globalny licznik w bazie (nie w pamięci) z limitem godzinowym i degradacją do „brak ceny”. Mapowanie nazwa miasta -> kod: `CATALOG` (`src/lib/destinations/catalog.ts`, 56 miast, `iataWro`) już to ma dla miast z katalogu. Brief pyta o „pokrycie mapowania”, a odpowiedź jest do sprawdzenia w 5 minut. Dla miast spoza katalogu: `brak ceny` bez błędu. Uwaga: kod w Travelpayouts to kod miasta (WAW, LON, PAR), a w `SKY_IDS` kod lotniska (CDG, LGW). Potrzebne są dwa mapowania (patrz uwaga 13).

**10. W · §7 ryzyko 2, §6 wiersz „Zamknięcie, a wyszukiwanie lotu pada”, spec 4.2 · Pętla zapytań po nieudanym wyszukiwaniu**
Przy błędzie brief mówi „ponowna próba przy otwarciu karty lotu (część 4)”. Część 4 odświeża, gdy `checkedAt` starsze niż 6 h; po nieudanym wyszukiwaniu nie ma `checkedAt`, więc każde otwarcie karty przez każdego z (do 9) uczestników uruchamia 1-2 zapytania Sky Scrappera, które nic nie zwracają i nie trafiają do cache (`fetchDatePair` cache'uje tylko niepuste wyniki, l. 400).
**Poprawka:** zapisywać `flight_checked_at` i `flight_status = failed` także przy porażce, ponawiać najwcześniej po 30 minutach, tylko na żądanie organizatora albo przy pierwszym otwarciu po tym czasie. Wpisać do kryteriów.

**11. W · Kryteria 9-13, brak · Zamykanie i głosowanie bez wymagań na atomowość i autoryzację wiersza**
Kryterium 13 sprawdza tylko role. Brakuje wymagań, które w tej funkcji są realnym ryzykiem:
- `member_id` w `date_votes` ma pochodzić z `getTripAccess` (token urządzenia), nigdy z ciała żądania. Inaczej uczestnik zagłosuje za innego (IDOR).
- `option_id` musi należeć do `trip_id` z URL-a (głosowanie na opcję cudzego wyjazdu).
- Zapis głosu musi sprawdzać `status = open` w tym samym zapytaniu (wyścig z zamknięciem), usunięty członek nie zapisuje.
- Zamknięcie jako warunkowy `update … where status = 'open' returning`, tylko zwycięzca wyścigu wywołuje wyszukiwanie lotu i dopasowanie. Bez tego dwa kliknięcia „Zamknij” to 2× do 4 zapytań Sky plus 2× Gemini.
- Dodanie/usunięcie terminu tylko przy `open`, limit 5 opcji egzekwowany w bazie, nie w UI.
- Limit na uczestnika dla głosów (spec: `checkRateLimit`), a dla zapytań o ceny (dodawanie terminów) limit w bazie, bo licznik w pamięci nie ogranicza niczego na serverless.
**Poprawka:** dopisać jako kryteria 16-20 z testami: głos z cudzym `member_id` w ciele ignorowany; głos po zamknięciu 409; dwa równoległe „Zamknij” = jedno wyszukiwanie; opcja z innego wyjazdu 404.

**12. W · §7 ryzyko 2, hamulce · Hamulce kosztów opisane tak, jakby działały**
Brief: „Ryzyko jest po stronie… dziennego limitu `DAILY_CAP` Sky Scrappera”. Licznik jest lokalny dla instancji (potwierdza `loty` 2.3). Nie ma więc globalnego bezpiecznika dla Sky Scrappera. Dla Travelpayouts nie ma żadnego. Na zamknięciu najgorszy przypadek per wyjazd to: każde ponowne otwarcie i zamknięcie z inną datą to nowy klucz cache = nowe 1-2 zapytania + dopasowanie Gemini; brak limitu liczby zamknięć.
**Poprawka:** limit liczby zamknięć na wyjazd (np. 3 na dobę) w bazie, komunikat w głosie marki. Ocenę kosztu zrobić wspólnie z `loty` (decyzja Kacpra o budżecie zapytań dziennie jest tam; termin ma się do niej odnosić, nie dublować).

**13. W · §2 krok 6 i §6 · Brakujące kody lotnisk i przypadki, w których wyszukiwanie z założenia zwraca `null`**
`searchFlightForDates` zwraca `null`, gdy kodu nie ma w `SKY_IDS` (67 wpisów). `DestinationRecommendation` nie przechowuje kodu IATA celu (jest tylko `city`), a `flightWro/flightBer` to pola legacy. Brief w §6 wylicza przyczyny porażki („limit API, brak klucza”), ale pomija najczęstszą: brak kodu. Pytanie o lotnisko startowe (Q7): `quiz.airports` to tablica.
**Poprawka:** funkcja `resolveRoute(trip)` zwraca `{ originCode, destTp, destSky } | null`; źródło: `CATALOG` po nazwie miasta + `SKY_IDS`; `null` daje stan „Lotu nie sprawdzimy automatycznie. Wpiszcie loty ręcznie” i ankietę bez cen. Kryterium: test dla miasta spoza katalogu i spoza `SKY_IDS`.

**14. W · §6 „Własna data” i kryterium 2 · Własny termin o innej długości niż plan**
Dozwolone są własne daty (`Dodaj termin`), ale nigdzie nie ma reguły długości. Plan ma `days.length = duration`. Termin 5-dniowy na plan 3-dniowy oznacza, że dopasowanie „pierwszego i ostatniego dnia” nie wystarczy (brakujące dni), a 2-dniowy ucina plan. Dodatkowo `DayPlan.date` to etykieta „Dzień 1 – [dzień tygodnia jeśli znany]” (`gemini.ts:102`), a nie data kalendarzowa, więc po wyborze terminu etykiety dni tygodnia w środkowych dniach mogą być błędne albo ich brak.
**Poprawka:** w v1 własny termin ma tę samą długość co plan: użytkownik wybiera datę startu, koniec liczy się sam (komunikat „Plan ma 3 dni, więc wylot… powrót…”). Po zamknięciu serwer przelicza etykiety wszystkich dni (czysta funkcja, bez Gemini). Inna długość = zmiana planu poza tą funkcją. **Wymaga decyzji Kacpra**, jeśli chce dopuścić dłuższe/krótsze terminy.

**15. W · §6 brak · Terminy wygasają, gdy ankieta jest otwarta**
Brief wprost nie ma presji czasu (dobrze), ale ankieta może być otwarta tygodniami. Opcja z datą, która minęła lub wypadła w <7 dni, nadal jest głosowalna. Nie ma też wiersza o ankiecie, w której wszystkie opcje stały się przeszłe.
**Poprawka:** opcje z datą wylotu <= dziś są oznaczane „Ten termin już minął” i nie da się na nie głosować ani ich wybrać; gdy wszystkie minęły, karta proponuje „Dodaj nowe terminy”. Bez odliczania i bez ponaglenia.

**16. W · Cały brief kontra `plan` · Zamknięcie ankiety i zapis planu z części 5 (`409 DAY_CHANGED`)**
Brief `plan` (sekcje 18-27) wprowadza zapis na poziomie dnia i `409 DAY_CHANGED`. Brief `termin` o tym nie wspomina: dopasowanie dni 1 i N może trafić na konflikt z czyjąś zmianą tego dnia, a nie ma reguły, kto wygrywa, ani co z licznikiem, ani czy `system_dates` da się cofnąć (spec: `undo` zwraca `previous_day`).
**Poprawka:** dopisać do §6: konflikt przy dopasowaniu = bez ponawiania, komunikat „Dzień się zmienił. Dopasuj jeszcze raz.”, `system_dates` ma `previous_day` i jest cofalne tak jak inne zmiany. Zsynchronizować z właścicielem `plan` (jego zależność z sekcji 199 zakłada, że dopasowanie przechodzi przez ten sam zapis dnia).

**17. W · §3.3 „Lot dla grupy… Ryanair 06:30 → 09:15”, ryzyko 1 · Pokazywanie ceny dokładnej, której poprawność nie jest zweryfikowana**
`splitPrice` zakłada, że `price.raw` to cena całej rezerwacji, a TODO w kodzie mówi, że nikt tego nie sprawdził. `loty` robi z tego warunek wydania. Termin w kryterium 9 i makiecie 3.3 używa wyniku dla grupy, a w tekście „Termin: 20-22 lutego · 4 osoby” sugeruje sumę.
**Poprawka:** zależność w §7: „Ceny razem dla grupy po zamknięciu pokazujemy dopiero po teście z `loty` 2.4 pkt 1. Do tego czasu tylko cena za osobę z podpisem »szacunek«.” Dodać do listy zależności.

**18. W · §4 „Ponowne otwarcie, ostrzeżenie” i §6 · Ponowne otwarcie ma niedomknięte stany**
`chosen_option_id` nie ma klucza obcego. Po ponownym otwarciu organizator może usunąć opcję, która była wybrana, i wskaźnik zawisa. Brief mówi, że „poprzedni lot i daty planu zostają”, ale nie czy `chosen_option_id` jest czyszczone, ani co widzi uczestnik na karcie planu w międzyczasie (wybrany termin czy ankieta?). Nazewnictwo: §5 ma przycisk „Zmień”, §2/§3.3 „Otwórz ankietę ponownie”.
**Poprawka:** `chosen_option_id uuid references date_options(id) on delete set null`; w stanie `open` po ponownym otwarciu karta pokazuje ankietę z dopiskiem „Poprzedni wybór: 20-22 lutego”; jedna nazwa przycisku. Ostrzeżenie o kupionym bilecie przesunąć do czasu, gdy część 4 istnieje (patrz uwaga 28).

**19. W · §3.1 · Tabela na komputerze nie obsługuje grup o 6-9 osobach i imion do 40 znaków**
`MAX_GROUP = 9`, imię do 40 znaków. „Szeroka tabela, bo jest miejsce na imiona” na 1280 px przy 9 kolumnach z imionami nie mieści się. Brief nie określa zachowania na tabletach (768-1279 px) ani przy długich imionach.
**Poprawka:** do 5 członków: tabela z imionami w nagłówku; od 6: widok kart jak na telefonie albo skrócone imiona z pełnym `title`/`aria-label`; breakpoint kart ustawić po szerokości kontenera, nie samej szerokości okna. Dodać kryterium: 9 członków, imię 40 znaków, brak przewijania poziomego na 375 px i 1280 px.

**20. W · §3.1-3.2 · Dostępność: symbole bez nazw i błędne powołanie na spec**
Brief zapewnia, że stan to „tekst, nie sam kolor”, ale telefon pokazuje „Ania ✓ Michał ✗ Ola ·” i desktop „Pasuje / Mogę / Nie mogę” skrótami. Powołanie „jak w spec 3.4” jest nieprawdziwe (patrz sekcja A). Brak: semantyki grupy przycisków (`role="radiogroup"` albo `aria-pressed`), fokusu po błędzie, ogłoszenia zmiany („Zapisano”) dla czytników, odróżnienia „jeszcze nie” od „nie mogę” bez koloru. Znak ✓/✗ na iOS potrafi renderować się jako emoji, co kłóci się z BRAND.md.
**Poprawka:** w odczycie cudzych głosów użyć krótkich słów (Pasuje / Jak trzeba / Nie mogę / jeszcze nie) lub ikon SVG z `aria-label`; przyciski głosu jako grupa z `aria-pressed`, `aria-live="polite"` dla zapisu i błędu; kontrast WCAG 2.1 AA w jasnym i ciemnym motywie; dodać kryterium dostępności. Usunąć powołanie na spec 3.4.

**21. W · §3.2, §4 · Skrócenie „Mogę, jak trzeba” do „Mogę” zmienia znaczenie głosu**
Decyzja Kacpra to „mogę, jak trzeba”. Na telefonie brief proponuje „Mogę” z pełnym tekstem tylko w `aria-label`. Widzący użytkownik nie widzi różnicy między „Pasuje” a „Mogę”, a ranking traktuje je odmiennie. Makieta ma jeszcze trzecią wersję: „Mogę, jak”.
**Poprawka:** trzy równe przyciski z dwuwierszowymi etykietami albo skrócenie do „Jak trzeba” (nie „Mogę”); jedna wersja w całym UI, makiety poprawić.

**22. W · §5 „Wcześniej na ścieżce” · Przycisk „Ustalmy termin” dopiero po dołączeniu kogoś utrudnia przepływ**
Przycisk pojawia się, gdy jest ≥1 zajęte miejsce poza organizatorem. Zaproszenie i głosowanie to wtedy dwie osobne wiadomości na czacie. `groupMessage('vote')` zakłada, że gość ma już rolę, a link prowadzi do planu. Kto wejdzie z tego linku bez dołączenia, trafia na `/dolacz/{token}`? Brief mówi „albo od razu plan, jeśli już dołączył”, ale link w tekście `vote` to link do planu, nie do zaproszenia.
**Poprawka:** link w `groupMessage('vote')` ma być linkiem zaproszenia (`/dolacz/{token}`), który dla już dołączonych przekierowuje na plan (spec 2.4 już tak robi). Ustalić to z właścicielem `zaproszenia`. Rozważyć, czy gating jest potrzebny: organizator może chcieć najpierw ustawić terminy, a potem wysłać jedną wiadomość „dołącz i zagłosuj”.

**23. W · §4 teksty do wklejenia · Rodzaje wiadomości i gramatyka**
- `groupMessage` w spec 2.7 ma rodzaje: zaproszenie, przypomnienie o głosowaniu, „termin ustalony, kupujemy bilety”, „rozliczmy się”. `zaproszenia` używa `"invite"`, `rozliczenia` `'settle'`, `plan` ma jeszcze prośbę o Przepustkę, a `termin` używa `'vote'` i `'reminder'` oraz niepodpisanego trzeciego. Dwa teksty „termin ustalony” istnieją równolegle: ten z `termin` (§4) i ten z `loty` (171).
- „Ola, Michał: brakuje Waszych głosów” nie zgadza się liczbą przy jednej osobie. „Mamy 4 terminy” jest zaszyte na sztywno. Daty w mianowniku w UI („20-22 lut”) i dopełniaczu w tekście („20-22 lutego”) wymagają funkcji formatującej z przejściem przez granicę miesiąca („27 lutego-1 marca”).
- Publiczne wymienianie imion w czacie grupy to lekka presja społeczna, a decyzja Kacpra to „bez sztucznej presji”. Organizator powinien móc wybrać wersję bez imion.
**Poprawka:** jedna definicja w części 2: `type GroupMessageKind = "invite" | "vote" | "reminder" | "dateSet" | "settle" | "passRequest"`, z testem snapshot na polskie formy liczby (1, 2-4, 5+) i granicę miesiąca. Jedno miejsce dla tekstu „termin ustalony” (właściciel: `termin`, `loty` tylko linkuje). Przypomnienie w dwóch wariantach: z imionami i „Brakuje jeszcze kilku głosów”.

### Drobne

**24. D · §2.1 „Pomijamy terminy, w które ten sam przewoźnik nie lata (nie sprawdzamy, bo koszt)”** · Zdanie jest sprzeczne wewnętrznie: pomijamy, ale nie sprawdzamy. **Poprawka:** usunąć albo zamienić na „Nie sprawdzamy, czy przewoźnik lata w danym terminie. Cena to tylko wskazówka”.

**25. D · §2.1 „Miesiąc już trwa albo minął: bierzemy ten sam miesiąc kolejnego roku”** · Jeśli miesiąc trwa i zostały jeszcze weekendy ≥7 dni od dziś (dziś 15 listopada, quiz „listopad”), reguła niepotrzebnie przeskakuje o rok. Brak też tekstu „mówimy to wprost” w tabeli §4. **Poprawka:** przeskok roku tylko gdy w miesiącu nie zostaje żaden pasujący termin; dodać tekst „Ten miesiąc już prawie minął, więc proponujemy luty 2027”.

**26. D · §5 Pomiar `date_vote_changed`** · Klient nie wie, czy to zmiana, bez round-tripu. **Poprawka:** wysyłać zdarzenie z odpowiedzi serwera (pole `changed: true`) albo zrezygnować; sprawdzić zgodę GA (zdarzenia lecą przez `trackEvent` z Consent Mode, gość widzi baner po raz pierwszy w trakcie głosowania).

**27. D · §3.3 „Plan dopasowany do lotu (pierwszy i ostatni dzień)”** · Napis pojawia się bezwarunkowo, także gdy dopasowania nie było (różnica ≤1 h) albo się nie udało. Twierdzenie jest też zbyt silne: dopasowanie do oferty, nie do lotu, który ekipa kupi. **Poprawka:** pokazywać tylko po faktycznym zapisie dnia, tekst „Dopasowaliśmy pierwszy i ostatni dzień do wybranej oferty lotu. Kupicie inny lot, plan możecie dopasować jeszcze raz.”

**28. D · §6 wiersz „Ponowne otwarcie… Jeśli ktoś oznaczył już bilet (część 4)”, pytanie 8** · Część 4 jeszcze nie istnieje, a brief zakłada istnienie zakupów. **Poprawka:** wiersz oznaczyć jako „po wdrożeniu części 4”, pytanie 8 zdjąć z listy przed budową (ostrzeżenie wystarczy, bo blokada nie ma uzasadnienia).

**29. D · §6 wiersz „Organizator usuwa propozycję z głosami”** · „Głosy znikają kaskadowo”, ale uczestnik, który właśnie zagłosował, nie dowiaduje się, że jego głos zniknął. Nie ma też obsługi sytuacji, w której organizator usunie wszystkie opcje poza jedną. **Poprawka:** minimum 2 opcje także przy usuwaniu; po odświeżeniu karta pokazuje „Organizator usunął jeden z terminów”.

**30. D · §3.2 „Sortowanie na telefonie: ranking, na komputerze: chronologicznie”** · Różne kolejności tej samej listy na dwóch urządzeniach tej samej osoby, a na telefonie karty skaczą po każdym głosie (zmiana rankingu w trakcie klikania). **Poprawka:** na telefonie też chronologicznie, a najlepszy termin wyróżniony; ranking tylko w odrębnej linii „Prowadzi: 20-22 lut”.

**31. D · §3.1 wiersz „Zamknij i wybierz termin” widzi tylko organizator, uczestnik „Czekamy, aż organizator wybierze”** · To zdanie jest biernym czekaniem, a decyzja Kacpra to bez presji. OK, ale brak stanu „organizator nie zagląda od dawna”. Nie dodawać przypomnień dla organizatora (bez powiadomień), tylko wspomnieć w §6, że to świadomie brak. **Poprawka:** jedno zdanie w §6.

**32. D · Dokument vs. spec: pytania 4, 6, 8, 9** · Pytanie 4 (brak odpowiedzi = „jeszcze nie”) jest już ustalone przez zakres decyzji o trzech głosach i nie musi iść do Kacpra. Pytanie 9 (sprzedaż na stronie głównej i w quizie) należy do `strona-glowna`/`zaproszenia`, a nie do funkcji terminu.

## C. Sprzeczności z innymi briefami

| Brief | Sprzeczność | Uwaga |
|---|---|---|
| `loty` | Obaj zapisują lot po zamknięciu do `flight_data`, w dwóch kształtach; `loty` ma osobny PR „aktywacja lotów” i bramkę testu na żywo | 2, 17 |
| `loty` | Dwa teksty „termin ustalony” (`termin` §4 i `loty` 171) | 23 |
| `loty` | `loty` 3A pkt 2: „Wybierzcie lot” bez ankiety zatwierdza daty. Nie opisano, co robi wtedy przycisk „Ustalmy termin” (czy wolno uruchomić ankietę, gdy `flight_data` ma już daty, i co wygrywa) | dopisać do §6 |
| `plan` | `409 DAY_CHANGED`, `apply_day_change`, ID punktów i reakcje a regeneracja dni 1 i N | 1, 16 |
| `zaproszenia` | Miejsca „Osoba N”, dwie osoby na jednym telefonie, link `vote` a `/dolacz` | 7, 22 |
| `strona-glowna` | „przy każdym widać cenę lotu” (151) kontra przewidywane „brak ceny” | 3 |

## D. Odpowiedzi na „otwarte pytania” przed budową

| Pytanie | Potrzebne przed budową? |
|---|---|
| 1. Daty w planie / `flight_data` | Nie jako pytanie do Kacpra: odpowiedź wynika z uwagi 2 (wspólna funkcja z `loty`). Potrzebna jest za to koordynacja PR-ów. |
| 2. Ceny na dowolne daty | Tak. To decyzja o zakresie PR-u. Rekomendacja: ankieta bez cen w pierwszym PR, ceny w drugim, po sprawdzeniu dokumentacji Travelpayouts (uwaga 9). Obecna propozycja („w tym samym PR”) wiąże wydanie z niepewnym zapytaniem. |
| 3. Kto zamyka | Nie. Spec mówi: organizator. Proponowana podpowiedź po komplecie głosów jest OK. |
| 4. Brak odpowiedzi | Nie (patrz uwaga 32), ale konsekwencje dla rankingu już tak (uwaga 8). |
| 5. Zamknięcie z odmową | Nie, brief już to przyjmuje z jednym potwierdzeniem. Można zostawić jako informację. |
| 6. Próg 7 dni | Tak, ale tylko jako parametr. Rekomendacja: stała w konfiguracji (domyślnie 7, bo plan i lot potrzebują czasu), bez dalszej dyskusji. |
| 7. Wiele lotnisk | Tak, mała decyzja. Rekomendacja: organizator wskazuje lotnisko przy tworzeniu ankiety, domyślnie pierwsze z quizu, i zapisuje je w `date_polls`. `loty` zakłada jedno lotnisko z quizu, więc ma być jedno źródło prawdy. |
| 8. Ponowne otwarcie po kupnie biletu | Nie (część 4 nie istnieje; ostrzeżenie wystarczy). |
| 9. Zdanie w quizie | Nie dla tej funkcji (właściciel: `strona-glowna`/`zaproszenia`). |

## E. Kryteria akceptacji: ocena sprawdzalności

- Sprawdzalne bez zmian: 3 (częściowo), 4, 7, 9, 13, 14 (przegląd tekstów jest ręczny, dodać test, który skanuje klucze tekstowe pod kątem `!` i emoji), 15.
- Niesprawdzalne lub niepełne: 1 (nie mówi, co z organizatorem, gdy zajęte miejsce zostanie potem usunięte), 2 (sprzeczne, uwagi 5 i 6), 5, 6 (patrz uwaga 7), 8 („w pobliżu” jest nieostre; zdefiniować: ten sam węzeł DOM/linia), 10 (zależy od `plan`, patrz uwaga 1), 11 (brak błędu Gemini), 12 (jak sprawdzić „nie ulegają zmianie”: porównanie `ai_plan_json` i `flight_data` przed i po).
- Brakuje: autoryzacji wiersza (uwaga 11), dostępności (20), widoku `/share` (nie powinien pokazywać karty terminu ani imion: brief tego nie mówi, a spec 2.6 zostawia `/share` jako publiczny podgląd), limitów (12), wygasłych opcji (15), długości terminu (14), dużych grup (19).

## F. Werdykt: **Z poprawkami**

Zakres, głos i przepływ są dobre, a ocena „Wymaga prac” przy cenach jest uczciwa. Do budowy brakuje: poprawienia mechanizmu dopasowania planu (1), ustalenia magazynu dat i podziału z `loty` (2), spójnej maszyny stanów i reguł generatora (5, 6), rankingu, który nie premiuje braku głosów (8), opisu architektury cen (9) i wymagań autoryzacyjnych (11). Żadne z tych nie wymaga przepisania briefu od zera.

### Uwagi wymagające decyzji Kacpra

1. **Uwaga 1:** dopasowanie planu automatycznie po zamknięciu (spec 3.5) czy przyciskiem po wyborze oferty lotu. Rekomendacja: przyciskiem.
2. **Uwaga 14:** czy własny termin może mieć inną długość niż plan. Rekomendacja: nie w v1.
3. **Uwaga 9 / pytanie 2:** czy ceny wchodzą w tym samym PR co ankieta. Rekomendacja: ankieta bez cen najpierw, ceny po sprawdzeniu dokumentacji Travelpayouts.
4. **Uwaga 12 (wspólnie z `loty`):** budżet zapytań dziennie i miejsce licznika (baza zamiast pamięci procesu). Decyzja jest już zaplanowana w `loty`; termin ma na nią czekać.
5. **Uwaga 8:** zgoda na odstępstwo od spec 3.4 (brakujące odpowiedzi w rankingu).
6. **Pytanie 7:** kto wskazuje lotnisko (organizator przy tworzeniu ankiety). Rekomendacja: tak.
