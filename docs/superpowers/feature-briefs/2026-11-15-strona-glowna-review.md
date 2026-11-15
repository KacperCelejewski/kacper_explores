# Recenzja briefu: Strona główna i komunikacja

Data: 2026-11-15 · Oceniany: `2026-11-15-strona-glowna.md` · Kod: `origin/main` (`ac37e25`), czytany przez `git show`. Numery linii briefu w nawiasach. Pliki kodu: `HomeClient.tsx` (HC), `DealsStrip.tsx`, `page.tsx`, `globals.css`.

Decyzji Kacpra nie podważam (pozycjonowanie „od A do Z", dwie ścieżki, kierunek D, znajomi bez konta, jedna Przepustka). Wskazuję tylko skutki.

## Krytyczne

**1. Hasło „Bez czatu" jest sprzeczne ze specem i z produktem** (l. 15, 21, 57-70, 141)
H1 „Bez czatu, który się nie kończy" i obietnica „w jednym miejscu, nie na czacie" są niezgodne ze specem wyjazdów (2.7): „Włóczykij nie zastępuje czatu grupy, tylko daje gotowy tekst" do wklejenia na grupę. Spec ma też wspólny czat wyjazdu (5.6). Ekipa i tak dostaje zaproszenie przez WhatsAppa. Dodatkowo mockupy R1 (l. 63-70, 85-93) obiecują „kto płaci", a rozliczenia to część 6.
Poprawka: H1 o rezultacie, nie o wrogu. Np. „Wyjazd ze znajomymi: dokąd, za ile i jaki plan." Podnagłówek: „Ustalacie to w jednym miejscu, a na grupie wklejacie tylko link." Skreślić „kto płaci" z mockupów do czasu części 6. Zmiana wymaga akceptacji Kacpra.

**2. Karta końcowa animacji i podnagłówek „na dziś" obiecują to, czego main nie robi** (l. 113-131, 141, 168, 208)
Brief w l. 129 uznaje za dozwolone „termin z quizu, cenę lotu na osobę, koszt na osobę i razem". Kod temu przeczy:
- Karta kierunku w `destinations/page.tsx` pokazuje „Cena lotu: **Sprawdź na żywo**", bez kwoty.
- `bestOffer` nigdzie nie jest ustawiane (`git grep "bestOffer ="` puste), `FlightCard` zwraca `null`. Brief sam to przyznaje w l. 208, więc §3.4 i §7 się wykluczają.
- „na osobę / razem" w planie (`plan/[tripId]/page.tsx` ok. l. 450-455) to skalowany szacunek Gemini z dopiskiem „(szacunek)", jedna kwota, bez rozbicia lot + apartament.
- Quiz zbiera miesiąc i długość, nie daty „pt 19 - nd 21 marca" (potwierdza brief „termin").
Animacja pokazuje więc „Lot 159 zł + apartament 285 zł = 444 zł" i termin, których użytkownik nie dostanie. Podnagłówek „loty z ceną na osobę" też jest nieprawdziwy dla ścieżki quizu (ceny są tylko na `/okazje`).
Poprawka: w R1 karta końcowa ma pokazywać wyłącznie to, co jest: szacowany koszt wyjazdu na osobę i razem, oznaczony „szacunek", bez rozbicia na lot i apartament i bez chipów terminu i lotu. Chipy lotu i terminu wchodzą z częściami 3-4 (i po naprawie `bestOffer`). Podnagłówek „na dziś": „Powiedz, kto jedzie. Dostaniesz kierunki w Waszym budżecie i plan godzina po godzinie." Dodać do checklisty PR: każda liczba i chip w animacji ma wskazany ekran w produkcji.

