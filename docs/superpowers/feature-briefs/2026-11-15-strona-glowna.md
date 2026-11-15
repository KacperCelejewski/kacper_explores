# Brief: Strona główna i komunikacja

Data: 2026-11-15 (wersja 2, po recenzji) · Właściciel funkcji: agent „Strona główna i komunikacja" · Kod: `origin/main` (`ac37e25`), czytany przez `git show`; BRAND.md, PRODUCT.md, audyt UI/UX z 13.11, spec wyjazdów grupowych z 14.11, recenzja `2026-11-15-strona-glowna-review.md`.

Oznaczenia: **[D]** decyzja Kacpra (obowiązuje) · **[K-kontroler]** rozstrzygnięcie kontrolera po recenzji, Kacper może je zmienić · **[P]** moja propozycja · **[?n]** pytanie do Kacpra (sekcja 9).

## 0. Co już jest na main

Audyt z 13.11 jest częściowo wykonany. Na main: pasek okazji z SSR (`initialDeals`), sekcja `#zrzut` zaraz pod paskiem, „Okazje" w `SiteNav` zamiast „Odkryj", „Okazje na weekend" i „Czwartkowy zrzut" w `GlobalMenu`, przycisk menu z etykietą „Menu" (`GlobalMenu` to globalny FAB w layoucie), nowy OG (`opengraph-image.tsx`, piasek i marka).

Zostaje: wąskie kolumny (hero 640 px, kroki i przykładowy plan 560, FAQ 600, zapis 480) i pustka po bokach przy 1440 px; hasło i `<title>` o „budżetowym weekendzie solo"; 14 linków do `/quiz`; karuzela 8 miast ze sztywnymi cenami; emoji w `EXAMPLE_PLAN`.

## 1. Problem i dla kogo

**Problem.** Wyjazd ekipą rozpada się na czacie: nikt nie wie, kiedy lecimy, kto kupił lot i kto komu oddaje. Strona opowiada o jednym solo weekendzie i tego nie mówi.

**Dla kogo.** [D] Nisza „organizacja i planowanie wyjazdu od A do Z". Dwie ścieżki: ekipa (pierwsza, w prostszy sposób) i solo/para. Główny odbiorca: organizator ekipy, 22–35 lat, ten, który „zawsze się tym zajmuje".

**Obietnica.** Dokąd, za ile i jaki plan: ustalacie to w jednym miejscu, a grupie wysyłacie link.

**Hasło (H1) [K-kontroler, wg recenzji 1].** „Wyjazd ze znajomymi: dokąd, za ile i jaki plan." (48 znaków). Bez „Bez czatu": spec (2.7, 5.6) mówi, że Włóczykij nie zastępuje czatu grupy, tylko daje tekst do wklejenia i własny czat wyjazdu. H1 opisuje rezultat, nie wroga. Tagline „Obudź w sobie Włóczykija." zostaje w stopce i metadanych.

## 2. Co robi i przepływ

1. Wejście (IG, Google, link wklejony na czat). Pierwszy ekran w 5 s: o ekipie, wyjazd w jednym miejscu, za darmo.
2. Jedno kliknięcie wybiera ścieżkę:
   - „Jedziemy ekipą" → `/quiz?companion=friends&src=home-ekipa`;
   - „Solo albo we dwoje" → `/quiz?src=home-solo`.
3. **Parametr `companion` jest w zakresie R1a [K-kontroler]**. Quiz trzyma krok i odpowiedzi w store (trwałym) i ma auto-advance na kroku 0, a wybór „Znajomi" otwiera `GroupSizePicker`. Parametr musi: ustawić companion, zresetować krok do 0, nie robić auto-advance, otworzyć `GroupSizePicker`; przy `src=home-solo` nie ustawiać nic.
4. Dalej strona pokazuje animację (3.4), okazje i zapis, kroki wyjazdu ekipy i przykładowy plan.
5. Kto jeszcze nic nie planuje, zostawia e-mail (Czwartkowy zrzut) albo czyta okazje. Konto nie jest wymagane.

Zakres: `/` (`page.tsx`, `HomeClient.tsx`, `HomeFAQ.tsx`), `SiteNav`, układ szerokiej strony (3.1), nowy komponent animacji, `features.ts`, metadane: `layout.tsx` (title, OG, Twitter), `manifest.webmanifest`, `webAppSchema` w `page.tsx`, FAQ, aktualizacja PRODUCT.md w tym samym PR [P]: „Users”, „Positioning” i liczba darmowych planów („5 free plans on sign-up” → 2 plany w miesiącu, `FREE_PLANS_PER_MONTH = 2`) [wg U21].

**Poza zakresem [K-kontroler].** Przeniesienie menu do nagłówka (zmiana globalna, FAB jest w layoucie; quiz i baner cookies go ukrywają); quiz poza parametrem; plan; zaproszenia; cennik; nowy obraz OG z kadrem animacji (Satori nie odtworzy komponentu).

## 3. Ekrany

### 3.1 Układ ogólny

