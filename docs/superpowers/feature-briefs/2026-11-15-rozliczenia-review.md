# Rozliczenia — opinia o briefie

Recenzent: agent-recenzent · 2026-11-15 · Brief: `2026-11-15-rozliczenia.md` (245 linii). Odwołania „l. N" to numery linii briefu. Kod czytany z `origin/main` (`src/app/components/BudgetTracker.tsx`, `src/lib/group.ts`, `src/app/globals.css`). Decyzji Kacpra [DK] nie podważam, wskazuję tylko skutki.

## Weryfikacja liczb (przeliczone w groszach, osobny skrypt)

- Kursy: 82 × 4,29 = 351,78; 30 × 4,29 = 128,70; 90 × 4,29 = 386,10. Zgodne.
- Suma wydatków 226 147 gr. Salda: Marek +10 779, Ania +56 390, Michał −22 431, Ola −44 738, suma 0. Zgodne.
- Udziały (reszta groszy dla najwcześniejszych): Marek 53 320, Ania 57 610, Michał 57 609, Ola 57 608, suma 226 147. Zgodne z AC 2. Rozkład 35 178/4 i 499/4 i 12 870/3 zgodny z AC 3.
- Trzy przelewy (447,38; 116,52; 107,79) są minimum: żaden podzbiór sald nie sumuje się do zera, więc n − 1 = 3.
- AC 4 (po „Oddane" Michał → Marek: Marek 0,00, Michał −116,52) i AC 5 (po usunięciu taksówki: +107,79 / +606,80 / −181,41 / −533,18; przelewy 533,18 / 73,62 / 107,79) zgodne.
- Plan: 636 + 1 140 + 560 + 240 = 2 576; zostało 314,53; poza planem 133,69. Zgodne.
- Błąd w makiecie: pasek na telefonie `[#########---]` to 9/12 = 75 %, a wydano 2 261,47 z 2 576 = 87,8 % (ok. 10,5/12).

Liczby przykładu są poprawne. Problemy leżą w regułach, których przykład nie dotyka.

---

## Uwagi

### Krytyczne

**1. Kurs NBP zależy od godziny wpisania, a brief sam sobie przeczy**
Gdzie: l. 150–153 vs l. 218 (AC 6).
Brief mówi, że „wydatek wpisany rano dostaje poprzedni kurs" (tabela wychodzi w południe), a AC 6: „Dzień roboczy z opublikowaną tabelą bierze kurs z tego dnia". Dwa identyczne wydatki z jednego dnia dostają różne kursy zależnie od tego, o której je wpisano. Do tego „zmiana kwoty przelicza od nowa" (l. 153): poprawka literówki po południu zmienia kurs, więc 82 € → 90 € nie musi dać 386,10. Pieniądze, których nikt nie umie odtworzyć na kalkulatorze, to wprost ryzyko nr 1 z briefu. AC 6 nie jest testowalny bez zamrożenia godziny.
Poprawka: jedna reguła zależna tylko od `spent_on`: `fx_date` = data ostatniej tabeli o dacie ≤ `spent_on` istniejącej w momencie zapisu; jeśli `spent_on` to dziś i tabeli jeszcze nie ma, bierzemy poprzednią i podpisujemy „kurs z 19.02, tabela z dziś jeszcze nie wyszła". Zmiana kwoty NIE zmienia kursu (używa zapisanego `fx_rate`); kurs liczy się od nowa tylko przy zmianie `spent_on` lub waluty. Dopisać do AC test z zamockowanym zegarem (11:00 i 13:00 tego samego dnia) i AC „zmiana kwoty zachowuje `fx_rate`". To zmienia zapis specu 6.3 („zmiana dnia albo kwoty liczy go od nowa"), więc wymaga decyzji (patrz koniec).

**2. Wolne miejsca-widmo i usunięci uczestnicy generują wieczny dług, którego nikt nie spłaci**
Gdzie: l. 162, 170–172 (i spec 2.3, 2.5; zaproszenia 102).
Pierwsze „Zaproś ekipę" zakłada tyle miejsc, ilu dorosłych w quizie („Osoba 2…4"). Quiz mówi „4 osoby", pojedzie 3. Każdy wydatek „za wszystkich" obciąży też „Osobę 4" (25 %), której nikt nie spłaci. Usunięcie miejsca nie pomaga: „Jego wydatki i udziały zostają i liczą się w salda" (l. 171). Efekt: „Wszystko oddane" jest nieosiągalne w najczęstszym scenariuszu (ktoś odpuścił wyjazd), a salda reszty są od pierwszego dnia zawyżone.
Poprawka: (a) przy dodawaniu wydatku „za wszystkich" nie wliczać miejsc bez `joined_at`, albo ostrzegać: „Osoba 4 jeszcze nie dołączyła. Liczymy ją w podziale?" z domyślnym „nie"; (b) przy usuwaniu miejsca, które nie dołączyło lub nic nie zapłaciło, dialog „Osoba 4 ma udział w 3 wydatkach. Przeliczyć bez niej?" (zdejmuje wiersze `expense_shares`, zapis w historii); (c) dla usuwanej osoby, która dołączyła i ma saldo, dialog pokazuje saldo i mówi, że zostaje w rozliczeniu. Dopisać AC: miejsce bez `joined_at` usunięte z przeliczeniem daje saldo 0 u niej i sumę sald 0 u reszty.

**3. Brak mechanizmu, który pokazuje osobie zmianę jej własnego salda**
Gdzie: l. 141(b), 202 (ryzyko 2).
[DK] każdy edytuje wszystko, brak powiadomień. Jedyne zabezpieczenie to „3 zmiany od Twojej ostatniej wizyty" liczone z czasu w `localStorage`. To nie działa: wyczyszczone dane lub inny przeglądarka = „wszystko jest nowe" albo nic; nie mówi, czy zmiana dotyczy mnie; nie pokazuje skutku w złotych. Scenariusz: wierzycielka Ania zapłaciła apartament, ktoś ustawia wydatek „za 3 osoby" bez niej, jej saldo spada, a ona przelewa lub czeka na zwrot na starych liczbach. Przy tym brief nie pokazuje „co" zmieniono, tylko „poprawiła Ania, 21 lut" (l. 31), a spec 6.2 wymaga „kto i co zmienił".
Poprawka (to nie jest powiadomienie, więc zgodne z DK): zapisywać po stronie serwera przy każdej wizycie `ledger_seen_at` i `ledger_seen_balance_minor` na wierszu uczestnika (jedno urządzenie = jedno miejsce, więc nie ma problemu wielu urządzeń). Na górze ekranu: „Od Twojej ostatniej wizyty Twoje saldo zmieniło się z +107,79 na +95,00 zł. Zobacz co" i lista tylko zmian, które dotyczą tej osoby (płacił, udział, Oddane), z różnicą: „Kwota: 82 € → 90 €". Przy zapisie edycji, gdy istnieją „Oddane", pokazać przed zapisem skutek: „To zmieni saldo Ani z +563,90 na +510,00 zł. Ktoś już oddał część pieniędzy." i zaproponować „Skopiuj wiadomość na grupę" z gotowym tekstem zmiany. Dopisać AC: po cudzej edycji, która zmienia moje saldo, widzę starą i nową kwotę oraz autora, na nowym urządzeniu po przejęciu miejsca też.

### Ważne

**4. „Oddane" porównywane z aktualnym wyliczeniem odrzuca prawdziwe płatności i nie jest zabezpieczone przed wyścigiem**
Gdzie: l. 177, 221 (AC 9), 235 (Q1).
(a) Użytkownik zrobił BLIK 116,52 zł, w międzyczasie ktoś poprawił wydatek i przelew w liście wynosi 120,00. „Oddane" kończy się `409`, choć pieniądze poszły. Zapis faktu zewnętrznego nie może zależeć od tego, czy pasuje do wyliczenia. (b) Ludzie zaokrąglają przelewy do pełnych złotych (przykład w specu 6.4 sam tak robi); wyliczenie „do grosza" bez możliwości zmiany kwoty zmusza do nierównej kwoty. (c) „Serwer porównuje (od, do, kwota) z aktualnym wyliczeniem" bez blokady nie wyklucza dwóch wierszy, bo oba żądania czytają stan przed zapisem; AC 9 nie da się spełnić bez transakcji. (d) Po częściowej płatności zachłanny lub dokładny algorytm może przetasować listę, więc „ten sam przelew" przestaje być stabilnym pojęciem.
Poprawka: „Oddane" zapisuje to, co użytkownik widział (od, do, kwota), z domyślną kwotą z listy i możliwością zmiany („Oddałem inną kwotę"); resztę pokazuje lista na nowo. Duplikat wykrywany kluczem `client_request_id` (UUID z formularza, unikalny indeks) oraz regułą „ten sam (od, do) w ciągu 60 s od innego uczestnika → pytanie »Michał już to oznaczył. Dodać drugi raz?«". Zapisy do `expenses`/`settlements` jednego wyjazdu serializować: funkcja SQL z `select … for update` na wierszu `trips` albo licznik `ledger_rev` sprawdzany w jednej transakcji. Dopisać AC dla obu mechanizmów.

