# Audyt: dostępność, wydajność, mikrokopia i głos marki poza stroną główną

Data: 2026-11-15. Gałąź: `fix/a11y-brand-polish` (z `origin/main`, PR #41).
Metoda: czytanie kodu (WCAG 2.1 AA, BRAND.md, `FORBIDDEN_COPY`) oraz `curl` publicznych adresów produkcji
(kody odpowiedzi, wagi, manifest). Bez kont, bez generowania planów, bez płatności. Zakres poza układem
strony głównej (HomeClient) i poza webhookiem, auth, adminem, cronem, analityką, migracjami.

Legenda: **P1** psuje doświadczenie lub dostępność, **P2** zauważalne, **P3** kosmetyka.
Kolumna "Stan" uzupełniona po poprawkach (commit w historii gałęzi).

## 1. Stany brzegowe i głos marki

| # | Miejsce | Problem | Pr. | Stan |
|---|---|---|---|---|
| 1.1 | Brak `error.tsx` i `global-error.tsx` | Wyjątek w renderze pokazuje domyślną, angielską stronę Next, bez marki, bez drogi wyjścia | P1 | poprawione |
| 1.2 | `not-found.tsx` | Kopia poprawna, ale "Nie znaleziono strony / Wygląda na to, że ta trasa nie istnieje" jest sucha; brak wskazania, że link mógł być stary | P3 | poprawione |
| 1.3 | `/offline` | "Nie można załadować strony bez internetu" brzmi urzędowo; ekran bez nawigacji; brak `role` dla zmiany stanu | P2 | poprawione |
| 1.4 | `ChatPanel` | "Przepraszam, wystąpił błąd. Spróbuj ponownie." to dokładnie ton zakazany w BRAND.md (przepraszający, urzędowy) | P2 | poprawione |
| 1.5 | `quick/page.tsx` | "Nie udało się wygenerować planu: Nieznany błąd" ujawnia surowy komunikat serwera, zaczyna od "Nie udało się" | P1 | poprawione |
| 1.6 | `profile/page.tsx` | Usunięcie konta kończy się natywnym `alert()` (blokuje, nie da się go ostylować, nieczytelny dla części czytników); błąd portalu płatności jest połykany bez śladu dla użytkownika | P2 | poprawione |
| 1.7 | `login/page.tsx` | OAuth (Google) nie ma obsługi błędu; po wysłaniu linku brak `role="status"`; brak wskazówki "sprawdź spam" i kroku "wyślij ponownie" | P2 | poprawione |
| 1.8 | `/share/[tripId]` | Nieistniejący lub prywatny plan zwraca HTTP 200 (miękki 404, strona w pełni ładowana klientem) | P2 | poprawione (prawdziwy 404) |
| 1.9 | Pozostałe błędy (generowanie planu w kierunkach, lista pakowania, knajpy, zrzut, newsletter) | Już w głosie marki: "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim." | n/d | bez zmian |

## 2. Ładowanie i szkielety

| # | Miejsce | Problem | Pr. | Stan |
|---|---|---|---|---|
| 2.1 | Brak plików `loading.tsx` w całej aplikacji | Przejście do `/plan/*`, `/profile`, `/odkryj` pokazuje starą stronę aż do pobrania kodu; nic nie sygnalizuje postępu | P2 | poprawione |
| 2.2 | `/profile`, `/odkryj` | Goły spinner (`animate-spin`) bez tekstu dla czytnika i bez kształtu docelowej strony, skok układu po załadowaniu (CLS) | P2 | poprawione (szkielet + `role="status"`) |
| 2.3 | `/plan/[tripId]`, `/share/[tripId]` | Obracający się samolot ("Ładowanie planu…") zamiast szkieletu; samolot jako bohater jest zakazany w BRAND.md (dozwolony jako mała ikona) | P3 | plan: poprawione szkieletem w `loading.tsx`, ShareClient zostaje (rzadki, krótki stan) |

## 3. Dostępność (WCAG 2.1 AA)

| # | Kryterium | Miejsce | Problem | Pr. | Stan |
|---|---|---|---|---|---|
| 3.1 | 2.4.7 Widoczny fokus | `login/page.tsx` pole e-mail, `FeedbackWidget.tsx` (3 pola) | Styl inline `outline: "none"` wygrywa z globalnym `*:focus-visible` i kasuje obrys; zostaje tylko zmiana koloru ramki 1,5 px | P1 | poprawione |
| 3.2 | 4.1.3 Komunikaty statusu | login "Sprawdź skrzynkę", zapis preferencji w profilu, kopiowanie linku w share | Zmiana stanu bez `role="status"` / `aria-live` | P2 | poprawione (login, profil, offline, szkielety); share: istniejący przycisk zmienia etykietę, zostawiony |
| 3.3 | 2.5.5 Rozmiar celu (AAA, ale zasada projektu 44 px) | linki w `SiteNav` ("Okazje", "Zaloguj"), przyciski `text-xs` w profilu, "Wróć" | Wysokość mniejsza niż 44 px (`py-2` na 12 px tekstu ≈ 32 px) | P2 | poprawione w nawigacji i profilu; reszta w sekcji "Zostaje" |
| 3.4 | 1.1.1 Treść nietekstowa | `SiteNav` logo | `<img alt="Włóczykij">` wewnątrz linku z `aria-label` na tym samym linku: czytnik czyta dwa razy | P3 | poprawione |
| 3.5 | 1.4.3 Kontrast | paleta | Zmierzone (2026-11-15): `--accent` na piasku 5,20:1, na `--bg-surface` 4,87:1, na `--accent-light` 4,59:1; `--text-muted` na piasku 5,32:1, na `--bg-surface` 4,98:1, na `--accent-light` 4,70:1; biały na `--accent` 5,96:1; `--error` na piasku 5,64:1. Wszystko ≥ 4,5:1 | OK | bez zmian |
| 3.6 | 2.3.3 / ruch | `globals.css`, `MotionProvider` | Jest `prefers-reduced-motion` (CSS) oraz `MotionProvider` dla framer-motion | OK | bez zmian |
| 3.7 | 2.4.1 Pomijanie bloków | `layout.tsx` | Jest "Przejdź do treści" i `<main id="main-content">` | OK | bez zmian |
| 3.8 | Tytuły stron | `error`, `offline`, `login` | `error.tsx` nie ma metadanych (komponent kliencki); dodany `<title>` | P3 | poprawione |

## 4. Wydajność

| # | Miejsce | Obserwacja | Pr. | Stan |
|---|---|---|---|---|
| 4.1 | Czcionki | `next/font/google` (Geist + Cormorant Garamond z latin-ext), self-hosted `woff2`, `display: swap` domyślnie; Cormorant ładuje 4 wagi x 2 style | P3 | bez zmian (zmiana wag zmienia wygląd całej strony) |
| 4.2 | Obrazy | `SiteNav` i `quick` używają `<img>`; zdjęcia miast w `destinations` przez własne API i `<img loading="lazy">`; zdjęcia w planie i odkryj przez `next/image` | P3 | `SiteNav` logo ma `width`/`height` (SVG, CLS = 0); reszta zostaje |
| 4.3 | CLS | Brak rezerwacji miejsca na `/profile` i `/odkryj` po zniknięciu spinnera | P2 | poprawione szkieletami |
| 4.4 | `/` waga HTML | 134 kB (HomeClient, poza zakresem) | n/d | agent R1b |
| 4.5 | Service worker | `wloczykij-v2`; precache `/`, `/offline`, `/quiz`; stale-while-error dla stron; `/share/*` bez cache | P3 | bez zmian |

## 5. PWA

| # | Miejsce | Obserwacja | Pr. | Stan |
|---|---|---|---|---|
| 5.1 | `manifest.webmanifest` | Brak `id`, `lang`, `categories`; `orientation: portrait` blokuje tablet i komputer | P3 | poprawione (`id`, `lang`, `categories`, `orientation` usunięty) |
| 5.2 | Ikony 192/512 | Znak mieści się w strefie bezpiecznej maskable (zmierzone: najdalszy punkt ok. 150 z 205 px promienia); osobne wpisy `any` i `maskable` | OK | bez zmian |
| 5.3 | `/offline` w manifeście | Strona offline w precache, ok | OK | bez zmian |

## 6. Otwarte graficzne uzupełnienia (poza tym zadaniem)

- **Podgląd planu przy wklejeniu linku (Open Graph):** brak obrazka dla `/share/[tripId]`; przy wklejeniu na czacie
  grupy pokazuje się obraz domyślny strony głównej albo nic. Poprawione: `opengraph-image.tsx`, szczegóły w
  `lead`-owym raporcie i w commicie.
- **Zostaje:** cele dotykowe w ukrytych głębiej widokach planu (`plan/[tripId]/page.tsx`, 1,5 tys. linii, plik
  intensywnie zmieniany przez inne gałęzie, więc ryzyko konfliktu), kontrast `--text-muted` na `--bg-surface`,
  pomiary Lighthouse na produkcji (wymagają osobnej sesji w Chrome).
