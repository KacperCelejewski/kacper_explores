# Kontrola wiarygodności ceny i szacunku budżetu (R3), 2026-11-19

Zakres: brief R3 (kontrola pokrycia i zrozumienia cen). Bez sieci, bez migracji, bez zmian cen i Stripe. **Pokrycia na produkcji nie zmierzono**; liczby poniżej pochodzą z fixtures w testach.

## 1. Kontrola pokrycia (bez sieci, na fixtures)

Kod: `src/lib/flights/coverage.ts`, test: `src/lib/flights/coverage.test.ts`. Uruchomienie: `npx vitest run src/lib/flights/coverage.test.ts`.

| Miara | Licznik / mianownik | Definicja |
|---|---|---|
| Karty kierunków | karty ze świeżą wyceną z cache / karty kwalifikujące się | kwalifikuje się karta z miasta z katalogu (jest para trasa-data do sprawdzenia); miasto spoza katalogu nigdy nie dostanie ceny i jest raportowane osobno (`notEligible`); wycena: ta sama funkcja co na produkcji (`selectCardFlightPrice`), więc liczy się ważność cache, daty, skład pasażerów |
| Okazje wg lotniska | lotniska z ≥1 świeżą, nieodlecianą okazją / 6 polskich lotnisk (+ lista bez okazji) | świeża = cena > 0 i `fetched_at` ≤ 8 dni (cron raz w tygodniu) |
| Miasta weekendowe | miasta z listy weekendowej z ≥1 świeżą okazją / wszystkie miasta listy | j.w. |
| Wiersze okazji | świeże / wszystkie nieodlecone | stary wiersz nadal się pokazuje, z ostrzeżeniem (pkt 2) |

Wynik pustego mianownika to `null` ("brak kwalifikujących się"), nie 0% ani 100%. Funkcja wyboru par wyszukiwania została wydzielona z `api/destination-flight-prices/route.ts` do `card-pairs.ts`, więc kontrola i produkcja używają tego samego kodu (testy trasy bez zmian przechodzą).

Wyniki na fixtures (nie dane produkcyjne): 3 kwalifikujące się karty z 4, z ceną 2/3 (67%); pusty cache 0/3; cache wygasły 0/3; inny skład pasażerów nie liczy się jako pokrycie.

**Luka:** żeby zmierzyć realne pokrycie, trzeba podać tym funkcjom wiersze `flight_cache` i `drop_deals` z produkcji (odczyt, dostęp Kacpra). Nie ma jeszcze skryptu z odczytem bazy.

## 2. Przegląd miejsc z ceną i naprawy

| Miejsce | Stan przed | Naprawa |
|---|---|---|
| Karty kierunków | cena tylko z cache, data sprawdzenia, "Cena może się zmienić", brak ceny = jawny komunikat | bez zmian (już poprawne). Suma ekipy "razem ok. X zł" obok budżetu "razem do …" mogła uchodzić za koszt wyjazdu: teraz "Lot dla wszystkich ok. X zł (4 osoby)" |
| Plan: "Szacowany całkowity koszt" | prompt liczy sumę **bez lotów** (od 2026-11-12), quiz obiecuje budżet za cały wyjazd z lotami | etykieta "Szacunek na miejscu, bez lotów" + uwaga, że lot trzeba doliczyć; to samo w widoku udostępnionym; podgląd OG i opis meta kończą się "bez lotów" |
| Licznik wydatków (`BudgetTracker`) | wydatki na loty wchodziły do porównania z planem bez lotów (fałszywe "powyżej budżetu"); kategoria Loty pokazywała "plan: ~0 zł"; plan brany z dolnego końca zakresu | porównanie bez lotów, z górnym końcem zakresu; Loty: "poza szacunkiem planu" |
| `FlightCard` (stare zapisane plany) | "cena z ostatnich wyszukiwań", choć bez daty | "cena orientacyjna, ze starszego wyszukiwania, bez daty sprawdzenia; potwierdź ją przed zakupem". Żaden obecny kod nie ustawia `bestOffer`, więc dotyczy tylko starych planów |
| Mail zrzutu | temat "Mediolan za 201 zł w ten weekend" brzmiał jak koszt weekendu; preheader "Od X zł" bez "lot" | "Mediolan: lot za 201 zł na ten weekend"; "Loty od X zł: …". Treść maila już miała datę i "może się zmienić" |
| `/okazje`, `/okazje/[lotnisko]`, `/weekend/[miasto]`, pasek na stronie głównej | statyczne "z ostatnich dni" (niesprawdzane), data tylko w stopce, "od X zł" bez słowa "lot" | wspólny helper `dealsPriceNote`: data pobrania z **najstarszego** `fetched_at` ("pobrane przez nas"), ostrzeżenie "ponad tydzień temu" powyżej 8 dni, "bez podanej daty" gdy brak; nota przy nagłówku, "lot od X zł" |

Testy: `src/lib/priceTrust.test.ts` (świeżość, nota, kopia budżetu, porównanie wydatków, kontrole źródeł), `coverage.test.ts`, zaktualizowane `email.test.ts`, `groupFlow.test.ts`, `shareOg.test.ts`.

## 3. Luki pozostałe

