# Audyt spójności dokumentów prawnych z działaniem aplikacji

Data: 2026-11-16. Gałąź: `docs/legal-consistency`. Stan kodu: `origin/main` @ 1faebee.

**To nie jest porada prawna.** To porównanie tego, co mówią strony (regulamin, polityki, cennik, FAQ, banner, maile), z tym, co robi kod. Część "do księgowej / prawnika" na końcu to lista pytań, nie odpowiedzi. Oznaczenia: **OK** zgodne, **POPRAWIONE** tekst zmieniony w tej gałęzi (commit w nawiasie), **KOD** potrzebna zmiana w kodzie albo ustawieniach (poza zakresem tego zadania), **?** nie da się sprawdzić z repo (właściciel potwierdza).

## 0. Najważniejsze (przeczytaj to, jeśli nic więcej)

1. **Kto jest sprzedawcą.** Strony mówią "prowadzonego przez Włóczykij", a Włóczykij nie jest podmiotem prawnym. Przy działalności nierejestrowanej sprzedawcą jest osoba fizyczna; regulamin i polityka powinny ją wskazać (imię i nazwisko, adres do doręczeń, e-mail). Tego nie wpisuję, bo to dane właściciela, a prawnik ma zdecydować o zakresie i o tym, jak pogodzić to z brakiem imienia na kanale marki. **Pola do uzupełnienia są w sekcji 9.**
2. **Odstąpienie od umowy.** Stary regulamin twierdził, że "generując plan, użytkownik wyraża zgodę i traci prawo". W kodzie nie ma żadnej zgody ani informacji w momencie zakupu (ani checkboxa, ani Stripe `consent_collection`). Zmieniłem tekst na opis tego, co naprawdę robimy (zwrot w 14 dni, dopóki nie użyjesz planu z Packa lub Pro) i dodałem informację przed płatnością (cennik, okno Stripe, strona po zakupie). **Informacja to jeszcze nie wyraźna zgoda** w rozumieniu art. 38 pkt 13: sprawa do prawnika (pytanie 2).
3. **Dane osobowe trafiają do podmiotów, których polityka nie wymieniała**: Resend (maile), Slack (e-mail nowego użytkownika), Notion (treść opinii), Google Analytics, dostawcy cen lotów i zdjęć. Dopisane.
4. **Retencja z polityki nie miała pokrycia w kodzie** ("plany do 12 miesięcy", "konto do 3 lat od logowania"): żadne zadanie tego nie kasuje. Tekst zmieniony na to, co jest (do usunięcia konta). Alternatywa to dopisać czyszczenie w kodzie, a potem wrócić do limitów w tekście.
5. **Usunięcie konta kasuje zapis płatności w naszej bazie** (kaskada), a polityka mówiła o 5 latach przechowywania danych księgowych. Księgowa ma powiedzieć, co musisz trzymać i gdzie (Stripe, własne zestawienie).
6. **Platforma ODR UE jest zamknięta** (według mojej wiedzy od 2025-07-20; **zweryfikuj**, nie sprawdzałem źródła online). Regulamin odsyłał do martwego adresu. Zmieniłem.

## 1. Regulamin (`src/app/regulamin/page.tsx`)

