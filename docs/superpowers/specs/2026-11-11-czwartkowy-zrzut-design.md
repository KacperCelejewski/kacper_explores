# Czwartkowy zrzut — design

Data: 2026-11-11 · Etap 1 z 3 nowego modelu Włóczykija

## Po co

Dziś plan od Włóczykija jest jednorazowy: ktoś go dostaje, jedzie i nie ma powodu wracać. Do tego ChatGPT robi coś podobnego za darmo. Czwartkowy zrzut daje to, czego czat nie potrafi: sam przychodzi w czwartek z prawdziwymi cenami z lotniska użytkownika, w jego budżecie, z zajawką tego, co robić na miejscu.

Cel: powód, żeby wracać co tydzień, i lejek do konta, a potem do Pro.

## Nowy model (kontekst, nie wszystko w tym etapie)

Model „D”: darmowe okazje plus prowizje z linków partnerskich plus opcjonalne Pro.

1. **Etap 1 (ten dokument):** Czwartkowy zrzut, darmowy, dla każdego z mailem.
2. **Etap 2:** kredyty. 2 pełne plany miesięcznie za darmo, odnawiane; Pack (5 planów, 14,99 zł) zostaje; niewykorzystane kredyty obecnych użytkowników zostają. Zmiany w cenniku i regulaminie.
3. **Etap 3:** Pro to własne alerty (miasto lub „gdziekolwiek”, daty, próg ceny), sprawdzanie codzienne, kilka lotnisk, plus plany bez limitu i PDF. Ceny Pro bez zmian (19,99 zł/mies., 149,99 zł/rok).

Odrzucone: „zrzut wcześniej dla Pro”. Ceny z cache nie są zarezerwowane dla nikogo, więc byłaby to sztuczna presja (PRODUCT.md: Honest by default).

## Warunki wstępne (poza kodem, robi Kacper)

- **Domena w Resend.** Maile idą dziś z `onboarding@resend.dev`, który dostarcza tylko na adres właściciela konta Resend. Trzeba zweryfikować `wloczykij.me` (DNS: SPF, DKIM) i wysyłać z adresu w tej domenie (np. `zrzut@wloczykij.me`). Do sprawdzenia przy okazji: czy potwierdzenia newslettera w ogóle dziś dochodzą.
- **Marker partnera Travelpayouts.** W kodzie nie ma dziś parametru `marker` w linkach, więc rezerwacje nie są przypisywane. Nowa zmienna `TRAVELPAYOUTS_MARKER`.

## Ograniczenia

- **Tylko darmowe API.** Travelpayouts Data API (`/aviasales/v3/prices_for_dates`) z samym `origin` zwraca kierunki „gdziekolwiek”. Sprawdzone 2026-11-11 dla WRO, KTW, KRK, WAW, GDN, POZ. Limit 100 zapytań na godzinę z IP. Ceny pochodzą z wyszukiwań z ostatnich 48 h, nie na żywo.
- **Resend, plan darmowy:** 100 maili dziennie, 3000 miesięcznie. Batch API do 100 maili na wywołanie. Na darmowym planie zrzut obsłuży około 90 subskrybentów (reszta dziennego limitu na maile transakcyjne). Powyżej trzeba przejść na płatny plan Resend. To jedyny element, który przestaje być darmowy wraz ze wzrostem.
- **Vercel Cron:** funkcja do 60 s (`maxDuration`), więc przygotowanie i wysyłka to osobne crony. Harmonogram w `vercel.json` jest w UTC: 22:00 w Warszawie to `0 21 * * 3` zimą i `0 20 * * 3` latem. Wybieramy wersję zimową i akceptujemy godzinę różnicy latem. Na planie Hobby cron może odpalić z opóźnieniem do godziny, co tu nie przeszkadza.

## 1. Zapis

**Formularz** „Co czwartek 3 wyjazdy z Twojego lotniska”:
- e-mail,
- lotnisko lub lotniska (lista z `src/lib/airports.ts`, `POLISH_AIRPORTS`),
- budżet na lot w obie strony: do 200 / 300 / 500 zł.

Miejsca: strona główna, stopka, ekran po wygenerowaniu planu.

