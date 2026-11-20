# Uczciwe zdjęcia miast — 2026-11-16

Gałąź: `fix/city-photos`. Zakres: brief `2026-11-16-night-photos.md`.

## Zmiana

- `cityPhotos.ts` zwraca model `CityPhoto`: dla Unsplash URL, ID fotografii, autora, profil, stronę fotografii, źródło i zweryfikowane miasto; dla ilustracji lokalny URL i źródło. Usunięto wszystkie przypisania zdjęć obcych miast oraz domyślną wieżę Eiffla.
- Biała lista obejmuje osiem miast poniżej i ich jawne aliasy językowe. Każde inne miasto dostaje autorskie `public/illustrations/journey-poster.svg`: płaski pejzaż, słońce, droga i paleta plakatu; bez tekstu i bez udawania konkretnego miejsca.
- `fetchCityPhoto` pobiera z Unsplash wyłącznie uprzednio zweryfikowany identyfikator (`/photos/:id`). Pierwszy wynik wyszukiwania nie jest dowodem miejsca, dlatego usunięto wyszukiwanie oraz fallback Wikipedii bez metadanych licencji. Dodanie nowego miasta wymaga sprawdzenia konkretnego zdjęcia, autora i źródła, potem rozszerzenia białej listy.
- Istniejący klucz `UNSPLASH_ACCESS_KEY` jest opcjonalny. Bez klucza lub przy błędzie API działają sprawdzone zdjęcia z lokalnymi metadanymi; nieznane miasta nie wywołują zewnętrznego API. Fetch ma cache 24 h, limit oczekiwania 4 s oraz kontrolę ID i hostów URL. Adres CDN z API jest zachowany razem z parametrem `ixid`.
- `/api/city-photo` oddaje cały model. Wspólny `CityPhoto` pokazuje kadr i podpis „Zdjęcie: Autor, Unsplash”, oba linki mają `utm_source=wloczykij&utm_medium=referral`. Podpis jest na jednolitym tle, poza linkiem nawigacyjnym. `next/image unoptimized` osadza bezpośredni CDN, bez proxy Next. Błąd ładowania obrazu przełącza kadr i podpis na ilustrację.
- Wszystkie istniejące miejsca użycia przeniesiono na ten komponent: galeria głównej, `/destinations`, `/quick`, `/odkryj`, `/plan/[tripId]`. Małe miniatury powiększono, żeby mieściły podpis. Ilustracja ma uczciwy opis alternatywny i podpis „Ilustracja Włóczykija”.
- Usunięto `FEATURED_DESTINATIONS.priceFrom`, stałe kwoty inspiracji i niepoparte ofertą tagi „Tanie loty”. Prawdziwe ceny kierunków i pasek okazji nadal pochodzą z istniejących danych; nie zmieniono ich logiki.

## Źródła zdjęć i sprawdzenie miejsca

Strony zdjęć, dane autorów i odpowiadające im obrazy CDN odczytano 2026-11-16. Wszystkie osiem obrazów pobrano (HTTP 200) i obejrzano w zestawieniu. Stare identyfikatory bez pełnej weryfikacji zastąpiono poniższymi; zachowano poprawne zdjęcia Lizbony i Dubrownika.