Kontener 1120 px, marginesy 48 px od 1280. Sekcje dwukolumnowe tam, gdzie dziś jest kolumna 560 px. Telefon: jedna kolumna, 20 px marginesu.

**Wspólne progi dla całego produktu [K-kontroler, wg U4].** Ten brief jest właścicielem progów razem z briefem „plan”: poniżej 768 px jedna kolumna (margines 16–20 px); 768–1023 jedna kolumna do 720 px; od 1024 dwie kolumny; od 1280 kontener 1120 px. Mechanizm jest wspólny: znacznik w HTML z serwera (`data-page="home"`, w planie `data-page="plan"` + `data-layout="wide"`) i selektor `:has()` (opis niżej). Pozycja FAB „Menu” zależy od tego samego znacznika. Układ planu dla wszystkich planów (solo i para też) to osobny wczesny PR po R1b, w gestii briefu „plan”; ten brief musi przejąć te progi i ten mechanizm zamiast `localStorage` i `body.is-home`.

**Układ bez hydracji (recenzja 5, zweryfikowane w kodzie).** Szeroki układ dziś zależy od klasy `is-home` dodawanej w `useEffect` (`HomeClient.tsx:252`). Reguły `body.is-home main.app-shell` (`globals.css:231-271`) zdejmują limit 448 px, robią nawigację `fixed`, ustawiają `max-width: 600px` na `section`/`footer` i przesuwają FAB. Do hydracji i bez JS strona ma więc wąski układ, po hydracji skacze (CLS). `layout.tsx:56` renderuje `main#main-content.app-shell` dla wszystkich tras, bez wiedzy o trasie.
Rozwiązanie [P], bez JS: usunąć `useEffect` i zastąpić selektor `body.is-home` selektorem opartym na markerze w HTML z serwera: komponent `/` renderuje `<div data-page="home">` jako pierwsze dziecko `main`, a CSS używa `main.app-shell:has(> [data-page="home"])`. `:has()` działa w Chrome 105+, Safari 15.4+, Firefox 121+ (wymagana wersja przeglądarek do potwierdzenia przez Kacpra; starsze dostają wąski układ, bez błędów). Selektory FAB i `section[id]` zmienić na `body:has([data-page="home"])`. Alternatywa [P2], jeśli `:has()` się nie sprawdzi: grupy tras `(site)` i `(home)` z osobnymi layoutami (root layout bez `main`); to przenosi ok. 25 tras i jest kosztowniejsze, więc tylko w razie potrzeby. Na koniec reguła 3 z `globals.css` (`max-width: 600px` dla sekcji) zostaje zastąpiona szerokościami z tego briefu.

Kolejność sekcji (oba urządzenia):

1. Nawigacja
2. Hero: H1, wybór ścieżki, animacja D
3. Pasek okazji + zapis na Czwartkowy zrzut (jak na main, bez przestawiania) [K-kontroler, wg recenzji 4]
4. „Jak to działa dla ekipy": kroki z `features.ts`, w kolejności komponentu „stan wyjazdu” z produktu
5. Przykładowy plan (Barcelona) w układzie planu z produktu (3.5)
6. FAQ
7. Finał z CTA

Karuzela miast wypada [P]: duplikuje quiz, ma sztywne ceny. Razem z nią znika `fetchCityPhotoUrl` x8 w `page.tsx`, prop `galleryPhotos`, `next/image`, `scrollRef`/`handleScroll`. **Plakat z hero znika [K-kontroler]**, nie jedzie do finału (finał ma własny `DuskPoster`). Liczba CTA do `/quiz`: 7 (nawigacja 1, hero 2, kroki 1, przykładowy plan 1, finał 2).

### 3.2 Komputer, 1280 px i więcej

```
+-------------------------------------------------------------------------------+
| [logo]            Planuj wyjazd   Okazje   Cennik   Blog           [Zaloguj się]|
+-------------------------------------------------------------------------------+
| Dla ekipy i dla tych, co jadą sami                                            |
| Wyjazd ze znajomymi:        +--------------------+--------------------------+ |
| dokąd, za ile              | Czat grupowy, dziś  | Włóczykij zbiera to tak   | |
| i jaki plan.               |  Ania: gdzie w ogóle|  Barcelona (tło: mapa)    | |
|                            |  Marek: ile to wyjdzie|  inicjały A M T K        | |
| Powiedz, kto jedzie.       |  Tomek: kto ogarnie..|  ok. 450 zł na osobę      | |
| Dostaniesz kierunki w      |                     |  (szacunek)               | |
| Waszym budżecie i plan     +--------------------+--------------------------+ |
| godzina po godzinie.        Przykład, nie Wasz wyjazd            [Wstrzymaj]  |
| [Jedziemy ekipą ->]  Solo albo we dwoje ->                                    |
| 6 pytań · darmowe konto · bez karty                                           |
| Wiem już dokąd: 4 kroki · Co czwartek 3 okazje: zapisz się                    |
+-------------------------------------------------------------------------------+
| Pasek okazji (lewa 7/12)                     | Zapis na zrzut (prawa 5/12)    |
+-------------------------------------------------------------------------------+
```