**Baza.** Migracja na `newsletter_subscribers`:
- `airports text[] not null default '{}'`
- `max_price int` (PLN, lot w obie strony)
- `drop_enabled boolean not null default false`
- `unsubscribe_token text unique`
- `drop_disabled_reason text` (np. `bounce`, `complaint`, `user`)

Jedna lista, bez drugiej tabeli.

**Potwierdzenie zapisu:** istniejący mechanizm (`verified`, `verification_token`, `/api/newsletter/verify`). Zrzut idzie wyłącznie do `verified = true and drop_enabled = true`. Obecni potwierdzeni subskrybenci bez lotniska nie dostają zrzutu, dopóki nie wybiorą lotniska. Dostają jeden mail z zaproszeniem (osobne zadanie, poza zakresem).

**Zalogowani:** przycisk „Wysyłaj mi zrzut” w profilu i po planie. Bierze `airports` i `budget` z `quiz_preferences`, a adres z konta. Mapowanie `BudgetLevel` na `max_price` jest zdefiniowane w kodzie.

**Kod rabatowy przy zapisie** (10% na Pro Roczny): bez zmian.

**Wypis:** link `/api/drop/unsubscribe?token=…` w każdym mailu plus nagłówki `List-Unsubscribe` i `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. Wypis ustawia `drop_enabled = false` i nie usuwa wiersza. Link do zmiany lotniska i budżetu prowadzi do prostej strony `/zrzut/ustawienia?token=…`.

## 2. Cotygodniowy proces

### Środa 22:00 — `/api/cron/drop-prepare`

1. **Daty weekendu.** Najbliższy weekend po środzie, w trzech wariantach: czw–nd, pt–nd, pt–pn.
2. **Pobranie cen.** Dla każdego lotniska z co najmniej jednym aktywnym subskrybentem i każdego wariantu: jedno zapytanie `prices_for_dates` (`origin`, `departure_at`, `return_at`, `currency=pln`, `sorting=price`, `limit` = maksimum dozwolone przez API, do potwierdzenia w dokumentacji). Dwie próby ponownie przy błędzie. Lotnisko bez danych jest pomijane w tym tygodniu.
3. **Grupowanie i filtry.** Dla pary (lotnisko, kod miasta) zostaje najtańsza oferta. Odrzucamy:
   - loty krajowe (cel w Polsce),
   - `transfers > 1` lub `return_transfers > 1`,
   - miasta bez polskiej nazwy (katalog `src/lib/destinations/catalog.ts`, potem darmowa lista miast Travelpayouts, potem odrzucenie).
4. **Zapis** do `drop_deals`: `week` (np. `2026-W47`), `origin`, `city_code`, `city_name`, `price`, `departure_at`, `return_at`, `airline`, `transfers`, `link`, `fetched_at`. Unikalność `(week, origin, city_code)`. Ponowne uruchomienie nadpisuje dane tego tygodnia.
5. **Zajawki.** Dla każdego unikalnego `city_code` w tygodniu, który nie ma jeszcze wpisu w `city_teasers`: jedno wywołanie Gemini, równolegle (pula ok. 5). Wynik: 2–3 zdania w głosie marki (BRAND.md) i `local_budget` (przybliżony koszt na miejscu na weekend, w walucie lokalnej). Zapis w `city_teasers(week, city_code, teaser, local_budget)`. Wynik walidowany (długość, brak pustych pól). Błąd oznacza brak zajawki; okazja idzie bez niej. Koszt logowany przez istniejący `geminiLog`.
6. **Raport** przez `sendSlack`: lotniska, liczba okazji, zajawki OK / błąd, czas trwania.

Jeśli wszystkiego nie da się zmieścić w 60 s, zajawki przechodzą do osobnego crona `/api/cron/drop-teasers` (środa, godzinę po `drop-prepare`), który generuje brakujące wpisy `city_teasers` dla bieżącego tygodnia.

### Czwartek 17:00 — `/api/cron/drop-send`

1. Pobiera okazje z `drop_deals` dla bieżącego tygodnia. Jeśli ich nie ma, kończy i zgłasza to na Slacku.
2. **Wybór dla subskrybenta:** okazje z jego `airports`, `price <= max_price`, różne miasta, od najtańszej, maksymalnie 3.
3. **Nic nie pasuje: nie wysyłamy.** Bez maila z okazjami ponad budżet.
4. **Ochrona przed podwójną wysyłką:** tabela `drop_sends(week, subscriber_id, sent_at, resend_id)` z unikalnością `(week, subscriber_id)`. Wiersz powstaje przed wysyłką partii, a `resend_id` jest uzupełniany po niej. Powtórzony cron pomija tych, którzy już mają wiersz.
5. **Wysyłka** przez batch API Resend, po 100 maili na wywołanie, aż do limitu dziennego. Gdy limit się skończy, reszta jest zgłaszana na Slacku, a nie wysyłana później (zrzut na weekend w piątek ma mniej sensu).
6. **Raport** na Slacku: wysłane, pominięte (brak dopasowania), błędy.

**Odbicia i skargi:** webhook Resend (`email.bounced`, `email.complained`) ustawia `drop_enabled = false` i `drop_disabled_reason`.

## 3. Mail

- **Nadawca:** `Włóczykij <zrzut@wloczykij.me>`.
- **Temat:** najtańsza okazja, np. „Mediolan za 201 zł w ten weekend”. Jeśli są co najmniej 2 okazje, alternatywnie „3 wyjazdy z Krakowa na ten weekend”. Bez wykrzykników i wielkich liter.
- **Karta okazji (maksymalnie 3):** miasto, cena w obie strony, daty i godziny, linia, przesiadki, zajawka, `local_budget`, a pod ceną „cena ze środy 22:00, może się zmienić”.
  - **„Sprawdź cenę”:** `https://www.aviasales.com{link}&marker={TRAVELPAYOUTS_MARKER}` plus UTM.
  - **„Ułóż mi plan”:** `/quiz?city={city_code}&from={origin}&depart={YYYY-MM-DD}&return={YYYY-MM-DD}&src=drop` plus UTM.