| Miasto / widok | Autor | Strona źródłowa / identyfikator |
| --- | --- | --- |
| Barcelona / Sagrada Família | Jeffrey Eisen | [b1v7_djQNuk](https://unsplash.com/photos/b1v7_djQNuk) |
| Lizbona / Alfama | Get Golden Visa | [M0ywxxUOIkE](https://unsplash.com/photos/M0ywxxUOIkE) |
| Rzym / Koloseum | Cristina Gottardi | [VhlLC2eNSuo](https://unsplash.com/photos/VhlLC2eNSuo) |
| Ateny / Akropol | Michal Vrba | [oxZwLNRTZ1Q](https://unsplash.com/photos/oxZwLNRTZ1Q) |
| Praga / zamek i Wełtawa | Mikheil Kuzmidi | [GxOyvWUWPrY](https://unsplash.com/photos/GxOyvWUWPrY) |
| Dubrownik / stare miasto | Hongbin | [odcVzDcfS1s](https://unsplash.com/photos/odcVzDcfS1s) |
| Budapeszt / parlament i Dunaj | Martin Guido | [Jv2wfhVptR0](https://unsplash.com/photos/Jv2wfhVptR0) |
| Porto / most Dom Luís I | Vincent Yap | [4p_BzPvxm0s](https://unsplash.com/photos/4p_BzPvxm0s) |

Zasady odczytane 2026-11-16: [atrybucja i UTM dla API](https://help.unsplash.com/en/articles/2511315-guideline-attribution), [bezpośrednie osadzanie URL CDN](https://unsplash.com/documentation#hotlinking). Odczytano także lokalne przewodniki zainstalowanego Next 16.4.6: `image.md`, `route.md`, `fetch.md` w `node_modules/next/dist/docs/01-app/03-api-reference/`.

## Weryfikacja

Wyniki 2026-11-16:

- `npm test`: **951/951**, 89 plików; w tym 24 nowe przypadki: poprzednio fałszywe miasta, aliasy, pełna atrybucja, brak cen, hotlinking, API → JSON → UI, brak klucza, obce ID, brak autora, nieprawidłowe URL, błędny JSON, HTTP 429, timeout i brak parametru miasta.
- `npm run lint`: **0 błędów, 26 ostrzeżeń** w istniejących miejscach; bez wyciszania reguł. `npm run typecheck`: OK. `git diff --check`: OK.
- `npm run build` z poniższymi atrapami: OK, wygenerowane strony i trasy. Nie używano sekretów ani produkcyjnej bazy.
- Smoke HTTP na produkcyjnym serwerze lokalnym: główna, SVG i endpoint zdjęcia odpowiadają poprawnie; Rzym ma metadane, Warszawa ilustrację. Parsowanie SSR głównej: 8 zdjęć, 8 podpisów, 16 linków UTM, brak zagnieżdżonych linków i proxy obrazów.
- SVG wyrenderowano i obejrzano. **Nie wykonano testu UI, klawiatury ani screenshotów layoutu 320/390/1440 px**: Chrome uruchamiany przez Playwright zakończył start `SIGABRT`, a narzędzie przeglądarkowe zgłosiło „The browser access host is unavailable”. Nie sprawdzono na żywo gałęzi API z prawdziwym kluczem; testy mają atrapy odpowiedzi.

```sh
npm ci
npm test
npm run lint
npm run typecheck
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=build-placeholder \
SUPABASE_SERVICE_ROLE_KEY=build-placeholder \
STRIPE_SECRET_KEY=sk_test_build_placeholder \
GEMINI_API_KEY=build-placeholder npm run build
```

Do ręcznego odbioru na preview: główna (wszystkie osiem kart), kierunki Rzym/Warszawa, `/quick` po wpisaniu miasta, `/odkryj`, istniejący plan; szerokości 320/390/1440 px, podpisy, linki autora i Unsplash, fokus, brak poziomego przepełnienia. Zablokowanie CDN w devtools powinno pokazać ilustrację i usunąć podpis fotografii. Sprawdzić też powiększenie tekstu.

## Produkcja i granice

Brak migracji, nowych env i zależności. Wystarczy standardowy deploy po merge i ręczny odbiór UI; atrapy powyżej służą tylko lokalnemu buildowi. Zdjęcia wymagają dostępu przeglądarki do `images.unsplash.com`; ewentualny przyszły CSP musi to uwzględnić. Obecny `UNSPLASH_ACCESS_KEY` pozostaje tylko po stronie serwera. Nie wykonano wdrożenia ani zmian ustawień kont.

Nie ruszano webhooka, auth, cronów, MDX, globals, HomePoster ani HomeDreams. Zmiany głównej to wyłącznie pobieranie modelu zdjęć, typ propsa galerii, komponent kadru/podpisu i usunięcie kwot. Przy integracji z PR #43 zachować kontrakt `galleryPhotos: CityPhoto[]` oraz podpisy jako rodzeństwo linków nawigacyjnych; nowe karty nie mogą przywracać starych kwot ani używać samych URL bez autora. Raport i kod są w tej gałęzi; nie edytowano plików biznesowych innych agentów.

## Commit / push

Próba `git add` i `git commit` została zablokowana przez sandbox: `Unable to create .../.git/worktrees/wloczykij-app-photos/index.lock: Operation not permitted`. Zgodnie z briefem **brak nowego commita i pushu**; komplet zmian pozostaje niezacommitowany w worktree `fix/city-photos`. Lead może wykonać commit i push bez force po odbiorze.

## Ramka nigdy nie jest pusta (2026-11-20)

Przyczyna zgłoszenia "Budapeszt, Lizbona: nic nie ma" (częściowo hipoteza: lokalnie, bez klucza Unsplash i z działającym CDN, obie karty pokazują zdjęcia; nie odtworzono pustki na produkcji): kadr `CityPhoto` nie miał tła pod zdjęciem, więc przy wolnym lub zablokowanym CDN Unsplash (albo obrazie, który zepsuł się przed hydracją i nie wywołał `onError`) zostawał pusty prostokąt. Adresy CDN obu miast odpowiadają HTTP 200 (sprawdzone 2026-11-20). Poprawka: plakat marki jako tło pod każdym zdjęciem, kontrola `complete && naturalWidth === 0` po montażu, `alt` z nazwą miasta, zdjęcie lub ilustracja na `/weekend/[miasto]`. Test `src/lib/cityPhotoCoverage.test.ts` sprawdza wszystkie miasta z katalogu. Miasta spoza białej listy (dziś 8 z 56 w katalogu) nadal dostają jedną wspólną ilustrację; własne zdjęcia z licencją wymagają ręcznej weryfikacji i dopisania do `VERIFIED_PHOTOS`.
