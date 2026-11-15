# npm audit — 2026-11-15

Audyt wykonany 2026-11-15 na `chore/npm-audit-fixes`: `npm ci`, `npm audit --json`, następnie `npm audit fix` bez `--force`. Audyt po naprawie: **11 podatnych pakietów: 2 krytyczne, 9 umiarkowanych, 0 wysokich i 0 niskich**. Instalacja zgłosiła przed naprawą 20 podatności: 3 krytyczne, 5 wysokich, 11 umiarkowanych, 1 niską. Bezpieczna naprawa zaktualizowała wyłącznie lockfile i pozostawiła 11 ustaleń.

Wszystkie pozostałe ustalenia są osiągalne przez `devDependencies`/narzędzia deweloperskie. Nie są dołączane do produkcyjnego bundle aplikacji. „Osiągalne” oznacza, że pakiet znajduje się w drzewie instalacji developerskim, a nie że atakujący może wywołać go przez publiczny endpoint aplikacji.

## Pozostałe po naprawie

| Pakiet (wersja) | Ważność | Produkcyjny? | Osiągalny? | Decyzja | Advisory |
|---|---|---:|---|---|---|
| `vitest` (3.2.7) | krytyczna | nie | tak, lokalny runner testów | Do osobnego PR: bezpieczna poprawka w audycie wymagałaby Vitest 5 (major); nie podnosić major w tym zadaniu. | [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp), [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) |
| `tinypool` (1.1.1) | krytyczna | nie | tak, worker Vitest | Do osobnego PR razem z aktualizacją Vitest: poprawiona wersja nie mieści się w obecnym zakresie zależności Vitest 3; override wymuszałby niezgodną wersję. | [GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) |
| `@vitest/mocker` (3.2.7) | umiarkowana | nie | tak, lokalny runner testów | Do osobnego PR razem z Vitest 4.1.11+; bezpieczna naprawa wymaga major. | [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) |
| `eslint-config-next` (16.4.6) | umiarkowana | nie | tak, lint/build | Zaakceptowana tymczasowo i do osobnego PR: gałąź podatności biegnie przez TypeScript ESLint/minimatch; bez zmiany Next 16 nie znaleziono poprawki w zakresie patch/minor. | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) |
| `minimatch` (10.2.6, zagnieżdżony pod TypeScript ESLint) | umiarkowana | nie | tak, parser ESLint | Do osobnego PR: advisory obejmuje wersje 7–11.0.0; wymaga aktualizacji/zmiany łańcucha parsera. Wersja 3.1.5 używana przez inne wtyczki ESLint nie jest objęta tym advisory. | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) |
| `@typescript-eslint/typescript-estree` (8.72.2) | umiarkowana | nie | tak, parser ESLint | Do osobnego PR: podatność pochodzi z gałęzi `minimatch` 10; poprawka wymaga bezpiecznej aktualizacji/zmiany łańcucha parsera i weryfikacji ESLint. | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) |
| `@typescript-eslint/eslint-plugin` (8.72.2) | umiarkowana | nie | tak, eslint-config-next | Pozostaje jako pakiet dotknięty podatnością pośrednią; aktualizacja parsera w osobnym PR. | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) |
| `@typescript-eslint/parser` (8.72.2) | umiarkowana | nie | tak, eslint-config-next | Pozostaje jako pakiet dotknięty podatnością pośrednią; aktualizacja parsera w osobnym PR. | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) |
| `@typescript-eslint/type-utils` (8.72.2) | umiarkowana | nie | tak, eslint-config-next | Pozostaje jako pakiet dotknięty podatnością pośrednią; aktualizacja parsera w osobnym PR. | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) |
| `@typescript-eslint/utils` (8.72.2) | umiarkowana | nie | tak, eslint-config-next | Pozostaje jako pakiet dotknięty podatnością pośrednią; aktualizacja parsera w osobnym PR. | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) |
| `typescript-eslint` (8.72.2) | umiarkowana | nie | tak, eslint-config-next | Do osobnego PR wraz z łańcuchem TypeScript ESLint/minimatch. | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) |

## Naprawione

`npm audit fix` bez `--force` zaktualizował zależności tranzytywne w `package-lock.json`; nie zmienił `package.json` ani wersji Next, React, Supabase czy Stripe. Wśród usuniętych ustaleń były pakiety produkcyjne, m.in. `amadeus`/`qs`, `jspdf`/`dompurify`, `gray-matter`/`js-yaml` oraz Next/PostCSS. Zmniejszyło to wynik z 20 do 11; wszystkie pozostałe po audycie pakiety są developerskie.

## Weryfikacja

- `npm test`: 82 pliki, 765 testów zaliczonych.
- `npm run lint`: 0 błędów, 27 istniejących ostrzeżeń.
- `npm run typecheck`: zaliczony.
- `npm run build`: zaliczony na Next.js 16.4.6 z tymczasowymi lokalnymi atrapami zmiennych środowiskowych; nie zapisano ich do plików.
- `npm audit`: 11 ustaleń pozostałych jak wyżej.
