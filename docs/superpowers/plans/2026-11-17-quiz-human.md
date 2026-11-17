# Plan wdrożenia quizu

1. [x] Odizolować pracę od niezapisanych zmian i potwierdzić bazę main na GitHub.
2. [x] Zapisać specyfikację i kryteria odbioru.
3. [x] Dodać nazwane kroki, migrację oraz testy zgodności.
4. [x] Wdrożyć zdjęcia, naturalne teksty i jawne przechodzenie dalej.
5. [x] Sprawdzić typy, lint, testy i rzeczywisty przepływ w przeglądarce.
6. [ ] Przejrzeć różnice, utworzyć PR, potwierdzić CI i publikację.

Środowisko: osobny checkout `implementation/quiz-human`, branch `feat/quiz-human`. Katalog główny aplikacji pozostaje nietknięty. Shell nie rozwiązuje github.com; stan main potwierdzono w zalogowanej przeglądarce. Lokalne zależności mogą różnić się od lockfile — dokładne wersje weryfikuje CI z npm ci.

## Wyniki kontroli lokalnej

- TypeScript: przechodzi.
- ESLint: 0 błędów; ostrzeżenia hooków istnieją również w dotychczasowym quizie (inicjalizacja z URL i domyślnego miesiąca).
- Vitest: 98 plików, 1055 testów przeszły, w tym migracja stanu v1/v4→v5 oraz kolejność i walidacja obu ścieżek.
- Chrome: faktyczny komponent React z atrapami Next router/image oraz profile/track; normalny przepływ dla 5 znajomych, jawny przycisk Dalej, pominięcie zainteresowań, domyślne daty, pełny quiz, odświeżenie zachowujące odpowiedzi, przejście do URL logowania. Kontrola wizualna przy 320 px. To lokalny odbiór komponentu, nie dowód działania sesji Supabase ani produkcyjnego logowania.
- Lokalny next dev: EPERM przy otwieraniu portu. next build --webpack: brak DNS fonts.googleapis.com. Build Turbopack dodatkowo nie obsługuje zależności podpiętych symlinkiem spoza root. Kod nie zmienia fontów, lockfile ani konfiguracji builda; pełny build musi potwierdzić Vercel.
- Do potwierdzenia na wdrożeniu: rzeczywista sesja/logowanie, zapisane preferencje, link newslettera, eventy z udzieloną zgodą GA i końcowy build.

Dodatkowo Chrome potwierdził skrócony quiz newslettera (4 kroki, z pominięciem terminu i lotniska), zachowanie wybranego miasta w adresie logowania oraz klikalne i dostępne dla technologii asystujących powroty przez pasek postępu. Odbiór pełnej sesji Supabase i GA pozostaje osobnym punktem po publikacji.

Publikacja przez GitHub UI: PR #52. Vercel zbudował aplikację poprawnie. Odbiór ujawnił istniejącą regułę przekierowującą również preview na domenę produkcyjną. Dodano wyjątek wyłącznie dla VERCEL_ENV=preview oraz testy zachowania produkcyjnego redirectu i cronów; jest potrzebny do odbioru przed merge.