**5. Każdy może kliknąć „Oddane", także dłużnik za siebie**
Gdzie: l. 172, 235 (Q1).
Michał może jednym kliknięciem wyzerować własny dług, a Ania dowie się z „zmian od ostatniej wizyty" (patrz 3). Brief zakłada, że samo „zaznaczył Michał" wystarczy. Wśród znajomych zwykle tak, ale bez wskazania, kto potwierdził, „Wszystko oddane" znaczy tylko „ktoś kliknął".
Poprawka: dwa stany jednego wiersza: „oddane, zaznaczył płacący" i „potwierdzone przez odbierającego" (jedno dotknięcie odbiorcy). Saldo liczy się od pierwszego stanu (żeby nie blokować), ale odbiorca widzi „Michał zaznaczył, że oddał 116,52 zł. Dotarło?" z „Tak"/„Nie" (Nie = Cofnij z autorem). Ekran końcowy: „Wszystko zaznaczone jako oddane" bez potwierdzeń, „Wszystko oddane" po potwierdzeniach. Do decyzji Kacpra (Q1 rozszerzone).

**6. Fundament wydatków potrzebny już w części 4, a „przesunięcie do migracji części 4" jest zbędne i ryzykowne**
Gdzie: l. 192–194, 245 (Q11); loty l. 48, 75, 221.
Brief loty (własciciel części 4) nie zawiera żadnej z kolumn z tego briefu (`updated_at`, `source`, `settle_enabled`). Jednocześnie loty potrzebują już w części 4 zapisu wydatku i jego usunięcia („ten sam mechanizm co w części 6", loty l. 75), czyli trasy, dostępu, autora i historii. Kolumny dodaje się później bez problemu (`alter table … add column if not exists … default`), więc nie ma powodu, by zmuszać dwa PR-y do uzgodnienia migracji. Za to brak wspólnego API wydatków oznacza, że część 4 napisze własne, a część 6 je przepisze.
Poprawka: rozbić na dwa kroki. Krok 1 (przed lub razem z częścią 4, jeden właściciel): `src/lib/expenses.ts` i trasy `POST/PATCH/DELETE` z `getTripAccess`, `rev`, `created_by`, `updated_by`, historią i funkcją udziałów; część 4 woła tylko to. Krok 2 (część 6): kursy NBP, salda, ekrany, `settlements`, `settle_enabled`. Kolumny z części 6, których potrzebuje krok 1 (`rev`, `updated_by_member_id`, `client_request_id`, `source`), mają wartości domyślne, więc wstawki części 4 są poprawne. `pln_minor` nullable zmienia kolumnę ze specu (`not null`), trzeba to wprost zapisać w migracji, z `check (pln_minor is not null or fx_status = 'pending')`.

**7. Optymistyczna blokada na `updated_at` jest krucha**
Gdzie: l. 175.
`timestamptz` w Postgresie ma mikrosekundy, a JS `Date` milisekundy. Po przejściu przez JSON wersja z klienta może się nie zgadzać z bazą (fałszywe `409` albo przepuszczone konflikty). Przywrócenie i usunięcie też muszą podbijać wersję.
Poprawka: kolumna `rev int not null default 1` zwiększana przy każdym zapisie, usunięciu i przywróceniu; `PATCH` z `If-Match: rev`. Zachować `updated_at` do wyświetlania. W komunikacie `409` zachować wpisane przez drugą osobę pola (nie kasować jej wersji), żeby mogła je ponowić.

**8. Dodanie wydatku nie jest idempotentne przy słabym zasięgu**
Gdzie: l. 129, 183, 186; teksty l. 133 („Brak sieci…").
Za granicą, w roamingu, żądanie często dochodzi, a odpowiedź nie. Użytkownik klika „Dodaj" drugi raz i powstają dwa wydatki. Brief ma heurystykę „Możliwy duplikat" (l. 129) bez reguły i klucz idempotencji tylko dla `source` (l. 183).
Poprawka: `client_request_id uuid` generowany przy otwarciu arkusza, unikalny `(trip_id, client_request_id)`, powtórzenie zwraca istniejący wpis. Regułę „Możliwy duplikat" zdefiniować: inny autor, ten sam płacący, ta sama kwota i waluta, ten sam `spent_on`, w ciągu 24 h. Obie rzeczy do AC.

**9. Tekst „Wydatek czeka w formularzu, nic nie zginie" obiecuje coś, co nie jest prawdą**
Gdzie: l. 133 vs l. 205 („offline poza zakresem").
Jeśli karta zostanie zamknięta lub system ją wyrzuci z pamięci (iOS po przełączeniu aplikacji), szkic znika. Marka stoi na uczciwości.
Poprawka: albo faktycznie zapisywać szkic w `localStorage` przy każdej zmianie pola (i przywracać), albo tekst „Brak sieci. Spróbuj jeszcze raz za chwilę." Rekomendacja: szkic w `localStorage` plus tekst „Brak sieci. Wydatek zostaje w formularzu na tym telefonie." AC: zamknij i otwórz arkusz, szkic wraca.

**10. Datę „z przyszłości" blokujemy błędnie po północy**
Gdzie: l. 152, 218.
Serwer (Vercel) działa w UTC. Użytkownik w Polsce o 00:30 ma lokalnie „Dziś = 22.02", serwer ma jeszcze 21.02 i odrzuca „Tego dnia jeszcze nie było". To kolacja o północy w barze, nie rzadki przypadek. Poza Europą (UTC+8) problem trwa 8 godzin.
Poprawka: klient wysyła `spent_on` jako lokalną datę, serwer dopuszcza do dnia UTC + 1 (górna granica UTC+14: dzień UTC + 1). Dopisać AC: „o 00:30 czasu polskiego dzisiejsza data jest przyjęta". Kurs dla takiej daty bierze ostatnią dostępną tabelę (reguła z uwagi 1). Tekst błędu „Tego dnia jeszcze nie było" jest niejasny, np. „Ta data jest z przyszłości".

**11. Jednostki walut i precyzja kursu**
Gdzie: l. 154, 166.
(a) `amount_minor int` (max ok. 2,1 mld) nie mieści np. 50 000 000 VND × 100; (b) nie wszystkie waluty mają 2 miejsca (JPY 0, KWD 3), więc „grosze" muszą wynikać z wykładnika ISO 4217; (c) JSON API NBP podaje kurs za 1 jednostkę z 4 miejscami, więc przy walutach o niskim kursie (HUF, JPY, IDR) zaokrąglenie kursu daje błąd względny rzędu procenta. Tego nie mogłem sprawdzić offline; brief słusznie każe to zbadać, ale nie daje kryterium.
Poprawka: `amount_minor bigint`, wykładnik waluty z tablicy ISO w kodzie; zbadać odpowiedź API i jeśli kurs jest za 1 jednostkę z 4 miejscami, zapisywać `fx_rate numeric(18,8)` i pobierać „za jednostkę" z tabeli XML/przelicznika; AC: HUF 25 000 i JPY 10 000 dają kwotę zgodną z opublikowanym kursem za 100 jednostek.

**12. „Czeka na kurs" musi blokować rozliczanie, nie tylko być wyłączone z sald**
Gdzie: l. 158, 238 (Q4).
Wydatek czekający na kurs jest poza saldami, więc lista przelewów jest niepełna, a ludzie mogą wykonać przelewy i kliknąć „Oddane" na liczbach, które za chwilę się zmienią. Brief nie mówi, co robi tekst na grupę (l. 133) ani „Wszystko oddane".
Poprawka: gdy istnieją wydatki w stanie `pending`, ekran „Żeby było równo" pokazuje u góry „1 wydatek czeka na kurs. Salda są jeszcze niepełne.", „Oddane" jest wyłączone dla kwot, których to dotyczy (albo cała lista), „Skopiuj tekst na grupę" niedostępne. Dociąganie kursu: przy każdym otwarciu przez dowolnego uczestnika oraz przy zapisie. Rekomendacja Q4 („czeka na kurs") słuszna, pod tym warunkiem. Dopisać AC (obecne AC 7 rozgałęzia się na dwa warianty).

**13. Przepustka jako wydatek: brak reguł dla przypadków, które w specu Przepustki istnieją**
Gdzie: l. 28, 183, 195, 223 (AC 11); Przepustka spec l. 137–139, 161, 173, 296, 377.
Nierozstrzygnięte: (a) kto jest „kupującym", gdy webhook Stripe nie ma ciasteczka (metadata ma `supabase_user_id`, a gość po etapie 3 nie ma konta): potrzebne `member_id` w metadata albo mapowanie `user_id → trip_members`; (b) `source = 'grant'` (ręczne nadanie) i Pro (`passSource: "pro"`) nie są płatnością, więc nie mogą tworzyć wydatku; (c) `charge.refunded` ustawia `refunded_at`, a wydatek zostaje; (d) idempotencja: „(trip_id, source)" nie wystarcza dla biletów (wiele na wyjazd), a dla Przepustki lepszy jest `stripe_session_id`; (e) wyjazd, który stał się grupowy po zakupie (l. 183) jest raz decyzją w treści, a raz pytaniem (Q8).
Poprawka: dopisać `source` jako tekst, np. `pass:{stripe_session_id}`, unikalny w `(trip_id, source)` (bilety `source = null`); wydatek tylko dla `source = 'purchase'`; `charge.refunded` miękko usuwa wpis (autor „Włóczykij") z historią; kupujący z `metadata.member_id` (organizator w etapie 2). Q8 usunąć lub rozstrzygnąć: brief już wybrał.

**14. Wydatek z biletu: etykieta „dodany sam" jest nieprawdziwa, a edycja ruszy status biletu**
Gdzie: l. 28, 54–55, 130, 184.
Wg briefu loty wydatek `flights` powstaje, gdy uczestnik wypełni formularz kwoty (loty l. 64–65), czyli ma autora; „dodany sam" pasuje tylko do Przepustki. Ostrzeżenie dotyczy tylko usunięcia (l. 130, 184), a poprawa udziałów (odznaczenie Ani w „Za kogo") też zabiera „ma bilet".
Poprawka: etykieta „z karty lotu · dodał Marek"; „dodany sam" tylko dla `pass`. Ostrzeżenie przy każdej zmianie wydatku `flights`, która zmienia zbiór osób lub usuwa: „Ten wpis to też status biletu. Ania straci »ma bilet«".

**15. Dwie rodziny: brief obiecuje, ale nie obsługuje podziału „po porcjach"**
Gdzie: l. 13, 239 (Q5); loty l. 66.
Grupa docelowa obejmuje „rodzinę, która chce się rozliczyć z drugą rodziną" (l. 13), a pierwsza wersja ma tylko „po równo" i „wybrane osoby" (Q5). Dzieci i niemowlęta nie mają wierszy w `trip_members`, więc wszystko dzieli się na dorosłych: rodzina z trójką dzieci płaci tyle samo co para bez dzieci. To nie błąd arytmetyki, to błąd wyniku. Przepustka i apartament nie są wrażliwe, ale kolacje już tak.
Poprawka: albo usunąć rodziny z „Dla kogo" w v1 i nazwać ograniczenie w ekranie („Dzielimy po równo między dorosłych"), albo dać minimalny interfejs wag: przy „Za kogo" obok każdej osoby stepper „porcje 1 / 1,5 / 2" (kolumna `weight` istnieje; wagi całkowite 1–3 wystarczą z mnożnikiem 2, np. 1, 2 = 1/2 porcji w dół nie, więc proponuję `weight` 1–4 oznaczający „porcje"). Decyzja Kacpra.

**16. Układ na komputerze: brief nie uwzględnia kolumny 448 px ani sąsiednich briefów**
Gdzie: l. 40–72, 139–140.
`origin/main`: `.app-shell { max-width: 448px; margin: 0 auto; … }` (`globals.css`), a szeroki układ jest tylko dla `body.is-home`. Brief obiecuje dwie kolumny 2/3 + 1/3 przy min. 1280 px z tabelą 5 kolumn i panelem przyklejonym, ale mówi jednocześnie, że wydatki to „sekcja w planie" (l. 139). Zaproszenia i loty mówią wprost, że plan zostaje wąski; plan buduje własny szeroki kontener z kolumną dnia 560–640 px i prawą kolumną z zakładkami Zmiany/Czat/Ekipa. W żadnej z tych szerokości pięciokolumnowa tabela się nie mieści, a „edycja w panelu z prawej" (l. 70) zajmuje to samo miejsce co saldo.
Poprawka: wydatki jako osobna trasa `/plan/{id}/wydatki` z własnym kontenerem szerokim (wzór `body.is-home`, nie zmiana globalnego `.app-shell`), układ dwukolumnowy od 1024 px, poniżej jedna kolumna jak na telefonie; z planu prowadzi link/kafel „Wydatki" (na komputerze może być zakładką prawej kolumny planu z krótką listą). Uzgodnić z właścicielem planu. Skutek do decyzji: gość bez konta na komputerze to drugie urządzenie, które wg zaproszeń Q6 „wyrzuca" telefon z miejsca, więc rozliczanie na laptopie jest realnie dla zalogowanych.

**17. Stały przycisk i arkusz dodawania nie spełniają „jednej ręki"**
Gdzie: l. 22–26, 77–107, 227 (AC 15).
(a) Stały przycisk „na dole ekranu" planu przez pół roku przed wyjazdem zasłania treść planu i koliduje z dolnym panelem czatu (plan) i paskami przeglądarki wbudowanej w Instagram/WhatsApp; brief nie mówi, kiedy się pojawia ani o `env(safe-area-inset-bottom)`. (b) Kolejność pól w arkuszu: kwota, „Kto płacił?", „Za kogo?", kategorie, tytuł, data, „Dodaj". Przy otwartej klawiaturze numerycznej (ok. 40 % ekranu 375 × 667) kategorie i „Dodaj" są pod nią lub poza zasięgiem kciuka. (c) Sprzeczność: l. 24 mówi, że kategoria jest „ostatnio użyta" (domyślna), a l. 26 i AC 15 liczą „kwota + kategoria + Dodaj" jako trzy dotknięcia; nie wiadomo, czy kategoria jest wymagana. Domyślna kategoria po cichu daje złe dane („Jedzenie" dla taksówki). (d) Dla rodziny z wyłączonym rozliczaniem pola „Kto płacił/Za kogo" są zbędne.
Poprawka: przycisk stały tylko w widoku wydatków i w oknie od dnia przed wylotem do 14 dni po powrocie, poza tym zwykły przycisk w sekcji. Arkusz: kwota, rząd kategorii, „Dodaj" przyklejone nad klawiaturą (`visualViewport`); pozostałe pola zwinięte w jeden wiersz „Płacisz Ty · za wszystkich (4) · dziś · Zmień". Kategoria wymagana, bez domyślnej (jedno dotknięcie, ale świadome), albo domyślna z widocznym podświetleniem i AC liczące dotknięcia tak samo. Dla `settle_enabled = false` ukryć „Kto płacił/Za kogo" pod „Zmień". AC: „po wpisaniu kwoty »Dodaj« jest widoczne bez przewijania na 375 × 667 z klawiaturą".

**18. Formy rodzajowe: aplikacja nie zna płci**
Gdzie: l. 31, 51 („Zapłaciłeś"), 107, 126, 127–129, 172.
„Zapłaciłeś: 640,99 zł" zobaczy też Ania; „poprawiła Ania", „Michał usunął", „zaznaczył Marek", „Ola (usunięta z wyjazdu)", „Ania dodała" wymagają zgadywania płci po imieniu (Kuba, Sasza, Nikola…). Marka głos jest „jak znajomy", ale błąd w formie obraża.
Poprawka: formy bezosobowe: „Zapłacone przez Ciebie: 640,99 zł"; „dodane: Michał · ostatnia zmiana: Ania, 21 lut"; „Oddane, zaznaczone przez Marka"; „Michał usunął…" → „Wydatek usunięty (Michał)"; „Ola (poza wyjazdem)". Spec 2.5 też używa „usunięty z wyjazdu", więc dopisać zgodę na zmianę.

**19. Metryki sukcesu są zawyżane przez wpisy dodawane same**
Gdzie: l. 17.
Przepustka dodaje wydatek automatycznie, więc każdy grupowy wyjazd z Przepustką ma „co najmniej jeden wydatek" bez żadnego użycia. `/admin/analytics` liczy z bazy. Drugi wskaźnik („salda zerowe w 14 dni") mierzy kliknięcia „Oddane", nie przelewy, i nie ma definicji dla wyjazdów rodzinnych z wyłączonym rozliczaniem ani dla wyjazdów, gdzie nikt nikomu nic nie wisi.
Poprawka: wskaźnik 1 liczy wydatki z `source is null` (ręczne, w tym bilety z formularza) i bez `pass`; wskaźnik 2 zdefiniować: wśród wyjazdów z `settle_enabled` i niezerowymi saldami na dzień powrotu, odsetek, w którym w 14 dni wszystkie salda mają zero. Zdarzenie `settlement_marked` z parametrem `confirmed`.

**20. Kryteria akceptacji pomijają to, co jest tu najbardziej ryzykowne**
Gdzie: l. 209–230.
Dobre są AC 1–5 (konkretne liczby) i 16 (własności). Brakuje: reguły godziny z uwagi 1; święta (np. 1 stycznia 2027, piątek, bierze tabelę z 31 grudnia 2026) i tabeli B z etykietą; HUF/JPY; wydatku o 00:30; idempotencji i wyścigu (konkretny mechanizm); `pending`; porcji i usuniętej osoby bez dołączenia (uwaga 2); sprawdzenia, że zmiana kwoty zachowuje kurs; gender-neutralnych tekstów; kategorii domyślnej. Sformułowania niemierzalne: AC 14 „403/brak danych" (wybrać jedno: 403 dla obcych z cookie, 404 dla braku wyjazdu), AC 15 „bez poziomego przewijania" (podać szerokości 320, 375, 1280), AC 7 (dwa warianty). AC 16 „liczba przelewów ≤ n − 1" nie sprawdza minimalności, jeśli wybrany zostanie dokładny algorytm (patrz 21).
Poprawka: dopisać AC odpowiadające uwagom 1, 2, 4, 7, 8, 10, 11, 12 oraz test: „liczba przelewów równa n minus maksymalna liczba rozłącznych podzbiorów o sumie zero" (porównanie z brute-force dla n ≤ 9).

**21. Algorytm przelewów: pytanie 2 jest niepotrzebne, a brief sprzecznie przypisuje decyzję**
Gdzie: l. 204, 236 (Q2); l. 477 specu.
Ryzyko 4 mówi, że „Kacper chce najmniejszej liczby [DK]", a Q2 pyta, czy to w ogóle robić. Dokładny algorytm jest tani: w `main` `MAX_GROUP = 9` (to miejsca, nie „8"), więc niezerowych sald jest co najwyżej ok. 9 plus usunięci uczestnicy. Standardowe DP po maskach (`dp[mask] = max_i dp[mask \ i] + (sum[mask] == 0)`) to 2^n · n operacji; dla n ≤ 16 pomijalne, powyżej zachłanny. Wewnątrz grupy o sumie zero zachłanny daje k − 1 przelewów, razem n − (liczba grup). Dla przykładu wynik to 3 (nie da się lepiej, patrz weryfikacja).
Poprawka: wprost wybrać dokładny algorytm do n ≤ 16, zachłanny powyżej, usunąć Q2. Określić determinizm: remisy po `trip_members.created_at, id`, żeby wszyscy na wszystkich urządzeniach widzieli tę samą listę. Uczciwie zapisać: dokładny algorytm może zaproponować inne pary niż intuicja (nie »największy dłużnik największemu«), ale nigdy więcej przelewów.

**22. „Wszystko oddane. Nikt nikomu nic nie wisi." przesadza**
Gdzie: l. 38, 119, 230 (AC 18).
Aplikacja zna tylko kliknięcia. Zdanie „nikt nikomu nic nie wisi" jest prawdą poza aplikacją, nie w niej, a przy `pending` albo zaokrągleniach bywa fałszywe.
Poprawka: „Wszystko zaznaczone jako oddane." (jeśli uwaga 5 przyjęta: „Wszystko oddane i potwierdzone."). Marka lubi konkret, a nie obietnice.

### Drobne

**23. Reszta groszy zawsze trafia do najwcześniej dołączonych**
Gdzie: l. 167, 211.
Organizator (pierwszy w kolejności) dostaje + 1 gr przy większości wydatków. Różnica to grosze, ale „kolejność dołączania" jest niedookreślona: miejsca rezerwowe nie mają `joined_at`. Użyć jednego klucza: `trip_members.created_at, id`. Zapisać to w AC 1–3. Nie ma potrzeby rotować reszt.

**24. Szczegóły NBP**
Gdzie: l. 149–152.
(a) `404` z API NBP dla dnia bez tabeli to normalny wynik, nie awaria; kod musi je odróżnić od timeoutu i `5xx`. (b) Okno wyszukiwania co najmniej 10 dni wstecz (święta + weekend). (c) Wynik z tabeli B oznaczyć w etykiecie („kurs NBP, tabela B, 17.02"). (d) Dodać test święta (patrz 20).

**25. Przeliczone „ok." na telefonie może się różnić od zapisanego**
Gdzie: l. 105.
Podgląd z cache może mieć inny kurs niż zapisany (uwaga 1). Pokazywać „ok." i datę kursu; po zapisie zawsze liczba z serwera. Do wiadomości wystarczy.

**26. Informacja tylko po najechaniu i skrót `N`**
Gdzie: l. 69–72.
Podział groszy „87,95 · 87,95 · 87,94 · 87,94" widoczny tylko po najechaniu nie istnieje na telefonie, klawiaturze i czytniku. Zrobić rozwijany wiersz. Skrót `N` musi działać tylko poza polami tekstowymi i dać się wyłączyć (WCAG 2.1.4).

**27. Teksty: ton i pewność**
Gdzie: l. 119, 122, 123, 128, 132, 133.
- „Na razie nic nie wydaliście. To się zmieni." — obietnica bez pokrycia; „Jeszcze nic tu nie ma. Pierwszy wydatek dodasz przyciskiem poniżej."
- „Zwolnij. Tyle wydatków w minutę to chyba pomyłka." — oskarża; po powrocie ludzie wpisują paragony hurtem. Limit liczbowy nie jest podany; ustawić np. 30 zapisów/min i tekst „Za dużo zapisów naraz. Spróbuj za minutę."
- „Wyjazd za Wami. Czas się rozliczyć." — brief sam obiecuje „bez ponagleń" (l. 141c). Pokazywać tylko osobom z niezerowym saldem, z możliwością zamknięcia, i nie dłużej niż 30 dni po powrocie.
- Tekst do wklejenia (l. 133) może się zestarzeć po edycji; dopisać datę i zdanie „Kursy: średni NBP z dnia wydatku."
- Notkę o kursie NBP (ryzyko 3, l. 203) pokazać także w wierszu wydatku walutowego, nie tylko w „Jak to wyszło?", bo różnica z wyciągiem to najczęstsza kłótnia.

**28. Pytania do Kacpra: dwa są już rozstrzygnięte w treści**
Gdzie: l. 183 vs 242 (Q8); l. 204 vs 236 (Q2); l. 139 vs 243 (Q9).
Q8 (Przepustka wstecznie) i Q2 mają odpowiedź w treści briefu; Q7 opiera się na błędnym założeniu: Przepustka 4,99 zł nie tworzy osobnych przelewów po 1,25 zł, bo przelewy liczy się z sald netto (w przykładzie nie dodaje żadnego przelewu). Drobna kwota może się pojawić tylko wtedy, gdy czyjeś saldo netto jest małe. Przepisać Q7: „Czy ukrywać przelewy poniżej 1 zł?" z konsekwencją „saldo nie zejdzie do 0,00".

**29. `settle_enabled` bez domyślnej wartości**
Gdzie: l. 194.
`boolean default false` ukryłoby rozliczenia także znajomym. Zapisać: `settle_enabled boolean null`, `null` = według `companion` (friends → tak, family → nie). Przełącznik zapisuje jawnie `true/false`. Zmiana `companion` w quizie po założeniu grupy nie nadpisuje jawnej wartości.

**30. Usunięcie konta organizatora kasuje rozliczenia całej grupy**
Gdzie: spec „Błędy" (kaskada), brief l. 207.
Po wyjeździe, w trakcie niezakończonych rozliczeń, organizator usuwa konto i grupa traci wiedzę o długach. Przed usunięciem konta i wyjazdu grupowego z niezerowymi saldami: „Zostały nieoddane pieniądze. Skopiuj listę na grupę." (ten sam tekst co l. 133). Do przekazania właścicielowi profilu.

**31. Dalsze drobiazgi**
- `parsePln` z `BudgetTracker` (l. 29–33 w kodzie) zwraca 0 dla tekstu z wyrazami przed liczbą po spacji, np. `"Loty (w obie strony) 300 zł"` (przeliczone), co dla `plannedBreakdown` w grupie daje „0 / 0". Brief opiera na nim „plan a wydano" (l. 196). Zalecenie: liczbowe pola planu zamiast parsowania tekstu, albo parser rozpoznający pierwszą cyfrę.
- Duże kwoty: brak potwierdzenia przy oczywistym błędzie (82 € zamiast 8 200 €). Prosty próg „Ta kwota jest 10 razy większa niż średnia. Na pewno?" przy > 5 000 zł.
- Zmiana `companion` z `friends` na `family`: co z już wpisanymi wydatkami? Dane zostają (AC 12 to już mówi), tylko widok się chowa.
- Definicja `Razem` i „Wydano": nie wlicza `deleted_at` i `pending`; dopisać do AC 13.
- Makieta paska postępu (patrz „Weryfikacja liczb").
- Spec 6.4 (533 / 74 / 108) różni się od AC; dopisać w specu notkę, że obowiązują liczby z briefu (ryzyko 6 to zakłada, ale nie wskazuje miejsca).

---

## Werdykt: **Z poprawkami**

Arytmetyka, struktura i przypadki brzegowe są dobre, a liczby w przykładzie są poprawne. Przed budową trzeba zamknąć uwagi 1, 2 i 3 (reguła kursu, miejsca-widma, widoczność zmian dla osoby, której saldo się zmienia), a także 4, 6, 16 (wyścig przy „Oddane", API wydatków dla części 4, układ komputera). Reszta to poprawki w trakcie budowy.

## Uwagi wymagające decyzji Kacpra

1. **Reguła kursu (uwaga 1):** czy zmiana kwoty zachowuje zapisany kurs (rekomendacja: tak, to zmiana zapisu specu 6.3) i jak traktujemy dzień bez opublikowanej jeszcze tabeli (rekomendacja: poprzednia tabela z podpisem).
2. **Widoczność zmian salda (uwaga 3):** zgoda, że zapis po stronie serwera, kiedy osoba ostatnio widziała saldo, nie łamie zasady „bez powiadomień".
3. **„Oddane" (uwagi 4 i 5):** czy zapisujemy faktycznie przekazaną kwotę (z możliwością zmiany) i czy dodajemy potwierdzenie odbiorcy.
4. **Miejsca-widma i usunięci (uwaga 2):** czy usunięcie miejsca, które nie dołączyło, zdejmuje jego udziały (rekomendacja: tak, z potwierdzeniem).
5. **Wagi/porcje (uwaga 15):** v1 bez wag i wycofanie dwóch rodzin z grupy docelowej, czy prosty stepper porcji.
6. **„Czeka na kurs" (uwaga 12, Q4):** tak, pod warunkiem blokady „Oddane" i tekstu na grupę przy niepełnych saldach.
7. **Układ komputera (uwaga 16):** osobna trasa `/plan/{id}/wydatki` ze szerokim kontenerem czy zakładka w planie; oraz skutek: goście na laptopie wyrzucają telefon z miejsca.
8. **Przepustka (uwaga 13):** czy wydatek `pass` powstaje tylko przy płatnej Przepustce (nie przy Pro i nie przy ręcznym nadaniu) i znika przy zwrocie.
9. **Formy bezosobowe (uwaga 18):** zgoda na zmianę formułowania, także w specu 2.5 („usunięty z wyjazdu").
10. **Metryki (uwaga 19):** definicja wskaźników bez wpisów dodawanych samych.

Q2 (algorytm minimalny) nie wymaga decyzji, jeśli przyjąć uwagę 21.
