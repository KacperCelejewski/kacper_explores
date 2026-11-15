# Rozliczenia — brief funkcji (część 6 wyjazdów grupowych)

Data: 2026-11-15 (wersja po recenzji) · Właściciel: agent „Rozliczenia" · Pod spec `2026-11-14-wyjazd-ze-znajomymi-design.md` (część 6) i Przepustkę (`2026-11-11`). Recenzje: `2026-11-15-rozliczenia-review.md` i `2026-11-15-ux-review.md` (wersja 3). Spójne z briefami `plan` i `loty`.

Oznaczenia: **[DK]** decyzja Kacpra · **[S]** zapis ze specu części 6, niepotwierdzony osobno · **[P]** moja propozycja · **[K]** rozstrzygnięcie kontrolera, Kacper może zmienić.

Przykład: Marek (organizator, „Ty" na jego telefonie), Ania, Michał, Ola; Barcelona 20–22 lut 2027 (20.02 to sobota, 21.02 niedziela). Kursy NBP są wymyślone.

## 1. Problem i dla kogo

Czterech znajomych jedzie razem. Raz płaci Ania (apartament), raz Michał (kolacja), raz Marek (loty). Po powrocie nikt nie wie, kto komu ile, więc rozliczenie wisi na jednej osobie z arkuszem albo na aplikacji, w której połowa ekipy nie ma konta. Dziś `BudgetTracker` zna tylko sumy na jednym telefonie i nie wie, kto płacił.

Dla kogo: uczestnik wyjazdu grupowego bez konta (główny przypadek), organizator (zwykle płaci za loty i Przepustkę). **Rodzina:** jedna rodzina z wyłączonymi rozliczeniami ogląda tylko wydatki i plan a wydano. **Dwie rodziny w jednej grupie nie są grupą docelową v1**, bo dzieci nie mają miejsc i nie ma wag: rodzina z trójką dzieci płaciłaby tyle co para. Ekran mówi to wprost: „Dzielimy po równo między dorosłych." **[K]**

Zadanie: kto zapłacił i za kogo wpisuje się w kilka sekund na telefonie, a po powrocie jedna lista mówi „kto komu ile". Włóczykij liczy, pieniędzy nie rusza. **[DK]**

Miary **[P]**: (1) odsetek wyjazdów grupowych z co najmniej jednym wydatkiem w `category <> 'pass'` (wpis Przepustki powstaje sam, więc go nie liczymy; bilet z formularza liczymy, bo ktoś wpisał kwotę). (2) wśród wyjazdów z włączonym rozliczaniem i niezerowymi saldami w dniu powrotu: odsetek, w którym w 14 dni wszystkie salda mają zero. Zdarzenie `settlement_marked` dostaje parametr `confirmed` (czy odbiorca potwierdził).

## 2. Przepływ

### 2.1 Dodanie wydatku (telefon, jedna ręka)
1. Na telefonie na trasie wydatków jest **jeden dolny pasek akcji** z „Dodaj wydatek" (pełna szerokość, `env(safe-area-inset-bottom)`), a pływający przycisk „Menu" przechodzi tam do nagłówka. Pasek jest stały od dnia przed wylotem do 14 dni po powrocie, poza tym zwykły przycisk w treści. W planie (pasek akcji planu ma „Zapytaj Włóczykija") jest skrót „Dodaj wydatek" w karcie wydatków, który otwiera trasę z arkuszem (`?dodaj=1`). Na trasach planu i wydatków nic innego nie jest `fixed` przy dolnej krawędzi **[K-kontroler]** (U11).
2. Arkusz: kwota (klawiatura numeryczna), niżej rząd kategorii, „Dodaj" przyklejone nad klawiaturą (`visualViewport`). Reszta zwinięta w jeden wiersz: „Płaci: Ty · za: wszystkich (4) · dziś · Zmień" **[P]**.
3. Kategoria jest wymagana i bez domyślnej (jedno świadome dotknięcie; domyślna dawałaby złe dane, np. „Jedzenie" dla taksówki). Tytuł opcjonalny, pusty dostaje nazwę kategorii.
4. Waluta: ostatnio użyta, na początku waluta celu, inaczej EUR **[S]**.
5. Wydatek za część osób: „Zmień" otwiera listę z zaznaczonymi wszystkimi, skrót „Tylko ja". Zero zaznaczonych: blokada.
6. Po zapisie komunikat „Dodane." z „Cofnij" (usuwa własny, świeży wpis bez pytania). Klient generuje `client_request_id` przy otwarciu arkusza. Powtórne „Dodaj" przy słabym zasięgu zwraca ten sam wpis, nie drugi **[P]**.
7. Szkic (kwota, kategoria, osoby) zapisuje się w `localStorage` przy każdej zmianie i wraca po zamknięciu arkusza. Wpisy dodawane same: Przepustka (tylko płatna, 4,99 zł) i bilet z formularza części 4 **[DK]**.

### 2.2 Poprawa i usunięcie
Każdy uczestnik poprawia i usuwa każdy wydatek **[DK]**. Edycja rozwija wiersz w miejscu. Przy wpisie: „dodane: Michał · ostatnia zmiana: Ania, 21 lut" i rozwijana lista „co się zmieniło" („Kwota: 82 € → 90 €"). Przed zapisem, gdy zmiana ruszy czyjeś saldo: „To zmieni salda: Ania +563,90 → +510,00 zł. Część pieniędzy jest już oddana." Po zapisie „Skopiuj informację o zmianie na grupę" **[K]**. Usunięcie dotyczy innych, więc jedno pytanie z nazwanymi osobami (tabela w sekcji 4), przyciski „Usuń" / „Zostaw", a potem „Przywróć" w „Usunięte". Wzorce **[K-kontroler]** (U19): telefon = dolny arkusz, komputer ≥ 1024 px = okno 480 px (dodawanie), edycja w wierszu; działanie odwracalne i tylko własne: bez pytania, z „Cofnij" w komunikacie.

### 2.3 Rozliczenie po wyjeździe
1. Po powrocie u osoby z niezerowym saldem karta trafia do slotu «Karta-akcja widza» z treścią w stylu „Oddajesz 224,31 zł · Ty → Ania 116,52 zł [Oddane]" (u wierzyciela „Dostajesz 107,79 zł · Michał → Ty 107,79 zł"). Pełna karta jest na `/plan/{id}/wydatki`. Na telefonie kroki paska stanu rozwijają karty (brief `plan`), więc nie ma osobnej zwiniętej linii wydatków ani powtórzenia; karta znika po 30 dniach albo po zamknięciu. Bez maili i powiadomień **[S]**.
2. „Skopiuj tekst na grupę" daje listę przelewów ze stanem na dzień i godzinę, linkiem i zdaniem „Kursy: średni NBP z dnia wydatku." Link w tekście to ten sam aktualny link zaproszenia, bez żadnych skutków ubocznych (token szyfrowany, decyzja Kacpra w toku); ma postać `/dolacz/{token}?do=wydatki` (jedyny format głębokiego linku; urządzenie już w wyjeździe trafia od razu na `/plan/{id}/wydatki`). Gdyby zostało przy samym skrócie: tekst bez linku, „Wejdźcie w plan z wcześniejszego linku." **[K-kontroler]** (U2, U9). Niedostępne, gdy są wydatki „czekające na kurs".
3. Na górze ekranu: moje saldo i moje przelewy. „Jak to wyszło?" rozwija: zapłacone X, udział Y, różnica Z, z listą wydatków.
4. Po przelewie (BLIK, gotówka) ktoś klika „Oddane" **[K]**: okienko z kwotą wpisaną z listy i możliwością zmiany („Kwota przelewu"). Zapis liczy się do salda od razu. Odbiorca widzi „Zaznaczone: Michał, 107,79 zł. Dotarło?" z „Potwierdzam" i „Nie dotarło" (to drugie cofa wpis, autor widoczny).
5. Koniec: „Wszystko zaznaczone jako oddane." albo, po potwierdzeniach, „Wszystko oddane i potwierdzone."

## 3. Ekrany

### 3.1 Komputer (min. 1280 px) **[K-kontroler]**
Układ planu pisze brief `plan` (U1): w kolumnie bocznej sticky stoją sloty «Kolumna boczna: Koszt», «Kolumna boczna: Termin», «Kolumna boczna: Lot», **«Kolumna boczna: Wydatki»** i «Kolumna boczna: Zakładki». Karta siedzi w slocie «Kolumna boczna: Wydatki» (saldo + „Otwórz"); u widza z niezerowym saldem po wyjeździe w «Karta-akcja widza». Opisuję tylko ten slot i pełną stronę `/plan/{id}/wydatki`. Ta trasa używa tego samego mechanizmu co plan i strona główna: znacznik z serwera (`data-page`, `data-layout="wide"`) i `:has()`, bez wzoru `body.is-home`, bez flag w `localStorage`, i tych samych progów: < 768 px jedna kolumna; 768–1023 jedna kolumna do 720 px; ≥ 1024 dwie kolumny; ≥ 1280 kontener 1120 px. Szeroki układ obejmuje wszystkie plany (U4); trasa wydatków istnieje tylko dla grup, solo zostaje przy `BudgetTracker` w slocie «Kolumna główna: Reszta» (tam plan 4.0 kładzie budżet). Skutek: gość bez konta otwierający to na laptopie zabiera miejsce telefonowi (jedno urządzenie na miejsce, brief „zaproszenia"). Gdyby Kacper przyjął propozycję UX (do dwóch urządzeń na miejsce), ryzyko znika.

```
Wydatki · Barcelona · 20–22 lut · 4 osoby         [ + Dodaj wydatek ]

Data   Co                       Płaci   Za kogo     Kwota  | TWOJE SALDO
21.02  Kolacja El Xampanyet     Michał  wszyscy     351,78 |  Dostajesz 107,79 zł
       82 € · kurs NBP 4,29 z 19.02                         |  Twój udział: 533,20 zł
20.02  Taksówka z lotniska      Ola     3 osoby     128,70 |  Zapłacone przez Ciebie: 640,99 zł
       30 € · kurs NBP 4,29 z 19.02                         |  [ Jak to wyszło? ]
20.02  Apartament, 2 noce       Ania    wszyscy   1 140,00 |
20.02  Lot WRO–BCN, 4 osoby     Ty      wszyscy     636,00 | ŻEBY BYŁO RÓWNO
       z karty lotu · dodane: Ty                            |  Ola → Ania       447,38 zł [Oddane]
14.02  Przepustka               Ty      wszyscy       4,99 |  Michał → Ania    116,52 zł [Oddane]
       dodane automatycznie                                 |  Michał → Ty      107,79 zł [Oddane]
Razem 2 261,47 zł · 5 wydatków          [Usunięte (0)]      |  Pieniędzy nie ruszamy. Oddajecie sobie sami.
                                                            | PLAN A WYDANO (skład: 4 osoby)
                                                            |  Wydano: 565,37 zł na osobę · 2 261,47 zł razem
                                                            |  Plan: ok. 644 zł na osobę · ok. 2 576 zł razem (szacunek)
                                                            |  Zostało z planu: 314,53 zł
                                                            |  Loty      636,00 / 636
                                                            |  Nocleg  1 140,00 / 1 140
                                                            |  Jedzenie  351,78 / 560
                                                            |  Atrakcje    0,00 / 240
                                                            |  Poza planem 133,69 (transport 128,70, Przepustka 4,99)
```
Przykład z telefonu Marka (na innych telefonach „Ty" to ktoś inny). 565,37 to 2 261,47 / 4 zaokrąglone do grosza. Sumy: 636,00 + 1 140,00 + 128,70 + 351,78 + 4,99 = 2 261,47. Salda: Marek +107,79, Ania +563,90, Michał −224,31, Ola −447,38, razem 0,00. Plan: 636 + 1 140 + 560 + 240 = 2 576.

- Lewa kolumna: tabela z rozwijanym wierszem (podział groszy „87,95 · 87,95 · 87,94 · 87,94", co się zmieniło, edycja w miejscu). Prawa: sticky, saldo i przelewy na górze, plan a wydano pod nimi **[P]**.
- Saldo wszystkich pod „Jak to wyszło?". Najpierw „ja", potem grupa. Na każdej liście widz to „Ty" (pierwszy), reszta po imieniu; w tekście na grupę zawsze same imiona **[K-kontroler]** (U15).
- Szerokość 1024–1279 px: te same dwie kolumny, węższa tabela (kolumna „Za kogo" schodzi pod tytuł).

### 3.2 Telefon (375 px)
```
Wydatki · Barcelona
Dostajesz 107,79 zł
Twój udział 533,20 zł
Wydano: 565,37 zł na osobę
        2 261,47 zł razem
Plan: ok. 644 zł na osobę (szacunek)
[#######-] zostało 314,53 zł
[ Żeby było równo (3 przelewy) > ]

21.02  Kolacja El Xampanyet
       Michał · 351,78 zł
20.02  Taksówka z lotniska
       Ola · 128,70 zł · 3 osoby
20.02  Apartament, 2 noce
       Ania · 1 140,00 zł
 ...
[        + Dodaj wydatek        ]
```
Pasek: 7 z 8 segmentów to 87,5 %, a wydano 2 261,47 z 2 576 zł to 87,8 %. Na telefonie wydatki to krok „Wydatki" w slocie «Stan wyjazdu» (dotknięcie kroku rozwija kartę pod paskiem, jak w planie 4.0) oraz własna strona. Arkusz dodawania (klawiatura numeryczna otwarta, „Dodaj" nad nią, bez przewijania na 375 × 667):
```
Dodaj wydatek                    X   (telefon Michała)
        82,00      [ EUR v ]
(Jedzenie)(Nocleg)(Transp.)(Atrakcje)(Inne)
Płaci: Ty · za: wszystkich (4) · dziś 21.02 · Zmień
ok. 351,78 zł (kurs z 19.02)
[            Dodaj             ]
```
„Oddane" na telefonie:
```
Ty → Marek       (telefon Michała)
Kwota przelewu  [107,79] zł
[ Oddane ]  [ Zostaw ]
```
Po zapisie wiersz: „Ty → Marek 107,79 zł · zaznaczone: Ty · czeka na potwierdzenie" (u Marka „Michał → Ty"). Saldo Marka 0,00, Michała −116,52, pozostałe dwa przelewy bez zmian. Wiersze min. 56 px.

## 4. Teksty (głos BRAND.md: bez emoji, wykrzykników i „niestety"; **formy bezosobowe**, bo aplikacja nie zna płci, i bez odmiany imion) **[K]**

| Gdzie | Tekst |
|---|---|
| Nagłówki | „Wydatki", „Żeby było równo" |
| Przyciski i pola | „Dodaj wydatek", „Dodaj", „Oddane", „Cofnij", „Potwierdzam", „Nie dotarło"; „Ile?", „Płaci", „Za kogo", „Co to było?", „Kiedy?" |
| Pusta lista | „Jeszcze nic tu nie ma. Pierwszy wydatek dodasz przyciskiem poniżej." |
| Saldo | „Dostajesz 107,79 zł" · „Oddajesz 224,31 zł" · „Jesteś na zero" · „Zapłacone przez Ciebie: 640,99 zł" |
| Podpisy | „dodane: Michał · ostatnia zmiana: Ania, 21 lut", „z karty lotu · dodane: Marek", „dodane automatycznie" |
| Dane | „Wydano: 565,37 zł na osobę · 2 261,47 zł razem"; „Plan: ok. 644 zł na osobę · ok. 2 576 zł razem (szacunek)" (wzorzec cen: „{X} zł na osobę · {Y} zł razem", szacunek z „ok." i „(szacunek)") |
| Pod przelewami | „Pieniędzy nie ruszamy. Oddajecie sobie sami, np. BLIK-iem." |
| Dzielenie | „Dzielimy po równo między dorosłych." |
| Kurs | „82 € → 351,78 zł (kurs NBP 4,29 z 19.02)"; gdy tabeli z dnia nie ma: „kurs z 19.02, bo 21.02 to niedziela" lub „kurs z 19.02, tabela z dziś jeszcze nie wyszła"; tabela B: „kurs NBP, tabela B, 17.02" |
| Kurs a bank | W wierszu walutowym i w „Jak to wyszło?": „Liczymy po średnim kursie NBP z dnia wydatku, nie po kursie banku." |
| Grosze | „351,78 zł na 4 osoby: 87,95 zł dwa razy, 87,94 zł dwa razy" |
| NBP nie działa | „Nie mamy teraz kursu. Wydatek czeka na kurs albo wpisz kwotę w złotówkach." |
| Czeka na kurs | „1 wydatek czeka na kurs. Salda są jeszcze niepełne." |
| Brak sieci | „Brak sieci. Wydatek zostaje w formularzu na tym telefonie." |
| Ponowienie zapisu | „Nie zapisało się. Spróbuj jeszcze raz — zwykle działa za drugim." |
| Konflikt edycji | „Ten wydatek został zmieniony (Ania). Masz już nową wersję. Twoje poprawki: kwota 90 €, [Wpisz jeszcze raz]" |
| Usunięty | „Ten wydatek został usunięty (Michał)." [Przywróć] |
| Usuwanie | „Usunąć „Apartament"? Saldo zmieni się u: Ania, Michał, Ola." [Usuń] [Zostaw] |
| Poza wyjazdem | „Ola (poza wyjazdem)" |
| Miejsce bez dołączenia | „Osoba 4 (jeszcze nie dołączyła) ma udział w 3 wydatkach. Przeliczyć bez niej?" [Przelicz] [Zostaw] |
| Podwójne „Oddane" | „To już jest oznaczone (Michał, 2 min temu). Dodać drugi raz?" |
| Możliwy duplikat | „Podobny wydatek już jest: 82 €, dodane: Ania, dziś 21:14. To ta sama kolacja?" |
| Bilet | „Ten wpis to też status biletu. Po zmianie bez biletu: Ania." (status „bilet jest" / „jeszcze bez biletu", dosłownie z `loty`) |
| Zmiana salda | „Od Twojej ostatniej wizyty: saldo zmieniło się z +107,79 na +95,00 zł. [Zobacz co]" (wzorzec wspólny z planem) |
| Duża kwota | „To dużo (8 200 €). Na pewno?" |
| Limit | „Za dużo zapisów naraz. Spróbuj za minutę." (30 zapisów na minutę na uczestnika) |
| Data | „Ta data jest z przyszłości." |
| Wskazówka w zaproszeniu | „Wydatki wpiszecie tu na miejscu. Bilety i Przepustka dopiszą się same." (tylko przy włączonym kluczu wydatków w `features.ts`) |
| Rodzina | „Rozliczamy się" + „Jedzie jedna rodzina, więc zwykle płaci się z jednej kieszeni. Dokładacie się osobno? Włącz." |
| Tekst na grupę | „Barcelona, rozliczenie, stan na 22.02, 18:40: Ola → Ania 447,38 zł, Michał → Ania 116,52 zł, Michał → Marek 107,79 zł. Kursy: średni NBP z dnia wydatku. Po przelewie kliknijcie „Oddane": {link}" |

Poprawki do specu **[P]**: 2.5 „usunięty z wyjazdu" zastąpić „poza wyjazdem"; 6.3 patrz sekcja 6; 6.4 przykład w pełnych złotych (533, 74, 108) zastąpić liczbami z tego briefu. Reguła głosu staje się regułą całego produktu **[K-kontroler]** (U5): imię zawsze w mianowniku (po dwukropku lub w nawiasie), czasowniki bezosobowe, w 1. os. l. mn. albo w teraźniejszym; skan tekstów w AC 24.

## 5. Widoczność i odkrywalność

- Solo i para: bez zmian, `BudgetTracker` z `localStorage` **[DK]**. Nowe pojęcia nie pojawiają się w solo.
- Grupa: slot «Kolumna boczna: Wydatki» w szkielecie planu (brief `plan`, 4.0): karta z saldem i „Otwórz", krok „Wydatki: oddajesz 224,31 zł" w pasku stanu wyjazdu, po wyjeździe przy niezerowym saldzie karta w «Karta-akcja widza», skrót „Dodaj wydatek". `BudgetTracker` w grupie zastępuje trasa `/plan/{id}/wydatki`. Teksty zapowiadające wydatki w innych częściach (panel zaproszenia, karta lotu) pokazują się tylko przy włączonym kluczu `features.ts` **[K-kontroler]** (U16).
- Dostęp tylko dla członków przez `getTripAccess`. `/share/{id}` i obcy nie widzą kwot ani imion **[P]**.
- Zmiany salda bez powiadomień **[K]**: serwer zapisuje przy wierszu uczestnika `ledger_seen_at` i `ledger_seen_balance_minor`. Na górze ekranu baner „Od Twojej ostatniej wizyty: saldo zmieniło się z … na …" i lista tylko zmian dotyczących tej osoby (płacący, udział, „Oddane"), z różnicą. To stan w aplikacji, nie wiadomość. Przejęcie miejsca dziedziczy ten stan. Kolumny dodaje migracja części 4 (z tego briefu), nie zaproszeń **[K-kontroler]** (U6).
- Rodzina: „Żeby było równo" ukryte, wydatki i plan a wydano widoczne. `settle_enabled` ma wartość `null` = według `companion` (znajomi tak, rodzina nie); przełącznik zapisuje jawne `true/false`, zmiana `companion` jej nie nadpisuje **[P]**.
- Dostępność **[P]**: cele dotyku min. 44 px, saldo nie tylko kolorem, czytnik „plus 107 złotych 79 groszy", kontrast AA, brak skrótów klawiszowych.

## 6. Przypadki brzegowe i błędy

**Kurs NBP** (zmiana spec 6.3) **[K]**
- Jedna reguła: `fx_date` to data ostatniej tabeli A o dacie ≤ `spent_on`, która istnieje w chwili zapisu. Weekend, święto: tabela z ostatniego dnia roboczego (okno wyszukiwania 10 dni wstecz). Dla „dziś" przed południem, gdy tabela jeszcze nie wyszła: poprzednia, z podpisem. Zapisany kurs się nie zmienia.
- **Zmiana kwoty zachowuje zapisany kurs** (82 € → 90 € = 386,10 zł). Kurs liczy się od nowa tylko przy zmianie `spent_on` lub waluty. Spec 6.3 mówi inaczej, proponuję poprawkę.
- `404` z NBP dla dnia bez tabeli to normalny wynik (szukamy wcześniejszej), nie awaria; awarią są timeout i `5xx`.
- Tabela B (raz w tygodniu) z etykietą. Waluta spoza A i B: „czeka na kurs" nie ma sensu, komunikat „Tej waluty nie obsługujemy. Wpisz kwotę w złotówkach."
- Jednostki: `amount_minor bigint`, wykładnik waluty z ISO 4217 (JPY 0, KWD 3), `fx_rate numeric(18,8)`. Sprawdzić, czy API NBP daje kurs za 1 jednostkę z czterema miejscami, a dla HUF, JPY, IDR użyć przelicznika; kryterium w AC 11.
- `spent_on` klient wysyła jako lokalną datę; serwer przyjmuje do dnia UTC + 1 (północ po polsku nie jest „przyszłością"). Dalej: „Ta data jest z przyszłości."
- Podgląd „ok." na telefonie pokazuje datę kursu; po zapisie obowiązuje liczba z serwera.

**NBP niedostępne: „czeka na kurs"** **[K]**
- Wydatek zapisuje się z `fx_status = 'pending'`, `pln_minor` nullable (zmiana kolumny ze specu, `check (pln_minor is not null or fx_status = 'pending')`), poza saldami. Kurs dociąga się przy każdym otwarciu wydatków i przy zapisie.
- Dopóki istnieje wydatek „czekający", „Oddane" i „Skopiuj tekst na grupę" są wyłączone, a nad przelewami stoi „1 wydatek czeka na kurs. Salda są jeszcze niepełne."

**Wydatek za część osób**
- Płacący nie musi być wśród osób, za które płaci. Zero zaznaczonych: „Zaznacz choć jedną osobę."
- Nowy uczestnik nie bierze udziału w starych wydatkach. Nowy wydatek „za wszystkich" obejmuje aktualnych.
- Miejsca bez dołączenia są domyślnie zaznaczone (organizator może wpisywać za osoby bez telefonu). Gdy takie miejsce ma saldo, ekran pisze: „Osoba 4 (jeszcze nie dołączyła) ma saldo −533,18 zł." Liczby osób podpisujemy: „skład" (liczba w cenie) i „ekipa" (miejsca na liście) (U20).

**Miejsca-widma i uczestnicy poza wyjazdem** **[K]**
- Usunięcie miejsca, które nie dołączyło, zdejmuje jego udziały po potwierdzeniu („Przeliczyć bez niej?"). Wpis w historii, saldo tej osoby 0,00, suma sald reszty 0,00. Usuwa organizator **[S]**.
- Uczestnik, który dołączył i ma saldo: jego wydatki i udziały zostają, jako „Ola (poza wyjazdem)". Dialog usunięcia pokazuje saldo: „Ola ma do oddania 447,38 zł. Dług zostaje w rozliczeniu." Dług zostaje na liście przelewów, a „Oddane" może zaznaczyć każdy uczestnik. Gdy grupa chce go darować: wpis `kind = 'waived'` z podpisem „odpuszczone" **[P]**.
- Nie można go wybrać w nowym wydatku.

**Grosze** **[S]**
- Wszystko w groszach, liczby całkowite. Przeliczenie: kwota × kurs, zaokrąglenie połowy w górę, na liczbach dziesiętnych.
- Podział według `weight` (w v1 zawsze 1, bez wag w interfejsie **[K]**): część całkowita, potem reszta groszy metodą największych reszt, remisy po `trip_members.created_at, id`. 35 178 gr na 4: 8 795, 8 795, 8 794, 8 794. 499 gr na 4: 125, 125, 125, 124.
- Suma udziałów = kwota, suma sald = 0. Przelewy dokładne co do grosza.
- Przelewy liczy dokładny algorytm: maksymalna liczba rozłącznych podzbiorów sald o sumie zero, DP po maskach dla n ≤ 16 (`MAX_GROUP` = 9), zachłanny powyżej. Liczba przelewów = n − liczba grup. Remisy deterministyczne, żeby wszyscy widzieli tę samą listę **[K]**.

**Dwie osoby naraz** **[P]**
- Zapisy `expenses` i `settlements` jednego wyjazdu idą przez funkcję SQL, która blokuje wiersz `trips` (`select … for update`), albo przez `ledger_rev` sprawdzany w jednej transakcji.
- Wydatek ma `rev int` zwiększany przy zapisie, usunięciu i przywróceniu; `PATCH` z `If-Match: rev`. Niezgodność: `409 EXPENSE_CHANGED`, UI pokazuje nową wersję i zachowuje pola drugiej osoby.
- Edycja usuniętego: „Ten wydatek został usunięty (Michał)" + „Przywróć".
- „Oddane" zapisuje to, co użytkownik widział (od, do, kwota), nie jest porównywane z bieżącym wyliczeniem. Duplikat: `client_request_id` (unikalny) oraz ten sam (od, do) od innej osoby w ciągu 60 s, co daje pytanie „Dodać drugi raz?".
- Możliwy duplikat wydatku: inny autor, ten sam płacący, kwota i waluta, ten sam `spent_on`, w ciągu 24 h.

**Pozostałe**
- Po zmianie wydatków lista przelewów liczy się od nowa, „Oddane" zostają jako wpłaty. Nadpłata daje przelew odwrotny z wyjaśnieniem: „Po zmianie wydatków: Marek → Michał 20,00 zł.".
- Kwota musi być dodatnia: „Kwota musi być większa od zera". Zwrot kaucji to poprawa oryginału. Powyżej 5 000 zł pytanie „Na pewno?".
- Przepustka **[K]**: wydatek `pass` tylko przy płatnej Przepustce (nie Pro, nie ręczne nadanie), zapłacony przez kupującego z `metadata.member_id`, klucz `pass:{stripe_session_id}` (webhook powtórzony nie dubluje, usunięty ręcznie nie wraca). Zwrot (`charge.refunded`) usuwa wpis miękko (autor „Włóczykij", historia). Przepustka kupiona przed założeniem grupy: wpis dopisuje się przy pierwszym „Zaproś ekipę" z datą zakupu.
- Bilet: zmiana osób lub usunięcie wydatku `flights` zmienia status biletu („bilet jest" / „jeszcze bez biletu"; ostrzeżenie z tabeli). Tytuł `flights` nadaje serwer **[loty]**.
- Plan a wydano (ceny w formacie „{X} zł na osobę · {Y} zł razem", kwoty z `Intl.NumberFormat('pl-PL')`): liczy `deleted_at is null` i bez `pending`. Plan to liczby, nie tekst: `parsePln` zwraca 0 dla „Loty (w obie strony) 300 zł", więc w grupie czytamy pola liczbowe albo parser bierze pierwszą liczbę **[P]**.
- Format: „82,5" i „82.5" = 82,50; „82,555" odrzucone; „1 140,00 zł" ze spacją niełamliwą.
- Usunięcie konta organizatora z niezerowymi saldami: ostrzeżenie „Zostały nieoddane pieniądze. Skopiuj listę na grupę." (do właściciela profilu).
- Zmiana `companion` w quizie po założeniu grupy: dane zostają, zmienia się widok.

## 7. Zależności i ryzyka

**Zależności**
- Część 2: `trip_members`, `getTripAccess`, `removed_at`, przejęcie miejsca.
- **Część 4 (brief `loty`)**: migracja części 4 tworzy `expenses`, `expense_shares` i resztę schematu z tego briefu: `rev`, `updated_at`, `updated_by_member_id`, `source` (klucz idempotencji, unikalny `(trip_id, source)`: `flight:{uuid}` w `loty`, `pass:{stripe_session_id}`, `req:{uuid}` dla ręcznych), `fx_status`, `pln_minor` nullable, `expense_changes` (kto, kiedy, `previous` jsonb), `settlements` z `confirmed_at`, `confirmed_by_member_id`, `kind`, `trips.settle_enabled`, `trip_members.ledger_seen_*`. **[K]**
- **Wspólne API, bez dublowania [K]**: `src/lib/expenses.ts` (`createExpense`, `updateExpense`, `deleteExpense`, `restoreExpense`: dostęp, `rev`, historia, udziały, idempotencja) powstaje w części 4 i to wołają trasy lotów. Część 6 dokłada na nim trasy ogólne `POST/PATCH/DELETE`, kursy NBP, salda, `settlements` i ekrany. Wydatki `flights` z części 4 mają PLN (`pln_minor = amount_minor`, `fx_*` puste) i nie czekają na NBP.
- Plan **[K-kontroler]**: szkielet strony, sloty, pasek stanu wyjazdu, mechanizm szerokiego układu (znacznik z serwera + `:has()`, wspólne progi), dolny pasek akcji i przeniesienie FAB „Menu" do nagłówka pisze brief `plan`; tu tylko slot „wydatki" i trasa `/plan/{id}/wydatki`.
- Zaproszenia: ten sam aktualny link w tekście na grupę (U2), `/dolacz` dla już dołączonego urządzenia kieruje prosto na plan z kotwicą (U9).
- Przepustka: webhook Stripe tworzy `pass` przez `createExpense`.
- NBP: `api.nbp.pl` bez klucza, cache kursów **[S]**.

**Ryzyka**
1. **Błąd w liczeniu to koniec zaufania.** Środki: liczby całkowite, testy własności, dokładny algorytm sprawdzany brute-force, „Jak to wyszło?".
2. **Każdy może wszystko i nikt nie dostaje wiadomości** **[DK]**. Środki: baner zmiany salda z różnicą, podgląd skutku przed zapisem, historia, „Usunięte", potwierdzenie odbiorcy. Zostaje ryzyko podszycia się (przejęcie miejsca, 2.4).
3. **Kurs NBP to nie kurs z karty** **[DK]**: różnica z wyciągiem to najczęstsza kłótnia. Napis w wierszu wydatku, nie tylko w „Jak to wyszło?".
4. **Zasięg za granicą:** dodawanie wymaga sieci. Chronią: szkic w `localStorage`, idempotencja, „czeka na kurs". Kolejka offline poza zakresem.
5. **Laptop gościa wyrzuca telefon z miejsca** (jedno urządzenie na miejsce; propozycja UX: do dwóch, decyzja otwarta). Do tego czasu rozliczanie na komputerze to w praktyce organizator z kontem.
6. **Spójność między PR-ami:** schemat w części 4, API wspólne, formy bezosobowe w `loty`, układ w `plan`.
7. **Dane:** imiona i kwoty do usunięcia z wyjazdem; nie zbieramy kont ani numerów telefonów **[DK]**.

## 8. Kryteria akceptacji

Dane wzorcowe: 5 wydatków z 3.1, równy podział (taksówka na 3: Ania, Michał, Ola), kolejność `created_at`: Marek, Ania, Michał, Ola.

1. Salda: Marek +107,79; Ania +563,90; Michał −224,31; Ola −447,38; suma 0,00. Przelewy: Ola → Ania 447,38; Michał → Ania 116,52; Michał → Marek 107,79.
2. Udziały: Marek 533,20, Ania 576,10, Michał 576,09, Ola 576,08; suma 2 261,47.
3. Grosze: 351,78 na 4 = 87,95 / 87,95 / 87,94 / 87,94; 4,99 na 4 = 1,25 / 1,25 / 1,25 / 1,24; 128,70 na 3 = 42,90 trzy razy.
4. „Oddane" Michał → Marek 107,79: Marek 0,00, Michał −116,52, pozostałe przelewy bez zmian; „Cofnij" przywraca punkt 1. Zapis z kwotą 100,00 daje Marka +7,79 i Michała −124,31 (zapis nie jest porównywany z listą).
5. Odbiorca klika „Potwierdzam": wpis ma `confirmed_at`; ekran końcowy przy samych zaznaczeniach mówi „Wszystko zaznaczone jako oddane", po potwierdzeniach „Wszystko oddane i potwierdzone".
6. Usunięcie taksówki: Marek +107,79; Ania +606,80; Michał −181,41; Ola −533,18; przelewy: Ola → Ania 533,18; Michał → Ania 73,62; Michał → Marek 107,79.
7. Kurs: 82 € z `spent_on` niedziela 21.02 i tabelą 4,29 z piątku 19.02 = `pln_minor` 35178, `fx_date` 2027-02-19. Zmiana kwoty na 90 € = 38610 i ten sam `fx_rate`; zmiana tytułu, płacącego, osób: ten sam kurs; zmiana `spent_on` lub waluty liczy kurs od nowa.
8. Zegar zamockowany: ten sam dzień roboczy o 11:00 (tabeli jeszcze nie ma) zapisuje poprzednią tabelę z podpisem „tabela z dziś jeszcze nie wyszła", o 13:00 tabelę z dziś. Święto: 1 stycznia 2027 (piątek) bierze tabelę z 31 grudnia 2026. Tabela B ma etykietę z datą.
9. Data: o 00:30 czasu polskiego dzisiejsza data jest przyjęta (serwer UTC); data dwa dni do przodu odrzucona.
10. NBP niedostępne (mock): wydatek EUR dostaje `pending`, nie wpływa na salda; „Oddane" i „Skopiuj tekst na grupę" wyłączone z napisem o niepełnych saldach; po odzyskaniu NBP wpis dostaje kurs i salda się liczą. Timeout i `5xx` to inny przypadek niż `404`.
11. Waluty: HUF 25 000 i JPY 10 000 dają kwotę zgodną z opublikowanym kursem za jednostkę; kwota 50 000 000 w walucie dużej nominalnie mieści się (`bigint`).
12. Miejsce bez `joined_at`, usunięte z przeliczeniem: jego saldo 0,00, suma pozostałych 0,00, wpis w historii. Uczestnik poza wyjazdem: saldo i przelew z „(poza wyjazdem)", niewybieralny w nowym wydatku, `waived` zeruje jego dług.
13. Edycja: A i B otwierają ten sam wydatek, A zapisuje, B dostaje `409` z `rev`, jego wpisane pola zostają widoczne. Dwa równoczesne „Oddane" na ten sam przelew z różnych urządzeń: jeden wiersz albo pytanie o drugi. Ten sam `client_request_id` dwa razy: jeden wydatek.
14. Cudza edycja zmieniająca moje saldo: po wejściu widzę stare i nowe saldo, autora i różnicę kwoty („82 € → 90 €"), także po przejęciu miejsca na nowym urządzeniu. Przed zapisem edycji widać skutek dla sald.
15. Duplikat: inny autor, ta sama kwota, waluta, płacący i dzień w 24 h daje pytanie; różna kwota nie.
16. Przepustka: płatna na grupę 4-osobową = jeden wydatek `pass` 4,99, udziały 1,25 / 1,25 / 1,25 / 1,24; webhook powtórzony nie dubluje; ręcznie usunięty nie wraca; Pro i ręczne nadanie nie tworzą wpisu; zwrot usuwa wpis; Przepustka sprzed grupy dopisuje się przy pierwszym zaproszeniu.
17. Metryka 1 nie liczy `pass`; metryka 2 ma mianownik z niezerowych sald w dniu powrotu.
18. Rodzina (`companion = family`, `settle_enabled = null`): „Żeby było równo" ukryte, wydatki i plan a wydano widoczne; po włączeniu przelewy się pokazują i dane nie znikają; zmiana `companion` nie nadpisuje jawnego `true/false`.
19. Plan a wydano (4 osoby): „Wydano 2 261,47 z 2 576 zł · zostało 314,53 zł", poza planem 133,69; nie liczy usuniętych ani `pending`. Plan z tekstem „Loty (w obie strony) 300 zł" daje 300. Solo: `BudgetTracker` z `localStorage` bez regresji.
20. Dostęp: obcy z ciasteczkiem i uczestnik poza wyjazdem dostają `403`; brak wyjazdu `404`; `/share/{id}` nie zwraca kwot ani imion.
21. Szerokości 320, 375, 768, 1024 i 1280 px: brak poziomego przewijania; ≥ 1024 dwie kolumny, ≥ 1280 kontener 1120 px (te same progi co plan). Na 375 × 667 z otwartą klawiaturą i bez niej „Dodaj" jest widoczne bez przewijania, a żaden inny element `fixed` (FAB „Menu", czat) go nie zasłania; dodanie = kwota + kategoria + „Dodaj"; cele dotyku ≥ 44 px. Przycisk stały tylko w oknie od dnia przed wylotem do 14 dni po powrocie. Zamknięcie i otwarcie arkusza przywraca szkic.
22. Wydatek `flights`: zmiana osób lub usunięcie pokazuje ostrzeżenie „Po zmianie bez biletu: Ania."; etykieta „z karty lotu · dodane: Marek", „dodane automatycznie" tylko dla `pass`.
23. Własności (losowo 1–50 wydatków, 2–9 osób): suma sald 0, suma udziałów = kwota, wykonanie wszystkich przelewów daje zera, a liczba przelewów równa się n minus maksymalna liczba rozłącznych podzbiorów o sumie zero (porównanie z brute-force).
24. Formaty: „82,5" i „82.5" = 82,50; „82,555", 0 i ujemne odrzucone. Skan wszystkich tekstów interfejsu i tekstu na grupę (test na stałych w kodzie i danych testowych Marek/Ania/Michał/Ola/Kuba/Nikola): brak czasowników na „-łem/-łeś/-łam/-łaś/-ł/-ła" odnoszących się do osoby oraz brak odmienionych imion (Marka, Anię, Oli, Kubie, Kubę, Nikoli…); „Zapłacone przez Ciebie", nie „Zapłaciłeś"; imię tylko w mianowniku.
25. Widz na liście to „Ty" (pierwszy), w tekście na grupę same imiona. Przy zapisie nieudanym: „Nie zapisało się. Spróbuj jeszcze raz — zwykle działa za drugim." Usuwanie pyta z nazwanymi osobami i ma „Przywróć"; „Oddane" ma „Zostaw", nie „Anuluj". Dodanie wydatku ma „Cofnij" w komunikacie.
26. Ceny: „Wydano: 565,37 zł na osobę · 2 261,47 zł razem" i „Plan: ok. 644 zł na osobę · ok. 2 576 zł razem (szacunek)".

## 9. Otwarte pytania do Kacpra (z rekomendacją)

Rozstrzygnięte przez kontrolera, do zmiany przez Kacpra: kurs przy zmianie kwoty, widoczność zmian salda, „Oddane" z potwierdzeniem, miejsca-widma, brak wag, „czeka na kurs", trasa `/plan/{id}/wydatki`, Przepustka, formy bezosobowe, metryki, dokładny algorytm.

1. **Kurs własny:** czy dopuścić ręczną kwotę w zł z wyciągu przy walucie obcej? Rekomendacja: nie w v1.
2. **Przełącznik „Rozliczamy się":** każdy uczestnik czy tylko organizator? Rekomendacja: każdy.
3. **Przelewy poniżej 1 zł:** ukrywać czy pokazywać? Przelewy liczą się z sald netto, więc Przepustka sama ich nie rozbija. Ukrycie oznacza, że saldo nie zejdzie do 0,00. Rekomendacja: pokazywać, drobne na końcu listy.
4. **Stare sumy z `localStorage`** po założeniu grupy: jednorazowa wskazówka „Wpisane wcześniej sumy zostały tylko na tym telefonie." Rekomendacja: tak.
5. **Kolejka offline w PWA** (poza szkicem w formularzu): rekomendacja: nie w v1.
6. **„Odpuszczone" (`kind = 'waived'`)** dla długu osoby spoza wyjazdu: rekomendacja: tak.
7. **Poprawki specu:** 6.3 (kurs przy zmianie kwoty), 2.5 („poza wyjazdem"), 6.4 (liczby). Zgoda?

## 10. Odpowiedzi na recenzję

Przyjęte wszystkie uwagi krytyczne i ważne oraz tanie drobne (23–31). Nieprzyjęte lub przyjęte częściowo:
- **1:** reguła kursu zależy od `spent_on`, ale dla „dziś" przed południem wynik zależy od chwili zapisu. Zostawiam to, bo nie da się inaczej (tabeli jeszcze nie ma), i ujawniam podpisem oraz testem z zegarem (AC 8). Zapisany kurs jest potem stały.
- **6:** recenzent proponuje wspólne trasy `POST/PATCH/DELETE` w kroku 1. Zostawiam wspólne funkcje `src/lib/expenses.ts` w części 4, a trasy ogólne w części 6, żeby część 4 nie czekała na NBP i interfejs.
- **15:** zamiast steppera porcji (opcja recenzenta) wybrano rozstrzygnięcie kontrolera: v1 bez wag, dwie rodziny poza grupą docelową.
- **17(a):** zamiast zwykłego przycisku wszędzie, stały tylko w oknie wyjazdu i na trasie wydatków.
- **21:** dokładny algorytm do n ≤ 16 (`MAX_GROUP` = 9 wystarcza), pytanie o niego usunięte.
- **26:** skrót klawiszowy `N` usunięty zamiast dopracowywać.
- **28:** pytanie o Przepustkę wstecznie (Q8) i o algorytm (Q2) usunięte; Q7 przepisane zgodnie z uwagą.
- **22:** zdanie „nikt nikomu nic nie wisi" usunięte zgodnie z uwagą.

## 11. Odpowiedzi na recenzję UX

Przyjęte: U1 (cytuję slot z briefu `plan`, własny układ usunięty), U2, U4 (jeden mechanizm i progi, wszystkie plany), U5 (reguła + rozszerzony skan w AC 24), U6 (kolumny zostają na serwerze, wzorzec „Od Twojej ostatniej wizyty: …"), U7 (krok „Wydatki" w pasku stanu zastępuje mój pasek po wyjeździe), U9, U11, U14, U15, U16, U17, U19, U20.
- **U10:** nie rozstrzygam, bo to decyzja zaproszeń i kontrolera; w ryzykach zapisałem skutek obu wariantów.
- **U7 (częściowo):** zachowuję własny baner „Od Twojej ostatniej wizyty: saldo zmieniło się…" na trasie wydatków. Pasek stanu mówi, że saldo jest niezerowe, a baner mówi, co się zmieniło i dlaczego; to dwie różne informacje.
- **U14 (częściowo):** „Twój udział: 533,20 zł" zostaje w tej postaci, bo to kwota osoby, nie cena na osobę. Wzorzec „{X} zł na osobę · {Y} zł razem" stosuję do wydano i planu.
- **U15 (częściowo):** w tekście do wklejenia na grupę nie ma „Ty", tylko imiona, bo ten sam tekst czytają różne osoby.
