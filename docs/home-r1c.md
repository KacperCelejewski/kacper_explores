# Home R1c — plakat kolejowy i marzenie ekipy

Data: 2026-11-15. Gałąź: `feat/home-r1b`. Baza porównania: `9d47460e38b8daa98fecb2fa6135b339a975077f` (R1b). Bez rebase i zmian na main.

## Wykonanie

- Hero A: `HomePoster.tsx`, autorskie SVG zaadaptowane z mocków A/B. Krem `#F5EFE0`, granat `#18324F`, pomarańcz `#EB531E`, brąz `#1C1008`. Podpis plakatu: „W czwartek pomysł. W piątek w drogę.”. H1, metadane, schema, FAQ, copy PR #30/#41 i dokładne adresy obu CTA pozostają bez zmian.
- Jeden komponent sceny: słońce, wzgórza, miasteczko i droga. Lizbona ma dachy i szyny na zboczu, Budapeszt kopułę i nabrzeże, Porto kamienice i most. SVG jest dekoracyjne (`aria-hidden`), a nazwy miast i podpis ilustracji są w HTML.
- SSR zawiera kompletny obraz z wymiarami 440 × 430. IntersectionObserver tylko dodaje klasę przy pierwszym wejściu ilustracji w widok (hero przy wejściu, karty przy przewijaniu), potem się odłącza; efekt ma cleanup. Bez JS lub bez obserwatora obraz jest statyczny i kompletny. CSS uruchamia skończone animacje wyłącznie przy `prefers-reduced-motion: no-preference`: słońce 1 s, miasteczko 0,7 s z opóźnieniem 0,15 s, droga 1,8 s. Bez pętli i wideo. Reduced motion wyłącza je całkowicie, również po zmianie preferencji podczas sesji.
- Zamiast listy ośmiu miast: osobna sekcja `HomeDreams` zaraz po hero, przed prawdziwymi okazjami. Trzy ilustrowane karty z mocka B. Jawne „Przykład” w nagłówku, wyniku i każdej karcie; umowne koszty całego wyjazdu, nie biletu. Kwoty 650/1050/1400 zł są wyłącznie danymi demonstracyjnymi mocka B (2026-11-15), nie badaniem cen ani ofertami.
- Budżet 400–2000 zł/os. (krok 50), liczba osób 2–9, początkowo 1100 zł/os. i 4 osoby. Budżet filtruje karty, liczba osób przelicza koszt razem i limit ekipy. Pusty stan nie udaje dostępnej taniej oferty. Wybór „na próbę” oznacza tylko lokalnie wybraną kartę, zmiana parametrów go czyści. Bez zapisu, fetch i przekazywania fikcyjnych kwot do quizu.
- Kontrolki mają etykiety, aktualny budżet ma `aria-valuetext`, wynik wspólne `role=status`, `aria-live=polite`, `aria-atomic=true`, przyciski `aria-pressed`. Globalny focus pozostaje; suwak, select i przyciski mają min. 44 px. Noscript opisuje statyczny przykład i ograniczenie interakcji bez JS.
- R1b zachowuje `data-page`, `:has()`, kontener 1120 px, progi 768/1024/1280. Karty układają się w jednej kolumnie na telefonie i w trzech od 768 px. Hero ma dwie kolumny od 1024 px. Test HomeClient nadal potwierdza 6 linków do quizu w SSR z okazjami i bez, z rezerwą siódmego na otwarte globalne menu. Zachowane oba adresy `/quiz?companion=friends&src=home-ekipa` i `/quiz?src=home-solo`.
- DealsStrip i zapis, dane i ceny prawdziwych okazji pozostają w obecnych komponentach. Nie zmieniono API, webhooka, auth, admina, cronów, analityki, quizu ani planu. Flagi pozostają false. Brak nowych zależności, fontów, zewnętrznych obrazów i migracji. Nowa warstwa używa CSS/IntersectionObserver; zastany Framer Motion w HomeClient nie został rozszerzony.

## Kontrole lokalne

- `npm test`: **87 plików, 837 testów, PASS**. Dodano 10 testów: progi i pusty wynik, sumy dla grupy oraz uczciwy/etykietowany SSR; rozszerzono istniejący test HomeClient o plakat i brak kwot w hero. To testy modelu i HTML, nie testy interakcji w przeglądarce.
- `npm run lint`: **0 błędów, 27 zastanych ostrzeżeń**.
- `npm run typecheck`: **PASS**.
- `npm run build`: **PASS**, z lokalnymi atrapami env podanymi niżej. Build zgłasza zastaną deprecjację Edge Runtime i błędy odczytu danych z atrapy Supabase. To nie jest test integracji z produkcyjną bazą, płatnościami ani lotami.
- `git diff --check`: **PASS**.

```sh
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=local-placeholder SUPABASE_SERVICE_ROLE_KEY=local-placeholder STRIPE_SECRET_KEY=sk_test_placeholder npm run build
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=local-placeholder SUPABASE_SERVICE_ROLE_KEY=local-placeholder STRIPE_SECRET_KEY=sk_test_placeholder npm run start -- --port 3100
```

Atrapy przekazano tylko procesom lokalnym, bez tworzenia `.env` i bez sekretów w repo. Do startu lokalnego z danymi runtime można przekazać ten sam zestaw atrap przed `npm run start`; prawdziwe okazje wymagają środowiska testowego z danymi.

## Waga przed i po

