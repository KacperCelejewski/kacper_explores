# Fakty do sprawdzenia w artykułach, seria 3 (2026-11-16)

Artykuły nie zawierają cen, kwot, procentów ani liczb źródłowych. Scenki otwierające są oznaczone jako przykład wymyślony (Ola, Kuba, Marta, Tomek, Ania, Piotrek to postacie fikcyjne). Twierdzenia o produkcie pochodzą z kodu i istniejących artykułów, pozostałe to wiedza ogólna do potwierdzenia. Poprzednie serie: `articles-fact-check.md`, `articles-fact-check-2.md`.

Dane GSC (odczyt 2026-11-16, ostatnie 28 dni do 13.11): 0 kliknięć, 51 wyświetleń, wyłącznie zapytania markowe i „podróże solo”. Brak fraz niemarkowych, więc tematy dobrano z klastra „wyjazd ze znajomymi”, nie z luk w zapytaniach.

## jak-powiedziec-znajomym-ze-nie-stac-cie-na-wyjazd

| Twierdzenie | Status / co sprawdzić |
|---|---|
| W tanich taryfach zwrot zwykle nie wchodzi w grę | ogólna praktyka tanich linii (jak w artykułach serii 2); sprawdzić regulaminy przewoźników przed cytowaniem |
| Zdania do czatu, kolejność rozmowy, „czego unikać” | porady redakcyjne oparte na zdrowym rozsądku, nie na badaniach; tekst mówi to wprost w sekcji „Czego nie wiemy” |
| Quiz: budżet, kierunki pasujące do kwoty, plan z szacunkiem kosztów od AI, dwa plany na miesiąc za darmo | `src/app/quiz/page.tsx`, `src/lib/prices.ts`; sprawdzić ponownie przed promowaniem |

## kto-ogarnia-wyjazd-i-dlaczego-zawsze-ta-sama-osoba

| Twierdzenie | Status / co sprawdzić |
|---|---|
| Mechanizmy (rozproszona odpowiedzialność, próg bólu, niewidzialność pracy) | opis typowych sytuacji, bez powołania na badania; tekst wprost zastrzega brak danych o skali zjawiska |
| Organizator często zostaje z kosztem, gdy ktoś wypadnie | ogólna zasada zakupu biletów w jednej rezerwacji (jak w `lot-w-grupie-...`) |
| Włóczykij nie zbiera głosów na termin, nie rozsyła zaproszeń, nie rozlicza kosztów; plan można wysłać znajomym linkiem do podglądu | zgodne z `src/lib/features.ts` (wszystkie flagi false) i PR #41; **zaktualizować tekst po włączeniu flag** |

## wyjazd-ze-znajomymi-z-roznymi-budzetami-jak-sie-dogadac

| Twierdzenie | Status / co sprawdzić |
|---|---|
| Quiz pyta o jeden budżet „na osobę, za cały wyjazd” (progi Backpacker / Komfortowy), jedna odpowiedź dla całej ekipy | `src/app/quiz/page.tsx` (BUDGET_LABELS, StepBudget); potwierdzone w kodzie 2026-11-16 |
| Włóczykij nie obsługuje różnych budżetów w jednej ekipie ani podziału kosztów | zgodne z `features.ts` (`settlements: false`); **zaktualizować po włączeniu flag** |
| Warianty noclegu (apartament, kilka pokoi, hostel z pokojem prywatnym) | ogólne; szczegóły w `nocleg-dla-ekipy-...`, tam w raporcie serii 2 |
| Linki do `/weekend/praga`, `/weekend/budapeszt`, `/okazje` | test linków w `src/lib/blog.test.ts` |