| Twierdzenie w dokumencie | Co robi kod | Zgodność | Ryzyko | Działanie |
|---|---|---|---|---|
| §1 "prowadzonego przez Włóczykij", kontakt hej@wloczykij.me | Brak podmiotu prawnego w kodzie; skrzynka: nie wiadomo, czy odbiera pocztę | Niekompletne | **Wysokie** (wskazanie sprzedawcy, dostępność kontaktu do reklamacji i odstąpienia) | Bez zmiany tekstu; pola w sekcji 9; sprawdź, czy skrzynka odbiera i kto ją czyta |
| §1 "podróży solo" | Produkt: solo, para, ekipa (PRODUCT.md, quiz z grupą) | Nieprawda | Niskie | POPRAWIONE (65dd9c7) |
| §2 "2 plany w każdym miesiącu, nie przechodzą" | `credits.ts`: `FREE_PLANS_PER_MONTH = 2`, okres według czasu warszawskiego, schodzą jako pierwsze | OK | – | – |
| §2 Pack 5 planów 14,99 zł, plany nie wygasają | `prices.ts`, webhook `add_credits`, brak wygasania | OK | – | – |
| §2 Pro "nielimitowane plany" | Brak limitu planów dla Pro, ale **dzienny limit AI na konto**: 30 (free) / 200 (Pro) dla zamiany, nowego dnia, czatu itd.; globalny bezpiecznik dla kont darmowych (`aiGuard.ts`) | Częściowo ("Honest by default") | Średnie | POPRAWIONE: opis limitu (65dd9c7) |
| (brak) plan za opinię | `/api/feedback`: pełna opinia = +1 kredyt raz na wyjazd; FAQ obiecuje też PDF | Brakowało | Niskie | POPRAWIONE: dodany punkt w §2 |
| §3 rejestracja Google OAuth lub magic link; "płatne funkcje wymagają konta" | Generowanie planu wymaga logowania (`/api/generate` 401); checkout też | Niedokładnie | Niskie | POPRAWIONE: "generowanie i płatności", quiz i okazje bez konta; dopisane usuwanie konta |
| §3 umowa zawarta z chwilą płatności | Webhook przyznaje plany po `checkout.session.completed` i `paid` | OK | – | – |
| §4 Stripe, brak danych kart | Checkout hostowany przez Stripe; w bazie tylko `payments` | OK | – | – |
| §4 "ceny brutto ... zawierają wszystkie należne podatki" | Cena z Stripe bez doliczeń; status VAT sprzedawcy nieznany | ? | Średnie (VAT) | POPRAWIONE: "cena końcowa, nie doliczamy innych opłat"; pytanie o VAT w sekcji 8 |
| §4 "Pro odnawiana co 30 dni" | Są dwa plany: miesięczny i **roczny** (149,99 zł) | **Nieprawda** dla rocznego | Wysokie (informacja o cenie i odnowieniu) | POPRAWIONE (65dd9c7) |
| §4 anulowanie z profilu | `/api/billing-portal` wołany z `profile/page.tsx` | OK | – | – |
| §4 zmiana cen z 14-dniowym wyprzedzeniem, e-mailem | Brak kodu wysyłającego takie maile; to procedura ręczna | ? | Niskie | Zostaje; pamiętaj o procedurze |
| §4 moment dostarczenia kredytów | Webhook (Stripe → baza), zwykle sekundy; strona po zakupie pokazuje "księguje się" | Nie było w tekście | Średnie | POPRAWIONE |
| §4 kody rabatowe | `allow_promotion_codes: true`; newsletter tworzy kod 10% (kupon `once`) | Nie było w tekście | Niskie | POPRAWIONE (jedno zdanie) |
| §5 art. 38 pkt 13, "generując plan użytkownik wyraża zgodę i traci prawo" | Brak zgody i informacji w UI w chwili zakupu lub generowania | **Nie zgadza się z kodem** | **Wysokie** | POPRAWIONE: tekst opisuje praktykę; dodana informacja przy zakupie (bda082b). Zgoda: zadanie dla prawnika / dewelopera (sekcja 8, pyt. 2) |
| §5 Pro: zwrot w 14 dni, jeśli nie użyto płatnych funkcji | Brak kodu zwrotów: zwrot robisz ręcznie w Stripe; webhook **nie obsługuje** `charge.refunded`, więc po zwrocie kredyty i Pro zostają | Procedura ręczna, luka w kodzie | Średnie | KOD: obsłużyć zwrot (webhook jest poza zakresem). Zwrot Packa i Pro ujednolicony z cennikiem |
| §6 reklamacje 14 dni | Procedura ręczna | ? | Niskie | – |
| §6 platforma ODR | Zamknięta (do weryfikacji) | Nieaktualne | Średnie | POPRAWIONE: odesłanie do rzecznika konsumentów, Inspekcji Handlowej, uokik.gov.pl |
| §7 linki afiliacyjne po zgodzie w bannerze; bez zgody bez ID | `withAffiliateConsent`, `useAffiliateConfig`: tak dla linków na stronie | OK | – | – |
| §7 (brak) maile Zrzutu | Linki Aviasales w mailach mają `marker` zawsze (`drop/links.ts`) i **nie miały oznaczenia** | Luka | Średnie (oznaczanie reklam) | POPRAWIONE: opis w §7, dopisek w mailu (f84ad72), test |
| §7 `rel="sponsored"` i dopisek "link partnerski" | `partnerLinkProps`, `AffiliateAnchor`, `PartnerLinks`: tak, dla linków paid | OK | – | – |
| §9 wyłączenia odpowiedzialności | Standardowe; wobec konsumentów mogą być niedozwolone (art. 385³ KC) | ? | Średnie | POPRAWIONE: zastrzeżenie "w zakresie dozwolonym"; do prawnika |
| §12 data wejścia w życie 17 maja 2026 | Zmiany z 2026-11-16 są istotne (odstąpienie, cena, odnawianie) | Wymaga procedury | Średnie | POPRAWIONE: "w brzmieniu zmienionym 16 listopada 2026". **§11 wymaga 14-dniowego maila do użytkowników z kontem** – decyzja i wysyłka po stronie Kacpra |

