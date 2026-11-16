# npm audit — 2026-11-16

Audyt wykonany po `npm ci` 2026-11-16. Pierwotnie npm zgłosił 11 podatności: 9 umiarkowanych i 2 krytyczne. `npm audit fix` bez `--force` nie zmienił zależności. Po aktualizacji Vitest 3 → 5.1.0 pozostało 8 podatności umiarkowanych; krytyczne alerty `tinypool` oraz alerty Vitest zniknęły.

Żaden alert nie dotyczy pakietu z `dependencies`. Wszystkie wymienione niżej pakiety są w drzewie developerskim i nie trafiają do runtime aplikacji.

| Pakiet | Zasięg | Decyzja |
| --- | --- | --- |
| `vitest` | Dev: runner testów | Zaktualizowano 3.2.7 → 5.1.0 (major); wszystkie testy przechodzą bez zmian treści. |
| `@vitest/mocker` | Dev: mockowanie w runnerze testów | Naprawione przez aktualizację Vitest do 5.1.0. |
| `tinypool` | Dev: workery Vitest | Naprawione przez aktualizację Vitest do 5.1.0; usunięto 2 alerty krytyczne. |
| `@typescript-eslint/eslint-plugin` | Dev: plugin ESLint | Pozostawiono; łańcuch jest podatny przez `minimatch`. |
| `@typescript-eslint/parser` | Dev: parser ESLint | Pozostawiono; łańcuch jest podatny przez `minimatch`. |
| `@typescript-eslint/type-utils` | Dev: narzędzia typów dla ESLint | Pozostawiono; łańcuch jest podatny przez `minimatch`. |
| `@typescript-eslint/typescript-estree` | Dev: parser TypeScript ESLint | Pozostawiono; zależy od podatnego `minimatch`. |
| `@typescript-eslint/utils` | Dev: narzędzia ESLint | Pozostawiono; łańcuch jest podatny przez `minimatch`. |
| `typescript-eslint` | Dev: konfiguracja lintowania z `eslint-config-next` | Pozostawiono; nie ma bezpiecznej automatycznej aktualizacji bez większej zmiany łańcucha. |
| `eslint-config-next` | Dev: konfiguracja lintowania i build | Pozostawiono. `npm audit fix --force` proponuje downgrade do 15.5.29, niezgodny z używanym Next 16; nie zmieniano wersji frameworka w tym zadaniu. |
| `minimatch` (zagnieżdżony pod `@typescript-eslint/typescript-estree`) | Dev: globowanie w analizatorze TypeScript/ESLint | Pozostawiono: poprawka wymaga minimatch 11.0.1, a npm nie oferuje bezpiecznej automatycznej aktualizacji w obecnym łańcuchu. Nie dodano override major o niezweryfikowanej zgodności. |

## Weryfikacja

- `npm ci` — zakończone; raportowało 11 podatności przed naprawą i 8 po aktualizacji Vitest.
- `npm audit fix` — bezpieczne poprawki nie były dostępne.
- `npm test` na Vitest 5.1.0 — 93 pliki, 973 testy zaliczone; pliki testowe bez zmian.
- `npm audit` po zmianach — 8 umiarkowanych, 0 wysokich/krytycznych; wszystkie w zależnościach developerskich ESLint.
- `npm audit --omit=dev` — 0 podatności w zależnościach produkcyjnych.
- `npm run lint` — 0 błędów, 27 ostrzeżeń.
- `npm run typecheck` — zaliczony.
- `npm run build` — zaliczony z atrapami env; bez sekretów w plikach. Podczas generowania statycznego stron kilka żądań do Supabase zakończyło się `fetch failed`, ale build zakończył się kodem 0.

Vitest 5 wymaga Node.js `^22.12.0 || ^24 || >=26`; środowisko CI używające testów powinno mieć Node 22.12.0 lub nowszy. Nie wymaga to zmian w runtime produkcyjnej aplikacji.
