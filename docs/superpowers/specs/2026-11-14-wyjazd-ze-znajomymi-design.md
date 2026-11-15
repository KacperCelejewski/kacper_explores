# Wyjazd ze znajomymi — design

Data: 2026-11-14 · Wyjazdy grupowe we Włóczykiju, części 1–6 · Pisane pod `origin/main` (`9fb4ae8`) · Zależy od `2026-11-11-przepustka-na-wyjazd-design.md`

## Po co

Znajomi, którzy chcą razem wyjechać, potykają się po kolei o te same rzeczy: zgranie terminu, kupienie tych samych lotów, uzgodnienie planu i rozliczenie, kiedy raz płaci jeden, a raz drugi. Dziś Włóczykij liczy wszystko pod jedną osobę:
- loty szuka dla jednego dorosłego (`adults=1` w `src/lib/flights/rapidapi.ts`, `1` na końcu ścieżki w `buildAviasalesUrl`, `adultsv2=1` w `buildSkyscannerUrl`, `group_adults: "1"` w `bookingLink`);
- prompt planu zna tylko etykietę „grupa znajomych” albo „rodzina z dziećmi”, bez liczby osób;
- wyjazd ma jednego właściciela, a `/share/{id}` jest tylko do oglądania;
- czat nie zapisuje historii na serwerze, bo klient wysyła ją w każdym żądaniu;
- `BudgetTracker` trzyma sumy w `localStorage` jednego telefonu i nie wie, kto płacił.

Cel: kiedy ktoś zaznacza w quizie znajomych albo rodzinę, Włóczykij liczy wyjazd pod całą grupę i podsuwa rzeczy, o których ekipa sama by nie pomyślała. Potem prowadzi grupę przez termin, loty, plan i rozliczenia, a znajomi nie muszą zakładać kont.

Grupy są w PRODUCT.md drugorzędną grupą odbiorców. Ta funkcja dokłada dla nich pełny przepływ, ale solo i para działają jak dziś.

