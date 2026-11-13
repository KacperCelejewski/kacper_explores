# Audyt UI i UX Włóczykija (wloczykij.me)

**Data:** 13 listopada 2026
**Zakres:** wszystkie strony z `src/app/` (bez `/admin`), na żywo na wloczykij.me (desktop 800 px i telefon 375 × 812) oraz w kodzie.
**Wersja kodu:** `origin/main` @ `9728577` (to, co jest na produkcji). Numery linii w raporcie odnoszą się do tej wersji.

> **Uwaga o branchu.** Lokalny branch `homepage-critique-fixes` jest 65 commitów za `origin/main`. Nie ma na nim `/okazje`, czwartkowego zrzutu, `DealsStrip` ani `/ig`. Poprawki z tego raportu trzeba robić na świeżym branchu z `main`, nie na `homepage-critique-fixes`.

> **Uwaga o kierunku.** Trwa 6-tygodniowy test okazji weekendowych (media + afiliacja). Dlatego priorytety w raporcie są ustawione pod dwa cele testu: **zapisy na Czwartkowy zrzut** i **kliknięcia w linki partnerskie (zwłaszcza noclegi)**. Raport nie proponuje zmian cennika, Przepustki ani nowych funkcji planu. Pack i Pro zostają, ale nie są tu celem do pchania.

---

## 1. Najważniejsze w skrócie

| # | Priorytet | Problem | Gdzie |
|---|---|---|---|
| 1 | **P0** | Zapis na Czwartkowy zrzut jest schowany: na stronie głównej dopiero po FAQ (ok. 4000 px w dół z 5500 na desktopie, 4360 z 5900 na telefonie). Nie ma go w nawigacji ani w menu. | `HomeClient.tsx:826`, `SiteNav.tsx`, `GlobalMenu.tsx` |
| 2 | **P0** | Domyślny budżet w zapisie to 300 zł, a najtańszy lot z Wrocławia w tym tygodniu kosztuje 348 zł. Osoba z Wrocławia, która nic nie zmieni, potwierdzi zapis i w czwartek **nic nie dostanie** (wysyłka po cichu ją pomija). | `DropSignup.tsx:13`, `lib/drop/send.ts:13` |
| 3 | **P0** | „Odkryj”, pierwszy link nawigacji na każdej stronie, prowadzi do pustej strony „Brak publicznych planów” z regionami Azja, Afryka, Oceania. | `SiteNav.tsx:45`, `odkryj/page.tsx` |
| 4 | **P0** | Po quizie ekran logowania pokazuje zmyślone wyniki (4 rozmyte karty „~1 800 zł” na sztywno) i pisze „Masz gotowe 6 kierunków”, chociaż kierunki jeszcze nie istnieją. To największy wyciek lejka i złamanie zasady „Honest by default”. | `login/page.tsx:69–105`, `quiz/page.tsx:310` |
| 5 | **P1** | Favicon i obrazek do udostępnień (OG) mają stary pomarańcz `#FF6B35` i okrągłe „W”, czyli dokładnie to, czego BRAND.md zakazuje. Każdy link wklejony w DM na Instagramie czy Messengerze wygląda jak inna marka. Ikony PWA z manifestu zwracają 404. | `icon.tsx`, `opengraph-image.tsx`, `manifest.webmanifest` |
| 6 | **P1** | Na kartach okazji „Nocleg ↗” jest szarym przyciskiem drugiego rzędu, a to prowizja od noclegów jest kilka razy wyższa niż od lotów. | `okazje/[lotnisko]/page.tsx:110–125` |
| 7 | **P1** | Trzy osobne formularze e-mail do dwóch różnych list: zrzut, popup „10% na Pro Roczny” i „Alerty cenowe — już wkrótce”. Na `/pricing` są dwa formularze i popup, żaden nie zapisuje na zrzut. | `pricing/page.tsx:231`, `NewsletterPopup.tsx`, `PriceAlertSignup.tsx` |
| 8 | **P1** | Baner „Kup Pack / Pro Roczny” w widoku planu pokazuje się każdemu darmowemu użytkownikowi (warunek `credits <= 2`, a darmowy limit to 2) i stoi **nad** linkami do lotu i noclegu. | `plan/[tripId]/page.tsx:442–507` |
| 9 | **P1** | Pasek okazji na stronie głównej ładuje się dopiero w przeglądarce (bez SSR): skacze układ, Google go nie widzi, nie ma nagłówka sekcji ani linku do zapisu. | `DealsStrip.tsx:46` |
| 10 | **P1** | Kilka ślepych zaułków bez nawigacji: `/zrzut/ustawienia` bez tokenu, 404, prywatny `/share`, `/login`, `/payment/success`. | szczegóły w sekcji 4.3 |

---

## 2. Mapa stron