**3. R1 sprzedaje „od A do Z", gdy działają 2 z 5 kroków** (l. 17, 21, 149-154, 214, 242)
Pozycjonowanie jest decyzją Kacpra, ale H1, nagłówek „Od pomysłu do rozliczenia" i tytuł sekcji obiecują cały proces, a kroki 2-5 to „wkrótce". Zasada z l. 164 („tylko to, co działa", „nigdy opis w czasie teraźniejszym") łamie się w samym H1. Etykiety „wkrótce" to zapowiedź funkcji, której nie ma, co BRAND/PRODUCT każą omijać.
Skutek do decyzji: albo R1 czeka na części 2-3 (zaproszenie + termin), albo H1 R1 opisuje stan faktyczny (patrz 1), a „od A do Z" wchodzi, gdy kroki 1-4 działają. Z kroków „wkrótce" zostawić najwyżej jedną linijkę pod sekcją, nie pięć kart.

**4. Przeniesienie zrzutu pod „Od A do Z" cofa P0-1 audytu i psuje test** (l. 48, 156, 172, 236)
Audyt P0-1: zapis był na 73% wysokości strony i dlatego został przeniesiony pod pasek (HC l. 407 `#zrzut`). Brief proponuje powrót, na dodatek w środku 6-tygodniowego testu, którego miarą są zapisy i kliknięcia partnerskie (przez `/okazje`). Do tego zmienia się wszystko naraz (H1, kolejność, układ), więc wynik testu nie da się przypisać żadnej zmianie, a punkt odniesienia (zapisy na 100 wizyt przed zmianą) nie jest w briefie zapisany.
Poprawka: w R1 pasek okazji i zapis zostają bezpośrednio pod hero (jak na main); ekipa jest pierwsza w hero i w A do Z, nie przez wypchnięcie testu. Przed wdrożeniem zapisać konwersję bazową (server-side: tabela zapisów, UTM, nie GA). Przesunięcie zrzutu rozważyć dopiero po teście. To jest [?2] i wymaga decyzji Kacpra.

**5. Szeroki układ i „bez JS" zależą od `useEffect`** (l. 41, 77, 188, 229)
Klasa `is-home` jest dodawana w `useEffect` (HC l. 252). Dopóki jej nie ma, `main.app-shell` ma 448 px, a nawigacja nie jest `fixed` (`globals.css`, `body.is-home main.app-shell`). Efekt: HTML z serwera i wersja bez JS to wąska kolumna, po hydracji układ przeskakuje na pełną szerokość (duży CLS na desktopie). Zdanie z l. 188 „nic krytycznego nie czeka na hydrację" jest nieprawdziwe, a kryteria 5 i 12 (CLS < 0,05) nie przejdą dla układu dwukolumnowego.
Poprawka: dodać do zakresu przeniesienie szerokości na stronę główną bez JS (osobna grupa tras / layout dla `/`, albo klasa na `<body>` ustawiana po stronie serwera). Dodać kryterium: HTML bez JS ma ten sam układ co po hydracji (test zrzutem ekranu z wyłączonym JS).

## Ważne

**6. Pierwszy ekran: kryteria nierealne, H1 za długi, pointa animacji poza zasięgiem** (l. 77-79, 105, 218)
- 375 x 812 to pełny ekran; w Safari/Chrome widać ok. 660-700 px. H1 (63 znaki) przy dzisiejszym `clamp(44px, min(12vw, 9vh), 86px)` (HC l. 319) to 5-6 linii na 335 px. Do tego plakietka, padding 104 px pod nawigację, podnagłówek, dwa CTA i mikrotekst. Na iPhone SE nie zmieści się nic.
- Na 1280 x 720 kolumna tekstu to 5/12 z 1120 = ok. 466 px; H1 w 4-5 liniach przy 64 px plus reszta daje ok. 730 px, więc „bez przewijania" się nie uda.
- Pointa animacji (karta Włóczykija) pojawia się w 10. s, a „górna połowa animacji" widoczna w pierwszym ekranie (kryterium 1) pokazuje tylko narzekanie na czacie.
Poprawka: kryteria na 375 x 667 i 1280 x 650; ustalić nowy `clamp` H1 (ok. 36-56 px) i skrócić H1 do ok. 45 znaków; kartę wynikową umieścić w górnej części karty animacji albo pokazywać w pętli skumulowane chipy od 1. s, tak aby w pierwszych 5 s było widać już „koszt na osobę". Długość pętli 16 s zostaje.

