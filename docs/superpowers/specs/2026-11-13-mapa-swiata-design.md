# Mapa świata `/swiat` — design

Data: 2026-11-13 · Ścieżka: architektoniczna (nowa podstrona, nowa warstwa danych, wizualizacja 3D)

## Po co

Efektowna zabawa do pochwalenia się, głównie z Instagrama: użytkownik zaznacza kraje, w których był, na globusie 3D i dostaje liczby (procent świata, procent każdego kontynentu, liczba krajów) oraz obrazek do wrzucenia na relację. Cel: nowy kanał dojścia do Włóczykija, nie funkcja planowania.

Sukces: osoba z Instagrama wchodzi bez konta, w kilka kliknięć zaznacza swoje kraje, widzi swój wynik i potrafi go udostępnić; pod wynikiem widzi drogę do okazji lotniczych.

## Ustalenia z rozmowy

| Pytanie | Decyzja |
|---|---|
| Cel | Zabawa i udostępnianie |
| Konto | Bez konta, zapis w przeglądarce; konto opcjonalne (synchronizacja poza pierwszą wersją) |
| Poziom szczegółu | Całe kraje |
| Procenty | Po liczbie krajów (świat i każdy kontynent) |
| Udostępnianie | Obrazek PNG do pobrania i przez okno udostępniania telefonu |
| Technika globusa | `react-globe.gl` (three.js), stylizowany pod markę |
| Terytoria zależne | Rysowane, ale nie do zaznaczenia i nie liczone |

## Poza pierwszą wersją

Konta i synchronizacja między urządzeniami, publiczne linki do map, regiony wewnątrz dużych krajów, dodawanie odwiedzonych krajów z poziomu planów podróży. Model danych zostawia miejsce na kolumnę z listą kodów w profilu, ale nic z tego nie powstaje teraz.

## Struktura

Adres `/swiat`. Strona jest komponentem serwerowym (metadane, SEO, opis), a globus to osobny komponent klienta ładowany leniwie (`next/dynamic`, `ssr: false`), więc three.js nie trafia do reszty serwisu. Przed pisaniem kodu czytamy dokumentację Next 16 w `node_modules/next/dist/docs/` (AGENTS.md).

Jednostki, każda z jednym zadaniem:

1. **`src/lib/world/countries.ts`** — lista 195 państw (193 członków ONZ plus Watykan i Palestyna): kod ISO 3166-1 alfa-2 i kontynent. Polskie nazwy z `Intl.DisplayNames(["pl"], { type: "region" })`, bez własnej tabeli tłumaczeń. Przypisanie kontynentu: Rosja do Europy, Turcja, Gruzja, Armenia, Azerbejdżan i Kazachstan do Azji, Egipt do Afryki, Cypr do Europy, Meksyk, Ameryka Środkowa i Karaiby do Ameryki Północnej. Antarktyda nie ma krajów, więc kontynentów jest sześć.
2. **`src/lib/world/stats.ts`** — czysta funkcja `countryStats(visited)`: liczba odwiedzonych krajów, procent świata i procent każdego kontynentu. Kody spoza listy są ignorowane. Procent pokazywany jako liczba całkowita, a poniżej 1% jako „<1%”.
3. **`src/lib/world/storage.ts`** — odczyt i zapis klucza `visited_countries` w `localStorage`: tylko lista kodów, każda wartość sprawdzana względem listy krajów, wszystkie operacje w `try/catch`.
4. **`public/world/countries.geojson`** — uproszczone granice krajów (Natural Earth 110 m, domena publiczna) z właściwością `iso`. Generowane jednorazowo skryptem z `world-atlas` i `topojson-client`, wynik w repozytorium. Wczytywane dopiero na stronie `/swiat`.
5. **Interfejs** — komponenty klienta: globus, wyszukiwarka z listą krajów (grupowana po kontynentach, z polem wyszukiwania i zaznaczaniem), panel z liczbami i przycisk obrazka.
6. **`src/lib/world/shareCard.ts`** — składanie obrazka: tekst (czysta funkcja, testowana) i rysowanie na `canvas` 2D (nietestowane automatycznie).

Przepływ: klik w kraj albo zaznaczenie na liście, zmiana zbioru, zapis, przeliczenie, odświeżenie panelu i koloru kraju na globusie.

