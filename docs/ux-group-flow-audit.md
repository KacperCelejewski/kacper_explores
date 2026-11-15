# Audyt ścieżki "wyjazd ze znajomymi" (2026-11-15)

Produkcja: `https://wloczykij.me`. Przejście jak nowy użytkownik: strona główna → "Jedziemy ekipą" → quiz (kroki 1–6) → plan → udostępnianie. Chrome, okno 614 px szerokości (najwęższe, na jakie pozwoliło okno; 390 px nie dało się ustawić, układ i tak jest mobilny) oraz 1280×800.

Czego **nie** robiłem, żeby nie zużywać zasobów właściciela: nie kliknąłem "Dobierz kierunki" (woła API kierunków), nie generowałem planu, nie klikałem "Udostępnij w galerii Odkryj" na planie testowym (przestawia `is_public`). Ekran kierunków i działanie udostępniania oceniam z kodu (`src/app/destinations/page.tsx`, `src/app/plan/[tripId]/page.tsx`, `src/app/api/gallery`, `src/app/api/share`) i z oglądu planu `/plan/budapeszt-1794773191468`. Ten plan ma `quizAnswers.companion = solo`, więc nie widać na nim widoku "na osobę / razem" (kod go ma, `showGroupBudget`).

## Co jest, a czego nie ma

Jest: pytanie "Ile osób jedzie" (3–9) przy wyborze "Znajomi", koszt na osobę i razem w nagłówku planu (przy zapisanej grupie), ceny lotów w kartach liczone na osobę, publiczny link `/share/[tripId]` otwierany bez konta.
Nie ma (flagi w `features.ts` wyłączone): zaproszeń, głosowania nad terminem, wspólnych lotów, rozliczeń, wspólnego obiektu "grupa".

## Tabela problemów