**7. Hero: niespójne zestawienie akcji** (l. 141-145, 170 vs mockupy 63-70, 85-93)
Tabela §5 mówi, że „Wiem dokąd" jest w hero na mniejszej wadze, a mockupy i teksty hero go nie mają (dziś jest, HC l. 380). Linia „Albo co czwartek 3 okazje" jest w tekstach, nie ma jej w mockupach. Hero ma wtedy 4-5 akcji, co rozmywa „ekipę pierwszą i prosto".
Poprawka: hero = dwa CTA + mikrotekst; „Wiem dokąd" i linia o zrzucie jako jeden dyskretny wiersz pod mikrotekstem (z linkiem `#zrzut`), narysować go w obu mockupach.

**8. Nagłówek sekcji 4 zawęża okazje do solo** (l. 48, 156)
„Sam/a albo we dwoje? Zacznij od okazji." sugeruje, że okazje i zrzut są nie dla ekipy, a organizator ekipy to najlepszy odbiorca „3 okazji na weekend". Zmniejsza to pulę zapisów w teście (patrz 4).
Poprawka: „Nie wiesz jeszcze dokąd? Trzy okazje na najbliższy weekend." Zostaje dynamiczny H2 paska (`Najbliższy weekend z {from}`; brief myli to ze stałym „z Wrocławia", l. 156).

**9. Menu: brief opiera się na starym stanie** (l. 107)
Przycisk menu ma już etykietę „Menu" (`GlobalMenu.tsx`: `<IconCompass/> Menu`, commit c9d4c18). `GlobalMenu` jest globalnym FAB-em renderowanym w layoucie, nie częścią `SiteNav`. Przeniesienie do nagłówka to zmiana dla całego serwisu (quiz ukrywa FAB, baner cookies też). Na 375 px logo + Okazje + Cennik + Zaloguj + Menu w `text-xs` się ścieśni.
Poprawka: usunąć punkt z zakresu albo opisać go jako osobną zmianę globalną z mockupem 375 px. Do R1 niepotrzebny.

**10. Metadane i OG: zakres niepełny, zależność nieaktualna** (l. 160, 184, 210, 228)
- OG na main jest już w nowej marce (`opengraph-image.tsx`: piasek, `BRAND_MARK`, Cormorant), wiersz „podgląd w starej marce" w §7 i uwaga w l. 184 są nieaktualne.
- `opengraph-image.tsx` jest globalny. „OG z hasłem i kadrem końcowym animacji" wymaga osobnego obrazu dla `/` (Satori nie odtworzy komponentu animacji, więc to druga implementacja).
- Kryterium 11 („title, description, JSON-LD i H1 mówią to samo") nie przejdzie bez zmian w `layout.tsx` (title, OG i Twitter: „budżetowe weekendy solo", l. 23, 33, 39), `manifest.webmanifest` („Budżetowe podróże solo") i `webAppSchema` w `page.tsx` („Budżetowe weekendy solo"). Brief ich w zakresie nie wymienia.
Poprawka: dodać te pliki do zakresu; OG strony głównej jako statyczny plan (tagline + hasło), bez kadru animacji.