## 2. Polityka prywatności (`src/app/privacy/page.tsx`)

| Twierdzenie | Co robi kod | Zgodność | Ryzyko | Działanie |
|---|---|---|---|---|
| §1 administrator "Włóczykij" | Jak wyżej | Niekompletne | **Wysokie** | Sekcja 9 |
| §2 kategorie danych: konto, podróże, płatności, techniczne | Plus: pytania do czatu (Gemini), udostępnienie planu linkiem `/share`, e-mail + lotniska + próg ceny (Zrzut, newsletter), przypomnienie 3 dni przed wylotem (cron na e-mail konta), opinie (Notion), `quiz_events` (losowy `session_id`, zdarzenie, krok), liczniki użycia AI | Brakowało 5 kategorii | Wysokie | POPRAWIONE (3c54a23) |
| §2 partnerzy: parametry linku, brak e-maila | `travelpayoutsLink`: marker, project, trasa; bez e-maila. W mailach Zrzutu marker zawsze | OK + luka maili | Niskie | POPRAWIONE |
| §3 podstawy | Dopisane: zgoda dla Zrzutu i newslettera (double opt-in w kodzie), interes dla statystyk i powiadomień | Niekompletne | Średnie | POPRAWIONE; poprawność podstaw do prawnika |
| §4 procesorzy: Supabase, Stripe, Gemini, Vercel, Google OAuth | Brakowało: **Resend, GA4, Slack, Notion, Travelpayouts/RapidAPI, Unsplash**, partnerzy afiliacyjni | **Niekompletna lista** | Wysokie | POPRAWIONE |
| §4 Supabase region Frankfurt, DPA zawarta | Z repo nie wynika (region ustawia się w panelu) | ? | Średnie | Potwierdź w panelu Supabase i w koncie (DPA) |
| §4 Gemini "bez danych osobowych" | Prompty zawierają plan, preferencje i **dowolny tekst z czatu** | Zbyt mocne | Średnie | POPRAWIONE; ostrzeżenie, by nie wpisywać wrażliwych danych |
| §4 Gemini: czy Google używa danych do trenowania | Zależy od tego, czy klucz `GEMINI_API_KEY` to płatny poziom API | ? | Średnie | Sprawdź plan kluczy w Google AI Studio / Cloud; do prawnika (pyt. 5) |
| §4 Vercel logi 30 dni | Z repo nie wynika (zależy od planu Vercel) | ? | Niskie | Potwierdź |
| §4 transfery: "na podstawie SCC" | Zależy od dostawcy (DPF albo SCC) | Uogólnione | Średnie | POPRAWIONE: "DPF jeśli na liście albo SCC"; do prawnika |
| §5 plany do 12 mies., konto do 3 lat | **Brak zadania czyszczącego**; usunięcie konta: `DELETE /api/profile` + kaskada | **Nieprawda** | Wysokie | POPRAWIONE: "do usunięcia konta"; opisane też newsletter, opinie, statystyki |
| §5 dane płatności 5 lat | Kaskada kasuje `payments` razem z kontem; dane u Stripe zostają | Sprzeczne | Średnie | POPRAWIONE; księgowa (pyt. 4) |
| §5 `quiz_events`, `gemini_usage_log`, `api_usage_log` | Bez żadnego czyszczenia | Brak okresu | Niskie (nie osobowe: UUID sesji, liczniki) | Opisane "bez limitu czasu" dla statystyk |
| §6 prawa użytkownika, 30 dni | Samoobsługowe usunięcie konta (tak). Eksport danych (art. 20): **brak funkcji**, tylko mail | Procedura ręczna | Niskie | Zostaje; pamiętaj, że skrzynka musi odbierać |
| §7 "Rate limiting na wszystkich endpointach API" | Limity tylko na części (checkout, newsletter, AI) | Zbyt mocne | Niskie | POPRAWIONE |
| §7 TLS 1.3 | Zależy od klienta | Zbyt konkretne | Niskie | POPRAWIONE ("HTTPS / TLS") |
| §7 RLS "każdy widzi tylko swoje dane" | Migracje: RLS, luki domknięte (`close_rls_gaps`); plan publiczny jest dostępny po linku | OK | – | – |