| Trasa | Do czego służy | Osiągalna ze strony głównej? | Główne CTA | Cel konwersji | Stan |
|---|---|---|---|---|---|
| `/` | Landing, quiz, okazje, zrzut | — | „Zaplanuj wyjazd — za darmo” (14 linków do `/quiz`) | konto (przez quiz), e-mail (zrzut) | Działa, ale zapis na zrzut za nisko |
| `/ig` | Przekierowanie z bio IG z UTM | — | → `/` | — | Działa (307) |
| `/okazje/[lotnisko]` | Najtańsze loty na najbliższy weekend z 7 lotnisk | Tak, tylko z paska okazji (po załadowaniu JS) | „Sprawdź cenę lotu ↗” | klik partnerski, e-mail | Najlepsza strona pod test, słabo podlinkowana |
| `/quiz` | 6 pytań | Tak (hero) | wybór odpowiedzi | konto | Działa, bramka konta na końcu |
| `/login` | Magic link + Google | Tak (nav) | „Wyślij link logowania” | konto | Po quizie zmyślone karty wyników |
| `/destinations` | 6 kierunków z Gemini, wybór lotu | Tylko przez quiz | „Planuj wyjazd” | plan (kredyt), klik partnerski | Bez quizu przekierowuje do `/quiz` |
| `/quick` | „Wiem dokąd” w 4 krokach | Tak (hero, drugi link) | „Dalej” | konto, plan | Brak własnego `<title>`, „Wstecz” prowadzi do `/start` |
| `/start` | Wybór ścieżki quiz / quick | Nie (tylko „Wstecz” z `/quick`) | dwie karty | — | Sierota, dubluje hero |
| `/plan/[tripId]` | Plan dzień po dniu + narzędzia | Po wygenerowaniu | lot, nocleg, Pack/Pro, zrzut, feedback | klik partnerski, płatność, e-mail | Kolejność bloków pod złe cele |
| `/share/[tripId]` | Publiczny podgląd planu | Z linku od znajomego | „Wygeneruj własny plan” | konto | Zły komunikat dla nieistniejącego ID |
| `/odkryj` | Galeria publicznych planów | Tak (nav, link nr 1) | „Stwórz plan” | — | **Pusta** |
| `/pricing` | Free / Pack / Pro | Tak (nav) | „Kup Pack”, „Zostań Pro” | płatność, e-mail | 2 formularze + popup, kolory spoza palety |
| `/payment/success` | Po płatności | Po Stripe | „Zaplanuj wyjazd” | — | Bez `session_id` mówi „płatność się księguje” |
| `/profile` | Konto, podróże, zrzut, subskrypcja | Po zalogowaniu (nav, menu) | „Zrób quiz”, „Kup więcej planów” | — | OK |
| `/zrzut/ustawienia` | Lotniska i budżet zrzutu (token z maila) | Nie | „Zapisz” | utrzymanie e-maila | Bez tokenu: jedno zdanie i nic więcej, tytuł „| Włóczykij | Włóczykij” |
| `/blog`, `/blog/[slug]` | 5 artykułów SEO | Tak (nav desktop, menu, stopka) | „Zaplanuj podróż za darmo” | konto | Daty z 2025, tylko CTA do quizu |
| `/regulamin`, `/privacy`, `/cookies` | Prawne | Stopka | — | — | OK |
| `/offline` | PWA offline | — | — | — | OK |
| `/flights` | Przekierowanie do `/destinations` | — | — | — | Martwa trasa, do usunięcia |
| 404 | Nie znaleziono | — | „Wróć do strony głównej” | — | Bez nawigacji, ogólny tytuł strony |

---

## 3. Widoczność funkcji ze strony głównej

Legenda: ✅ widoczne i osiągalne · ⚠️ jest, ale schowane albo słabe · ❌ brak

| Funkcja | Na stronie głównej | Jak dojść | Ocena | Co zrobić |
|---|---|---|---|---|
| Quiz (6 pytań) | Hero, „Jak to działa”, przykładowy plan, karuzela, finał, stopka | 1 klik | ✅ aż za bardzo (14 linków) | Zostawić hero + finał, resztę zamienić na okazje/zrzut |
| „Wiem dokąd” (`/quick`) | Drugi link w hero | 1 klik | ✅ | — |
| Okazje weekendowe (`/okazje`) | Pasek pod hero, tylko gdy JS pobierze dane | 1 klik | ⚠️ | Dodać „Okazje” do nawigacji i menu, render po stronie serwera, nagłówek sekcji |
| Czwartkowy zrzut (zapis) | Sekcja `#zrzut` pod FAQ, link w stopce | przewinięcie ok. 5 ekranów | ⚠️ schowany | Przenieść pod pasek okazji, dodać do nawigacji |
| Konto / logowanie (magic link, Google) | „Zaloguj się” w nawigacji | 1 klik | ✅ | Na `/login` powiedzieć, co daje konto |
| Moje podróże / profil | Tylko po zalogowaniu (licznik planów w nav, menu) | 1 klik | ✅ | — |
| Cennik, Pack, Pro | „Cennik” w nav, FAQ | 1 klik | ✅ | Bez zmian (test) |
| Alerty cenowe | Brak, tylko na `/pricing` | 2 kliki | ⚠️ duplikat zrzutu | Zastąpić zapisem na zrzut |
| Newsletter z kodem 10% | Brak, popup po 10 s tylko na `/pricing` | 2 kliki + czekanie | ⚠️ duplikat | Wyłączyć albo przepiąć na zrzut |
| Blog | Nav na desktopie, menu na telefonie, stopka | 1–2 kliki | ✅ | — |
| Galeria „Odkryj” | Pierwszy link w nav | 1 klik | ❌ pusta | Zdjąć z nav do czasu, aż będą plany |
| Funkcje planu: zmiana dnia, zamiana atrakcji, restauracje, lista pakowania, mapa, budżet, czat, PDF, `.ics`, link do udostępnienia | Przykładowy plan pokazuje tylko 5 godzin z jednego dnia | — | ❌ nie widać | Jedna linijka pod przykładowym planem: „Zmienisz dzień, podmienisz atrakcję, wrzucisz do kalendarza” |
| Ocena planu (feedback → PDF albo +1 plan) | Brak | tylko w planie | ⚠️ | Wspomnieć w FAQ „Czy Włóczykij jest darmowy?” |
| Mail z przypomnieniem przed wyjazdem | Brak | — | ❌ | Dopisać jako korzyść konta na `/login` |
| Kontakt `hej@wloczykij.me` | Stopka | — | ✅ | — |

