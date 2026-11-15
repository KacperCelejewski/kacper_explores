# Fakty do sprawdzenia w artykułach (2026-11-15)

Artykuły celowo nie zawierają cen, czasów dojazdu ani godzin otwarcia. Poniżej twierdzenia, które pochodzą z wiedzy ogólnej, a nie z kodu, i warto je potwierdzić w oficjalnym źródle przed publikacją.

## ktorym-lotniskiem-z-polski-lecisz-na-weekend

| Twierdzenie | Źródło w repo / do sprawdzenia |
|---|---|
| Nazwy lotnisk i miejscowości (Pyrzowice, Balice, Nowy Dwór Mazowiecki) | `src/lib/seo/airportFacts.ts` (potwierdzone w kodzie) |
| Modlin pokazuje ceny z danych Warszawy (WAW), brak osobnej strony w indeksie | `src/app/okazje/page.tsx`, `src/app/sitemap.ts` (potwierdzone w kodzie) |
| Okęcie leży w granicach Warszawy | wiedza ogólna, pewne |
| Katowice Airport i Kraków Airport leżą poza miastami (Pyrzowice, Balice) | `airportFacts.ts`; sformułowanie ogólne, bez odległości |
| Quiz ma 6 pytań, ekipa 3 do 9 osób | `PRODUCT.md`, artykuł o ekipie |
| Brak czasów dojazdu i kosztów dojazdu | celowo; do uzupełnienia tylko ze stron lotnisk i przewoźników z datą dostępu |

## weekend-w-budapeszcie-plan-na-48-godzin

| Twierdzenie | Status |
|---|---|
| Dunaj dzieli miasto na Budę (zachód) i Peszt (wschód) | wiedza ogólna, pewne |
| Wzgórze Zamkowe, Kościół Macieja, Baszta Rybacka, Most Łańcuchowy, Góra Gellérta, Parlament, Bazylika św. Stefana, Hala Targowa, aleja Andrássy, Plac Bohaterów, Park Miejski, łaźnia Széchenyi | nazwy własne, pewne; godziny, bilety i rezerwacje celowo bez szczegółów (sprawdzić na stronach oficjalnych) |
| Węgry w Schengen, waluta: forint | pewne; kurs i zasady płatności bez liczb |
| Wejście do Parlamentu zwykle wymaga biletu na termin | do potwierdzenia na oficjalnej stronie Parlamentu |
| W mieście jest metro (w tym "najstarsza linia"), tramwaje, autobusy; operator BKK | BKK pewne; zwrot "najstarsza linia" (M1) do potwierdzenia lub usunięcia |
| Tramwaj wzdłuż Dunaju po stronie Pesztu | pewne (linia 2), numer celowo pominięty |
| Dzielnica żydowska w Peszcie jako miejsce lokali w dawnych kamienicach | ogólne; do potwierdzenia |
| Strona `/weekend/budapeszt`: czy ma ceny (bez cen dostaje `noindex`) | do sprawdzenia na produkcji przed publikacją |
