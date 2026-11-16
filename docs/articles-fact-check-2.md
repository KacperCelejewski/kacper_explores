# Fakty do sprawdzenia w artykułach, seria 2 (2026-11-15)

Artykuły nie zawierają cen, czasów dojazdu, godzin otwarcia ani liczb źródłowych. Poniżej twierdzenia z wiedzy ogólnej (nie z kodu), które warto potwierdzić w oficjalnym źródle przed promowaniem tekstów. Pierwsza seria: `articles-fact-check.md`.

## nocleg-dla-ekipy-apartament-czy-kilka-pokoi

| Twierdzenie | Status / co sprawdzić |
|---|---|
| W apartamentach pojawiają się opłata za sprzątanie, kaucja, dopłata za dodatkowego gościa | zasada ogólna serwisów rezerwacyjnych; sformułowane jako „zdarza się", bez nazw serwisów |
| W wielu miastach pobiera się opłatę miejscową / podatek turystyczny od osoby, często na miejscu | wiedza ogólna; w tekście odesłanie do stron miast, bez kwot |
| W niektórych miastach obowiązują ograniczenia i rejestracja wynajmu krótkoterminowego | wiedza ogólna; bez nazw miast |
| „Plan podaje szacunek kosztów na osobę i razem" | zgodne z artykułem o ekipie i FAQ strony głównej; potwierdzić, że szacunek obejmuje nocleg, zanim tekst zacznie to wprost obiecywać (obecnie sformułowanie ogólne) |

## jak-zorganizowac-wyjazd-ze-znajomymi-od-pomyslu-do-wylotu

| Twierdzenie | Status / co sprawdzić |
|---|---|
| EKUZ daje dostęp do niezbędnej opieki w państwach UE na zasadach danego kraju i nie zastępuje ubezpieczenia podróżnego | wiedza ogólna, pewne co do zasady; sprawdzić sformułowanie na stronie NFZ |
| Poza strefą Schengen wymagania co do dokumentu mogą być inne | ogólne; odesłanie do MSZ i stron państw |
| Imię i nazwisko na bilecie musi zgadzać się z dokumentem; poprawka bywa płatna | ogólne zasady przewoźników; różnią się między liniami |
| Włóczykij nie zbiera głosów na termin, nie rozsyła zaproszeń, nie rozlicza kosztów | zgodne z `features.ts` (wszystkie flagi false); **zaktualizować tekst po włączeniu flag** |
| Gotowy plan można wysłać znajomym linkiem do podglądu | zgodne z PR #41 (przycisk „Wyślij plan ekipie"), niezweryfikowane end-to-end na produkcji |

## lot-w-grupie-jak-kupic-bilety-dla-ekipy

| Twierdzenie | Status / co sprawdzić |
|---|---|
| Wielu przewoźników przydziela miejsca losowo, wybór miejsc bywa płatny | ogólna praktyka tanich linii; bez nazw przewoźników |
| Limity bagażu dotyczą pojedynczego pasażera i nie sumują się w grupie | ogólna praktyka; sprawdzić regulaminy konkretnych linii przed cytowaniem |
| W najtańszej taryfie jest ograniczona liczba miejsc, cena może wzrosnąć przy kolejnych osobach | ogólna zasada pul taryfowych |
| W UE obowiązują przepisy o prawach pasażerów przy opóźnieniach i odwołaniach; ULC jest polskim organem | pewne co do zasady; bez numeru rozporządzenia i kwot odszkodowań; sprawdzić nazwę organu na stronie ULC |
| Okazje pokazują cenę „dla jednej osoby” | **celowo nie twierdzimy tego wprost**; sprawdzić w `src/app/okazje` i danych `drop_deals`, co dokładnie oznacza cena (tekst mówi tylko „zwykle dla jednej osoby”) |

## weekend-w-barcelonie-plan-na-48-godzin

| Twierdzenie | Status |
|---|---|
| Nazwy: Barri Gòtic, Katedra, Plaça de Sant Jaume, La Rambla, El Born, Muzeum Picassa (w Born), Barceloneta, Sagrada Família, Passeig de Gràcia, Casa Batlló, Casa Milà (La Pedrera), Gràcia, Montjuïc, Park Güell, Bunkers del Carmel | nazwy własne, pewne; godziny, bilety i rezerwacje celowo bez szczegółów |
| Sagrada Família jest wciąż w budowie | pewne w momencie pisania; zweryfikować, jeśli budowa zostanie ogłoszona jako zakończona |
| Wejście do Sagrady, domów Gaudího i części Parku Güell na bilet z godziną | zwykła praktyka; potwierdzić na oficjalnych stronach |
| La Rambla jest tłoczna, kieszonkowcy w tłocznych miejscach | wiedza ogólna, sformułowane jako zasada ostrożności |
| Montjuïc: dojazd metrem, autobusem lub kolejką | pewne co do istnienia opcji; trasy i bilety celowo pominięte |
| Z lotniska El Prat do centrum: metro, pociąg lub autobus | pewne co do istnienia opcji; trasy i godziny pominięte |
| Hiszpanie jedzą obiad i kolację później niż w Polsce | wiedza ogólna, bez godzin |
| Katalonia: katalońskiego i hiszpańskiego | pewne |
| Strona `/weekend/barcelona` (cena lotów, indeksowanie) | sprawdzić na produkcji przed promowaniem; bez cen strona dostaje `noindex` |
