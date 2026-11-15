# Maile Włóczykija: audyt dostarczalności i jakości (2026-11-15)

Zakres: tylko odczyt. Rekordy DNS sprawdzone publicznie (`dig` przez resolver 1.1.1.1, 2026-11-15 ok. 23:15), kod z gałęzi `feat/email-quality`. Nic nie wysłano, do Resend i DNS nie logowano, niczego nie zmieniono.

## Werdykt

Uwierzytelnianie nadawcy przez Resend jest ustawione poprawnie (SPF i DKIM). **Brakuje DMARC**, i to jest jedyna rzecz, którą warto zrobić przed pierwszym czwartkowym zrzutem. Kod wysyłki zrzutu miał już poprawne nagłówki wypisu jednym kliknięciem; poprawiono szablony i dodano wersje tekstowe oraz reply-to.

## DNS wloczykij.me

| Rekord | Wynik | Ocena |
|---|---|---|
| NS | `dns.home.pl`, `dns2.home.pl`, `dns3.home.pl` | DNS zarządza home.pl (tam Kacper dodaje rekordy) |
| MX `wloczykij.me` | `10 poczta2667679.home.pl` | skrzynki (hej@) obsługuje home.pl |
| SPF `wloczykij.me` | `v=spf1 a mx ~all` | OK dla poczty z home.pl. Resend go nie potrzebuje (patrz niżej) |
| DKIM `resend._domainkey` | TXT z kluczem publicznym RSA (`p=MIGfMA0…`) | OK, domena zweryfikowana w Resend. Klucz wygląda na 1024-bitowy (domyślny Resend); do rozważenia 2048 w ustawieniach Resend, nie pilne |
| `send.wloczykij.me` MX | `10 feedback-smtp.eu-west-1.amazonses.com` | OK, to ścieżka zwrotna (Return-Path) Resend, region eu-west-1 |
| `send.wloczykij.me` SPF | `v=spf1 include:amazonses.com ~all` | OK. SPF jest sprawdzany na `send.`, które jest subdomeną `wloczykij.me`, więc przy luźnej zgodności (domyślnej) DMARC uzna SPF za zgodny |
| **DMARC `_dmarc.wloczykij.me`** | **brak rekordu** | **Brak. Do dodania** |
| `_dmarc.zrzut.wloczykij.me`, MX `zrzut.wloczykij.me` | brak | Normalne: `zrzut@` to adres w domenie głównej, nie subdomena |
| CAA, MTA-STS, BIMI | brak | Niepotrzebne teraz |
| Inny DKIM `dkim._domainkey` | TXT 2048-bit | Prawdopodobnie poczta home.pl (niezweryfikowane) |

Nie sprawdzałem, czy w home.pl istnieją skrzynki lub aliasy `zrzut@`, `przypomnienie@` i `alerty@` (wymagałoby próby SMTP; poza zakresem „tylko odczyt publiczny”). Nadawcy w kodzie: `hej@` (potwierdzenie newslettera), `zrzut@` (zrzut, potwierdzenie, link ustawień), `przypomnienie@` (przypomnienie przed wyjazdem), `alerty@` (alert dla admina).

## Kod: nagłówki i nadawca

- `List-Unsubscribe: <https://…/api/drop/unsubscribe?token=…>` i `List-Unsubscribe-Post: List-Unsubscribe=One-Click` są w wysyłce zrzutu (`src/app/api/cron/drop-send/route.ts`). Adres jest HTTPS, token w query, a `POST` na ten adres wypisuje bez dodatkowego kroku i nigdy nie zwraca 429 przy poprawnym tokenie. To spełnia RFC 8058 w tej formie. Nie dodawałem `mailto:`, bo wymaga skrzynki, która wypisuje automatycznie.
- `GET` na adres wypisu pokazuje stronę z przyciskiem (skanery poczty nie wypiszą nikogo przez przypadek). Dobre.
- Potwierdzenia (newsletter, zrzut, link ustawień) i przypomnienie są transakcyjne: nie mają `List-Unsubscribe` celowo (wypisywanie z potwierdzenia nie ma sensu).
- Dodane w tej gałęzi: `replyTo: hej@wloczykij.me` we wszystkich mailach użytkownika, wersja tekstowa (`text`) w każdym mailu, preheader, stopka z danymi nadawcy.
- Odbicia i skargi: `/api/resend-webhook` wyłącza zrzut po `email.bounced` i `email.complained`. Działa tylko, jeśli webhook jest skonfigurowany w Resend z sekretem `RESEND_WEBHOOK_SECRET` (patrz lista Kacpra).