---

## 4. Przepływ klienta: lejki, wycieki, ślepe zaułki

Każda ścieżka powinna kończyć się **e-mailem** (zrzut), **kontem** albo **pieniędzmi** (klik partnerski, Pack, Pro). Poniżej każda ścieżka z miejscem, w którym ludzie odpadają.

### 4.1 Lejki

**A. Instagram → strona główna → quiz → konto → plan** (główny ruch: `/ig` ląduje na `/`)

1. `/` hero → „Zaplanuj wyjazd — za darmo” → `/quiz`
2. 6 pytań (tekst pod quizem: „Nic nie kosztuje”)
3. **Bramka konta** (`quiz/page.tsx:310`): niezalogowany trafia na `/login` z rozmytymi, wymyślonymi kartami
4. Magic link → skrzynka → powrót → `/destinations` → generowanie (kredyt) → `/plan/[id]`
5. W planie: baner Pack/Pro, zapis na zrzut, lot ↗, nocleg ↗

*Wycieki:* (3) to najdroższe miejsce w całym serwisie: ktoś odpowiedział na 6 pytań i zamiast wyniku dostaje formularz, a potem musi przełączyć się do poczty. Ekran nie daje alternatywy „wolę bez konta”. (5) baner płatny stoi przed linkami partnerskimi.

*Poprawka (P0):*
- Minimum: uczciwy tekst na `/login` po quizie. Zamiast „Masz gotowe 6 kierunków” → „Zaloguj się, a dobierzemy 6 kierunków pod te odpowiedzi”. Usunąć rozmyte karty albo pokazać w nich prawdziwe odpowiedzi z quizu (budżet, termin, lotnisko), a nie wymyślone miasta.
- Lepiej: pokazać 6 kierunków **bez konta**. `/api/destinations` nie wymaga logowania (ma cache i limit), a `destinations/page.tsx:722` i tak ma własną bramkę przed generowaniem planu. Konto byłoby potrzebne dopiero przy „Planuj wyjazd”, czyli wtedy, gdy człowiek już coś zobaczył i chce więcej. Koszt: jedno wywołanie Gemini flash-lite więcej na anonimowy quiz. Decyzja Kacpra.
- Na `/login` dodać pod formularzem wyjście na e-mail: „Nie chcesz konta? Zapisz się na czwartkowe okazje z Twojego lotniska” (zwinięty `DropSignup` z lotniskiem z quizu).

**B. Strona główna → pasek okazji → `/okazje/[lotnisko]` → partner** (ścieżka testu)

1. `/` pasek „Najbliższy weekend z Wrocławia” (pojawia się po pobraniu danych)
2. Klik w kartę → `/okazje/wro` (lista, nie konkretna okazja)
3. Karta: „Sprawdź cenę lotu ↗” (główny), „Nocleg ↗” (szary), „Plan na 48 h →” (quiz z wypełnionymi polami → bramka konta)
4. Na samym dole, po 12 kartach: zapis na zrzut

*Wycieki:* pasek nie mówi, czym jest ani że to samo przychodzi co czwartek mailem. Na `/okazje` zapis jest po 12 kartach (na telefonie to ok. 12 ekranów). Formularz nie zna lotniska, na którego stronie stoi. „Plan na 48 h” obiecuje coś, co i tak kończy się bramką konta, a pobyt trwa 47–73 h.

*Poprawka:* patrz sekcja 5, punkty P0-2, P1-1, P1-3.

**C. Zapis na Czwartkowy zrzut** (strona główna, `/okazje`, plan)

1. E-mail, 1–3 lotniska, budżet 200/300/500 zł (domyślnie 300)
2. „Zapisz mnie” → „Sprawdź skrzynkę i potwierdź zapis. Pierwszy zrzut w czwartek.”
3. Potwierdzenie w mailu → czwartek → mail z 3 okazjami → linki partnerskie

