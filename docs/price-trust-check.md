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
| `/okazje`, `/okazje/[lotnisko]`, `/weekend/[miasto]`, pasek na stronie głównej | statyczne "z ostatnich dni" (niesprawdzane), data tylko w stopce, "od X zł" bez słowa "lot" | wspólny helper `dealsPriceNote`: data z **najstarszego** `fetched_at`, ostrzeżenie "sprzed ponad tygodnia" powyżej 8 dni, "bez podanej daty" gdy brak; nota przy nagłówku, "lot od X zł" |

Testy: `src/lib/priceTrust.test.ts` (świeżość, nota, kopia budżetu, porównanie wydatków, kontrole źródeł), `coverage.test.ts`, zaktualizowane `email.test.ts`, `groupFlow.test.ts`, `shareOg.test.ts`.

## 3. Luki pozostałe

- Plany sprzed 2026-11-12 mogły wliczać lot w sumę; etykieta "bez lotów" jest dla nich niepewna (brak pola z wersją promptu).
- `DealsStrip` bez okazji na starcie dalej ukrywa sekcję bez komunikatu (świadoma decyzja w kodzie); po zmianie lotniska komunikat jest.
- Stare wiersze `drop_deals` są pokazywane z ostrzeżeniem, nie ukrywane. Jeśli cron zawiedzie, ostrzeżenie pojawia się po 8 dniach.
- Zrozumienie ceny przez ludzi (H1) nie było badane; to test z użytkownikami, nie kod.
- Pełnego budżetu z ceną noclegu nie ma i nie obiecujemy (osobny zakres).
- Nie sprawdzono renderu w przeglądarce (patrz sekcja recenzji).

## 4. Recenzja obalająca

(uzupełnić po przeglądzie)