## Wymagania dużych skrzynek (Gmail, Yahoo)

Z wiedzy ogólnej o zasadach dla nadawców masowych (od 2024; potwierdź w aktualnych wytycznych Google i Yahoo, nie sprawdzałem ich dziś): SPF lub DKIM, **DMARC**, wypis jednym kliknięciem w mailach marketingowych, niski odsetek skarg. Przy małej liczbie odbiorców formalnie to nie obowiązuje, ale brak DMARC obniża zaufanie od pierwszego maila, a pierwsza wysyłka decyduje o reputacji nowej domeny.

## Co musi zrobić Kacper (DNS i Resend)

1. **Dodać DMARC w home.pl** (panel DNS, rekord TXT): nazwa `_dmarc`, wartość `v=DMARC1; p=none; rua=mailto:hej@wloczykij.me; fo=1`. Zaczynamy od `p=none` (tylko raporty). Po 2–4 tygodniach czystych raportów zaostrzyć do `p=quarantine`.
2. **Sprawdzić w home.pl, że istnieją skrzynki lub aliasy** `hej@`, `zrzut@`, `przypomnienie@`, `alerty@` (albo catch-all). Odpowiedzi idą teraz na `hej@`, ale ludzie odpowiadają też na nadawcę, a odbicia z nieistniejących skrzynek psują reputację.
3. **W Resend (Domains) sprawdzić**, że `wloczykij.me` ma status Verified dla SPF i DKIM, region eu-west-1, oraz włączyć śledzenie odbić i skarg.
4. **W Resend (Webhooks)** dodać endpoint `https://wloczykij.me/api/resend-webhook` ze zdarzeniami `email.bounced` i `email.complained`, a jego sekret ustawić na Vercel jako `RESEND_WEBHOOK_SECRET` (jeśli jeszcze nie ma).
5. **Na Vercel (produkcja) sprawdzić zmienne**: `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL=https://wloczykij.me` (linki weryfikacji i wypisu; bez niej `newsletterVerifyUrl` użyje `http://localhost:3000`), `NEXT_PUBLIC_BASE_URL` (linki w przypomnieniu i alercie), `TRAVELPAYOUTS_MARKER` (bez niej linki w zrzucie są bez prowizji, a mail nie pokaże informacji o linkach partnerskich), `CRON_SECRET`.
6. **Test przed pierwszym zrzutem (decyzja Kacpra):** wysłać zrzut tylko na własne adresy (Gmail, Outlook, ewentualnie Onet lub WP) i sprawdzić w nagłówkach „Pokaż oryginał”: `spf=pass`, `dkim=pass`, `dmarc=pass`. Ja niczego nie wysyłałem.
7. **Do decyzji:** adres pocztowy operatora w stopce. W repo nie ma danych firmy poza `hej@wloczykij.me` (polityka prywatności i regulamin podają tylko e-mail), więc stopka ma nazwę, stronę i e-mail. Jeśli prowadzisz działalność, dopisz nazwę i adres firmy w stopce (i do polityki prywatności).

## Luki produktowe (nie naprawione, bo wykraczają poza szablony)

- Przypomnienie przed wyjazdem idzie do każdego użytkownika z planem na 3 dni przed wylotem i nie ma ustawienia wyłączenia. Obejście: stopka mówi „odpisz, a wyłączymy” (ręcznie). Docelowo: przełącznik w profilu (brief dla techniki).
- Zrzut: po 4 tygodniach bez wysyłki zweryfikować, że `drop_enabled` i `verified` dają niepustą listę odbiorców i że cron `drop-send` ma dane `drop_deals` na bieżący tydzień (poza zakresem tego zadania).
- Alert admina (`sendApiAlert`) zostaje w starym wyglądzie (wewnętrzny, z emoji w temacie). Do ujednolicenia, jeśli kiedyś będzie potrzeba.