*Wycieki:* (1) lotnisko nie jest wypełnione, choć strona je zna (`/okazje/wro`, `localStorage.deals_origin` w pasku na stronie głównej, odpowiedź z quizu). (1) domyślne 300 zł przy obecnych cenach odcina część lotnisk. (3) jeśli nic nie mieści się w budżecie, `lib/drop/send.ts:13` pomija osobę bez słowa, więc pierwszy kontakt po potwierdzeniu to cisza. (2) ekran sukcesu nie proponuje nic dalej.

**D. Blog (ruch z Google) → quiz**

1. Artykuł 8–14 min → na końcu jedno CTA „Gotowy na swoją podróż? AI zaplanuje Twój wyjazd” → `/quiz` → bramka konta

*Wyciek:* czytelnik z wyszukiwarki jest zimny. Prośba o konto po artykule to za duży krok, a zapis na okazje (jedno pole) nie jest w ogóle oferowany. *Poprawka:* `DropSignup` w środku i na końcu artykułu + link do `/okazje` z nazwą lotniska.

**E. Cennik → płatność**

1. `/pricing` → „Kup Pack” / „Zostań Pro” → Stripe → `/payment/success`
2. Po 10 s popup „10% zniżki na Pro Roczny”, niżej niebieskie „Alerty cenowe — już wkrótce”

*Wyciek:* dwa formularze e-mail i popup konkurują z przyciskami płatności i nie zapisują na zrzut. Brak wzmianki, że okazje i zrzut są darmowe bez konta.

**F. Udostępniony plan → nowy użytkownik**

1. `/share/[id]` → „Wygeneruj własny plan” → quiz → bramka konta

*Wyciek:* dla złego lub usuniętego ID strona mówi „Plan prywatny… Poproś go o włączenie opcji”, choć planu po prostu nie ma.

**G. Widok planu → pieniądze**

Obecna kolejność (`plan/[tripId]/page.tsx`): podsumowanie → **baner Pack/Pro** (każdy darmowy) → **zapis na zrzut** → lot ↗ → noclegi ↗ → restauracje → dni → udostępnij/PDF → feedback.

*Poprawka:* podsumowanie → lot ↗ + nocleg ↗ (zaraz pod kosztem) → dni → zrzut → feedback → baner Pack/Pro **tylko** gdy `credits === 0`.

### 4.2 Gdzie konwersja ucieka, w liczbach ze strony

- Strona główna ma 14 linków do `/quiz`, 4 do `/okazje/wro` i **1** do `#zrzut` (w stopce).
- Zapis na zrzut zaczyna się na 73% wysokości strony na desktopie i 74% na telefonie.
- Na `/okazje/wro` zapis jest po 12 kartach okazji.
- W nawigacji na telefonie są tylko „Odkryj” (pusta), „Cennik” i „Zaloguj się”.

### 4.3 Ślepe zaułki

| Strona | Co widzi człowiek | Czego brakuje | Poprawka |
|---|---|---|---|
| `/odkryj` | „Brak publicznych planów” + regiony z całego świata | treści | Zdjąć z nav i z `sitemap.ts:23`; nav „Odkryj” → „Okazje” |
| `/zrzut/ustawienia` bez tokenu | „Ten link jest nieaktualny. Najnowszy znajdziesz w ostatnim zrzucie.” | nawigacji, linku, formularza | `SiteNav` + „Wpisz e-mail, wyślemy nowy link” albo przynajmniej `DropSignup`; poprawić tytuł (`zrzut/ustawienia/page.tsx:7` ma „| Włóczykij”, a szablon dokleja drugie) |
| 404 (`not-found.tsx`) | „Nie znaleziono strony” | nav, tytułu „Nie znaleziono”, linku do okazji | `SiteNav`, `metadata.title`, dwa linki: okazje i quiz |
| `/share/[zły id]` | „Plan prywatny” | prawdy | Rozróżnić „nie ma takiego planu” od „prywatny”; formy bezosobowe |
| `/payment/success` bez sesji | „Płatność jeszcze się księguje” | warunku | Bez `session_id` przekierować do `/pricing` |
| `/login` | Formularz, bez nav | drogi powrotu poza FAB | `SiteNav` albo link „← Wróć” |
| `/start` | Wybór ścieżki | wejścia z jakiejkolwiek strony | Usunąć; „Wstecz” w `quick/page.tsx:270` → `router.back()` albo `/` |
| `/flights` | Przekierowanie | — | Usunąć trasę |
| Plan → „Zaplanuj nową podróż” | Reset quizu i powrót na `/` | — | Prowadzić prosto do `/quiz` (`plan/[tripId]/page.tsx:820`) |

---

## 5. Lista poprawek

Format: **co** · gdzie · dlaczego · jak.

### P0: blokuje cel testu albo wprowadza w błąd