Miary sukcesu (propozycja Claude'a):
- odsetek wyjazdów „znajomi” i „rodzina”, w których organizator zaprosił ekipę, i średnia liczba osób, które dołączyły;
- odsetek wyjazdów grupowych z zamkniętym terminem, z oznaczonymi biletami i z co najmniej jednym wydatkiem;
- liczba osób, które pierwszy raz trafiły do Włóczykija z zaproszenia;
- przychód z Przepustek i prowizji na wyjazd grupowy w porównaniu z solo.

## Decyzje

Ustalone z Kacprem 2026-11-14:
- Grupy to pełnoprawny przypadek. Solo i para bez zmian.
- Loty grupy z **jednego wspólnego lotniska**. Różne miasta później.
- Znajomi dołączają **bez konta**: link, wybór imienia z listy, telefon zapamiętuje. Konto opcjonalnie, żeby mieć wyjazd na innych urządzeniach.
- **Jedna Przepustka (4,99 zł) na wyjazd działa dla wszystkich uczestników.** Funkcje grupy (zaproszenia, termin, loty, reakcje, historia, rozliczenia) są darmowe. Darmowe limity bez Przepustki (2 zmiany, 5 pytań) są wspólne dla wyjazdu.
- **Najpierw gdzie, potem kiedy:** organizator robi quiz i plan, zaprasza ekipę, grupa wybiera termin.
- **Plan zmieniają wszyscy uczestnicy**, z historią, cofaniem i reakcjami.
- **Dostęp przez własny token urządzenia** i trasy API z kluczem serwisowym (podejście A niżej).
- Budujemy wszystkie części po kolei, według jednego planu wdrożenia.

Zaproponowane w rozmowie i przyjęte przez Kacpra (szczegóły w częściach): skład grupy w quizie z wiekiem dzieci, cena na osobę i razem, porównanie z ceną dla jednej osoby tylko przy najlepszej ofercie, ankieta terminów z trzema odpowiedziami i cenami z pamięci podręcznej Travelpayouts, dwa sposoby kupna biletów, odświeżanie ceny przy otwarciu karty bez powiadomień, wspólny czat, tryb „Rozdzielmy się”, rozliczenia w złotych po kursie NBP, rozliczenia domyślnie wyłączone dla rodziny, teksty do wklejenia na grupę zamiast własnych powiadomień.

Odrzucone albo odłożone:
- **Droższa Przepustka grupowa:** płatność stałaby, zanim znajomi dołączą, a to moment, w którym każdy zaproszony poznaje Włóczykija.
- **Zmiany planu tylko przez organizatora:** wszystko stałoby na jednej osobie, która już ogarnia termin i loty.
- **Dołączanie z kontem:** część ekipy by nie dołączyła, a termin, reakcje i rozliczenia działają tylko z całą grupą.
- **Osobne salda w każdej walucie:** dokładniejsze, ale trudne do oddania BLIK-iem.
- **Powiadomienia o spadkach cen lotu dla grupy:** to obszar alertów Pro z modelu „D”. Darmowe dla grup podcięłyby Pro.
- **Na później:** loty z różnych miast, „najpierw kiedy” (grupa zaznacza wolne terminy, Włóczykij szuka celu), ekipa jako encja na wiele wyjazdów, zmiany na żywo, powiadomienia dla gości, zdjęcia paragonów.

## Podejścia

Część 1 nie potrzebuje nowej warstwy dostępu. Wybór dotyczył tego, jak serwer rozpoznaje uczestnika bez konta w częściach 2–6.

**A. Własny token urządzenia, wszystko przez trasy API (wybrane).** Nowe tabele mają włączone RLS i żadnych polityk, tak jak tabele po `close_rls_gaps`. Telefon dostaje ciasteczko z losowym tokenem, w bazie jest tylko skrót. To ten sam mechanizm, który etap 3 Przepustki buduje dla `wl_owner`, więc powstaje raz. `getTripAccess` dostaje rolę uczestnika.
- Plusy: nic nowego w infrastrukturze, RLS zostaje zamknięte, jedna tożsamość gościa w całej aplikacji.
- Minusy: każda akcja wymaga trasy API. Zmiany na żywo w przyszłości przyjdą przez Broadcast z serwera.

**B. Anonimowe konta Supabase (odrzucone).** Gość staje się anonimowym użytkownikiem, klient czyta i zapisuje bezpośrednio pod politykami RLS opartymi na członkostwie, a Realtime działa od razu.
- Odrzucone, bo: znowu otwiera RLS dla kilku tabel, a tam były dziury z etapu 0. Supabase zaleca CAPTCHA przy anonimowym logowaniu, co dokłada krok w przeglądarce Instagrama. Obok `wl_owner` powstałby drugi model tożsamości gościa.

**C. Ekipa jako osobna encja przed wyjazdem (odrzucone na teraz).** Przydałaby się przy „najpierw kiedy” i powtarzanych wyjazdach. Przy „najpierw gdzie” wyjazd zawsze jest pierwszy. Da się ją dodać później, podpinając `trip_members` pod ekipę.

## Kolejność i zależności

| Część | Co | Zależy od |
|---|---|---|
| 1 | Grupa w quizie, lotach i kosztach | nic, można budować od razu |
| 2 | Zaproszenia i uczestnicy | nic, buduje `getTripAccess` z samymi rolami (patrz niżej) |
| 3 | Wspólny termin | część 2 |
| 4 | Wspólne loty | części 1, 2, 3 (karta działa też bez ankiety) |
| 5 | Wspólny plan | część 2, tryb „Rozdzielmy się” wymaga `/api/modify-day` z etapu 2 Przepustki |
| 6 | Rozliczenia | części 2 i 4 |

- Każda część to osobny PR.
- **Decyzja Kacpra (2026-11-14): grupy budujemy od razu, bez czekania na etap 2 Przepustki.** Część 2 tworzy `getTripAccess` i `TripAccess` tylko z rolami (`role`, `memberId`). Dopóki nie ma Przepustki, uczestnicy mają to, co dziś ma właściciel: zmiany z AI i czat bez licznika, pod dziennym limitem AI organizatora. Etap 2 Przepustki dokłada potem do tej samej funkcji `hasPass`, `freeEditsLeft` i `freeChatLeft` (wspólne dla wyjazdu) i bramki. Opisy `hasPass` i wspólnych liczników w częściach 2.5 i 5.1 dotyczą stanu po etapie 2.
- Tryb „Rozdzielmy się” (5.5) wchodzi razem z `/api/modify-day`. Jeśli grupy będą gotowe wcześniej, 5.5 czeka na ten endpoint, a reszta części 5 idzie bez niego.
- Zakup Przepustki przez uczestnika bez konta działa dopiero po etapie 3 Przepustki (zakup bez logowania). Do tego czasu kupuje organizator.
- Token urządzenia (2.1) budujemy zgodnie z punktem 3.1 spec Przepustki. Która praca wejdzie pierwsza, ta go buduje, a druga używa.

## Część 1 — grupa w quizie, lotach i kosztach

### 1.1 Skład grupy

`src/types/index.ts`:

```ts
export interface GroupComposition {
  adults: number;          // dorośli, w tym organizator
  childrenAges: number[];  // wiek każdego dziecka w latach, 0–17
}

export interface QuizAnswers {
  // …istniejące pola
  group?: GroupComposition;
}
```

Czyste funkcje w `src/lib/group.ts`:
- `groupFromCompanion(companion, group?)`: solo daje `{ adults: 1 }`, para `{ adults: 2 }`, znajomi domyślnie 4 dorosłych, rodzina domyślnie 2 dorosłych bez dzieci. Brak `group` w starych zapisach (`src/lib/store.ts`, `quiz_answers` w bazie) czytamy jak solo albo parę według `companion`.
- `groupSize(group)`: liczba miejsc w samolocie, czyli dorośli i dzieci od 2 lat.
- `toFlightPassengers(group)`: `{ adults, children, infants }`. Dziecko poniżej 2 lat to niemowlę, od 2 do 11 lat to dziecko, od 12 lat dorosły. Progi trzeba sprawdzić z dokumentacją Sky Scrappera.
- `MAX_GROUP`: górna granica pasażerów, jaką przyjmuje Sky Scrapper. Do sprawdzenia w dokumentacji.

Quiz (`src/app/quiz/page.tsx`) i szybka ścieżka (`src/app/quick/page.tsx`):
- przy „Znajomi” pod kartą pojawia się licznik osób (od 3 do `MAX_GROUP`, domyślnie 4);
- przy „Rodzina” pojawiają się liczniki dorosłych i dzieci, a każde dziecko dostaje wybór wieku;
- solo i para nie dostają żadnego nowego pola;
- `src/lib/quizSummary.ts` dopisuje skład do podsumowania („4 osoby”, „2 dorosłych, dzieci 4 i 7 lat”).

### 1.2 Propozycje celów

Ceny celów pochodzą z pamięci podręcznej Travelpayouts i są liczone dla jednej osoby. Przy grupie większej niż 1 karta celu pokazuje „od 129 zł/os · ok. 516 zł za 4 osoby” z dopiskiem, że to szacunek. Niemowlęta nie liczą się do sumy. Dotyczy wszystkich miejsc, które pokazują cenę celu po quizie (`/destinations` i pokrewne). Builder znajduje je w kodzie.

### 1.3 Dokładne loty

- `searchFlightOptions`, `searchCheapestFlight` i `fetchForDate` w `rapidapi.ts` przyjmują pasażerów z `toFlightPassengers` i przekazują ich do Sky Scrappera. Nazwy parametrów (`adults`, `childrens`, `infants`) i to, czy cena w odpowiedzi jest za osobę, czy za całą rezerwację, trzeba sprawdzić w dokumentacji.
- `FlightOffer.price` zostaje ceną za osobę. Dochodzą `passengers` (skład) i `totalPrice` (razem w PLN).
- Klucz w `flight_cache` uwzględnia pasażerów, np. `sky-WRO-BCN-2026-02-20-2026-02-22-a4c0i0`. Dla jednego dorosłego klucz zostaje taki jak dziś, żeby nie stracić istniejącej pamięci.
- **Porównanie z jedną osobą.** Tylko dla najlepszej oferty i tylko przy grupie większej niż 1 idzie drugie zapytanie z jednym dorosłym na te same daty. Jeśli cena za osobę dla jednej osoby jest niższa o co najmniej 5 zł, karta pokazuje: „Jedna osoba poleci za 129 zł, ale w tej cenie nie ma już 4 miejsc.” Gdy `canCallApi()` odmawia, porównanie się pomija.
- **Linki:**
  - `buildAviasalesUrl` dostaje pasażerów, a liczbę osób koduje w ścieżce. Format dzieci i niemowląt w ścieżce Aviasales trzeba sprawdzić. Jeśli się nie da, link podaje dorosłych, a karta mówi „Dzieci dodasz na stronie wyszukiwarki”.
  - `buildSkyscannerUrl` dostaje `adultsv2` i `childrenv2` z wiekiem dzieci (format do sprawdzenia).
  - `bookingLink` w `src/lib/affiliate.ts` dostaje `group_adults`, `group_children`, `age` dla każdego dziecka i `no_rooms=1`, żeby Booking pokazywał całe apartamenty dla grupy.
  - `hostelworldLink` dostaje liczbę gości, jeśli Hostelworld ma taki parametr.

### 1.4 Plan

`buildPrompt` w `src/lib/gemini.ts`:
- `PROFIL PODRÓŻNIKA` dostaje skład: „4 dorosłych” albo „2 dorosłych, dzieci: 4 i 7 lat”;
- wszystkie koszty (aktywności i `budgetBreakdown`) są wprost **za osobę**, a nocleg to udział jednej osoby w realnej opcji dla tej grupy, np. apartament dla czterech podzielony na cztery;
- `companionGuide` dla znajomych i rodziny prosi o wskazówki tam, gdzie liczba osób zmienia rachunek: taksówka z lotniska zamiast N biletów, apartament zamiast łóżek w hostelu, bilety rodzinne i grupowe, darmowe wejścia dla dzieci, rezerwacja stolika dla dużej grupy. Bez wymyślonych cen i godzin, tak jak w reszcie promptu.

Interfejs planu:
- nagłówek budżetu pokazuje kwotę na osobę i razem. „Razem” liczy kod: koszt na osobę razy `groupSize` (niemowlęta nie liczą się). To szacunek i tak jest podpisany;
- karta lotu w planie (z etapu 1 Przepustki) pokazuje cenę na osobę, razem i ewentualnie linijkę z porównaniem z 1.3;
- `BudgetTracker` dostaje `plannedTotal` dla całej grupy. W części 1 dalej zapisuje w `localStorage`.

### 1.5 Pomiar

`plan_generated` dostaje parametr `group_size`.

## Część 2 — zaproszenia i uczestnicy

### 2.1 Token urządzenia

Ciasteczko `wl_owner` z punktu 3.1 spec Przepustki służy też jako token uczestnika grupy: losowe 32 bajty, `httpOnly`, `Secure`, `SameSite=Lax`, jedno na urządzenie, w bazie tylko skrót SHA-256. Ważność 90 dni, przedłużana przy każdej wizycie (propozycja Claude'a, żeby aktywna grupa nie traciła dostępu w trakcie planowania). To ciasteczko niezbędne do działania usługi, więc nie wymaga zgody. Trafia do `/cookies` i polityki prywatności.

### 2.2 Dane

```sql
create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  role text not null check (role in ('organizer', 'member')),
  user_id uuid references auth.users(id) on delete set null,
  device_token_hash text,        -- null = miejsce czeka na osobę
  joined_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index on public.trip_members (trip_id, device_token_hash)
  where device_token_hash is not null and removed_at is null;

create table if not exists public.trip_invites (
  trip_id text primary key references public.trips(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);

alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;
-- bez polityk: dostęp tylko kluczem serwisowym
```

Wyjazd jest grupowy, jeśli ma wiersze w `trip_members`. Organizator to właściciel wyjazdu (`trips.user_id`) i ma wiersz z `role = 'organizer'`.

### 2.3 Zaproszenie

- Plan wyjazdu z `companion` „znajomi” albo „rodzina” i co najmniej dwoma dorosłymi ma przycisk „Zaproś ekipę”.
- Pierwsze kliknięcie zakłada wiersz organizatora i tyle wolnych miejsc, ilu jest jeszcze dorosłych w składzie: „Osoba 2”, „Osoba 3”… Organizator może od razu poprawić imiona. Dzieci nie dostają miejsc.
- Link to `/dolacz/{token}`, z losowymi 32 bajtami w base64url. W bazie jest tylko skrót. „Nowy link” podmienia wiersz w `trip_invites` i stary link przestaje działać.
- Panel zaproszenia ma „Kopiuj link”, „Wyślij na WhatsAppa” (`wa.me` z samym tekstem, bez numeru) i systemowe udostępnianie (`navigator.share`), jeśli jest.
- Podgląd linku (og:image i tytuł) pokazuje miasto i daty, bez imion.

### 2.4 Dołączanie

`/dolacz/{token}`:
- pokazuje miasto, daty, imię organizatora i listę miejsc;
- jeśli to urządzenie już jest w tym wyjeździe, przekierowuje na `/plan/{id}`;
- wybór wolnego miejsca przypisuje do niego skrót tokenu urządzenia i ustawia `joined_at`. Można poprawić imię;
- „Nie ma mnie na liście” dodaje nowe miejsce, do `MAX_GROUP` dorosłych. Nowa osoba zwiększa `adults` w składzie grupy, a cena lotu oznacza się jako do odświeżenia;
- wybór miejsca, które już ktoś zajął, pyta „To Ty na nowym telefonie?” i przenosi miejsce na to urządzenie. Poprzednie urządzenie traci dostęp. Wpis trafia do historii (5.3). To świadomie przyjęte ryzyko podszycia się wśród znajomych;
- zalogowany użytkownik, który dołącza, dostaje `user_id` przy swoim miejscu, a wyjazd pojawia się w jego profilu.

Po każdym logowaniu `src/app/auth/callback/route.ts` przypina do konta miejsca z tokenem tego urządzenia, tak jak etap 3 Przepustki przypina wyjazdy.

### 2.5 Dostęp

`getTripAccess(tripId, viewer)` ze spec Przepustki:
- `Viewer` to `{ userId?: string; deviceTokenHash?: string }`;
- `TripAccess` dostaje `role: "organizer" | "member" | null` i `memberId: string | null`;
- `hasPass` i darmowe liczniki z `trip_usage` dotyczą każdego z rolą. Liczniki są na wyjazd, więc są wspólne.

Trasy, które dziś sprawdzają `user_id` właściciela, przechodzą na klienta serwisowego i `getTripAccess`. Wpuszczają każdego z rolą: `GET /api/trips/[tripId]`, zapisy planu, `regenerate-day`, `swap-activity`, `modify-day`, `chat`, `packing-list`, `restaurants`, PDF.

Tylko organizator może: zmieniać imiona innych i ich usuwać, generować nowy link, zamykać i otwierać ankietę terminu, usuwać wyjazd, zmieniać `is_public`.

Dzienny limit AI (`guardAiCall`) dla wywołań uczestników liczy się na konto organizatora (`trips.user_id`). Goście nie mają kont, a organizator zawsze ma. Komunikat po przekroczeniu: „Dzienny limit AI dla tego wyjazdu się skończył. Wróćcie jutro.”

Usunięcie uczestnika ustawia `removed_at`. Jego urządzenie traci dostęp, a jego wydatki zostają w rozliczeniach z dopiskiem „usunięty z wyjazdu”.

### 2.6 Widok uczestnika

- Plan wygląda tak samo jak u organizatora, z dopiskiem „Jesteś jako Ania · zmień”.
- Nagłówek planu pokazuje inicjały uczestników.
- `/share/{id}` zostaje widokiem tylko do oglądania dla osób spoza grupy.

### 2.7 Teksty do wklejenia na grupę

Czysta funkcja `groupMessage(kind, ctx)` w `src/lib/groupMessages.ts` składa teksty w głosie z BRAND.md: zaproszenie, przypomnienie o głosowaniu, „termin ustalony, kupujemy bilety”, „rozliczmy się”. Każdy tekst zawiera link. Uczestnicy bez konta nie dostają od nas maili. Włóczykij nie zastępuje czatu grupy, tylko daje gotowy tekst.

## Część 3 — wspólny termin

### 3.1 Dane

```sql
create table if not exists public.date_polls (
  trip_id text primary key references public.trips(id) on delete cascade,
  status text not null check (status in ('open', 'closed')),
  chosen_option_id uuid,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.date_options (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  depart_date date not null,
  return_date date not null,
  est_price_per_person int,       -- PLN, szacunek z Travelpayouts, null = brak ceny
  price_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.date_votes (
  option_id uuid not null references public.date_options(id) on delete cascade,
  member_id uuid not null references public.trip_members(id) on delete cascade,
  answer text not null check (answer in ('yes', 'maybe', 'no')),
  updated_at timestamptz not null default now(),
  primary key (option_id, member_id)
);
-- RLS włączone, bez polityk
```

### 3.2 Propozycje terminów

- Organizator klika „Ustalmy termin”.
- Pierwszą propozycją są daty, z którymi powstał plan. Włóczykij dokłada 2–4 kolejne terminy o długości z quizu w miesiącu z quizu. Wyjazdy do 4 dni zaczynają się w czwartek albo w piątek, dłuższe w sobotę. Reguły wyboru dat są propozycją Claude'a i builder może je dopracować (por. `src/lib/drop/dates.ts`).
- Przy każdym terminie jest szacunkowa cena lotu za osobę z pamięci podręcznej Travelpayouts dla tych dat i tego lotniska, bez zapytań do Sky Scrappera. Endpoint z cenami na konkretne daty trzeba wybrać w dokumentacji Travelpayouts. Brak danych daje „brak ceny”, a głosowanie działa dalej.
- Organizator może dodać własny termin i usuwać propozycje, dopóki ankieta jest otwarta.

### 3.3 Głosowanie

- Każdy uczestnik zaznacza przy każdym terminie „pasuje”, „mogę, jak trzeba” albo „nie mogę” i może zmieniać zdanie do zamknięcia ankiety.
- Widać, kto jeszcze nie zagłosował, i przycisk z tekstem przypomnienia z 2.7.
- Bez odliczania czasu i bez sztucznej presji.

### 3.4 Wynik

Czysta funkcja `rankDateOptions(options, votes, members)`:
1. najpierw terminy bez żadnego „nie mogę”;
2. potem mniej odpowiedzi „mogę, jak trzeba”;
3. potem niższa cena (brak ceny na końcu).

Najlepszy termin dostaje dopisek „Wszyscy mogą i jest najtaniej” albo „Wszyscy mogą”. Jeśli każdy termin ma jakieś „nie mogę”, nad listą jest napis „Nie ma terminu dla wszystkich” i wyróżniony termin z najmniejszą liczbą odmów.

```
Kiedy lecimy do Barcelony?               3 z 4 zagłosowało

13–15 lut     Ty ✓  Ania ✓  Michał ✗          ok. 249 zł/os
20–22 lut     Ty ✓  Ania ✓  Michał ✓          ok. 159 zł/os
              Wszyscy mogą i jest najtaniej
27 lut–1 mar  Ty ✓  Ania ~  Michał ✓          ok. 189 zł/os

Czeka na: Ola     [Skopiuj przypomnienie na grupę]
```

### 3.5 Zamknięcie

Organizator zamyka ankietę i wybiera termin (domyślnie pierwszy z rankingu). Wtedy:
- idzie dokładne wyszukiwanie lotu dla całej grupy (1.3) na te daty z lotnisk z quizu. Wynik zapisuje się w `trips.flight_data`;
- jeśli godziny przylotu albo wylotu różnią się od tych w planie o więcej niż godzinę, pierwszy i ostatni dzień planu dopasowują się do nowych godzin (logika `calcTripSchedule` i `regenerate-day`). To zmiana systemowa: nie zużywa darmowych zmian, ale liczy się do dziennego limitu AI organizatora. W historii ma rodzaj `system_dates`;
- daty w planie przestają być oznaczone jako wstępne.

Organizator może otworzyć ankietę ponownie. Do kolejnego zamknięcia zostaje poprzedni lot.

## Część 4 — wspólne loty

### 4.1 Karta lotu grupy

Po zamknięciu terminu, albo od razu, jeśli grupa nie robiła ankiety, plan ma kartę:

```
Lot do Barcelony · 20–22 lut · 4 osoby
Ryanair FR 1234 · WRO 06:30 → BCN 09:15
Powrót FR 1235 · BCN 21:10 → WRO 23:55
Teraz ok. 159 zł/os · 636 zł razem · sprawdzone 2 h temu

[ Kupuję za wszystkich ]
albo każdy sam:  Ty ✓ 159 zł   Ania ✓ 159 zł   Michał: jeszcze nie
```

- Numery lotów pochodzą z segmentów w odpowiedzi Sky Scrappera, jeśli tam są (do sprawdzenia). Bez nich karta pokazuje przewoźnika i godziny.
- Link prowadzi do wyszukiwarki z całą grupą (1.3) i ma zdarzenie `affiliate_click` jak w etapie 1 Przepustki.

### 4.2 Odświeżanie ceny

Przy otwarciu karty, jeśli cena jest starsza niż 6 godzin, serwer jeszcze raz szuka tego lotu dla grupy, z kontrolą `canCallApi()`. Przy wyczerpanym limicie karta pokazuje starą cenę z datą sprawdzenia. Bez maili i powiadomień o zmianie ceny.

### 4.3 Kupno

Kupno zapisuje się jako wydatek w tabelach z części 6 (6.1). Tabele `expenses` i `expense_shares` powstają w części 4, a interfejs rozliczeń dochodzi w części 6.

- **„Kupuję za wszystkich”:** kupujący wpisuje, ile zapłacił (pole wstępnie wypełnione ceną razem). Powstaje wydatek `flights` zapłacony przez niego i podzielony równo na wszystkich uczestników. Wszyscy dostają status „ma bilet”.
- **„Kupiłem swój”:** uczestnik zaznacza bilet i kwotę. Może dopisać, że kupił też dla wybranych osób. Powstaje wydatek podzielony na te osoby.
- Status „ma bilet” wynika z wydatków `flights`, które obejmują daną osobę. Usunięcie wydatku cofa status.
- Przypomnienie przy przyciskach: „Do rezerwacji potrzebujesz imion i nazwisk jak w dowodzie, a przy dzieciach także dat urodzenia.” Tych danych nie zbieramy.
- Kodu rezerwacji nie przechowujemy, bo razem z nazwiskiem pozwala zarządzać rezerwacją.
- Stała wskazówka o jednym bagażu rejestrowanym na dwie osoby, bez cen.

## Część 5 — wspólny plan

### 5.1 Kto co może

Każdy uczestnik: zmiany z AI (`regenerate-day`, `swap-activity`, `modify-day` ze spec Przepustki), ręczne dodanie punktu, reakcje, czat. Limity bez Przepustki są wspólne dla wyjazdu.

### 5.2 Zapisy bez gubienia zmian

Dziś cały plan siedzi w `trips.ai_plan_json`, a trasy zapisują go w całości. Gdy dwie osoby zmienią naraz dwa różne dni, druga zmiana nadpisze pierwszą.

Wymóg:
- zapisy planu idą na poziomie jednego dnia, a dwie zmiany różnych dni naraz obie się zapisują;
- zmiana dnia, który ktoś zmienił w międzyczasie, kończy się `409` z kodem `DAY_CHANGED`. Aplikacja odświeża plan i pokazuje „Ania właśnie zmieniła ten dzień. Masz już nową wersję.”;
- dotyczy wszystkich tras, które zapisują plan, także `PATCH /api/trips/[tripId]` z `ai_plan_json` i cofania.

Mechanizm (np. funkcja SQL z `jsonb_set` i porównaniem dnia albo numer wersji dnia) wybiera builder. Zmiana z AI, która skończyła się `409`, nie zużywa darmowej zmiany.

### 5.3 Historia

```sql
create table if not exists public.plan_changes (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  member_id uuid references public.trip_members(id) on delete set null,
  day_index int not null,
  kind text not null check (kind in ('day', 'swap', 'rain', 'later', 'cheaper', 'custom', 'split', 'manual', 'undo', 'system_dates', 'member_takeover')),
  summary text,
  previous_day jsonb,
  created_at timestamptz not null default now()
);
-- RLS włączone, bez polityk
```

- Plan grupy ma listę „Ostatnie zmiany”: „Michał zamienił Muzeum Picassa na Camp Nou · Cofnij”.
- „Cofnij” przywraca `previous_day` jako nową zmianę typu `undo`. Nie zwraca zmiany na licznik, tak jak w spec Przepustki.
- `member_takeover` (2.4) ma `day_index = -1` i nie ma `previous_day`.
- Czy historia zapisuje się też dla wyjazdów solo, decyduje builder.

### 5.4 Reakcje

Punkty planu nie mają dziś stałych identyfikatorów. `DayActivity` dostaje pole `id` (krótki losowy ciąg), które nadają `validateAndFixPlan` i `validateDay`. Istniejące plany dostają identyfikatory przy pierwszym wczytaniu wyjazdu grupowego.

```sql
create table if not exists public.activity_reactions (
  trip_id text not null references public.trips(id) on delete cascade,
  member_id uuid not null references public.trip_members(id) on delete cascade,
  activity_id text not null,
  reaction text not null check (reaction in ('want', 'skip')),
  updated_at timestamptz not null default now(),
  primary key (trip_id, member_id, activity_id)
);
```

Przy punkcie są przyciski „Chcę” i „Odpuszczam” oraz inicjały osób, które je kliknęły. Bez emoji. Reakcje do punktu, którego już nie ma, po prostu się nie wyświetlają.

### 5.5 „Rozdzielmy się”

Nowy tryb `split` w `/api/modify-day`:
- przy punkcie, który ma i „Chcę”, i „Odpuszczam”, pojawia się „Rozdzielmy się tu”;
- prompt dostaje ten punkt, kto chce, a kto odpuszcza. Uczestnicy są w prompcie oznaczeni etykietami (`U1`, `U2`…), a nie imionami, a kod tłumaczy etykiety na osoby;
- AI dzieli ten fragment dnia na dwie ścieżki i dodaje punkt spotkania („17:30 · Spotkanie w El Xampanyet”);
- `DayActivity` dostaje opcjonalne `forMembers?: string[]` (id uczestników). `validateDay` dopuszcza nakładające się godziny tylko dla punktów z różnymi `forMembers`;
- liczy się jak zwykła zmiana z AI.

### 5.6 Wspólny czat

Wyjazd grupowy ma jeden wątek czatu zapisany na serwerze:

```sql
create table if not exists public.trip_chat_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  member_id uuid references public.trip_members(id) on delete set null,
  role text not null check (role in ('user', 'model')),
  text text not null check (char_length(text) <= 4000),
  created_at timestamptz not null default now()
);
```

- `/api/chat` dla wyjazdu grupowego składa historię z bazy (ostatnie 50 wiadomości, jak dziś limit), a nie z żądania.
- Przy pytaniu widać imię autora. Do Gemini imiona nie trafiają.
- Wyjazdy solo zostają przy historii po stronie klienta.

### 5.7 Odświeżanie

Plan grupy pobiera świeże dane po powrocie na kartę (`visibilitychange`), po własnym zapisie i co 60 s, gdy karta jest widoczna. Odpowiedź ma znacznik ostatniej zmiany, żeby niezmieniony plan nie przesyłał się w całości. Interwał to propozycja Claude'a.

## Część 6 — rozliczenia

### 6.1 Dane

```sql
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  paid_by_member_id uuid not null references public.trip_members(id),
  category text not null check (category in ('flights', 'accommodation', 'food', 'transport', 'attractions', 'other', 'pass')),
  title text not null check (char_length(title) between 1 and 80),
  amount_minor int not null check (amount_minor > 0),
  currency text not null,              -- ISO 4217
  pln_minor int not null,              -- kwota w groszach po przeliczeniu
  fx_rate numeric,                     -- kurs średni NBP, null dla PLN
  fx_date date,                        -- data tabeli NBP
  spent_on date not null,
  created_by_member_id uuid references public.trip_members(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.expense_shares (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  member_id uuid not null references public.trip_members(id),
  weight int not null default 1 check (weight > 0),
  primary key (expense_id, member_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  from_member_id uuid not null references public.trip_members(id),
  to_member_id uuid not null references public.trip_members(id),
  amount_pln_minor int not null check (amount_pln_minor > 0),
  marked_by_member_id uuid references public.trip_members(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
-- RLS włączone, bez polityk
```

Kategorie są takie jak w `BudgetTracker`, plus `pass`.

### 6.2 Wydatek

- Pola: kwota, waluta, kto płacił (domyślnie ja), za kogo (domyślnie wszyscy, można odznaczyć), kategoria, tytuł, dzień (domyślnie dziś).
- Waluta domyślnie to waluta celu, jeśli dane wyjazdu ją znają, a inaczej EUR. Skąd ją wziąć, decyduje builder.
- Każdy uczestnik może dodać, poprawić i usunąć każdy wydatek. Usunięcie ustawia `deleted_at`. Kto i co zmienił, widać przy wydatku.

### 6.3 Waluty

- Wydatek w obcej walucie przeliczamy na złote po kursie średnim NBP z tabeli A z dnia wydatku. Jeśli tego dnia nie ma tabeli (weekend, święto), bierzemy ostatnią wcześniejszą. Gdy waluty nie ma w tabeli A, sprawdzamy tabelę B. API: `api.nbp.pl`, bez klucza.
- Kurs zapisuje się przy wydatku i się nie zmienia. Zmiana dnia albo kwoty liczy go od nowa.
- Kursy trzymamy w pamięci podręcznej (tabela albo cache serwera, decyduje builder), żeby nie pytać NBP przy każdym wydatku.
- Gdy NBP nie odpowiada: „Nie mamy teraz kursu. Wpisz kwotę w złotówkach albo spróbuj za chwilę.”
- Przy wydatku widać „82 € → 352 zł (kurs NBP 4,29 z 21.02)”.

### 6.4 Saldo i przelewy

Czyste funkcje w `src/lib/settle.ts`:
- `computeBalances(expenses, shares, settlements)`: saldo każdego uczestnika w groszach. Podział według `weight`, a reszta groszy trafia deterministycznie do kolejnych osób, tak żeby suma była dokładna;
- `settleUp(balances)`: lista przelewów „kto komu ile”. Zachłannie: największy dłużnik płaci największemu wierzycielowi, aż wszystko wyjdzie na zero.

„Oddane” przy przelewie zapisuje wiersz w `settlements` i przelicza saldo. Można to cofnąć. Pieniędzy nie przesyłamy i nie zbieramy numerów telefonów ani kont.

```
Rozliczenia · Barcelona                      razem 2 133 zł

Lot, 4 osoby             Ty        636 zł
Apartament, 2 noce       Ania    1 140 zł
Kolacja w El Xampanyet   Michał     82 € → 352 zł (kurs NBP 4,29)
Przepustka               Ty       4,99 zł

Żeby było równo:
  Ola → Ania       533 zł    [Oddane]
  Michał → Ania     74 zł    [Oddane]
  Michał → Ty      108 zł    [Oddane]
```

### 6.5 Wpisy dodawane same

- Bilety z części 4.
- Przepustka: gdy `grantTripPass` nadaje Przepustkę wyjazdowi grupowemu, dodaje wydatek `pass` na 4,99 zł zapłacony przez kupującego i podzielony na wszystkich.

### 6.6 Rodzina

Dla `companion = 'family'` sekcja „Żeby było równo” jest domyślnie ukryta, z przełącznikiem „Rozliczamy się” (np. gdy jadą dwie rodziny). Wydatki i porównanie z planem działają zawsze.

### 6.7 Tracker budżetu

W wyjeździe grupowym `BudgetTracker` liczy sumy z `expenses` według kategorii i porównuje je z planem dla całej grupy (1.4). W solo zostaje `localStorage`. Sum z `localStorage` nie przenosimy do grupy, bo nie wiadomo, kto płacił.

## Pomiar

Zdarzenia GA4 przez `trackEvent`, bez imion i bez danych osobowych:

| Zdarzenie | Kiedy | Parametry |
|---|---|---|
| `group_invite_created` | pierwsze „Zaproś ekipę” | `group_size`, `companion` |
| `group_joined` | uczestnik zajmuje miejsce | `slot` (`reserved`, `new`, `takeover`) |
| `date_poll_started` | organizator otwiera ankietę | `options` |
| `date_vote` | głos | `answer` |
| `date_poll_closed` | zamknięcie | `options`, `all_can` |
| `flight_purchase_marked` | oznaczenie biletu | `mode` (`all`, `self`) |
| `plan_reaction` | reakcja | `reaction` |
| `expense_added` | wydatek | `category`, `foreign` |
| `settlement_marked` | „Oddane” | — |

`/admin/analytics` dostaje: liczbę wyjazdów grupowych, średnią liczbę uczestników i odsetek wyjazdów grupowych z zamkniętym terminem, z biletami i z wydatkami.

## Błędy

- **Stary link po „Nowy link”:** „Ten link już nie działa. Poproś organizatora o nowy.”
- **Usunięty uczestnik otwiera plan:** „Nie jesteś już w tym wyjeździe.”
- **Inne urządzenie albo wyczyszczone dane:** otwiera link jeszcze raz i przejmuje swoje miejsce (2.4).
- **Organizator usunął wyjazd:** wszystko kasuje się kaskadowo. Link i plan pokazują „Organizator usunął ten wyjazd.”
- **Organizator usunął konto:** `trips.user_id` ma `on delete cascade`, więc wyjazd znika dla całej grupy. Usuwanie konta w profilu ostrzega, że zniknie też ten wyjazd grupowy.
- **Brak ceny dla terminu:** „brak ceny”, głosowanie działa.
- **Limit API lotów:** stara cena z datą, porównanie z jedną osobą pominięte.
- **`409 DAY_CHANGED`:** plan odświeżony, komunikat z 5.2, zmiana nie zużyta.
- **Dzienny limit AI organizatora:** komunikat z 2.5.
- **NBP niedostępne:** komunikat z 6.3.
- **Błąd Gemini:** jak dziś („zwykle działa za drugim”), licznik bez zmian.

## Bezpieczeństwo i prywatność

- Wszystkie nowe tabele mają włączone RLS i żadnych polityk. Czyta i zapisuje tylko serwer kluczem serwisowym, po `getTripAccess`.
- W bazie są tylko skróty tokenów urządzenia i zaproszeń.
- Uczestnicy podają tylko imię, a widzi je tylko grupa. Imiona nie trafiają do Gemini.
- Nie zbieramy danych z dowodu, kodów rezerwacji, numerów telefonów ani kont bankowych.
- Limity: dołączanie na IP, a głosy, reakcje i wydatki na uczestnika (`checkRateLimit`).
- Polityka prywatności i `/cookies`: ciasteczko urządzenia, imiona uczestników, wydatki grupy, przechowywanie do usunięcia wyjazdu. Regulamin §2: wyjazdy grupowe i Przepustka dla całej grupy. Tekst warto pokazać prawnikowi.

## Testy (vitest)

Czyste funkcje, testowane bez sieci:
- **`groupFromCompanion`, `groupSize`, `toFlightPassengers`:** granice wieku 1, 2, 11 i 12 lat, stare zapisy bez `group`.
- **Klucz cache lotów:** solo bez zmian, grupa z pasażerami.
- **Linki:** Aviasales, Skyscanner i Booking z grupą i z dziećmi, bez danych osobowych w adresach.
- **Porównanie z jedną osobą:** próg 5 zł, brak drugiej ceny.
- **`buildPrompt`:** skład grupy i instrukcja „za osobę” w prompcie.
- **`computeTripAccess`:** organizator, uczestnik, usunięty uczestnik, obcy; wspólne liczniki.
- **Tokeny:** skrót i weryfikacja, zajęcie wolnego miejsca, nowe miejsce, przejęcie miejsca, limit `MAX_GROUP`.
- **`rankDateOptions`:** wszyscy mogą, remisy, brak ceny, brak terminu dla wszystkich.
- **Zapisy planu:** dwa różne dni naraz, ten sam dzień naraz (`409`).
- **`validateDay` z `forMembers`:** nakładanie dozwolone tylko dla różnych osób.
- **`computeBalances` i `settleUp`:** podział z wagami, reszta groszy, suma zero, przelewy „Oddane”.
- **Kurs NBP:** wybór daty tabeli w weekend i święto, tabela B.
- **`groupMessage`:** każdy tekst ma link.

Supabase, Sky Scrapper, Travelpayouts, NBP i Gemini są mockowane.

Ręcznie:
- dwa telefony (iPhone z Safari, Android z Chrome): zaproszenie, dołączenie, przejęcie miejsca, głosowanie, równoczesne zmiany dwóch dni;
- dołączenie z przeglądarki wbudowanej w Instagram i z WhatsAppa, podgląd linku w WhatsAppie;
- wydatki w EUR w weekend.

## Warunki wstępne (poza kodem)

- Etap 2 Przepustki dla części 2–6, etap 3 dla zakupu przez gościa.
- Dokumentacja Sky Scrappera: parametry pasażerów, czy cena jest za osobę, czy za rezerwację, `MAX_GROUP`, numery lotów w segmentach.
- Dokumentacja Travelpayouts: endpoint z cenami na konkretne daty.
- Formaty pasażerów w adresach Aviasales, Skyscannera i Hostelworld.
- Prawnik: polityka prywatności, `/cookies` i §2 regulaminu.

## Ryzyka

- **Koszt API lotów.** Wyszukiwania grupowe nie trafiają w pamięć solo, porównanie z jedną osobą to drugie zapytanie, a odświeżanie karty dokłada kolejne. Hamulce: porównanie tylko dla najlepszej oferty, odświeżanie co 6 h, `canCallApi()`, ceny w ankiecie z Travelpayouts.
- **Limit AI organizatora.** Znajomi zużywają jego dzienny limit. Akceptujemy to: organizator zawsze ma konto, a goście nie mogą obejść limitu.
- **Podszycie się pod kogoś z grupy** przez przejęcie miejsca. Akceptujemy to wśród znajomych. Historia pokazuje każde przejęcie.
- **Szacunki kosztów dla rodzin** są przybliżone (koszt na osobę razy liczba osób) i tak są podpisane.
- **Przychód z grupy** jest taki jak z solo (jedna Przepustka). To świadoma decyzja. Grupa przynosi nowych ludzi i prowizje od lotów i noclegów dla wszystkich.

## Poza zakresem

- Loty z różnych miast i spotkanie na miejscu.
- „Najpierw kiedy”: grupa zaznacza wolne terminy, a Włóczykij szuka celu.
- Ekipa jako encja na wiele wyjazdów.
- Zmiany na żywo (Realtime, Broadcast).
- Maile i powiadomienia push dla uczestników bez konta.
- Zdjęcia paragonów.
- Osobne salda w każdej walucie.
- Powiadomienia o spadkach cen lotu (alerty Pro).
- Kupowanie biletów w aplikacji i przelewy między uczestnikami.

## Co zostaje builderowi

- Ostateczne teksty w głosie z BRAND.md i układ ekranów.
- Mechanizm zapisu dnia (5.2), byle spełniał wymóg.
- Reguły podsuwania terminów (3.2) i interwał odświeżania (5.7).
- Skąd brać walutę celu (6.2) i gdzie trzymać kursy (6.3).
- Czy historia zmian zapisuje się też w solo (5.3).
- Nazwy plików i komponentów poza tymi, które spec wymienia.