**11. Stan „brak okazji" to zmiana działania i zawiera nieprawdziwą obietnicę** (l. 191, 211, 227)
`DealsStrip` przy braku danych na domyślnym lotnisku zwraca `null` (l. 80), a po wyborze lotniska ma własny tekst („Na ten weekend nie ma jeszcze okazji z {from}…"). Brief mówi „bez zmiany działania" i jednocześnie wprowadza nowy tekst. Tekst „W tym tygodniu z Wrocławia nic sensownego. Zrzut i tak przyjdzie w czwartek." ma na sztywno Wrocław i fałszywą obietnicę: spec zrzutu (l. 78) mówi „Nic nie pasuje: nie wysyłamy".
Poprawka: „W tym tygodniu z {from} nic sensownego. Zapisz się, a damy znać, gdy coś wpadnie." Zdecydować, czy sekcja przy pustych danych w ogóle się pokazuje (dziś nie), i opisać to w kryterium 10.

**12. `?companion=friends` jest rdzeniem CTA, a leży „poza zakresem"** (l. 31, 35, 205)
Bez niego dwa CTA prowadzą do tego samego quizu, co przekreśla „dwie ścieżki, ekipa prosto". Zmiana nie jest „mała": quiz trzyma krok i odpowiedzi w store (trwałe między wizytami), krok 0 ma auto-advance, a wybór „Znajomi" pokazuje `GroupSizePicker`. Parametr musi ustawić companion, zresetować krok do 0 i nie robić auto-advance.
Poprawka: wciągnąć do zakresu R1 jako warunek; dodać `src=home-ekipa|home-solo` (kryterium 14). W `/quick` osobny parametr nie jest potrzebny.

**13. Animacja: wykonanie niedoprecyzowane** (l. 131, 137, 189-190)
- Kadr końcowy w SSR, a po hydracji start od pustego czatu, daje mignięcie treści przy każdym wejściu.
- `MotionConfig reducedMotion="user"` (MotionProvider) wyłącza tylko transformacje i układ, nie `opacity`. „Bez wskakujących chipów" wymaga własnej obsługi `matchMedia`.
- Tabela kończy się wygaszeniem i restartem (13,5-16 s), a l. 131 każe po 3 pętlach stanąć „na kadrze końcowym": trzeba określić, że zatrzymuje się na klatce z 13,5 s, nie na wygaszonej.
Poprawka: oś czasu w czystym CSS (`@keyframes`, `animation-play-state`, `@media (prefers-reduced-motion: no-preference)` włącza ruch), domyślnie renderowany kadr końcowy; JS tylko do IntersectionObserver, przycisku i licznika pętli. To jednocześnie rozwiązuje „bez JS", mignięcie i koszt JS.

**14. Dostępność: `aria-hidden` z przyciskiem w środku, kontrast akcentu** (l. 193, 196, 231)
- „Animacja `aria-hidden`" a „Wstrzymaj dostępny z klawiatury": fokusowalny element w poddrzewie `aria-hidden` to błąd. Przycisk i podpis „Przykład, nie Wasz wyjazd" muszą być poza ukrytym blokiem; zdanie alternatywne w tekście widocznym albo `sr-only`.
- Ceglasty `--accent-poster` #C4622D na piasku #F5EFE0 daje ok. 3,6:1, czyli za mało dla małych chipów (potrzeba 4,5:1). Do tekstu używać `--accent` #A04B20 (ok. 6:1). Chipy na tle z ziarnem mierzyć na rzeczywistym tle.
- Min. rozmiar tekstu bąbelków i chipów na karcie 375 px (propozycja: 14 px) — brief go nie określa.

**15. Wydajność: brak budżetu, ciężkie ziarno, niepełny zakres usuwania** (l. 190, 214, 242)
- „Waga komponentu do ustalenia w kryteriach" (l. 190), a w kryteriach jej nie ma. Dodać: ≤ 10 KB gzip nowego JS klienta, zero nowych zależności, zero obrazów rastrowych.
- Hero i finał używają `feTurbulence` na 1440 x 900 (HC l. 82+); powielenie na animowanej karcie wymusza przemalowania. Ziarno jako mała kafelkowana tekstura (data URI), nie filtr na warstwie animowanej.
- Usunięcie karuzeli to także: `fetchCityPhotoUrl` x8 w `page.tsx` l. 89-90, prop `galleryPhotos`, `next/image`, `scrollRef`/`handleScroll`. Dopisać do zakresu (zysk na TTFB).
- Q8 „plakat przenosi się do finału": finał ma już własny `DuskPoster` (HC l. 916), a plakat z hero ma nieskończoną, niezatrzymywalną animację skoków. Doprecyzować: plakat z hero znika, nie dołącza do finału.

**16. Obietnice w stopce przykładowego planu i emoji** (l. 175, 230)
- „wrzucisz do kalendarza" (.ics) czyta `bestOffer.departureDate` (`plan/page.tsx` l. 182), którego nikt nie ustawia, więc plik nie dostaje dat. Usunąć z linijki do czasu naprawy lotów.
- Kryterium 13 („brak emoji") nie przejdzie: `EXAMPLE_PLAN` (HC l. 33) ma ☕🏛️🥘🏖️🍷, a przykładowy plan zostaje (l. 48). Zamienić na ikony z `Icons.tsx` (audyt P2-2) albo zawęzić kryterium.

**17. Kryteria akceptacji: część niesprawdzalna** (l. 218-231)
- Kr. 3 „wszystkie liczby na stronie" to lista zamknięta, a strona ma kroki 01-03, godziny planu, ceny w EUR, „2-14 dni" w FAQ. Zawęzić: „liczby określające skalę, użytkowników, ceny lub oszczędność".
- Kr. 2 („węższej kolumny niż 720 px bez dwukolumnowego uzupełnienia") jest nieoperacyjne; zastąpić pomiarem: szerokość kontenera 1120 px przy 1440 px, brak `overflow-x` od 320 do 1920 px.
- Kr. 4: podać jedną stałą oś czasu w kodzie i test jednostkowy na jej wartości zamiast pomiaru na oko.
- Kr. 9: policzone CTA wychodzą na 7 (hero 2, A do Z 1, przykładowy plan 1, finał 2, nawigacja 1; HC l. 907 to CTA finału), limit 6. Albo limit 7, albo bez CTA w przykładowym planie.
- Kr. 12: Lighthouse jest zmienny; podać urządzenie, liczbę przebiegów (mediana z 5) i metrykę TBT zamiast „50 ms po hydracji".
- Kr. 14: GA zbiera po zgodzie (audyt P2-8). Zdarzenia mają iść też server-side, inaczej test jest niedoszacowany.

**18. Plan wdrożenia: R1 za duży, R2-R5 bez mechanizmu** (l. 214)
R1 łączy tekst, nowy układ na całej stronie, animację, usunięcie karuzeli i metadane. Każde odblokowanie (R2-R5) wymaga ręcznej zmiany tekstów, kroków i osi animacji (kryterium 4 ma stałe 16 s ±1).
Poprawka: R1a: teksty, hero, dwa CTA, `companion` w quizie, metadane. R1b: układ szeroki (z poprawką 5). R1c: animacja. Stan funkcji w jednym pliku (`features.ts`: `invites`, `datePoll`, `groupFlights`, `groupPlan`, `settlements`) sterującym krokami, animacją, metadanymi i FAQ; przełączenie = jedna linia w PR danej części.

**19. FAQ i dane strukturalne nie dostają treści pod ekipę** (l. 183, 228)
FAQ (`HomeFAQ.tsx`) ma 6 pytań pod solo i Pack/Pro; brief je zostawia, a „Czy znajomi muszą mieć konto?", „Kto płaci za Przepustkę?" nie mają odpowiedzi do części 2. `FAQPage` bierze treść z tej samej tablicy, więc nie wolno wstawić odpowiedzi o funkcji, której nie ma.
Poprawka: dodać dwa pytania w R1 w wersji uczciwej na dziś („Jedziemy ekipą, co dostajemy?": kierunki i plan na osobę i razem; udostępnienie planu linkiem), reszta wchodzi z `features.ts`.

## Drobne

**20. Głos marki** (l. 141-158)
Formy „sam/a" są nieporęczne w CTA; „Jadę sam albo we dwoje" albo „Solo albo we dwoje". Mieszanie „Twojego lotniska" (zrzut) z „Waszym" (ekipa) w jednym ekranie; ustalić: hero do ekipy w liczbie mnogiej, jednostkowa tylko w drugiej ścieżce. „Od A do Z" brzmi jak ulotka; rozważyć „od pomysłu do rozliczenia" jako nagłówek i w H1. Plakietka „Loty z 7 polskich lotnisk" nie pasuje do obietnicy ekipy; zastąpić „Dla ekipy, która nie ma czasu na ustalenia". Bez emoji i wykrzykników: brief tego przestrzega.

**21. Data w animacji starzeje się po 4 miesiącach** (l. 197)
19-21 marca 2027 minie w marcu, a brief zakłada odświeżanie „raz do roku". Użyć samych dni tygodnia („pt-nd") albo liczyć najbliższy przykładowy weekend przy buildzie; po zmianie sprawdzić rachunek 444 zł.

**22. „Ciemny motyw" nie istnieje** (l. 196, 229)
`layout.tsx` ma komentarz „The site has no dark theme", w `globals.css` nie ma `prefers-color-scheme`. Kryterium 12 „w obu motywach" jest puste. Zastąpić: kontrast na jasnych sekcjach i na ciemnej sekcji `DARK` (#0D0A07).

**23. Przepływ pkt 5 (link od znajomego) jest nieweryfikowalny** (l. 33)
„Strona główna nie może tego rozbić" nic nie zmienia w zakresie. Usunąć albo zamienić na kryterium (np. `/dolacz/{token}` nie przekierowuje na `/`).

**24. PRODUCT.md** (l. 23, 235)
Aktualizacja audytorium to konsekwencja zatwierdzonego pozycjonowania, nie pytanie [?1]. Dodać do tego samego PR: wiersz „Users" i „Positioning". Pytania Q1 i Q5 (podpis „Przykład", odpowiedź na mapie) uznać za rozstrzygnięte rekomendacją.

**25. Mikrotekst „za darmo na start" w pierwszym ekranie** (l. 27, 144)
Brief obiecuje w 5 s komunikat „za darmo na start", a mikrotekst to 13 px `text-muted` pod CTA (HC l. 386-389). Podnieść do 14-15 px i skrócić: „6 pytań · darmowe konto · bez karty".

## Werdykt

**Z poprawkami.** Kierunek i dobór decyzji są dobre, ale pięć uwag krytycznych blokuje budowę R1: hasło sprzeczne ze specem (1), animacja pokazuje niedziałające funkcje (2), „od A do Z" przed funkcjami (3), zrzut cofnięty w trakcie testu (4) i układ zależny od hydracji (5). Po ich naprawie reszta to doprecyzowania.

## Uwagi wymagające decyzji Kacpra

- **1** brzmienie H1 bez „Bez czatu" (propozycja w uwadze).
- **2** karta końcowa animacji R1 tylko z szacunkiem kosztu, chipy lotu i terminu dopiero z częściami 3-4.
- **3** kiedy wchodzi „od A do Z": R1 z uczciwym H1 teraz, czy czekać na części 2-3; bez „wkrótce" w pięciu kartach.
- **4** pozycja zrzutu i pomiar bazowy (odpowiada [?2]); rekomendacja: zostaje pod hero do końca testu.
- **9** czy menu w nagłówku jest w ogóle potrzebne (zmiana globalna).
- **12** zgoda na `?companion=friends` w zakresie R1.
- **15** potwierdzenie, że plakat z hero znika (nie jedzie do finału).
- **18** podział na R1a/b/c i `features.ts`.
- **20** forma „sam/a" i plakietka w hero.
