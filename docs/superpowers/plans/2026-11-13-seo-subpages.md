# Podstrony pod SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Dodać stronę zbiorczą `/okazje`, wzmocnić `/okazje/[lotnisko]` i dodać strony miast `/weekend/[miasto]` z prawdziwymi danymi, bez publikowania wymyślonych cen.

**Architecture:** Czyste funkcje w `src/lib/seo/` (slug, JSON-LD, fakty o lotniskach, dobór miast, treść miasta) z testami vitest. Strony w App Routerze czytają `drop_deals` przez `src/lib/drop/read.ts`. Strony miast mają `generateStaticParams` + `revalidate`, żeby adresy istniały stabilnie.

**Tech Stack:** Next.js 16 (docs w `node_modules/next/dist/docs/`), React 19, Supabase, vitest.

**Spec:** `docs/superpowers/specs/2026-11-13-seo-subpages-design.md`

## Global Constraints

- Żadnych cen z `src/lib/destinations/catalog.ts` na publicznych stronach (są wpisane ręcznie).
- Ceny tylko z `drop_deals`; brak danych = komunikat wprost, nie zmyślona liczba.
- Bez znaczników `Offer` z ceną. Dozwolone: `BreadcrumbList`, `ItemList`, `FAQPage`.
- Teksty po polsku, formy bezosobowe, bez „AI” w nagłówkach, kolory z `globals.css`.
- Miasto ma stronę tylko, gdy jest w katalogu i nie jest na liście wykluczeń dalekich kierunków.

## Review Focus

- Slug z polskimi znakami (`Wrocław`, `Kraków`) i miasta dwuczłonowe (`Palma de Mallorca`, `Nowy Jork`) → stabilny, jednoznaczny adres.
- `/weekend/xyz` (miasto spoza katalogu lub wykluczone) → 404.
- Miasto bez żadnych żywych danych → strona działa, mówi to wprost, nie trafia do sitemap.
- Zła baza lub brak połączenia → strona nadal się renderuje (bez bloku z cenami).
- JSON-LD musi być poprawnym JSON-em także dla tekstów z cudzysłowami i znakami `<`.

---

### Task 1: Funkcje wspólne (slug, JSON-LD, fakty o lotniskach, lista miast)

**Files:**
- Create: `src/lib/seo/slug.ts`, `src/lib/seo/slug.test.ts`, `src/lib/seo/jsonld.ts`, `src/lib/seo/jsonld.test.ts`, `src/lib/seo/airportFacts.ts`, `src/lib/seo/cities.ts`, `src/lib/seo/cities.test.ts`

**Interfaces:**
- Produces: `slugify(text: string): string`; `breadcrumbLd(items: {name: string; path: string}[]): object`; `faqLd(items: {q: string; a: string}[]): object`; `itemListLd(items: {name: string; path: string}[]): object`; `jsonLdScript(obj: object): string` (zabezpieczony przed `</script>`); `AIRPORT_FACTS: Record<string, {name: string; place: string}>`; `weekendCities(): CatalogEntry[]`; `cityFromSlug(slug: string): CatalogEntry | null`; `citySlug(c: CatalogEntry): string`.

- [ ] Testy: `slugify("Wrocław")="wroclaw"`, `slugify("Palma de Mallorca")="palma-de-mallorca"`, `slugify("Nowy Jork")="nowy-jork"`; `jsonLdScript` zamienia `<` na `<`; `breadcrumbLd` daje `position` od 1 i pełne URL-e `https://wloczykij.me…`; `cityFromSlug("bali")=null`, `cityFromSlug("lizbona")` zwraca Lizbonę; `weekendCities()` nie zawiera Bali, Bangkoku, Dubaju, Nowego Jorku, Tokio, Singapuru, Kairu, Tel Awiwu, Marrakeszu, Antalyi i ma unikalne slugi.
- [ ] Implementacja; `npx vitest run src/lib/seo` zielone; commit.

### Task 2: Odczyt danych dla miasta

**Files:** Modify `src/lib/drop/read.ts`; Create `src/lib/drop/cityDeals.test.ts`

**Interfaces:** `bestPerOrigin(deals: DropDeal[]): DropDeal[]` (najtańsza oferta na lotnisko, posortowane rosnąco po cenie); `getDealsForCity(cityName: string): Promise<DropDeal[]>` (ostatni tydzień, tylko przyszłe loty, `[]` przy błędzie).

- [ ] Test `bestPerOrigin`: dwie oferty z WRO i jedna z KRK → po jednej na lotnisko, rosnąco po cenie.
- [ ] Implementacja z `try/catch`; commit.

### Task 3: Hub `/okazje` i wzmocnienie `/okazje/[lotnisko]`

**Files:** Create `src/app/okazje/page.tsx`; Modify `src/app/okazje/[lotnisko]/page.tsx`, `src/app/sitemap.ts`

- [ ] Hub: nagłówek, krótki wstęp, 7 kart lotnisk z najniższą ceną (z `getDealsForOrigin`, bez ceny gdy brak danych), `DropSignup`, JSON-LD (`BreadcrumbList`, `ItemList`); metadata z canonical.
- [ ] Strona lotniska: wstęp z `AIRPORT_FACTS`, sekcja FAQ (jak liczymy ceny, bagaż, co znaczy „weekend”), `FAQPage` + `BreadcrumbList` + `ItemList` JSON-LD, opis meta z najniższą ceną gdy jest.
- [ ] Sitemap: `/okazje`; commit.

### Task 4: Strony miast `/weekend/[miasto]`

**Files:** Create `src/app/weekend/[miasto]/page.tsx`; Modify `src/app/sitemap.ts`

- [ ] `generateStaticParams` ze `weekendCities()`, `revalidate = 3600`, `notFound()` dla nieznanego sluga.
- [ ] Treść stała: opis z katalogu, „Dla kogo” i „Kiedy warto” z `vibes`/`placeTypes`/`tags`, FAQ; blok żywy z cenami per lotnisko (link do `/okazje/{lotnisko}#{city_code}`), komunikat przy braku danych; `DropSignup` i link do quizu z `preferredCity`.
- [ ] JSON-LD: `BreadcrumbList`, `FAQPage`; metadata z canonical.
- [ ] Sitemap: tylko miasta, dla których w chwili generowania są żywe dane (funkcja w sitemap czyta `drop_deals` z `try/catch`); commit.

### Task 5: Linkowanie wewnętrzne i weryfikacja

**Files:** Modify `src/app/components/SiteFooter.tsx`, `src/app/okazje/[lotnisko]/page.tsx`

- [ ] Stopka: link „Wszystkie okazje” → `/okazje`; strona lotniska: lista miast z bieżących okazji linkuje do `/weekend/{slug}`.
- [ ] `npx tsc --noEmit`, `npx vitest run`, `npm run build`; przegląd w przeglądarce `/okazje`, `/okazje/wro`, `/weekend/lizbona`, `/weekend/bali` (404).
- [ ] Dwa niezależne review (kod; zgodność z projektem), poprawki, commit i push.