| # | Pri | Krok | Problem | Dowód |
|---|-----|------|---------|-------|
| 1 | P1 | Plan, udostępnianie | **"Udostępnij" nie udostępnia.** Dla planu prywatnego (domyślnie) przycisk nic nie kopiuje, tylko na 3 s zmienia etykietę na "↓ Najpierw udostępnij plan". Link działa dopiero po kliknięciu innego przycisku. Użytkownik nie wie, co się stało. | `plan/[tripId]/page.tsx` `handleShare`: `if (!isPublic) { setCopied(true); … return; }` |
| 2 | P1 | Plan, udostępnianie | **Wysłanie planu ekipie wymaga opublikowania go w galerii.** Jedyny przełącznik to "Udostępnij w galerii Odkryj", a jedna flaga `is_public` otwiera i link, i galerię (`/api/gallery` czyta `is_public = true`, zwraca m.in. `quiz_answers`). Przy tym ekran nie mówi, że plan stanie się publiczny. | `api/gallery/route.ts`, `api/share/[tripId]/route.ts`, migracja `20260516000000_trips_is_public.sql` |
| 3 | P1 | Plan, udostępnianie | Przycisk jest **na samym dole** długiej strony (na produkcji y≈3450 z 3857 px), w rzędzie trzech równorzędnych małych przycisków (Udostępnij / PDF / Kalendarz), wysokość 40 px (<44 px). Nie wygląda jak główna akcja ekipy. | pomiar DOM na produkcji: 3 przyciski 131×40 px |
| 4 | P1 | Quiz, krok 1 | **Liczba osób jest pod zgięciem.** Na komputerze (1280×800) lepki przycisk "Dalej" zasłania kartę "Znajomi", a pole "Ile osób jedzie" jest niewidoczne bez przewijania. Domyślne 4 osoby można zaakceptować nieświadomie. | zrzut 1280×800 `/quiz?companion=friends` |
| 5 | P1 | Quiz, krok 1 | Pole "Ile osób jedzie" jest cichym dodatkiem pod kartami: mały tytuł, podpowiedź "Od 3 osób" (niejasna: od 3 w górę? minimum?). Nie mówi, po co podajemy liczbę. | zrzut telefon, krok 1 |
| 6 | P1 | Quiz, kroki 2–6 | **Skład ekipy znika.** Żetony podsumowania pokazują tylko "Znajomi", nigdy "4 osoby". Nie widać, że liczba została przyjęta ani że wpływa na ceny. | `answeredLabels` w `quiz/page.tsx` używa tylko `COMPANION_LABELS` |
| 7 | P1 | Kierunki | Nagłówek "Twoje destynacje. Dopasowane do Twojego budżetu i stylu" nie mówi nic o ekipie: ani ilu Was jedzie, ani że ceny są na osobę. Karta pokazuje "Cena lotu" (na osobę, ale tylko w drobnym wierszu i tylko gdy jest świeża wycena), nie ma wartości "razem". | `destinations/page.tsx` nagłówek i `DestCard` |
| 8 | P1 | Strona główna | Obietnica "Wyjazd ze znajomymi" nie mówi, co dostanie ekipa po stronie wyniku: podtytuł ("Powiedz, kto jedzie…") pomija koszt na osobę/razem i plan do wysłania. Odpowiedź jest dopiero w FAQ na dole strony ("Jedziemy ekipą, co dostajemy?"). | `homeCopy.ts` `SUBTITLE_BASE`; FAQ na produkcji |
| 9 | P1 | Strona udostępniona | Odbiorca widzi plan bez informacji, że to wyjazd ekipy: kwoty (liczone na osobę) pokazane są jako "Szacowany całkowity koszt" bez "na osobę" i bez wartości razem. API nie zwraca składu. | `share/[tripId]/ShareClient.tsx`, `api/share` |
| 10 | P2 | Quiz, krok 1 | Opis karty "Znajomi" kończy się "podział kosztów", co sugeruje rozliczanie wydatków (flaga `settlements` wyłączona). Ten sam opis w `/quick`. | `quiz/page.tsx` i `quick/page.tsx` `COMPANION_OPTIONS` |
| 11 | P2 | Nazewnictwo | Raz "ekipa" (CTA, FAQ), raz "znajomi" (karta, H1), raz "grupa" ("Twojej grupy"), raz "Ty/Twój" ("6 pytań o Ciebie", "kierunków skrojonych pod Ciebie"). Brak zasady. | strona główna, quiz |
| 12 | P2 | Strona główna → quiz | Po wejściu "Jedziemy ekipą" adres jest czyszczony z `companion`/`src` (celowo, dla analityki); ekran quizu jest identyczny jak dla "Solo albo we dwoje". Człowiek nie dostaje potwierdzenia, że wszedł ścieżką ekipy. | `/quiz` po kliknięciu |
| 13 | P2 | Plan | Nagłówek planu liczy "na osobę" i "razem" (dobrze), ale nic nie przypomina o składzie ("4 osoby") i nie podpisuje, że pozycje Loty/Nocleg/Jedzenie/Atrakcje są na osobę. | `plan/[tripId]/page.tsx` nagłówek |
| 14 | P2 | Dostępność | Przyciski "Udostępnij / PDF / Kalendarz" i przełącznik galerii: 40 px wysokości; na karcie kierunku "Szukaj lotów ↗" i "Planuj wyjazd →" mają `py-2` przy `text-xs` (~32 px). | pomiar DOM; `DestCard` |
| 15 | P2 | Plan | Brak informacji, że link otwiera plan bez konta (prawda wg `/api/share`, tylko dla planów publicznych). | `share/[tripId]` |

## Wniosek

Rozjazd wynika z trzech rzeczy: (1) obietnica na głównej jest ogólna, a to, co ekipa faktycznie dostaje (liczba osób → koszt na osobę/razem → link do planu), nigdzie nie jest powiedziane po drodze; (2) liczba osób znika po pierwszym kroku; (3) jedyny mechanizm "wysłania ekipie" jest ukryty na dole, nazwany "Udostępnij", a naprawdę publikuje plan w galerii.

## Czego ta zmiana nie rozwiązuje

Oddzielenie "link dla znajomych" od "galeria publiczna" wymaga osobnej kolumny widoczności w `trips` (migracja Supabase) i zmiany `/api/gallery`. Bez migracji ekran uczciwie mówi, że link = plan publiczny i pojawia się w galerii (patrz commit z kartą "Wyślij plan ekipie"). Decyzja o migracji należy do właściciela.
