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
| 1.3 | `/offline` | "Nie można załadować strony bez internetu" brzmi urzędowo; brak tytułu strony | P2 | poprawione (kopia z `edgeCopy.ts`, tytuł) |
| 1.4 | `ChatPanel` | "Przepraszam, wystąpił błąd. Spróbuj ponownie." to ton zakazany w BRAND.md; odpowiedź bez tekstu (np. 401) kończyła się ciszą | P2 | poprawione (limit 429 pokazuje czas oczekiwania, reszta tekst marki) |
| 1.5 | `quick/page.tsx` | "Nie udało się wygenerować planu: Nieznany błąd" ujawnia surowy komunikat serwera, zaczyna od "Nie udało się" | P1 | poprawione |
| 1.6 | `profile/page.tsx` | Usunięcie konta kończy się natywnym `alert()` (blokuje, nie da się go ostylować, nieczytelny dla części czytników); błąd portalu płatności jest połykany bez śladu dla użytkownika | P2 | poprawione |
| 1.7 | `login/page.tsx` | OAuth (Google) nie ma obsługi błędu; po wysłaniu linku brak `role="status"`, wskazówki o spamie i ponownego wysłania | P2 | poprawione |
| 1.8 | `/share/[tripId]` | Nieistniejący lub prywatny plan zwraca HTTP 200 (miękki 404, strona w pełni ładowana klientem) | P2 | poprawione (prawdziwy 404) |
| 1.9 | Pozostałe błędy (generowanie planu w kierunkach, lista pakowania, knajpy, zrzut, newsletter) | Już w głosie marki: "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim." | n/d | bez zmian |

## 2. Ładowanie i szkielety

| # | Miejsce | Problem | Pr. | Stan |
|---|---|---|---|---|
| 2.1 | Brak plików `loading.tsx` w całej aplikacji | Przejście do `/plan/*`, `/profile`, `/odkryj` pokazuje starą stronę aż do pobrania kodu; nic nie sygnalizuje postępu | P2 | poprawione |
| 2.2 | `/profile`, `/odkryj` | Goły spinner (`animate-spin`) bez tekstu dla czytnika i bez kształtu docelowej strony, skok układu po załadowaniu (CLS) | P2 | poprawione (szkielet + `role="status"`) |
| 2.3 | `/plan/[tripId]`, `/share/[tripId]` | Obracający się samolot ("Ładowanie planu…") zamiast szkieletu | P3 | plan: szkielet (`loading.tsx` i stan w stronie); `ShareClient` zostaje (krótki stan) |
| 2.4 | `/plan/[tripId]` | Gdy plan nie wczyta się, klient po cichu przenosi na `/` bez słowa wyjaśnienia | P2 | **nie poprawione** (zmiana zachowania dużego pliku, do osobnego zadania) |

## 3. Dostępność (WCAG 2.1 AA)

| # | Kryterium | Miejsce | Problem | Pr. | Stan |
|---|---|---|---|---|---|
| 3.1 | 2.4.7 Widoczny fokus | `login/page.tsx` pole e-mail, `FeedbackWidget.tsx` (3 pola) | Styl inline `outline: "none"` wygrywa z globalnym `*:focus-visible` i kasuje obrys; zostaje tylko zmiana koloru ramki 1,5 px | P1 | poprawione |
| 3.2 | 4.1.3 Komunikaty statusu | login "Sprawdź skrzynkę", zapis preferencji w profilu, błędy w profilu i szybkim planie | Zmiana stanu bez `role="status"` / `role="alert"` / `aria-live` | P2 | poprawione (login, profil, szkielety, quick); kopiowanie linku w share zostaje |
| 3.3 | 2.5.5 Rozmiar celu (AAA, zasada projektu 44 px) | linki w `SiteNav`, przyciski `text-xs` w profilu | Wysokość mniejsza niż 44 px (ok. 28–32 px) | P2 | poprawione: klasa `tap-area` (pole dotyku +8 px, wygląd bez zmian), `minHeight: 44` w profilu |
| 3.4 | 1.1.1 Treść nietekstowa | `SiteNav` logo | `<img alt="Włóczykij">` wewnątrz linku z `aria-label` na tym samym linku: czytnik czyta dwa razy | P3 | poprawione |
| 3.5 | 1.4.3 Kontrast | paleta | Zmierzone (2026-11-15): `--accent` na piasku 5,20:1, na `--bg-surface` 4,87:1, na `--accent-light` 4,59:1; `--text-muted` na piasku 5,32:1, na `--bg-surface` 4,98:1, na `--accent-light` 4,70:1; biały na `--accent` 5,96:1; `--error` na piasku 5,64:1. Wszystko ≥ 4,5:1 | OK | bez zmian |
| 3.6 | 2.3.3 / ruch | `globals.css`, `MotionProvider` | Jest `prefers-reduced-motion` (CSS) oraz `MotionProvider` dla framer-motion | OK | bez zmian |
| 3.7 | 2.4.1 Pomijanie bloków | `layout.tsx` | Jest "Przejdź do treści" i `<main id="main-content">` | OK | bez zmian |
| 3.8 | Tytuły stron | `error`, `offline` | `error.tsx` nie ma metadanych (komponent kliencki); dodany `<title>`; offline ma tytuł w layoucie | P3 | poprawione |