## Wygląd i zachowanie

- Stylizacja pod markę: tło jak strona, ocean i nieodwiedzone kraje w stonowanych odcieniach, odwiedzone w `--accent`, delikatna poświata atmosfery. Kolory z `globals.css`, więc ciemny motyw działa tak samo jak reszta serwisu.
- Globus obraca się sam, dopóki użytkownik go nie dotknie; przy `prefers-reduced-motion` nie obraca się wcale.
- Najechanie pokazuje nazwę kraju, klik zapala albo gasi. Na telefonie przeciągnięcie obraca, stuknięcie zaznacza.
- Terytoria zależne (Grenlandia, Portoryko, Gujana Francuska, Hongkong i podobne) mają neutralny kolor, brak zaznaczania i podpowiedź „terytorium zależne”.
- Małych krajów (Liechtenstein, Malta, Watykan) nie da się trafić palcem na globusie, dlatego wyszukiwarka z listą jest pełnoprawnym sposobem zaznaczania, nie dodatkiem.
- Bez WebGL albo na słabym urządzeniu strona działa dalej: lista i panel liczb są kompletne, globus jest tylko wizualną nakładką.
- Dostępność: lista jest obsługiwana klawiaturą i czytnikiem ekranu, globus dostaje opis tekstowy z aktualnymi liczbami.

## Obrazek do udostępniania

Format pionowy 1080×1920 (relacja na Instagramie). Zawartość: nazwa Włóczykij, zrzut globusa z zapalonymi krajami, duża liczba „23% świata”, pod nią „41 z 195 krajów”, sześć pasków kontynentów, na dole `wloczykij.me/swiat`. Składany lokalnie na `canvas` 2D, bez zewnętrznych usług. Zrzut globusa wymaga `preserveDrawingBuffer` w konfiguracji renderera. Na telefonie przycisk używa Web Share API z plikiem (okno udostępniania z Instagramem), a gdy przeglądarka tego nie umie, obrazek się pobiera.

## Powiązanie z serwisem i pomiar

Pod liczbami link „Dokąd następny kraj? Zobacz okazje z Twojego lotniska” do `/okazje/...` z UTM. Zdarzenia GA4: `world_share` (kliknięcie udostępnienia) i pierwsza akcja z liczbą zaznaczonych krajów. Resztę łapie istniejący licznik kliknięć. Nic z mapy nie opuszcza przeglądarki.

## Błędy

Zablokowany `localStorage`: mapa działa tylko w pamięci strony, z krótką informacją. Nieudane wczytanie granic: tryb samej listy z komunikatem. Uszkodzone zapisane dane: odrzucane wartość po wartości, strona się nie psuje.

## Testy

Automatyczne (Vitest) dla czystej logiki:
- `countryStats`: liczby, procenty, sumy kontynentów, nieznane kody ignorowane, pusty zbiór, wszystkie kraje.
- `storage`: poprawny odczyt, uszkodzony JSON, nieznane kody, zablokowany zapis.
- Spójność listy krajów: dokładnie 195 pozycji, kody unikalne, każdy kraj ma kontynent, sumy kontynentów dają 195, wszystkie kody mają kształt w GeoJSON albo świadomie nie.
- Tekst obrazka: nagłówek, liczby i paski dla kilku zbiorów wejściowych.

Wygląd globusa i obrazka sprawdzam wzrokowo w podglądzie, razem z wyglądem na szerokości telefonu. Rozmiar paczki dla tej strony mierzę przy budowaniu i opisuję w PR.

## Ryzyka

- Rozmiar paczki three.js i `globe.gl`: ładowane tylko na `/swiat`, ale warto sprawdzić koszt przy wolnym łączu i ustalić granicę przed wdrożeniem.
- Przypisanie krajów do kontynentów jest umowne; reguła jest wypisana wyżej i opisana w kodzie, żeby sporne przypadki nie wyglądały na błąd.
- Granice 110 m pomijają najmniejsze państwa, więc część z nich nie ma kształtu na globusie i jest dostępna tylko z listy. To zamierzone, nie błąd.
- `Intl.DisplayNames` wymaga nowoczesnej przeglądarki; w starszej lista pokazuje kody ISO zamiast polskich nazw.