**P0-1. Zapis na zrzut wyżej na stronie głównej**
- Gdzie: `src/app/components/HomeClient.tsx:380` (pasek) i `:826` (sekcja `#zrzut`), `SiteNav.tsx`, `GlobalMenu.tsx:163–167`
- Dlaczego: zapisy na zrzut to cel testu. Dziś trzeba przewinąć ok. 5 ekranów, a ruch z IG to telefony.
- Jak:
  1. Przenieść `<section id="zrzut">` bezpośrednio pod `<DealsStrip />` (przed „Jak to działa”). Kolejność strony: hero → okazje → zapis → jak to działa → przykładowy plan → FAQ → finał.
  2. W hero dodać trzecią, tekstową linię pod CTA: „Albo co czwartek 3 okazje z Twojego lotniska → #zrzut”.
  3. W `SiteNav` link „Okazje” (→ `/okazje/{zapamiętane lotnisko}`) zamiast „Odkryj”. W `GlobalMenu` dodać „Okazje na weekend” i „Czwartkowy zrzut”.
  4. Nagłówek sekcji zapisu w skali innych sekcji (dziś `text-xl`, czyli 20 px, przy 40–56 px w reszcie strony), z nazwą produktu: eyebrow „CZWARTKOWY ZRZUT”, tytuł „Co czwartek 3 wyjazdy z Twojego lotniska”.

**P0-2. Formularz zrzutu: lotnisko z kontekstu i budżet, który coś zwróci**
- Gdzie: `DropSignup.tsx:13`, `DropPrefsFields.tsx`, `okazje/[lotnisko]/page.tsx:141`, `lib/drop/send.ts:13`
- Dlaczego: z domyślnymi ustawieniami część zapisanych osób nie dostanie pierwszego maila. W tym tygodniu z Wrocławia najtaniej jest 348 zł, z Katowic 367 zł.
- Jak:
  1. `DropSignup` przyjmuje `defaultAirports` i `defaultMaxPrice`. Na `/okazje/[lotnisko]` podać `origin`, na stronie głównej lotnisko z `localStorage.deals_origin` (to samo co w pasku), w planie lotnisko z quizu.
  2. Domyślny budżet 500 zł albo najmniejszy próg, w którym mieszczą się co najmniej 3 okazje dla danego lotniska (dane już są w `/api/deals`).
  3. Pod budżetem podpowiedź z danych: „W tym tygodniu z Wrocławia od 348 zł”.
  4. Backend (decyzja Kacpra): gdy nic nie mieści się w budżecie, wysłać krótki mail „W tym tygodniu nic poniżej 300 zł. Najtańsze: …” zamiast `continue`. Cisza po potwierdzeniu zabija listę.
  5. Ekran sukcesu: „Sprawdź skrzynkę…” + link „W międzyczasie: okazje z Wrocławia →”. Kolory sukcesu z palety, nie `#F0FDF4/#16A34A`.

**P0-3. „Odkryj” z nawigacji**
- Gdzie: `SiteNav.tsx:45`, `sitemap.ts:23`, `odkryj/page.tsx`
- Dlaczego: pierwszy link nawigacji na każdej stronie prowadzi do pustki. Regiony Azja, Ameryki, Afryka, Oceania nie pasują do produktu (weekendy w Europie z Polski).
- Jak: zastąpić linkiem „Okazje”. `/odkryj` zostawić pod adresem, ale usunąć z nav i sitemapy, a pusty stan zamienić na link do okazji. Wrócić do galerii, gdy będzie co najmniej kilkanaście publicznych planów.

**P0-4. Uczciwy ekran po quizie i krótsza droga do wyniku**
- Gdzie: `login/page.tsx:69` (nagłówek), `:87–112` (rozmyte karty), `quiz/page.tsx:308–314`
- Dlaczego: stałe „Barcelona / Lizbona / Praga / Ateny ~1 800 zł” i „Masz gotowe 6 kierunków” to nieprawda (kierunki generują się dopiero na `/destinations` po zalogowaniu). PRODUCT.md: „Honest by default… no fabricated social proof”.
- Jak: patrz lejek A. Minimum na teraz: zmienić tekst, a w miejscu kart pokazać odpowiedzi z quizu („Sam/a · do 1500 zł · listopad · z Wrocławia”). Dodać korzyści konta: „2 plany co miesiąc, historia wyjazdów, mail dzień przed wylotem”. Dodać wyjście na e-mail (zrzut).

### P1: wyraźnie szkodzi konwersji albo marce

**P1-1. Pasek okazji na stronie głównej**
- Gdzie: `DealsStrip.tsx`, `page.tsx`
- Dlaczego: `return null` do czasu odpowiedzi `fetch` (`:46`), więc treść wskakuje po załadowaniu i przesuwa stronę, Google jej nie widzi, a przy wolnym łączu na telefonie pierwszy ekran jej nie ma. Nagłówek 20 px bez eyebrow, bez daty sprawdzenia ceny, bez wzmianki o zrzucie. Select ma `background: var(--surface)`, a taki token nie istnieje.
- Jak: pobrać okazje w `page.tsx` po stronie serwera (`getDealsForOrigin("WRO")`) i podać jako `initialDeals`; zmiana lotniska dalej po stronie klienta. Dodać eyebrow „OKAZJE NA WEEKEND”, podpis „Lot w obie strony, ceny z wyszukiwań z 13 listopada” i link „Dostawaj to co czwartek →” do `#zrzut`. Karta → `/okazje/wro#{city_code}` (kotwica na konkretnej okazji). `var(--surface)` → `var(--bg-surface)` (też `okazje/[lotnisko]/page.tsx:60`, `destinations/page.tsx`).