## 4. Wydajność

| # | Miejsce | Obserwacja | Pr. | Stan |
|---|---|---|---|---|
| 4.1 | Czcionki | `next/font/google` (Geist + Cormorant Garamond z latin-ext), self-hosted `woff2`, `display: swap` domyślnie; Cormorant ładuje 4 wagi x 2 style | P3 | bez zmian (zmiana wag zmienia wygląd całej strony) |
| 4.2 | Obrazy | `SiteNav` (logo SVG, stała wysokość, CLS 0) i `quick` używają `<img>`; zdjęcia miast w `destinations` przez własne API z `loading="lazy"`; plan i odkryj przez `next/image` | P3 | bez zmian |
| 4.3 | CLS | Brak rezerwacji miejsca na `/profile` i `/odkryj` po zniknięciu spinnera | P2 | poprawione szkieletami |
| 4.4 | `/` waga HTML | 134 kB (HomeClient, poza zakresem) | n/d | agent R1b |
| 4.5 | Service worker | `wloczykij-v2`; precache `/`, `/offline`, `/quiz`; stale-while-error dla stron; `/share/*` bez cache | P3 | bez zmian |

## 5. PWA

| # | Miejsce | Obserwacja | Pr. | Stan |
|---|---|---|---|---|
| 5.1 | `manifest.webmanifest` | Brak `id`, `lang`, `categories`; `orientation: portrait` blokuje tablet i komputer | P3 | poprawione |
| 5.2 | Ikony 192/512 | Znak mieści się w strefie bezpiecznej maskable (zmierzone: najdalszy punkt ok. 150 z 205 px promienia); osobne wpisy `any` i `maskable` | OK | bez zmian |
| 5.3 | `/offline` w manifeście | Strona offline w precache, ok | OK | bez zmian |

## 6. Podgląd udostępnionego planu (Open Graph)

Brak obrazka dla `/share/[tripId]`: przy wklejeniu linku na czacie ekipy pokazywał się obraz domyślny albo nic.
Poprawione: `src/app/share/[tripId]/opengraph-image.tsx` (1200x630, paleta konta: krem `#F5EFE0`, granat `#18324F`,
pomarańcz `#EB531E`; miasto, kraj, daty, skład ekipy znajomych, koszt na osobę i razem, hasło marki). Dane tylko z
publicznego planu (`is_public`) i tylko pola widoczne na stronie planu; rodzina nie ujawnia składu. Obraz zwykłej
marki dla planu, którego nie ma. Pamięć podręczna 300 s. Tytuł i opis strony z tego samego modelu (`src/lib/shareOg.ts`).
Nieistniejący lub prywatny plan zwraca teraz prawdziwy HTTP 404 (wcześniej 200).

## 7. Zostaje (poza zakresem tego zadania)

- Cele dotykowe wewnątrz widoku planu (`plan/[tripId]/page.tsx`, 1,5 tys. linii, intensywnie zmieniany przez inne gałęzie).
- Cichy powrót na `/` po nieudanym wczytaniu planu (2.4).
- Pomiary Lighthouse na produkcji i test czytnikiem ekranu (wymagają osobnej sesji; ten audyt opiera się na kodzie i `curl`).
- Weryfikacja podglądu w prawdziwych komunikatorach (WhatsApp, Messenger) po wdrożeniu: lokalnie sprawdzono tylko wygenerowany PNG i meta tagi.