## 3. Polityka cookies (`src/app/cookies/page.tsx`) i baner

| Twierdzenie | Co robi kod | Zgodność | Ryzyko | Działanie |
|---|---|---|---|---|
| `sb-*` ważne 7 dni | `@supabase/ssr` domyślnie `maxAge` 400 dni | Nieprawda | Niskie | POPRAWIONE (ce36b86) |
| `__Host-authjs.*` | W kodzie nie ma Auth.js | **Nieprawda** | Niskie | POPRAWIONE: usunięte |
| `quiz-state` (localStorage) | Klucz to `kacper-explores-store`; do tego `deals_origin`, `newsletter_popup_seen`, `wloczykij-budget-*`, `feedback-*`, `purchase_sent_*` (sessionStorage) | Nieprawda / niekompletne | Niskie | POPRAWIONE: pełna tabela |
| "Odpowiedzi z quizu nie idą na serwer przed ukończeniem" | Tylko krok i losowy `session_id` do `/api/track` | OK | – | Dopisane |
| GA4 za zgodą; bez zgody "anonimowe sygnały bez cookies" | Consent Mode v2: skrypt `gtag.js` ładuje się **zawsze**, domyślnie `analytics_storage: denied`, wysyła pingi bez cookies także przed zgodą | Zgodne z opisem, ale **skrypt Google ładuje się przed zgodą** | **Średnie** (spór o to, czy to wymaga zgody) | Tekst doprecyzowany; pytanie do prawnika (pyt. 6). Opcja w kodzie: ładować `gtag.js` dopiero po zgodzie |
| "Zgodę wycofasz czyszcząc dane strony" | Jest przycisk "Zmień zgodę na cookies" | Przestarzałe | Niskie | POPRAWIONE |
| Zakres GA4: "w co klikasz, przewijanie" | `ui_click` (etykieta, URL), `scroll_depth`, `page_view`, `purchase` (kwota i plan) | Niekompletne (zakup) | Niskie | POPRAWIONE |
| Linki partnerskie po zgodzie; samo wyświetlenie nie ładuje skryptów | `withAffiliateConsent`; brak skryptów Travelpayouts | OK | – | – |
| Licznik kliknięć partnerów bez cookies | `navigator.sendBeacon('/api/track')`, losowy UUID, bez trwałego ID | OK | – | – |
| Baner: "Akceptuj wszystkie" (wypełniony, akcent) vs "Tylko niezbędne" (obrys) | Ta sama wielkość i pozycja, różna wyrazistość | Do oceny | Niskie–średnie (wytyczne organów mówią o równej wyrazistości) | Nie zmieniałem (decyzja wizualna); pytanie 6 |
| Baner: tekst o linkach partnerskich i GA | Zgadza się z kodem consent (`saveConsent`, `setAnalyticsConsent`) | OK | – | – |
| Mail Zrzutu: linki z markerem bez banera | Zgoda na mail ≠ zgoda na cookies; link ma `marker` w URL | Wyjątek | Niskie–średnie | POPRAWIONE: opisane w cookies, privacy i regulaminie; dopisek w mailu |
| Stripe i Google OAuth: cookies stron trzecich | Przekierowania do Stripe i Google | OK | – | – |
| Fonty | `next/font/google` samohostuje; brak zapytań do Google Fonts z przeglądarki (do potwierdzenia w sieci na produkcji) | OK | – | Sprawdź w DevTools |
| Mapy | Brak kafelków map (tylko linki do Google Maps) | OK | – | – |

## 4. Oznaczenie linków partnerskich