**P1-2. Karty na `/okazje/[lotnisko]`**
- Gdzie: `okazje/[lotnisko]/page.tsx:98–127`, `lib/flights/airlines.ts`
- Dlaczego: prowizja od noclegu jest kilka razy wyższa niż od lotu, a nocleg wygląda jak dodatek.
- Jak:
  1. „Nocleg ↗” → „Nocleg pt–nd ↗” (daty już są w `bookingLink`) w tym samym wadze co lot, np. dwa równe przyciski w jednym rzędzie: „Lot 348 zł ↗” i „Nocleg na 2 noce ↗”.
  2. „Plan na 48 h →” → „Plan na ten weekend →” (pobyty mają 47–73 h).
  3. Uzupełnić `AIRLINE_NAMES`: na żywo widać surowe kody „MW” i „RR”.
  4. Zwinięty zapis na zrzut (z tym lotniskiem) po 3. karcie, pełny na końcu.
  5. Dodać `/okazje/*` (7 stron) do `sitemap.ts` i listę lotnisk do stopki. To strony z frazą „tanie loty na weekend z X”.
  6. Do weryfikacji: `/okazje/wmi` zwraca dokładnie te same okazje co `/okazje/waw` (Travelpayouts podaje kod miasta WAW, `lib/drop/deals.ts:100`). Jeśli to loty z Okęcia, strona „Weekend z Modlina” wprowadza w błąd.

**P1-3. Favicon, OG i ikony PWA**
- Gdzie: `src/app/icon.tsx:17`, `src/app/opengraph-image.tsx:32,43,62`, `public/manifest.webmanifest`
- Dlaczego: ruch idzie z Instagrama, czyli z linków wklejanych w DM i bio. Podgląd pokazuje pomarańcz `#FF6B35`, napis „za grosze”, flagi i krój bezszeryfowy. Favicon to okrągłe „W”, którego BRAND.md wprost zakazuje. `/icon-192.png` i `/icon-512.png` zwracają 404, więc „Dodaj do ekranu głównego” nie ma ikony. `theme_color` w manifeście to `#C4622D`, a w `layout.tsx` `#F5EFE0`.
- Jak: nowy znak już jest w `public/brand/` (`wloczykij-znak.svg`, `wloczykij-znak-2048.png`, `wloczykij-avatar-1080.png`), ale **nie jest w repo** (nieśledzony na lokalnym branchu). Commit, potem: `icon.tsx` → znak na piasku; `opengraph-image.tsx` → piasek `#F5EFE0`, Cormorant, hasło „Obudź w sobie Włóczykija.” i sylwetka wędrowca jak w hero; wygenerować `icon-192.png` i `icon-512.png` (wersja maskable z marginesem); ujednolicić `theme_color`.

**P1-4. Jedna lista mailowa zamiast trzech**
- Gdzie: `pricing/page.tsx:231` (`PriceAlertSignup`), `layout.tsx:60` + `NewsletterPopup.tsx:13` (popup na `/pricing`), `/api/newsletter`
- Dlaczego: „Alerty cenowe — już wkrótce” to obietnica tego, co zrzut już robi. Popup obiecuje zniżkę na Pro, a test nie pcha Pro. Ludzie zapisani na stary newsletter nie dostają zrzutu.
- Jak: na `/pricing` zamiast `PriceAlertSignup` dać `DropSignup` z nagłówkiem „Nie chcesz płacić? Okazje co czwartek są za darmo”. Popup wyłączyć (`ALLOWED_PATHS = []`) albo przepiąć na zrzut. Starą listę `newsletter` zostawić bez wysyłek; co z tymi adresami (zgoda na nowy typ maila), decyduje Kacper.

**P1-5. Kolejność w widoku planu**
- Gdzie: `plan/[tripId]/page.tsx:442` (warunek banera), `:487–502` (zrzut), `:507–513` (lot, noclegi)
- Dlaczego: baner Pack/Pro widzi każdy darmowy użytkownik od pierwszego planu i stoi nad linkami partnerskimi.
- Jak: warunek `userCredits.credits === 0`; `FlightCard` i `HotelLinks` zaraz pod podsumowaniem kosztu; zapis na zrzut po dniach planu (osoba właśnie skończyła planować, to dobry moment na „następny weekend”).