- Plany sprzed 2026-11-12 mogły wliczać lot w sumę, a kafelek "Loty" mieć liczbę; etykieta "bez lotów" jest dla nich niepewna, ekran może sam sobie przeczyć (brak pola z wersją promptu).
- `DealsStrip` bez okazji na starcie dalej ukrywa sekcję bez komunikatu (świadoma decyzja w kodzie); po zmianie lotniska komunikat jest.
- Stare wiersze `drop_deals` są pokazywane z ostrzeżeniem, nie ukrywane. Jeśli cron zawiedzie, ostrzeżenie pojawia się po 8 dniach.
- Zrozumienie ceny przez ludzi (H1) nie było badane; to test z użytkownikami, nie kod.
- Pełnego budżetu z ceną noclegu nie ma i nie obiecujemy (osobny zakres).
- Nie sprawdzono renderu w przeglądarce (patrz sekcja recenzji).

- Data przy cenach okazji to data **pobrania przez nas** (`fetched_at` crona), nie data oferty u dostawcy (Travelpayouts oddaje dane z własnego cache). Copy mówi "pobrane przez nas"; wiek samej oferty jest nieznany.
- Notka pod sumą planu w widoku udostępnionym nie odwołuje się do quizu (odbiorca linku go nie robił).

## 4. Recenzja obalająca (niezależny proces `claude -p --model sonnet --permission-mode plan`)

**Runda 1** (testy 1078 zielone; renderu stron recenzent nie sprawdzał). Ustalenia i decyzje:

| # | Waga | Ustalenie | Decyzja |
|---|---|---|---|
| 1 | średnia | Plan i widok udostępniony: "koszt całkowity podajemy też razem" i "Loty…" tuż nad etykietą "bez lotów" | naprawione: "szacunek na miejscu podajemy też razem. Lot liczymy osobno"; test pilnuje braku "koszt całkowity" |
| 2 | średnia | `DropSignup`: "W tym tygodniu z X loty od Y zł" bez daty i bez sprawdzenia świeżości | naprawione: "W ostatnich wyszukiwaniach z X loty od Y zł" |
| 3 | średnia | `dealsPriceNote` uznawała datę z przyszłości za świeżą (niezgodnie z `isFreshDeal`) | naprawione: data z przyszłości = "bez podanej daty"; test |
| 4 | średnia | testy kopii częściowo jako grep po źródłach, brak testów renderu | **nie naprawione**: repo uruchamia vitest tylko w `node` na `*.test.ts`, bez testów komponentów; logika jest w czystych helperach z testami zachowania, wpięcie sprawdzają kontrole źródeł |
| 5 | drobna | `budgetComparison` przy nieodczytanym szacunku dawało "powyżej budżetu" | naprawione + test |
| 6 | drobna | suma z górnym końcem zakresu, kategorie z dolnym | naprawione: kategorie też z górnym końcem |
| 7 | drobna | pojedyncze karty okazji bez daty (data zbiorcza przy liście) | **zostaje**: oznaczenie orientacyjne i data są na poziomie listy, tuż nad kartami |
| 8 | drobna | 2. os. l. poj. ("sprawdzisz", "potwierdź") | naprawione w nowych tekstach (`PLAN_TOTAL_NOTE`, `FlightCard`); istniejące "sprawdź aktualną cenę" w całym serwisie bez zmian |
| 9 | drobna | ISR 1 h opóźnia ostrzeżenie o starych cenach | zostaje, pomijalne |
| 10 | drobna | raport niedokończony | uzupełniony |

**Nie dało się zweryfikować:** render stron i komponentów w przeglądarce (brak testów komponentów, dev server nie uruchamiany w recenzji); pokrycie na danych produkcyjnych; zachowanie planów sprzed 2026-11-12.

**Runda 2** (testy 1079 zielone w chwili recenzji, tsc czysty, merge z `origin/main` bez konfliktów). Naprawy z rundy 1 potwierdzone. Nowe ustalenia:

| # | Waga | Ustalenie | Decyzja |
|---|---|---|---|
| 1 | średnia | "z wyszukiwań z <data>" sugeruje datę oferty, a to `fetched_at` crona | naprawione: "pobrane przez nas <data>"; luka w sekcji 3 |
| 2 | średnia | `dealsCoverage` bez `pickLatestWeek` (starsze tygodnie zawyżały liczniki), niezgodnie z produkcją | naprawione + test z dwoma tygodniami |
| 3 | drobna | notka planu odwołuje się do quizu także w widoku udostępnionym | naprawione: `PLAN_TOTAL_NOTE_SHARED` |
| 4 | drobna | stare plany: kafelek "Loty" z liczbą pod etykietą "bez lotów" | luka w sekcji 3 (nie do odróżnienia bez wersji promptu) |
| 5 | drobna | hub `/okazje`: nota z najtańszych okazji, nie ze wszystkich | zostaje (mały wpływ) |
| 6 | drobna | wcięcie `<p>` | zostaje (kosmetyka) |

**Runda 3** (commit ec7220e, testy 1080 zielone): brak blokerów i regresji. Ustalenia drobne, wszystkie naprawione: nota o starych cenach straciła zdanie "nie z rezerwacji na żywo" (przywrócone + test), dokument miał stare brzmienie not i zdublowany punkt o starych planach (scalone). Zostaje: nota na hubie `/okazje` z najtańszych okazji (mały wpływ); brak testów renderu.

Stan końcowy: `npm test` 1080/1080, `npm run lint` 0 błędów (26 ostrzeżeń istniejących), `npm run typecheck` czysty, `npm run build` z dummy env przeszedł.