- Hero: dwie kolumny, tekst 5/12, animacja 7/12, wysokość `min(100dvh, 860px)`. H1 `clamp(36px, 4.5vw, 56px)`.
- Hero ma dwa CTA, mikrotekst i **jeden dyskretny wiersz** („Wiem już dokąd: 4 kroki" → `/quick`, „Co czwartek 3 okazje: zapisz się" → `#zrzut`) [wg recenzji 7]. Obie wersje mockupów go mają.
- Karta animacji ma stały stosunek boków 16:10.
- „Jak to działa”: kroki w jednym rzędzie; przykładowy plan jak w 3.5; FAQ sticky nagłówek + pytania.
- 768–1023 px: hero w jednej kolumnie, animacja pod tekstem (max 720 px). Od 1024 px: dwie kolumny.

### 3.3 Telefon, 375 px

```
[logo]       Okazje  Cennik [Zaloguj]
Dla ekipy i dla tych,
co jadą sami
Wyjazd ze znajomymi:
dokąd, za ile i jaki plan.
Powiedz, kto jedzie. Dostaniesz
kierunki w Waszym budżecie i plan.
[ Jedziemy ekipą -> ]
Solo albo we dwoje ->
6 pytań · darmowe konto · bez karty
Wiem już dokąd · Co czwartek 3 okazje
------------------------ (fold 375 x 667)
[ czat (3 wiadomości) nad mapą ]
Przykład, nie Wasz wyjazd [Wstrzymaj]
Pasek okazji, zapis na zrzut
Kroki, przykładowy plan, FAQ, finał
```

Menu pływające zostaje jak dziś (poza zakresem). H1 na 375 px: 36 px, 4 linie.

### 3.4 Rola animacji D

Cel: w 16 s pokazać chaos czatu i to, że Włóczykij zbiera go w jednym miejscu. Wybrany kierunek [D]; wykonanie uczciwe wobec stanu kodu [K-kontroler].

Scenariusz pętli w R1 [K-kontroler, wg U3]. **Każde pytanie z czatu ma odpowiedź na karcie Włóczykija, widoczną w produkcji.** Pytania o termin, bilety i rozliczenie nie występują w R1 (gość przyszedłby po „kto komu oddaje” i by tego nie znalazł); dochodzą do osi razem ze swoją odpowiedzią, gdy włączy się klucz w `features.ts`.

| Czas | Czat po lewej | Karta Włóczykija po prawej (odpowiedź ≤ 1 s po pytaniu) |
|---|---|---|
| 0,0–1,0 s | pusty czat | tło: ilustracyjna mapa z kropkowaną trasą Wrocław → Barcelona, inicjały A, M, T, K |
| 1,0–4,0 s | Ania: „gdzie w ogóle lecimy?” | kierunek: „Barcelona” (jak karta kierunku z quizu) |
| 4,0–7,0 s | Marek: „ile to wyjdzie na głowę?” | „ok. 450 zł na osobę (szacunek)”, „ok. 1 800 zł razem” |
| 7,0–10,0 s | Tomek: „kto ogarnie, co tam robimy?” | „Plan na 3 dni, godzina po godzinie” |
| 10,0–13,5 s | czat przygasa | kadr końcowy: karta wygląda jak prawdziwa karta kosztu i nagłówek planu z produktu (ten sam komponent wizualny co w 3.5) |
| 13,5–16,0 s | bez zmian | trzymany kadr, wygaszenie, powrót |

Pary pytanie–odpowiedź dochodzące z `features.ts` (pętla zostaje 16 s, czasy się ściskają): `datePoll` → Ania: „to kiedy lecimy??” / chip terminu; `groupFlights` → „kto ma bilety?” / chip ceny lotu; `settlements` → „apartament 1140, kto płaci?” / „kto komu oddaje?” / linijka rozliczenia. Dopóki klucz jest wyłączony, pary nie ma ani w animacji, ani na stronie.

