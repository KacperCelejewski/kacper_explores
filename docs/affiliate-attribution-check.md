# Atrybucja linków partnerskich: kontrola (R6, 2026-11-19)

Test: `src/lib/affiliate-attribution.test.ts` (42 testy). Marker 728414; projekt z `TRAVELPAYOUTS_PROJECT_ID` (docelowo 601310, env na produkcji zmienia właściciel). Recenzja obalająca: 1 runda (sonnet, tylko odczyt); ustalenia 1 i 2 naprawione.

## Miejsca generowania linków

| # | Miejsce | Generator | Program | Sprawdzone testem |
|---|---|---|---|---|
| 1 | Karta lotu w planie (`PartnerLinks.FlightCard`) | `flightLink` → `flightSearchLink` | Aviasales 100/4114 | marker, trs, u=, rel, „link partnerski”, zgoda |
| 2 | Karta kierunku (`destinations/page.tsx`) | `flightSearchLink` / `flightLink` | Aviasales | te same generatory |
| 3 | Bilety (`TicketsLink`) | `ticketsLink` | Tiqets 89/2074 | j.w. + kodowanie `& # ? % +` i próba wstrzyknięcia trs/marker |
| 4 | Bagaż (`LuggageTile`) | `luggageLink` | Radical 209/5867 | j.w. |
| 5 | Strona okazji, lot (`okazje/[lotnisko]`) | `buildFlightLink` + `AffiliateAnchor` | Aviasales | UTM wewnątrz u=, zdjęcie obcych marker/trs, zgoda |
| 6 | Hotele (`HotelLinks`, strona okazji) | `bookingLink`, `hostelworldLink` | brak prowizji | `paid=false` zawsze, bez sponsored |
| 7 | E-mail zrzutu | `buildAffiliateUrl` (html i tekst) | Aviasales, sam marker | marker, UTM, ujawnienie |

Booking i Hostelworld pozostają bez prowizji. `travelpayoutsLink` odrzuca booking, hostelworld, getyourguide, viator, omio. Nic nie odblokowano.

## Znalezione i naprawione

- Recenzent: `buildAffiliateUrl` z `new URL` mógłby rzucić na zepsutym `deal.link` i zmieniać kodowanie zapytania; teraz operuje na tekście, bez wyjątków i bez przekodowania (test).
- E-mail: `buildAffiliateUrl` dopisywał marker bez przycięcia (marker z końcowym `\n` dawał `marker=728414%0A`), przy pustym markerze dopisywał `marker=`, a obcy `marker` z linku API dublował nasz. Poprawka w `src/lib/drop/links.ts`; testy w pliku testowym.

## Luki (bez zmian w kodzie)

1. E-mail zrzutu nie ma `trs` ani `tp.media`: linki mają sam `marker`, więc prowizje z maila nie trafią do projektu 601310. `drop-send` nie czyta też `TRAVELPAYOUTS_PROJECT_ID`. Wymaga decyzji i osobnej zmiany (dojście projektu do `renderDropEmail`).
2. `rel` to `sponsored noopener noreferrer`, bez `nofollow`. Regulamin opisuje dokładnie ten zapis. `sponsored` oznacza płatny link wg Google; `nofollow` jest opcjonalne (źródło nieweryfikowane w tej sesji). Dodanie `nofollow` wymagałoby zmiany regulaminu.
3. Linki w e-mailu nie mają `rel` ani zgody na cookies (nie dotyczy poczty); ujawnienie jest w treści.
4. Nic w kodzie nie waliduje, że env ma marker 728414 i projekt 601310: przy braku którejkolwiek wartości linki cicho stają się bezpośrednie (web). `drop-send` ostrzega tylko o braku markera.
5. `affiliate_click` ma `paid=true` także gdy link prowadzi do tp.media, ale to tylko kliknięcie: prowizję potwierdza wyłącznie panel Travelpayouts (Reports → Performance, do 24 h).
6. Linki zewnętrzne w blogu dostają `noopener noreferrer` bez `sponsored`; dziś nie ma tam linków do partnerów, ale dodanie takiego linku nie da oznaczenia.
7. Nie sprawdzono w praktyce: klikania w dev serwerze, panelu Travelpayouts, produkcji.

## Wymagania produkcji

Przed przełączeniem: właściciel ustawia `TRAVELPAYOUTS_PROJECT_ID=601310` (marker bez zmian) w Vercel i robi redeploy, potem ręczny test z `docs/affiliate-links.md`.