| Miejsce | Stan | Uwagi |
|---|---|---|
| Karty planu (`PartnerLinks`), okazje (`AffiliateAnchor`) | Dopisek "link partnerski" i `rel="sponsored noopener noreferrer"` tylko gdy link jest płatny (po zgodzie) | OK. Bez zgody linki są zwykłe, więc dopisek znika: spójne |
| `/okazje/[lotnisko]` | Dodatkowe zdanie o linkach partnerskich | OK |
| Mail Zrzutu | **Brak oznaczenia** | POPRAWIONE (f84ad72) |
| FAQ ("linki prowadzą do wyszukiwarek") | Nie wspominało o prowizji | POPRAWIONE |
| Artykuły bloga (MDX) | Brak linków `tp.media` w treści (sprawdzone grepem) | OK; jeśli pojawią się, dodać dopisek |
| Booking.com, Hostelworld | `paid: false`, bez ID | OK, zgodnie z regulaminem |

## 5. Cennik (`src/app/pricing/page.tsx`)

| Twierdzenie | Kod | Zgodność | Działanie |
|---|---|---|---|
| 2 plany/mies., bez karty | `FREE_PLANS_PER_MONTH` | OK | – |
| Pack 14,99 zł, Pro 19,99 zł/mies., 149,99 zł/rok, "12,50 zł miesięcznie", "o 90 zł taniej" | `prices.ts`; 12 × 19,99 − 149,99 = 89,89 zł; 149,99 / 12 = 12,50 zł | OK (zaokrąglone) | – |
| "Pro: nowe funkcje trafiają do Ciebie najpierw" | Brak mechanizmu w kodzie | Obietnica bez pokrycia | Nie zmieniałem; **decyzja Kacpra**: usunąć albo utrzymać świadomie |
| "Wyjazdy bez limitu" (Pro) | Brak limitu planów; dzienny limit AI w planie | Częściowo | Opisane w regulaminie |
| Zwroty | Różne zasady Packa i Pro w tekście | Niespójne z regulaminem | POPRAWIONE: jedna zasada (bda082b) |
| Odnawianie Pro | Nie było informacji przy cenniku | Brak | POPRAWIONE |
| Cena brutto | Cena = kwota w Stripe | OK | – |

## 6. FAQ (`HomeFAQ.tsx`) i strona po zakupie (`payment/success`)

| Element | Zgodność | Działanie |
|---|---|---|
| "Dwa plany w miesiącu", "bez karty", "6 pytań", lotniska (Wrocław, Katowice, Kraków, Warszawa, Modlin, Poznań, Gdańsk), "2 do 14 dni" | Zgodne z kodem i `prices.ts`; "6 kierunków" w quizie (nie sprawdzano liczby w UI, bez zmian) | OK |
| "Za opinię PDF albo jeden plan więcej" | Zgodne z `FeedbackWidget` i `/api/feedback` | OK |
| Brak informacji o zwrocie i prowizji | – | POPRAWIONE (f84ad72) |
| Success: "Masz na koncie 5 planów więcej" | Webhook dodaje 5 | OK; gdy webhook się spóźni, strona mówi "księguje się" (OK) |
| Success: brak informacji o odstąpieniu i odnawianiu | – | POPRAWIONE (bda082b) |
| Success: potwierdzenie płatności e-mailem | Nie obiecujemy (paragon od Stripe zależy od ustawień konta: ?) | Sprawdź w Stripe: Settings → Customer emails |

## 7. Pozostałe komunikaty i integracje

- **Popup newslettera** obiecywał "nowe kierunki, triki budżetowe i tanie loty na skrzynkę". W kodzie jedyna wysyłka to Czwartkowy zrzut (wymaga lotnisk i progu ceny, których popup nie zbiera) i mail potwierdzający. Zmieniono na to, co naprawdę dostajesz (b403756), dodano informację o danych i link do polityki.
- **Kod 10%** na Pro Roczny: istnieje (`PACK10-...`, kupon `once`, `max_redemptions: 1`). OK.
- **Slack**: przy nowym koncie leci pełny e-mail użytkownika (`auth/callback`); przy płatności skrót id. Opisane w polityce. Rozważ usunięcie e-maila z powiadomienia (zmiana w auth poza zakresem).
- **WhatsApp (CallMeBot)**: funkcja jest w kodzie, ale nigdzie niewywoływana. Nie opisuję.
- **Notion**: id bazy opinii ma wartość domyślną w kodzie (`feedback/route.ts`); to nie sekret, ale ujawnia identyfikator.
- **Resend webhook**: zapisuje tylko wyłączenie zrzutu przy bounce/complaint.
- **Przypomnienie przed wylotem** (cron): wysyłka na e-mail konta, bez osobnej zgody i **bez linku do wypisu**. Podstawa: wykonanie umowy / uzasadniony interes? Pytanie 5.