**P1-6. Ceny na kartach kierunków na stronie głównej**
- Gdzie: `src/lib/cityPhotos.ts:113–120`, karuzela w `HomeClient.tsx`
- Dlaczego: „Barcelona od ~1 400 zł” jest wpisane na sztywno, bez opisu, co obejmuje, a kilka ekranów wyżej pasek okazji pokazuje lot do Barcelony za 805 zł. Dwie różne liczby dla tego samego miasta na jednej stronie.
- Jak: podpis „cały wyjazd, szacunek” albo usunąć ceny z kart. Lepiej: zamiast ośmiu kart z pytaniem „Gdzie chcesz lecieć?” pokazać okazje z kilku lotnisk. Karuzela to ta sama funkcja co quiz w innym przebraniu.

**P1-7. Odmiana i kolor licznika planów**
- Gdzie: `SiteNav.tsx:87` („0 plany”), `destinations/page.tsx:861` („1 planów”, „2 planów”), `SiteNav.tsx:81`
- Dlaczego: błędy gramatyczne w nawigacji. Stan „2 plany” (normalny miesiąc) jest malowany na czerwono `#FEE2E2/#DC2626`, jakby coś było nie tak.
- Jak: jedna funkcja `formatPlans(n)` w `src/lib/` (1 plan, 2–4 plany, 0 i 5+ planów, 12–14 planów). Czerwony tylko przy 0, i to tokenem `--error`.

**P1-8. Blog jako wejście na listę**
- Gdzie: `blog/[slug]/page.tsx:66` (akapity `text-sm`), `:196–214` (CTA), `blog/page.tsx:113`
- Dlaczego: ruch z Google to ludzie, którzy jeszcze nic nie planują. Jedyne CTA to quiz z kontem. Akapity mają 14 px przy artykułach na 8–14 minut. CTA mówi „AI zaplanuje Twój wyjazd”, a pozycjonowanie mówi, że AI nie jest nagłówkiem. „Gotowy” jest tylko w rodzaju męskim. Daty publikacji z kwietnia i maja 2025.
- Jak: `DropSignup` po ok. 40% artykułu i na końcu, link do `/okazje`; akapity 16–17 px, interlinia 1,7; CTA bez „AI”, np. „Twój weekend w 3 minuty: lot i plan z cenami”; „Gotowy” → „Gotowe na wyjazd?” albo zdanie bezosobowe; odświeżyć daty, kiedy treść zostanie przejrzana.

**P1-9. Ślepe zaułki** z tabeli 4.3 (nav na `/login`, 404, `/zrzut/ustawienia`, `/share`, `/payment/success`, `/start`, `/flights`).

### P2: spójność z designem i drobne UX

**P2-1. Kolory spoza palety.** Tokeny są w `globals.css:3–18` (piasek, ceglasty `--accent #A04B20`, zieleń `#2D5A27`, czekolada). Liczba literałów kolorów spoza palety w plikach (bez adminów): `plan/[tripId]/page.tsx` 60, `share/[tripId]/ShareClient.tsx` 23, `NewsletterPopup.tsx` 20, `profile/page.tsx` 15, `destinations/page.tsx` 15, `FeedbackWidget.tsx` 12, `PriceAlertSignup.tsx` 11, `PartnerLinks.tsx` 10, `HomeClient.tsx` 10.
- Stary pomarańcz `rgba(255,107,53,…)` / `#FF6B35` z czasów przed rebrandingiem jest w 10 plikach, m.in. `plan/[tripId]/page.tsx:22–30`, `blog/[slug]/page.tsx:199`, `NewsletterPopup.tsx`, `profile/page.tsx`, `destinations/page.tsx`.
- Niebieski `#1D4ED8/#EEF3FF` w „Alertach cenowych”, `#1A56B0` w karcie lotu, kolory Bookinga `#003580` i Hostelworld `#FF6C2F` w `PartnerLinks.tsx:23–24`.
- Stany sukcesu i błędu na zielonych i czerwonych z Tailwinda (`#16A34A`, `#DC2626`), a w tokenach jest `--error #B91C1C`.
- Jak: dodać do `globals.css` `--success` (zieleń leśna `#2D5A27`), `--success-bg`, `--error-bg`, `--info` (woda `#5C7A78`) i zamienić literały. Karty partnerów: nazwa partnera tekstem, karta w kolorach Włóczykija.

**P2-2. Emoji jako ikony.** Emoji są w UI 25 plików, choć `Icons.tsx` ma liniowe ikony, których używa quiz. BRAND.md: „Infantylny (za dużo emoji)”. Do wymiany w pierwszej kolejności: `PartnerLinks.tsx` („🛏️ Booking.com”, „🏕️ Hostelworld”), przyciski planu („🔗 Udostępnij”, „🔒 PDF”, „🌍 Udostępnij w galerii”), `pricing` (🎒, 🔔), puste stany (`odkryj` 🗺️, 404 🗺️, `share` 🔒, `payment/success` 🎒), etykiety stylów w profilu („Full program 🔥”). Emoji w treści planu z Gemini mogą zostać.