- **Stopka:** jedno zdanie o Pro (alert na konkretne miasto), link do ustawień, wypis.
- **Szablon:** inline HTML w stylu obecnych maili w `src/lib/email.ts`; nowa funkcja `sendDropBatch`.
- Bez przekreślonych cen, „tylko teraz” i liczników.

## 4. Kliknięcie „Ułóż mi plan”

`/quiz` czyta parametry `city`, `from`, `depart`, `return`, `src`. Gdy są poprawne, ustawia cel, lotnisko i daty, i pomija te pytania. Zostają styl i kto jedzie. Niepoprawne parametry są ignorowane, a quiz działa jak dziś. Generowanie pełnego planu wymaga konta, tak jak teraz.

## 5. Pomiar

- UTM: `utm_source=drop&utm_medium=email&utm_campaign={week}&utm_content={city_code}`.
- GA4 (`src/lib/analytics.ts`): `drop_signup`, `drop_plan_started` (quiz z `src=drop`).
- `/admin`: liczba aktywnych subskrybentów zrzutu na lotnisko, wysłane w tygodniu, konta założone z `src=drop`. Otwarcia i kliknięcia z panelu Resend; bez własnego śledzenia pikselem.

## 6. Testy (vitest)

Czyste funkcje w `src/lib/drop/`, testowane bez sieci:

- `weekendDates(now)`: trzy warianty dat, w tym przełom miesiąca i roku oraz strefa `Europe/Warsaw`.
- `groupDeals(offers, catalog)`: najtańsza na miasto, odrzucanie krajowych, przesiadek i nieznanych miast.
- `pickDealsFor(subscriber, deals)`: filtr lotnisk i budżetu, różne miasta, maksymalnie 3, pusta lista gdy nic nie pasuje.
- `buildAffiliateUrl(link, marker, utm)` i `buildPlanUrl(deal, utm)`.
- Ochrona przed podwójną wysyłką: logika wyboru „do wysłania” przy istniejących `drop_sends`.
- Parsowanie parametrów `/quiz` z `src=drop`.

Travelpayouts, Gemini i Resend są mockowane.

## Poza zakresem tego etapu

Długie weekendy, alerty Pro (etap 3), zmiana kredytów (etap 2), podgląd planu bez konta, mail zapraszający obecnych subskrybentów do wyboru lotniska, push i WhatsApp.