## 8. Do księgowej / prawnika (osobna lista pytań)

1. **Działalność nierejestrowana.** Czy przy planowanych przychodach (Pack, Pro, prowizje afiliacyjne) mieszczę się w definicji i limicie przychodu (miesięczny limit zależy od minimalnego wynagrodzenia; **zweryfikuj aktualną kwotę**, nie wpisuję jej z pamięci)? Kiedy muszę zarejestrować działalność? Czy sprzedaż subskrypcji i stały, zorganizowany charakter nie wyczerpują znamion działalności gospodarczej?
2. **Odstąpienie od umowy (treści cyfrowe, Pack, Pro, planowana Przepustka 4,99 zł za wyjazd).** Czy sama informacja przy płatności wystarcza, czy potrzebne jest osobne pole wyboru ("żądam natychmiastowego wykonania, wiem, że tracę prawo") jako warunek zakupu? Jak postąpić, gdy Pack zostaje częściowo zużyty (zwrot proporcjonalny?). Czy zasada "po wygenerowaniu pierwszego planu z Packa prawo wygasa dla całego Packa" jest dopuszczalna? Konsekwencje braku informacji (wydłużenie terminu do 12 miesięcy).
3. **Wskazanie sprzedawcy i dane kontaktowe** przy działalności nierejestrowanej: co dokładnie musi się pojawić w regulaminie, polityce i stopce (imię i nazwisko, adres do doręczeń, e-mail, telefon?). Czy da się utrzymać markę bez imienia na kanale, a imię tylko w dokumentach prawnych?
4. **Rozliczenia.** (a) Prowizje afiliacyjne z zagranicznej platformy (Travelpayouts): jak je rozliczać, czy to przychód z działalności nierejestrowanej, jak dokumentować (brak faktury od platformy, wypłaty w walucie). (b) VAT: czy przy braku rejestracji sprzedaż Packa i Pro jest zwolniona, czy tekst "cena brutto" jest właściwy, co z limitem zwolnienia i usługami cyfrowymi dla konsumentów z UE (jeśli w ogóle ktoś kupi spoza PL). (c) Co przechowywać i jak długo, skoro usunięcie konta kasuje wpis płatności w bazie (Stripe zostaje). (d) Czy Stripe-owe zestawienia wystarczą jako dokumentacja.
5. **RODO.** (a) Rejestr czynności przetwarzania: czy muszę go prowadzić przy tej skali (art. 30 ust. 5)? (b) Umowy powierzenia i DPA: Supabase, Stripe, Resend, Vercel, Google (Gemini API, GA4), Slack, Notion, Unsplash; które mam zaakceptowane, których brakuje; Travelpayouts jako odrębny administrator czy współadministrator. (c) Transfery do USA (DPF/SCC) dla każdego z nich. (d) Gemini: czy klucz API to poziom, na którym Google nie używa danych do trenowania; treści z czatu mogą zawierać dane wrażliwe. (e) DPIA: czy nie jest wymagana (skala, profilowanie preferencji). (f) Podstawa prawna przypomnienia przed wylotem i brak wypisu z tego maila. (g) Okresy przechowywania (konto, plany, opinie w Notion, `quiz_events`).
6. **Cookies i zgody.** (a) Czy ładowanie `gtag.js` przed zgodą (tryb zgody v2, ping bez cookies) jest dopuszczalne w PL, czy ładować dopiero po zgodzie. (b) Czy wyrazistość przycisków "Akceptuj wszystkie" i "Tylko niezbędne" jest wystarczająco równa. (c) Czy linki partnerskie w mailu Zrzutu (zgoda na mail, nie na cookies) wymagają dodatkowej informacji.
7. **Regulamin dla treści cyfrowych i usług.** Czy brakuje wymaganych elementów (opis wymogów technicznych, sposób dostarczenia, funkcjonalność, zgodność treści cyfrowej z umową, rękojmia za treści cyfrowe), klauzul abuzywnych w §9 (wyłączenie odpowiedzialności wobec konsumentów), trybu zmiany regulaminu (§11: 14 dni, a dla subskrypcji prawo wypowiedzenia), trybu zmiany cen przy subskrypcji rocznej.
8. **Oznaczanie reklam.** Czy dopisek "link partnerski" i `rel="sponsored"` wystarczają, czy potrzebne jest wyraźniejsze oznaczenie przy planie i w mailach (UOKiK, wytyczne o ukrytej reklamie).
9. **Przepustka 4,99 zł (planowana).** Zakres treści cyfrowej, okres ważności, odstąpienie, wpływ na limit działalności nierejestrowanej.