Pomiar lokalnych artefaktów produkcyjnego `next build`, 2026-11-15, ta sama instalacja zależności i zestaw atrap env. Nie jest to pomiar sieci ani LCP. Gzip: Python `gzip.compress(..., mtime=0)`, domyślny poziom 9. KB = 1000 B.

| Artefakt | R1b B | R1c B | Przyrost B | R1b gzip B | R1c gzip B | Przyrost gzip B |
|---|---:|---:|---:|---:|---:|---:|
| HTML głównej | 64 386 | 71 868 | +7 482 | 12 094 | 13 661 | +1 567 |
| JS wskazany przez HTML | 1 021 045 | 1 023 406 | +2 361 | 303 686 | 304 500 | +814 |
| CSS wskazany przez HTML | 48 866 | 52 403 | +3 537 | 9 283 | 10 032 | +749 |
| Wszystkie inline SVG (część HTML) | 4 350 | 8 813 | +4 463 | 1 334 | 1 927 | +593 |

**Łączny przyrost HTML + JS + CSS: 13 380 B surowo / 3 130 B gzip (3,13 KB). Netto JS: +0,81 KB gzip, SVG: +0,59 KB gzip.** SVG już wliczono w HTML, więc nie dodajemy tego wiersza do sumy. JS obejmuje również istniejące wspólne skrypty aplikacji, a nie tylko HomeClient. Usunięcie importu danych `cityPhotos` z HomeClient kompensuje część nowego kodu; podano wynik netto. Rozmiary nie mierzą pracy głównego wątku/GPU. Brak dodatkowych żądań na ilustracje.

Metoda odtworzenia: po buildzie odczytać `.next/server/app/index.html`; zebrać i zduplikowane usunąć adresy `src` skryptów `.js` i `href` arkuszy `.css`; dla każdego adresu zamienić prefiks `/_next/` na `.next/`, policzyć rozmiar bajtów oraz gzip i zsumować. SVG: złączyć wszystkie fragmenty `<svg … </svg>` w kolejności HTML i skompresować jako jeden bufor. Porównywać dwa pełne buildy z identycznym env i wersjami pakietów. Ukryta na starcie karta Porto też jest w SSR i w tym pomiarze. HTML z prawdziwymi okazjami będzie miał inną wagę.

## Odbiór w przeglądarce — do wykonania przez leada

**Nie uruchamiano przeglądarki, nie wykonano zrzutów, pomiarów LCP/CLS, overflow ani testu czytnikiem ekranu.** Zgodnie z briefem wykonuje je lead. Powyższe reguły layoutu i dostępności opisują implementację, nie potwierdzony wynik UI.

1. Podgląd na 320/375/390/768/1024/1280/1440/1920 px, szczególnie 375 × 667 i 1280 × 650. H1, oba CTA i mikrotekst wobec banera cookies; kontener 1120, brak poziomego scrolla; 200% tekstu. Sprawdzić też kadrowanie ilustracji na kartach.
2. JS włączony/wyłączony oraz spowolniony: obraz i copy obecne od SSR, zgodny układ przed/po hydracji, brak błędów hydracji. Bez JS widoczne dwa początkowe przykłady i komunikat noscript. Obie ścieżki quizu i powrót działają; otwarte menu nie przekracza 7 linków.
3. Ruch zwykły: hero i karty odtwarzają krótkie wejście tylko raz, bez powtarzania przy ponownym scrollu. Reduced motion włączone przed załadowaniem i w trakcie ruchu: pełna nieruchoma scena, bez znikającej drogi/miasta. Brak obserwatora: pełna scena statyczna.
4. Start 1100/4: dwie karty, limit 4400 zł; 400: pusty stan; 650/1050/1400: odpowiednio 1/2/3 karty; 2000/9: limit 18000 zł, sumy 5850/9450/12600 zł. Wybrać kartę, zmienić budżet/liczbę osób: wybór znika, wynik/sumy się zmieniają. To nadal przykłady, nie oferty.
5. Tab, strzałki suwaka i selecta, Enter/Spacja przycisków, widoczny focus i cele 44 px; czytnik odczytuje aktualizowany wynik i wybór bez wielokrotnego czytania SVG. Zmierzyć LCP/CLS i sprawdzić scroll na telefonie.
6. Środowisko testowe z prawdziwymi okazjami: sprawdzić oddzielenie przykładowych kwot od danych, zmianę lotniska i zapamiętanie go, zapis zrzutu, FAQ i CTA. Nie wprowadzać atrap do konfiguracji Vercel.

## Przekazanie i produkcja

Zmiany do commita/pusha wyłącznie na `feat/home-r1b`, bez force. Zgodnie z wyjściem briefu ten etap nie tworzy PR ani merge. Lead przygotowuje otwarty PR i podgląd Vercel do obejrzenia przez Kacpra. **Produkcja dopiero po odbiorze wizualnym Kacpra, pomiarach i zielonym CI.** Nowe zmienne produkcyjne, usługi, migracje i instalacja pakietów nie są wymagane; aplikacja korzysta z dotychczasowej konfiguracji.

Próba `git add` i commita `feat(home): add railway poster hero and illustrative group dreams` została zablokowana: nie można utworzyć `/Users/kacpercelejewski/Documents/Code/travel apka/wloczykij-app/.git/worktrees/wloczykij-app-home-r1b/index.lock` (`Operation not permitted`). **Nie powstał commit, push nie został wykonany; zmiany pozostają niezacommitowane. Lead zrobi commit**, a następnie `git push origin feat/home-r1b` bez force. Nie podjęto próby obejścia ograniczenia ani modyfikacji uprawnień.