## Audyt treści i wyglądu

Stan przed zmianami → po zmianach (gałąź `feat/email-quality`):

| Obszar | Przed | Po |
|---|---|---|
| Głos | wykrzykniki, emoji (✈️ ✅ ⚠️), „Dzięki za zapisanie się do newslettera!”, forma „nie zapisywałeś się” | bez wykrzykników i emoji, bez form rodzajowych („Jeśli to nie Ty”), test sprawdza regułami `FORBIDDEN_COPY` |
| Marka | pomarańczowy blok nagłówka, system-ui | krem, ciemna czekolada, ceglasty akcent (`#A04B20`) ze strony; nagłówki szeryfowe (Georgia), hasło marki |
| Struktura | 5 osobnych kopii układu | jeden układ `src/lib/emailLayout.ts` |
| Preheader | brak | jest w każdym mailu |
| CTA | w zrzucie dwa przyciski, w stopce zapowiedź alertów Pro | jedno główne CTA w mailach transakcyjnych; w zrzucie „Sprawdź cenę” (główne) i „Ułóż mi plan” (obrys) przy każdej okazji; zapowiedź alertów usunięta (funkcja nie istnieje) |
| Wersja tekstowa | brak (zależność od auto-generowania) | jawna, z linkami i stopką |
| Stopka | „© 2026 Włóczykij”, w zrzucie wypis małym drukiem | powód otrzymania, link ustawień i wypisu, strona, e-mail kontaktowy |
| Ceny w zrzucie | stałe „cena ze środy 22:00” | data i godzina z `fetched_at` (czas polski), „lot w obie strony”, zastrzeżenie „może się zmienić” |
| Linki partnerskie | niejawne | jawna informacja (tylko gdy jest marker) |
| Dostępność | małe szare napisy (#9CA3AF) | kontrast tekstu ≥ 4,5:1 na kremie, rozmiary ≥ 12 px (treść 15–16 px), `lang="pl"`, `role="presentation"`, przyciski ≥ 44 px wysokości |
| Klienci poczty | `<table>` bez atrybutów, tło tylko w CSS | tabele, style inline, `bgcolor` w komórkach, przyciski w tabeli (działają w Outlooku bez VML jako prostokąt) |
| Tryb ciemny | brak | `color-scheme` i `prefers-color-scheme` (Apple Mail, Gmail na iOS, Outlook.com); klienci bez obsługi zostają przy jasnym |
| Temat przypomnienia | „Za 3 dni lecisz do X! ✈️ Twój plan podróży” | „Za 3 dni lecisz do X. Plan czeka” |

Podglądy do obejrzenia: `docs/email-previews/*.html` (żółty pasek na górze oznacza dane przykładowe; teksty `.txt` obok). Renderowanie: `npx vite-node --config vitest.config.ts scripts/render-email-previews.ts`. Obejrzane w Chrome w trybie ciemnym i jasnym (zrzut, przypomnienie, potwierdzenie zrzutu). Nie testowane w prawdziwych klientach poczty (Outlook desktop, Gmail web): to wymaga wysyłki.

Uwaga o palecie: brief wspominał granat; paleta strony i BRAND.md to krem, ciemna czekolada, ceglasty i zieleń leśna, więc użyto jej (bez granatu).

## Zmiany w plikach poza szablonami (minimalne)

- `src/app/api/cron/drop-send/route.ts`: do ładunku dodano `text` i `replyTo` (logika wysyłki, rezerwacje, limity bez zmian).
- `src/app/api/cron/pre-trip-email/route.ts`: szablon przeniesiony do `src/lib/preTripEmail.ts`, w wysyłce dodano `text` i `replyTo`, zmieniony temat (logika wyboru podróży bez zmian).