## 9. Pola do uzupełnienia przez właściciela (celowo nie są wpisane na stronach)

| Pole | Gdzie ma trafić | Uwagi |
|---|---|---|
| Imię i nazwisko sprzedawcy (osoby prowadzącej działalność nierejestrowaną) | Regulamin §1, Polityka prywatności §1, kontakt w stopce | Decyzja po odpowiedzi prawnika (pyt. 3) |
| Adres do doręczeń (korespondencja, reklamacje) | j.w. | Może być adres korespondencyjny |
| E-mail kontaktowy | Już jest: hej@wloczykij.me | **Sprawdź, czy skrzynka odbiera i czy ktoś ją czyta** (reklamacje 14 dni, odstąpienie, RODO 30 dni) |
| NIP/REGON | Nie dotyczy działalności nierejestrowanej | Nie wpisywać; po rejestracji uzupełnić |
| Numer konta / informacja o zwrotach | Nie wymagane (zwrot przez Stripe) | – |

## 10. Zadania poza zakresem (kod lub ustawienia) wynikające z audytu

1. Stripe → Settings → Public details / Terms of service URL, potem w kodzie `consent_collection.terms_of_service: "required"` (checkbox) i ewentualnie `custom_text.terms_of_service_acceptance`. Wymaga decyzji prawnika (pyt. 2) i ustawienia w panelu.
2. Webhook: obsługa zwrotów (`charge.refunded`, `customer.subscription.updated`) – dziś zwrot w Stripe nie odbiera planów ani Pro.
3. Zadanie czyszczące (cron): jeśli chcesz zachować w polityce limity czasowe (plany, konta nieaktywne, `quiz_events`).
4. Ładowanie `gtag.js` dopiero po zgodzie (jeśli prawnik tak zaleci).
5. Slack: bez pełnego e-maila w powiadomieniu o nowym koncie.
6. Link do wypisu w mailu przypominającym przed wylotem (jeśli prawnik zaleci).
7. Eksport danych użytkownika (art. 20) jako funkcja w profilu zamiast obsługi mailowej.
8. Pro: usunąć albo zrealizować "Nowe funkcje trafiają do Ciebie najpierw".
9. Rozesłać mail do użytkowników z kontem o zmianie regulaminu (§11, 14 dni) przed uznaniem zmian za wiążące; publikacja w imieniu Kacpra.

## 11. Jak to sprawdzić

```bash
git diff origin/main -- src/app/regulamin src/app/privacy src/app/cookies src/app/pricing src/app/payment src/app/components src/lib src/app/api/checkout
npm test && npm run lint && npx tsc --noEmit
```

Ręcznie na podglądzie: `/regulamin` (§2, §4, §5, §6, §7), `/privacy` (§2, §4, §5), `/cookies` (tabele, §4), `/pricing` (ramka "Zwroty"), `/payment/success?session_id=...` (po zakupie testowym), popup newslettera (nowy tekst), mail Zrzutu (dopisek o linkach partnerskich).

## 12. Wymagania produkcji

- Checkout (`custom_text.submit.message`): testowa płatność w trybie testowym Stripe, żeby zobaczyć tekst nad przyciskiem "Zapłać"; jeśli Stripe odrzuci parametr, usunąć jedną linię w `src/app/api/checkout/route.ts` (reszta strony działa bez niej).
- Bez migracji i bez zmian zmiennych środowiskowych.
- Przed publikacją: mail do użytkowników z kontem o zmianie regulaminu (pkt 9 powyżej).