**P2-3. Typografia.** Nagłówki sekcji na stronie głównej mają 40–56 px (Cormorant), a dwie sekcje testu, czyli pasek okazji i zapis na zrzut, 20 px. Teksty pomocnicze często 13–14 px. Na telefonie są dwa linki niższe niż 24 px („Wszystkie okazje z Wrocławia” 21 px, „polityce prywatności” 16 px).

**P2-4. Ton i język.**
- Anglicyzmy: „Family-friendly” (`quiz/page.tsx:584`, `quick/page.tsx:193`) → „Spokojne tempo, z dziećmi”; „Full program” (profil) → „Pełny program”; „solo travelerów” (blog) → „osób podróżujących solo”.
- Formy męskie: „Gotowy na swoją podróż?” (`blog/page.tsx:113`, `blog/[slug]/page.tsx:202`), „Poproś go” (`ShareClient.tsx:88`), „Bądź pierwszy” (`odkryj/page.tsx:189`) → formy bezosobowe.
- „AI” na pierwszym planie: „AI dopasuje atrakcje…” (quiz, krok 1), „Podaj miasto i kraj — AI ułoży plan” (`/quick`), CTA bloga. PRODUCT.md: „AI is the means, not the headline”.
- „Nic nie kosztuje” pod quizem jest prawdą, ale konto jest wymagane, a nigdzie w quizie tego nie widać. Dopisać: „Na końcu założysz darmowe konto”.

**P2-5. Spójność liczb i nazw.** „Czwartkowy zrzut” w stopce i profilu, „Co czwartek 3 wyjazdy” w formularzu, „Okazje na weekend” na `/okazje`, „Newsletter” w popupie: jedna nazwa produktu wszędzie („Czwartkowy zrzut”, podtytuł „okazje na weekend”). PRODUCT.md jest nieaktualny: pisze o 3 kierunkach i 5 darmowych planach na start, a strona o 6 kierunkach i 2 planach miesięcznie.

**P2-6. `/quick` bez tytułu strony.** Karta przeglądarki pokazuje ogólny tytuł serwisu, a „Wstecz” w pierwszym kroku prowadzi do sieroty `/start`.

**P2-7. Baner cookies zasłania CTA w hero przy pierwszym wejściu** (desktop 800 × 600: baner przykrywa „Zaplanuj wyjazd — za darmo”). Niższy baner albo przyklejony do dołu na pełną szerokość z mniejszym tekstem.

**P2-8. Pomiar.** GA4 zbiera dane dopiero po zgodzie, więc liczby lejka będą niedoszacowane. Dla decyzji z testu liczyć zapisy (`drop_signup`) i kliknięcia partnerskie po stronie serwera (tabela zapisów, UTM w linkach partnerskich), nie tylko w GA. Do GA dodać zdarzenie wejścia na `/login` z quizu, żeby zmierzyć bramkę z P0-4.

---

## 6. Telefon (375 × 812)

- Strona główna nie przewija się w poziomie (zmierzone: szerokość dokumentu 375 px).
- Hero: tytuł, CTA, link „Wiesz już dokąd?” i podpis mieszczą się na pierwszym ekranie, grafika jest pod nimi. Okazji nie widać na pierwszym ekranie.
- Nawigacja: „Odkryj”, „Cennik”, „Zaloguj się”. Brak „Okazje”, Blog jest tylko w menu pod przyciskiem z kompasem w prawym dolnym rogu, który nie wygląda jak menu (brak etykiety, ikona kompasu).
- Pływający przycisk menu zasłania prawy dolny róg treści na każdej stronie (m.in. przycisk „Dalej” w `/quick`, karty okazji).
- `/okazje/wro`: 12 kart po ok. 1 ekranie, zapis dopiero na samym końcu.

---

## 7. Kolejność wdrożenia

Każdy punkt to osobny, mały PR z `main`.

1. **Tydzień 1 testu (P0):** P0-1 (zapis pod okazjami + „Okazje” w nav zamiast „Odkryj”), P0-2 (lotnisko z kontekstu, domyślny budżet, podpowiedź ceny), P0-3, P0-4 (tekst na `/login` + wyjście na e-mail).
2. **Tydzień 1–2 (P1, ścieżka pieniędzy):** P1-2 (nocleg na równi z lotem, nazwy linii, zapis po 3. karcie, sitemap), P1-5 (kolejność w planie), P1-1 (SSR paska), P1-4 (jedna lista).
3. **Tydzień 2 (P1, marka):** P1-3 (favicon, OG, ikony PWA, commit `public/brand/`), P1-7, P1-6, P1-8, P1-9.
4. **Po teście (P2):** tokeny `--success/--error-bg/--info` i sprzątanie kolorów, emoji → `Icons.tsx`, ton, typografia, baner cookies.

Do decyzji Kacpra, nie do wdrożenia z automatu:
- Czy pokazywać 6 kierunków bez konta (koszt jednego wywołania Gemini flash-lite na anonimowy quiz).
- Czy wysyłać mail „w tym tygodniu nic w Twoim budżecie” zamiast pomijać osobę.
- Co zrobić ze starą listą `newsletter` i z popupem ze zniżką na Pro.
