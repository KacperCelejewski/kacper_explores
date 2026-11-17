# Quiz: naturalny język i ludzie w kadrze

## Cel i zakres

Zatwierdzony przez Kacpra kierunek: ciepły początek, proste pytania, pomocne wyjaśnienia. Zdjęcia pokazują wspólne chwile, a tekst traktuje odbiorcę jak osobę samodzielną. Bez interpretowania jego emocji i bez ukrywania kosztów. Wdrożenie zastępuje widok obecnego quizu, korzystając z istniejącego wyszukiwania, logowania i generatora.

## Przepływ

1. `companion`: „Z kim jedziesz?” — Ze znajomymi / We dwoje / Solo / Z rodziną. Dla znajomych i rodziny zostaje wybór składu grupy. Zdjęcie na wejściu: „Dobrze czasem gdzieś pojechać.”
2. `vibe`: „Na co masz ochotę?” (dla grupy: „Na co macie ochotę?”) — Odpocząć / Dużo zobaczyć / Poznać ludzi / Spędzić czas aktywnie. Wartości API pozostają `chill/intense/social/active`.
3. `styles`: „Co lubisz robić na wyjeździe?” — sześć dotychczasowych zainteresowań, wybór wielu lub pominięcie. Jedzenie pozostaje zainteresowaniem, nie nowym typem vibe.
4. `when`: „Kiedy i na ile dni?” — obecny wybór miesiąca i 2–21 dni. Domyślne ustawienie bieżącego miesiąca i 5 dni pozostaje widoczne i edytowalne.
5. `departure`: „Skąd ruszasz?” — obecne obsługiwane lotniska i zakres dojazdu.
6. `budget`: „Jaki budżet na osobę?” — istniejące poziomy `low` (do 1500 zł) i `medium` (1500–3000 zł). To preferencja dla całego wyjazdu, nie oferta ani gwarantowana cena. Zachować przeliczenie dla grupy i wyjaśnienie, że cenę lotu potwierdza sprzedawca.

Każdy krok ma jawny przycisk Dalej. Ostatni przycisk uruchamia dotychczasową ścieżkę wyników lub logowania. Bez automatycznego przełączania po dotknięciu opcji. Skrócony quiz z newslettera pomija `when` i `departure`, nadal korzystając z prefill.

## Kontrakty i zgodność

- `QuizAnswers`, API, płatności i generator bez zmian. Nie dodawać własnej kwoty budżetu ani dokładnych dat z prototypu.
- Kolejność i walidacja oparte o nazwane identyfikatory. Numeryczny stan Zustand pozostaje kompatybilnym indeksem pełnej kolejności; migracja v4→v5 mapuje znaczenie dotychczasowego kroku. Nie kasuje odpowiedzi ani zapisanych podróży.
- Zachować linki `city`, `afterLogin`, home/Instagram/blog, UTM, zapisane preferencje i grupy. Linki do edycji pytań z wyników używają identyfikatora, nie stałej liczby.
- Analityka: dotychczasowe nazwy zdarzeń i historyczne znaczenie `step` pozostają. GA4 otrzymuje również `step_id`, `step_position`, `flow_version=human_v1`. Zgoda na GA4 nadal obowiązuje. Backend `/api/track` bez zmiany schematu.
- Na końcu sprawdzić komplet wymaganych odpowiedzi, także po migracji, cofnięciu i przeskoku.

## Wygląd i dostępność

Mobilny układ zgodny z szerokością obecnej aplikacji, kremowe tło, mocny granat i ceglasty akcent. Jedna ludzka fotografia na wejściu; kolejne pytania mają spokojniejszy, praktyczny układ. Zdjęcia lokalne, optymalizowane przez next/image, ze znanymi źródłami/licencjami. Brak obowiązkowego pobierania z zewnętrznych serwisów. Klawiatura, widoczny fokus, aria-pressed, nagłówek ogłaszany po przejściu, pola z etykietami, respektowanie reduced motion, obsługa 320 px.

## Odbiór i wdrożenie

Testy migracji, kolejności, walidacji i powrotów; lint, typecheck, komplet istniejących testów. Ręcznie: normalny quiz, grupa, pominięcie zainteresowań, cofanie, odświeżenie, edycja z wyników, wejścia z kampanii i newslettera, konto i zapisane preferencje. Branch i PR na bazie main `d66b4a5` (potwierdzone w GitHub 17 listopada). Merge po zielonym CI i przeglądzie. Potwierdzić produkcyjne wdrożenie, nie utożsamiać lokalnego podglądu z publikacją. Wycofanie przez revert PR.

Poza zakresem: landing page, A/B testy, integracje hotelowe/mailowe/mapowe, ceny live i naprawa cache lotów. Emocjonalna komunikacja nie zastępuje rzetelnych informacji cenowych.