Zasady:
- **R1 pokazuje tylko to, co dziś działa [K-kontroler]**: kierunek, szacunek kosztu na osobę i razem (plan, `na osobę / razem` z dopiskiem „(szacunek)”) oraz plan godzina po godzinie. Chip terminu po części 3, chip ceny lotu po części 4 i po naprawie `bestOffer` (dziś nic go nie ustawia, `FlightCard` zwraca `null`, karta kierunku mówi „Sprawdź na żywo”). Rozliczenie po części 6.
- Każda liczba, chip i odpowiedź na karcie ma w PR wskazany ekran produkcji, na którym użytkownik ją zobaczy.
- **Mapa [K-kontroler, wg U13].** W produkcie nie ma mapy (plan ma tylko link do Google Maps). Mapa w animacji to ilustracyjne tło bez sugestii interakcji; kadr końcowy przechodzi w kartę produktu. Podpisy paneli: „Czat grupowy, dziś” i „Włóczykij zbiera to tak” (zamiast „To samo we Włóczykiju”). Jeśli Kacper zdecyduje, że mapa trasy wchodzi do planu [?8], animacja dostaje klucz `tripMap` w `features.ts`.
- Stały podpis „Przykład, nie Wasz wyjazd”. Włóczykij odpowiada na karcie, nie w czacie.
- Głos [K-kontroler, wg U5]: imię zawsze w mianowniku, bez form rodzajowych i bez odmiany imion; czasowniki bezosobowe, w 1. osobie liczby mnogiej albo w czasie teraźniejszym. Dotyczy też tekstów animacji (wiadomości z „ja kupiłem” odpadają).
- Brak dat kalendarzowych w R1 (pętla nie starzeje się); po części 3 tylko „pt–nd" albo najbliższy weekend liczony przy buildzie [wg recenzji 21].
- Bez pinezki i samolotu. Papier piaskowy, ceglasty akcent, zieleń; ziarno jako mała kafelkowana tekstura (data URI), nie `feTurbulence` na warstwie animowanej.
- **Wykonanie: czysty CSS** [P]. Oś czasu w `@keyframes` na elementach SVG/HTML, ruch włączony w `@media (prefers-reduced-motion: no-preference)`; domyślnie (bez ruchu, w tym reduced-motion) renderowany jest kadr końcowy z 13,5 s. Animacja startuje od pustego czatu w pierwszej klatce (bez mignięcia treści), działa bez JS. Wstrzymaj/Odtwórz: przycisk (JS przełącza `animation-play-state`); IntersectionObserver pauzuje poza widokiem; licznik pętli: dwie pętle z wygaszeniem, trzecia kończy się na klatce 13,5 s (dwa zestawy keyframes), nie na wygaszonej.
- „Wstrzymaj/Odtwórz”: cel dotyku ≥ 44 x 44 px na telefonie, widoczny fokus (wg U21).
- Dostępność: przycisk i podpis „Przykład…" stoją **poza** blokiem `aria-hidden`; sam rysunek `aria-hidden`, a zdanie alternatywne jest widoczne albo `sr-only`: „Przykład: czworo znajomych pyta na czacie, dokąd lecą, ile to kosztuje i co będą robić; Włóczykij odpowiada kierunkiem, szacunkiem kosztu na osobę i planem na 3 dni.”
- Kontrast: tekst chipów i etykiet w `--accent` (#A04B20, ok. 6:1), nie `--accent-poster` (#C4622D, ok. 3,6:1). Minimalny rozmiar tekstu na karcie 14 px.
- Budżet: ≤ 10 KB gzip nowego JS klienta, zero nowych zależności, zero obrazów rastrowych.

### 3.5 Przykładowy plan: funkcje, które już działają [K-kontroler, wg U12]

Sekcja pokazuje prawdziwy wygląd planu (ten sam komponent wizualny co w produkcie i w kadrze końcowym animacji): na komputerze dni po lewej, koszt i „Zapytaj Włóczykija” po prawej; na telefonie karta z trzema podpisami pod spodem. Trzy opisane miejsca na komponencie, **tylko funkcje, które dziś działają**: „Zamień” przy punkcie („Nie pasuje? Jedno kliknięcie i jest inny punkt”), „Zmień dzień”, „Wyślij ekipie link” (podgląd `/share`). Zmiana punktu w przykładzie to lokalna podmiana z gotowego zestawu, bez AI i bez zapytań do serwera; bez JS przykład jest statyczny z podpisami. Nie wolno tu pokazać: kalendarza `.ics` z datami lotu, mapy trasy, cen lotu, edycji przez całą ekipę ani rozliczeń (włączają je klucze z `features.ts`). Zależność: do czasu wczesnego PR układu planu (po R1b) sekcja używa własnej wersji komponentu o tych samych proporcjach; po nim współdzieli komponent.

## 4. Teksty [P, o ile nie oznaczono inaczej]

**Nawigacja:** komputer: Planuj wyjazd · Okazje · Cennik · Blog · Zaloguj się. Telefon: Okazje · Cennik · Zaloguj się (+ pływające Menu jak dziś).

**Hero**
- Plakietka (zastępuje „Loty z 7 polskich lotnisk”) [wg recenzji 20 i U21]: w R1 „Dla ekipy i dla tych, co jadą sami” (wersja „Dla ekipy, która nie ma czasu na ustalenia” sugeruje pomoc w ustalaniu terminu i wchodzi po `datePoll`). Fakt o 7 lotniskach zostaje w FAQ i przy okazjach.
- H1 [K-kontroler]: „Wyjazd ze znajomymi: dokąd, za ile i jaki plan."
- Podnagłówek R1: „Powiedz, kto jedzie. Dostaniesz kierunki w Waszym budżecie i plan godzina po godzinie." Po części 2: „Ustalacie to w jednym miejscu, a na grupie wklejacie tylko link."
- CTA: „Jedziemy ekipą" (główne), „Solo albo we dwoje" (drugie). Hero w liczbie mnogiej, jednostkowa tylko w drugiej ścieżce i zrzucie.
- Mikrotekst (14–15 px, nie 13): „6 pytań · darmowe konto · bez karty". Po części 2: „Znajomi dołączają z linku, bez konta".
- Dyskretny wiersz: „Wiem już dokąd: 4 kroki" · „Co czwartek 3 okazje z Twojego lotniska: zapisz się".

**Animacja:** „Czat grupowy, dziś” · „Włóczykij zbiera to tak” · „Przykład, nie Wasz wyjazd" · „Wstrzymaj" / „Odtwórz".

**Sekcja okazji i zrzutu:** nagłówek dynamiczny paska zostaje („Najbliższy weekend z {from}"); eyebrow „Nie wiesz jeszcze dokąd? Trzy okazje na najbliższy weekend." [wg recenzji 8].

**„Jak to działa dla ekipy”** [K-kontroler: bez etykiet „wkrótce”; wg U7 kroki są w tej samej kolejności i pod tymi samymi nazwami co komponent „stan wyjazdu” pod nagłówkiem planu w produkcie: Kiedy · Lot · Plan · Wydatki, poprzedzone „Dokąd”]. Karta pokazuje się tylko przy włączonym kluczu. R1, dwie karty: „Dokąd” („Sześć pytań, kierunki w Waszym budżecie i szacunek kosztu na osobę i razem.”) · „Plan” („Godzina po godzinie, z cenami i trikami budżetowymi. Link do podglądu wyślecie ekipie.”). Dochodzą: „Kiedy” (`datePoll`, „Ekipa głosuje na termin.”), „Lot” (`groupFlights`), „Wydatki” (`settlements`, „Kto komu ile, bez kalkulatora.”). Nagłówek sekcji w R1: „Jak to działa”; „Od pomysłu do rozliczenia” dopiero przy `settlements`. Hasło „od A do Z” w R1 nie jest obietnicą na stronie. Zmiana kolejności lub nazwy kroku w komponencie produktu = zmiana tutaj (jedno źródło etykiet w `features.ts`).

**Przykładowy plan (3.5), podpisy:** „Nie pasuje? Jedno kliknięcie i jest inny punkt” · „Zmień dzień” · „Wyślij ekipie link” (przy włączonym `invites`: „Zaproś ekipę: każdy wybiera swoje imię”) (bez „wrzucisz do kalendarza": `.ics` czyta `bestOffer.departureDate`, którego nikt nie ustawia).

**Finał:** „W piątek rano możesz już być w drodze." + dwa CTA jak w hero.

**Brak okazji [P, zmiana zachowania]:** sekcja z paskiem pokazuje się także bez danych i mówi: „W tym tygodniu z {from} nic sensownego. Zapisz się, a damy znać, gdy coś wpadnie." Zapis zostaje obok. Spec zrzutu: gdy nic nie pasuje, nie wysyłamy, więc nie obiecujemy „i tak przyjdzie".

**FAQ:** dodać dwa pytania uczciwe na dziś: „Jedziemy ekipą, co dostajemy?" (kierunki, szacunek kosztu na osobę i razem, plan, udostępnienie linkiem do podglądu) oraz „Kto płaci?" (opis obecnego modelu, bez Przepustki do wdrożenia). Pozostałe z `features.ts`. FAQPage bierze treść z tej samej tablicy.

**Metadane (R1a):** title „Wyjazd ze znajomymi: dokąd, za ile i jaki plan | Włóczykij"; description: 6 pytań, kierunki w budżecie, plan godzina po godzinie, loty z 7 lotnisk w okazjach. Ten sam sens w `layout.tsx` (title, OG, Twitter), `manifest.webmanifest`, `webAppSchema`, FAQPage. Sprawdzić, że tekst w `opengraph-image.tsx` nie zawiera już nieprawdziwych haseł.

**Reguła `features.ts` [K-kontroler, wg U16].** Każdy tekst w produkcie, który wspomina inną część (podnagłówek hero, mikrotekst, karty kroków, animacja, FAQ, metadane, a także zdania w briefach zaproszeń, lotów, terminu, planu i rozliczeń), pokazuje się tylko przy włączonym kluczu tej części; warianty zastępcze:

| Tekst | Klucz | Wariant zastępczy |
|---|---|---|
| „Ustalacie to w jednym miejscu, a na grupie wklejacie tylko link.” | `invites` | „Powiedz, kto jedzie. Dostaniesz kierunki w Waszym budżecie i plan godzina po godzinie.” |
| „Znajomi dołączają z linku, bez konta” | `invites` | brak |
| karta „Kiedy”, para „to kiedy lecimy??” | `datePoll` | brak |
| karta „Lot”, para „kto ma bilety?”, chip ceny | `groupFlights` | brak |
| karta „Wydatki”, para o rozliczeniu, „Dodane do rozliczeń” | `settlements` | „Zapisane: 636 zł, płaci Michał.” (loty); brak (zaproszenia) |
| nagłówek „Od pomysłu do rozliczenia” | `settlements` | „Jak to działa” |
| plakietka „Dla ekipy, która nie ma czasu na ustalenia” | `datePoll` | „Dla ekipy i dla tych, co jadą sami” |
| podpis w 3.5 „Wyślij ekipie link” | `invites` | przy włączonym: „Zaproś ekipę: każdy wybiera swoje imię” (zaproszenia zmieniają „Udostępnij” w „Podgląd publiczny”) |
| mapa trasy w produkcie | `tripMap` | mapa tylko jako tło animacji |

`features.ts` eksportuje stałe `FEATURES` i funkcję `isOn(key)`; plik należy do tego briefu. Test jednostkowy sprawdza, że żaden tekst z tabeli nie renderuje się przy wyłączonym kluczu.

## 5. Widoczność i marketing funkcji

| Funkcja | Gdzie | Jak dojść | Stan |
|---|---|---|---|
| Quiz z grupą, szacunek na os./razem | Hero (CTA ekipa), kroki 1–2, animacja, finał | 1 klik, `companion=friends` | działa (część 1) |
| Quiz solo/para | Hero (CTA drugie), finał | 1 klik | działa |
| „Wiem dokąd" (`/quick`) | Dyskretny wiersz w hero | 1 klik | działa |
| Okazje weekendowe | Sekcja pod hero (SSR), nawigacja, menu | 1 klik | działa |
| Czwartkowy zrzut | Sekcja pod hero, wiersz w hero, menu | zapis w 1 polu | działa |
| Funkcje planu | Sekcja 3.5 | w planie | działa (bez kalendarza do naprawy `bestOffer`) |
| Zaproszenia, termin, loty grupy, wspólny plan, rozliczenia | Kroki i animacja dopiero po wdrożeniu danej części | z planu | tylko spec |
| Cennik, Blog | Nawigacja, FAQ | 1 klik | bez zmian |

Marketing bez zmyślonych dowodów: dozwolone liczby określające skalę, ceny lub oszczędność to „6 pytań", „7 lotnisk", „2 plany gratis co miesiąc", ceny z `prices.ts`, dane paska okazji z datą sprawdzenia i kwoty w animacji oznaczonej „Przykład". Zakazane: liczba użytkowników i wyjazdów, opinie, logotypy. Animacja dowodzi mechanizmu, nie popularności. Prawdziwy dowód to kawałek planu (Barcelona) i cena z paska okazji; przykład zrzutu z datą tylko za zgodą [?3]. Przepustka (4,99 zł) wchodzi na stronę po wdrożeniu etapu 2.

## 6. Przypadki brzegowe i stany

- **Brak JS:** układ szeroki działa bez hydracji (3.1), animacja CSS biegnie, H1/CTA/okazje/zapis są w HTML. Wstrzymanie wymaga JS (bez niego animacja kończy się po trzech pętlach, więc WCAG 2.2.2 spełniona).
- **prefers-reduced-motion:** statyczny kadr końcowy; pozostałe `whileInView` bez przesunięć (`MotionConfig reducedMotion="user"` nie wyłącza `opacity`, więc dla własnych animacji obsługa `matchMedia`).
- **Wolne łącze:** LCP to tekst H1; animacja to CSS, rezerwuje miejsce 16:10, brak skoków układu.
- **Brak okazji:** zdanie z sekcji 4; zapis zostaje.
- **Zablokowany `localStorage`:** domyślnie WRO, bez błędu.
- **Czytnik ekranu:** sekcja 3.4.
- **Szerokości:** 320 px bez poziomego scrolla; 768–1024 animacja pod tekstem; 1280–1920 kontener 1120 px.
- **Baner cookies** nie zasłania CTA przy pierwszym wejściu (audyt P2-7).
- **Motyw:** strona nie ma ciemnego motywu (`layout.tsx`); kontrast ≥ 4,5:1 na jasnych sekcjach i na ciemnej (`DARK` #0D0A07).
- **Starsze przeglądarki bez `:has()`:** wąski układ, brak błędów.
- **`/dolacz/{token}`** nie przekierowuje na `/` (kryterium 11).

## 7. Zależności i plan wdrożenia

| Od czego | Co | Skutek bez tego |
|---|---|---|
| Część 1 (main) | grupa w quizie, szacunek na os./razem | podstawa R1 |
| Quiz | `companion`, `src` (w zakresie R1a) | patrz 2.3 |
| Część 2 | zaproszenia, `/dolacz` | tekst „bez konta" dopiero po niej |
| Część 3 | wspólny termin | chip terminu i krok „Kiedy" |
| Część 4 + naprawa `bestOffer` | wspólne loty | chip lotu, krok „Loty", `.ics` z datami |
| Części 5–6 | wspólny plan, rozliczenia | kroki 5–6 i końcówka animacji |
| Przepustka (etap 2) | model płatności | FAQ i cennik w obecnym modelu |
| Pomiar bazowy | zapisy zrzutu przed zmianą | brak punktu odniesienia dla testu |
| `DropSignup`, `DealsStrip` | istnieją | tylko układ, plus tekst „brak okazji" |

**Pomiar bazowy [K-kontroler, wg recenzji 4].** Zrzut zostaje bezpośrednio pod hero do końca 6-tygodniowego testu. Przed R1a zapisać, po stronie serwera (tabela zapisów, UTM, nie GA): liczbę zapisów na dobę z ostatnich 14 dni i liczbę wizyt `/` z logów lub Vercel Analytics; po zmianie porównywać zapisy na 100 wizyt. GA zbiera po zgodzie, więc same zdarzenia GA zaniżają wynik.

**Podział [K-kontroler].** **R1a:** teksty hero, dwa CTA, `companion`/`src` w quizie, metadane, FAQ, PRODUCT.md. **R1b:** układ szeroki bez hydracji (wspólny mechanizm i progi z 3.1), usunięcie karuzeli i plakatu, kontener 1120 px; zaraz po nim osobny PR układu planu dla wszystkich planów (brief „plan”), potem sekcja 3.5. **R1c:** animacja CSS. Stan funkcji w jednym pliku `src/lib/features.ts` (`invites`, `datePoll`, `groupFlights`, `groupPlan`, `settlements`, `tripMap`) steruje kartami kroków, osią animacji, podnagłówkiem, metadanymi i FAQ; włączenie = jedna linia w PR danej części. R2–R5: każda część włącza swój klucz.

## 8. Kryteria akceptacji

1. Przy 375 x 667 widać H1, oba CTA i mikrotekst; przy 1280 x 650 widać H1, oba CTA i mikrotekst (animacja może być przycięta od dołu). Zmierzyć w R1b i zapisać wartości w PR.
2. Kontener treści ma 1120 px przy 1440 px; brak `overflow-x` od 320 do 1920 px; progi 768/1024/1280 zgodne z 3.1.
3. Dla ekranu bez JS (zrzut z wyłączonym JS) układ, nawigacja i szerokości są takie same jak po hydracji; CLS strony głównej < 0,05 na desktopie i telefonie.
4. Oś czasu animacji ma jedną stałą w kodzie (czas pętli 16 s) z testem jednostkowym wartości i kolejności zdarzeń; dwie pętle z wygaszeniem, trzecia kończy się na klatce 13,5 s.
5. Z `prefers-reduced-motion: reduce` widać nieruchomy kadr końcowy z trzema wiadomościami i kartą Włóczykija.
6. „Wstrzymaj/Odtwórz” działa z klawiatury, ma cel ≥ 44 x 44 px i widoczny fokus, leży poza `aria-hidden`; animacja pauzuje poza widokiem; czytnik czyta jedno zdanie alternatywne.
7. „Przykład, nie Wasz wyjazd” widoczne przy każdej klatce. **Każda wiadomość w czacie ma na karcie odpowiedź widoczną w produkcji** (lista par pytanie–odpowiedź z kluczem `features.ts` i ekranem produkcji w opisie PR). Każda liczba i chip na karcie ma wskazany ekran produkcji; w R1 nie ma pytań ani chipów o termin, bilety i rozliczenie.
8. Liczby określające skalę, użytkowników, ceny lub oszczędność należą do listy dozwolonej (sekcja 5).
9. Liczba CTA do `/quiz` ≤ 7; oba CTA hero prowadzą z różnymi parametrami (`companion=friends` vs brak), a quiz z `companion=friends` startuje od kroku 0 z zaznaczonymi „Znajomi", `GroupSizePicker` otwarty, bez auto-advance.
10. Pasek okazji i zapis renderują się po stronie serwera; lotnisko z `localStorage` i `cheapestHint` działają jak dziś; stan „brak okazji" pokazuje zdanie z sekcji 4 i zapis.
11. `/dolacz/{token}` nie przekierowuje na `/`.
12. `<title>`, description, OG/Twitter, manifest, `webAppSchema`, FAQPage i H1 nie mówią o „budżetowym weekendzie solo" i nie obiecują funkcji z części 2–6, której nie ma na main (`features.ts` jako źródło).
13. Nowy JS klienta ≤ 10 KB gzip, zero nowych zależności; Lighthouse mobilny (urządzenie domyślne, mediana z 5 przebiegów): LCP < 2,5 s, TBT < 200 ms.
14. Brak emoji (w tym w `EXAMPLE_PLAN`, zastąpione ikonami z `Icons.tsx`), wykrzykników, słów „platforma", „innowacyjny", zmyślonych opinii i liczników, pinezki i samolotu jako motywu.
15. Kontrast tekstu ≥ 4,5:1 (`--accent`, nie `--accent-poster`), tekst na karcie ≥ 14 px.
16. Głos: skan wszystkich tekstów strony i animacji pod kątem form „-łem/-łeś/-ła/-ł” i odmienionych imion z danych testowych daje zero trafień.
17. Sekcja przykładowego planu pokazuje wyłącznie funkcje, które działają na main (lista w 3.5); żaden podpis nie dotyczy `.ics`, mapy, lotu, edycji ekipą ani rozliczeń.
18. Kolejność i nazwy kart „Jak to działa dla ekipy” są takie same jak kroki komponentu „stan wyjazdu” w produkcie (etykiety z `features.ts`).
19. Zdarzenia: kliknięcie CTA z `src`, pauza animacji i zapis na zrzut z polem `source` idą do GA oraz server-side (zapisy z tabeli, UTM).

## 9. Otwarte pytania do Kacpra

1. **Wersje przeglądarek** dla `:has()` (3.1): czy akceptujesz wąski układ w starszych? Inaczej grupy tras (droższe).
2. **Zrzut po teście.** Po 6 tygodniach: zostaje pod hero, czy przechodzi pod kroki ekipy?
3. **Dowód z produktu.** Czy wolno pokazać zanonimizowany przykład zrzutu z datą oraz prawdziwy wyjazd (za zgodą) w sekcji planu?
4. **Przykład w animacji.** 4 osoby, Barcelona, „ok. 450 zł na osobę": zostaje, czy zmienić miasto i liczbę osób?
5. **Hasło „od A do Z".** W R1 nie występuje na stronie jako obietnica (kroki rosną z `features.ts`). Czy tak ma być do wdrożenia części 3?
6. **Karuzela i plakat** usuwamy ostatecznie (rozstrzygnięte przez kontrolera): potwierdzenie.
7. **Nowe pytania w FAQ** (sekcja 4): akceptacja treści.
8. **Mapa trasy w planie.** Animacja pokazuje mapę jako tło ilustracyjne, bo w produkcie jej nie ma. Czy mapa trasy ma kiedyś wejść do planu (klucz `tripMap`), czy zostaje ilustracją?

## Odpowiedzi na recenzję

Przyjęte w całości: 1, 2, 3, 4, 6 (kryteria na 375 x 667 i 1280 x 650, H1 36–56 px, szacunek w 1. sekundzie), 7, 8, 9, 10 (bez nowego OG), 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25.

Zmiana mechanizmu lub zakresu:
- **5.** Recenzja proponuje „osobna grupa tras / layout albo klasa na body po stronie serwera". Zweryfikowane w kodzie: `is-home` w `useEffect` (`HomeClient.tsx:252`), reguły `globals.css:231-271`, `main.app-shell` w `layout.tsx:56` wspólny dla wszystkich tras. Wybieram CSS `:has()` z markerem w HTML SSR jako rozwiązanie podstawowe (jedna zmiana, bez przenoszenia ok. 25 tras), grupy tras jako wariant zapasowy. Powód: najtańsze, bez hydracji i bez zmiany struktury URL.
- **11.** Zdanie recenzenta przyjęte z jednym doprecyzowaniem: pokazanie sekcji bez danych to zmiana zachowania, dlatego oznaczona [P] i w kryterium 10.
- **13.** Recenzja sugeruje domyślny kadr końcowy w SSR. Zostawiam animację od pustego czatu w pierwszej klatce (CSS), a kadr końcowy tylko dla reduced-motion. Powód: z czystym CSS nie ma mignięcia ani zależności od JS; kadr końcowy jako domyślny wymagałby JS do startu animacji.
- **17.** Kryterium 9: limit 7 zamiast 6 (policzone CTA, w tym przykładowy plan), nie usuwam CTA z planu.
- **24.** Pytanie Q1 i Q5 usunięte (aktualizacja PRODUCT.md w PR, podpis i odpowiedź na mapie rozstrzygnięte). Dodatkowo zakres: PRODUCT.md w R1a.

## Odpowiedzi na recenzję UX

Przyjęte: **U3** (scenariusz z odpowiedziami, rozszerzone kryterium 7), **U4** (wspólny mechanizm `:has()` i progi, 3.1), **U5** (reguła głosu w animacji, kryterium 16), **U7** (kolejność i nazwy kart jak w „stan wyjazdu”), **U12** (3.5), **U13** (mapa jako tło, podpis „Włóczykij zbiera to tak”, karta jak w produkcie), **U16** (tabela i test), **U21** (a, b, c).

Zastrzeżenia:
- **U4.** Brief „plan” musi przejąć progi i mechanizm; z tego briefu nie da się tego wymusić. Do czasu wczesnego PR układu planu sekcja 3.5 ma własną wersję komponentu.
- **U7.** Karta „Koszt” z poprzedniej wersji wchodzi do „Dokąd”, bo komponent „stan wyjazdu” nie ma kroku „Koszt”. R1 ma więc dwie karty zamiast trzech; jeśli to za mało, można dodać kartę „Link dla ekipy” (działa dziś), ale poza paskiem produktu.
- **U12.** Lokalna podmiana punktu to JS na stronie głównej; mieści się w budżecie 10 KB gzip, a bez JS przykład jest statyczny z podpisami.
- **U21(b).** Plakietka „Dla ekipy, która nie ma czasu na ustalenia” nie jest skreślona, tylko wraca po `datePoll`.
