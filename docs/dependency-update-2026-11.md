# Aktualizacja Next.js i sharp — 15.11.2026

## Wybrane wersje

| Pakiet | Przed | Po | Uzasadnienie |
| --- | --- | --- | --- |
| `next` | 16.2.6 | 16.4.6 | Najnowsze stabilne wydanie linii 16.x widoczne w npm 15.11.2026; release z 9.11.2026. Obejmuje poprawki bezpieczeństwa do 16.4.5. |
| `eslint-config-next` | 16.2.6 | 16.4.6 | Wersja zgodna z Next.js. |
| `sharp` | brak bezpośredniej zależności (Next rozwiązywał wersję przechodnio) | 0.35.5 | Najnowsze stabilne wydanie w npm i upstream 15.11.2026; jawna wersja zapewnia użycie poprawionej implementacji optymalizacji obrazów. |

## Oficjalne źródła (sprawdzone 15.11.2026)

- Next.js, [wydanie v16.4.6](https://github.com/vercel/next.js/releases/tag/v16.4.6), opublikowane 9.11.2026 — najnowszy tag stable 16.x wskazany jako Latest.
- Next.js, [GHSA-7qx7-33qx-rqx2](https://github.com/vercel/next.js/security/advisories/GHSA-7qx7-33qx-rqx2), opublikowane 3.11.2026 — luka optymalizacji SVG; wersje 16.0.0–16.4.4 podatne, poprawka 16.4.5.
- Next.js, [lista oficjalnych advisories](https://github.com/vercel/next.js/security/advisories) oraz [release v16.4.5](https://github.com/vercel/next.js/releases/tag/v16.4.5), 3.11.2026 — wydanie zawiera poprawki kilku luk medium z tej daty; 16.4.6 jest nowszym wydaniem stabilnym.
- Next.js, [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), opublikowane 14.10.2026 — krytyczna luka RCE optymalizacji obrazów na glibc Linux; poprawki Next 16.4.1 oraz sharp >=0.35.5.
- sharp, [changelog v0.35.5](https://sharp.pixelplumbing.com/changelog/v0.35.5/), wydany 27.09.2026; [GitHub release](https://github.com/lovell/sharp/releases/tag/v0.35.5). npm `view sharp version` zwrócił 0.35.5.
- Sprawdzenie npm 15.11.2026: `npm view next@16 version --json` kończy listę stabilnych 16.x na 16.4.6; `npm view sharp version` zwraca 0.35.5.

## Zgodność i zmiany migracyjne

Przeczytano `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` i odpowiadającą mu notatkę Pages Router po instalacji Next 16.4.6. Wersja 16 wymaga Node.js >=20.9, używa Turbopack domyślnie, wymaga asynchronicznych Request APIs oraz usunęła `next lint`. Repo ma Node.js 22.14.0, skrypty `dev`/`build` bez webpack override i osobny skrypt `eslint`; brak `next lint`. Dynamiczne segmenty i `searchParams` mają Promise, a `cookies()` jest awaitowane. Nie ma sitemapów segmentowanych ani parametrów w funkcjach generujących obrazy.

Release 16.4.6 kompresuje automatycznie odpowiedzi Route Handlerów, jeśli nie są już skompresowane; nie wymaga to zmian aplikacji. Wydanie 16.4.6 z 9.11.2026 nie zawiera nowej zmiany breaking w wydaniu — to backport bugfixów.

Nie wykryto w tej aktualizacji konieczności adaptacji kodu. Zmiany z Next 16 były już uwzględnione w bazowym repo; aktualizacja 16.2.6 → 16.4.6 jest w obrębie tej samej linii. Nie uruchamiano audytu ani automatycznych poprawek innych zależności.

## Ograniczenia

Wynik audytu npm przy instalacji wskazał 20 podatności w całym grafie zależności (1 low, 11 moderate, 5 high, 3 critical); ten zakres briefu obejmuje wyłącznie Next, sharp i ich zależności przechodnie. Należy przejrzeć `npm audit` oddzielnie przed wdrożeniem. Poprawki pakietów nie zastępują produkcyjnego testu endpointu `/_next/image` ani aktualizacji wdrożonego artefaktu.

## Weryfikacja lokalna

- `npm ci` zakończony; Next 16.4.6, eslint-config-next 16.4.6, sharp 0.35.5.
- `npm test`: 82 pliki, 748 testów zaliczonych. `npm run lint`: 0 błędów, 27 ostrzeżeń. `npm run typecheck`: zaliczony.
- `npm run build` z atrapami sekretów: zaliczony (Next Turbopack). Podczas prerenderowania logował błędy fetch do niedostępnego Supabase; statyczne strony i kompilacja zakończyły się.
- `npm run dev` (domyślny Turbopack) nie uruchomił się w tym środowisku z błędem `unable to start FSEvent stream`; wariant webpack napotkał `EMFILE` watch limit. Po buildzie sprawdzono trasę na `npm run start`: `/`, `/blog`, `/quiz`, `/sitemap.xml` zwróciły 200, `/api/real-flights` zwrócił 400 (brak parametrów), bez 500.
