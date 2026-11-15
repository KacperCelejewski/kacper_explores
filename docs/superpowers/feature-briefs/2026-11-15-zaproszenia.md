# Brief: Zaproszenia i uczestnicy (wyjazdy grupowe, część 2)

Data: 2026-11-15 (wersja 3, po recenzji kodu i recenzji UX) · Właściciel: agent funkcji „Zaproszenia i uczestnicy” · Pisane pod `origin/main` (`ac37e25`, część 1 zmergowana)
Źródła: spec `2026-11-14-wyjazd-ze-znajomymi-design.md` (część 2, „Bezpieczeństwo i prywatność”), spec Przepustki (etap 3, `wl_owner`), `BRAND.md`, `PRODUCT.md`, audyt z 13.11, recenzje `2026-11-15-zaproszenia-review.md` i `2026-11-15-ux-review.md`, briefy planu i rozliczeń. „U2” itd. odsyłają do wątków recenzji UX.

Oznaczenia: **[D]** decyzja Kacpra (spec z 14.11), **[K]** rozstrzygnięcie kontrolera (Kacper może zmienić), **[P]** moja propozycja, **[?]** otwarte pytanie (sekcja 9). „R3” itd. odsyłają do uwag recenzji.

## 1. Problem i dla kogo

**Organizator** ułożył plan dla ekipy i teraz sam pilnuje reszty: wkleja zrzuty ekranu, odpowiada „a kto jedzie?” i nie wie, kto w ogóle zajrzał. **Uczestnik** dostaje link na grupie i chce w 10 sekund zobaczyć, dokąd jedzie i co go czeka, bez konta i bez tłumaczenia komuś, kim jest.

Obietnica [P]: *Wklejasz jeden link na grupę, a każdy wybiera swoje imię i widzi ten sam plan, bez konta.*

Kto: ekipy 3–6 osób (22–35 lat) planujące na WhatsAppie i Messengerze oraz rodziny z dorosłym organizatorem. To drugorzędna grupa w PRODUCT.md, więc zero zmian dla solo i pary [D]. Funkcja jest darmowa [D]; to powód do powrotu i do poznania Włóczykija przez zaproszonych, nie źródło przychodu.

**Zakres tej części [K]:** uczestnik **ogląda plan** i korzysta z czatu, listy pakowania i restauracji w ramach dziennego limitu AI organizatora. Zapis planu (zmiana dnia, zamiana, dodanie punktu) dochodzi z częścią 5 (zapis na poziomie dnia, `409 DAY_CHANGED`). To jawne odstępstwo od brzmienia spec 2.5 (poprawka spec w sekcji 7).

## 2. Przepływ krok po kroku

### Organizator (musi mieć konto [K])

1. Plan z `companion` „znajomi” albo „rodzina” **i jawnym składem** (`isGroupTrip`, nie domysł z `groupFromCompanion`), z co najmniej dwiema osobami do zaproszenia. Stare wyjazdy bez `group` dostają przed zaproszeniem pole „Ilu was jedzie?” [P, R11]. W slocie «Nagłówek» planu (3.1) stoi „Zaproś ekipę” [D: przycisk].
2. Klik otwiera panel w trybie **przygotowania**: nic nie jest jeszcze zapisane. Lista miejsc to szkic: „Ty” (imię wpisane jawnie albo z profilu, nigdy prefiks maila [K, R16]) i „Osoba 2…N”. Organizator wpisuje imiona.
3. „Utwórz zaproszenie” to jawna akcja ze skutkami [P, R14]: zapisuje wiersze `trip_members` i link oraz uruchamia **wspólny hak `activateGroup`** (idempotentny): nadanie `id` punktom planu (brief planu), wydatek `pass`, jeśli Przepustka już jest (brief rozliczeń). Dopóki nikt nie dołączył, panel ma „Usuń zaproszenie” (wyjazd wraca do niegrupowego).
4. „Wyślij na WhatsAppa” (`wa.me/?text=`, bez numeru), „Kopiuj zaproszenie” (tekst + link) albo „Udostępnij…” (`navigator.share`, wykrywany funkcją, nie szerokością okna) [D, R23]. Do Messengera służą „Kopiuj” i „Udostępnij…”.
5. Nagłówek pokazuje inicjały ekipy (Ty pierwszy) i klik otwiera panel z listą, statusami i zarządzaniem.
6. Później: poprawia imiona, usuwa uczestnika (zawsze z nowym linkiem [K]), robi nowy link, widzi etykietę „Nowe” przy miejscach dopisanych przez gości i znacznik „zmieniono urządzenie” [P].

### Znajomy (bez konta)

1. Klika link w WhatsAppie; podgląd pokazuje miasto i (jeśli są) daty, bez imion [D].
2. `/dolacz/{token}`: „Zaproszenie: Barcelona”, długość lub daty, lista miejsc. Imię organizatora tylko jeśli je wpisał [K]. W przeglądarce wbudowanej (UA lub potwierdzony test, 6.4) **nad listą** ostrzeżenie z instrukcją „Otwórz w przeglądarce” [R3].
   **Urządzenie, które już ma miejsce w tym wyjeździe [K, U9],** nie widzi listy imion: od razu `router.replace` na `/plan/{id}` według głębokiego linku `/dolacz/{token}?do=termin|lot|wydatki` (przekierowanie na `/plan/{id}#bok-termin`, `#bok-lot` albo `/plan/{id}/wydatki`; na telefonie kotwica rozwija kartę z kroku paska stanu) [N4] i z komunikatem „Jesteś jako Ania · zmień”, żeby przypomnienie o głosowaniu otwierało kartę głosowania. Dotyczy każdego tekstu na grupę, bo wszystkie linkują do `/dolacz/{token}`.
3. Dotyka swojego imienia (jedno dotknięcie [D]). Serwer atomowo zajmuje miejsce (6.8), ustawia ciasteczko i robi `router.replace` na `/plan/{id}`, więc token znika z paska adresu i historii.
4. Na planie: „Jesteś w środku jako Ania. To nie Ty? Zmień”, a pod tym jedno zdanie z najbliższą akcją [U7]: w części 2 „Tu jest plan. Pytania zadasz w „Zapytaj Włóczykija”.”, po wejściu terminu „Zagłosuj na termin, reszta planu jest niżej.”. Potem stale „Jesteś jako Ania · zmień” [D]. **Zmień** to menu: „Zmień imię” (własne), „To nie ja” (zwalnia to urządzenie) [P, R8].
5. Brak imienia: „Nie ma mnie na liście”, wpisuje imię, dołącza jako nowa osoba, o ile jest miejsce w limicie (6.6). U organizatora miejsce ma etykietę „Nowe”. **Skład w planie i ceny się nie zmieniają** [K, R10].
6. Zajęte imię: „To Ty na nowym telefonie?” — przeniesienie dostępu albo dopisanie drugiego urządzenia (do dwóch na miejsce, 6.5) [D; K-kontroler: U10], z zawężeniami z sekcji 7 pkt 2.
7. Zalogowany gość: jeśli konto ma już miejsce w tym wyjeździe, wchodzi bez pytania. Inaczej po dołączeniu może kliknąć „Zaloguj się, żeby zachować ten wyjazd” (przypięcie konta tylko po tym kliknięciu, 6.12) [P, R12].

## 3. Ekrany (szkice tekstowe)

Stan `origin/main`: `.app-shell` ma 448 px także na desktopie. **Szkielet strony planu grupowego pisze brief „plan” (sekcja 4.0, jedyny obowiązujący).** Ten brief nie projektuje własnej kolejności bloków; panel ekipy to jeden współdzielony komponent. Karta siedzi w slocie «Nagłówek» (przyciski „Zaproś ekipę”, imiona ekipy, „Jesteś jako Ania · zmień”). Ekipa jest w slocie «Nagłówek», więc **nie ma osobnego kroku „Ekipa” w pasku stanu** [N6].

### 3.1 Co wnoszę do slotu «Nagłówek»

- Inicjały ekipy, **Ty zawsze pierwszy**, potem reszta po imieniu: „Ty, Michał, Ola, Tomek” [U15]. Klik otwiera panel ekipy.
- Organizator przed zaproszeniem: przycisk „Zaproś ekipę” z podpisem „Zapraszasz 3 osoby”. Po utworzeniu zaproszenia przycisk zastępują inicjały i status („Czekają: Michał, Ola”).
- Uczestnik: „Jesteś jako Ania · zmień” i inicjały.

### 3.2 Panel „Zaproś ekipę”

Wzorzec [U19]: **telefon = dolny arkusz, komputer ≥ 1024 px = okno 480 px**. Arkusz leży nad dolnym paskiem akcji planu i nie dokłada własnego stałego elementu u dołu ekranu [U11]; ten brief nie wprowadza żadnego `fixed` poza arkuszem i oknem.
Kolejność: tytuł + zamknięcie → jedno zdanie → „Kto jedzie” (pola imion, statusy, ostrzeżenie o nazwach domyślnych) → [po „Utwórz zaproszenie”] podgląd tekstu → **Wyślij na WhatsAppa** (główny na telefonie), **Kopiuj zaproszenie**, **Udostępnij…** (tylko przy `navigator.share`, wykrywane funkcją [R23]) → „Zrób nowy link” (szary tekst, tylko tutaj [U2]).
Na komputerze głównym przyciskiem jest **Kopiuj zaproszenie**, obok „Wyślij na WhatsAppa” (WhatsApp Web). Bez `navigator.clipboard` (przeglądarka wbudowana): pole z zaznaczonym tekstem i podpowiedzią „Przytrzymaj i skopiuj”.
**Uczestnik:** ten sam panel tylko do odczytu: lista bez „…”, **bez widocznego linku i bez „Zrób nowy link”** [K].
Listy: widz to zawsze „Ty” (pierwszy), reszta po imieniu; statusy bez czasownika osobowego: „Ty · organizator”, „Ania · jest w środku”, „Ola · czeka na link” [U15].

### 3.3 `/dolacz/{token}`

Osobny layout segmentu: bez `GlobalMenu` i z odłożonym `CookieBanner` (ciasteczko urządzenia jest niezbędne, banner nie zasłania listy) [P, R21]. Jedna kolumna 448 px, na komputerze wyśrodkowana. Kolejność:
1. Logo (bez „Zaloguj się” jako głównego działania).
2. [Ostrzeżenie o przeglądarce wbudowanej, jeśli dotyczy.]
3. Zdjęcie miasta; „Zaproszenie: Barcelona”; linia „3 dni · 4 osoby” (daty tylko potwierdzone, wstępne z dopiskiem „wstępnie”) [R18].
4. „Plan dzień po dniu jest już gotowy. Wybierz swoje imię i wchodzisz.” (z imieniem organizatora tylko jeśli je wpisał: „Michał zaprasza…”)
5. „Kim jesteś?” i duże przyciski imion (≥ 56 px): wolne aktywne; zajęte z dopiskiem „już ktoś jest”; miejsce organizatora zablokowane.
6. „Nie ma mnie na liście” (pole imienia + „Dołącz”).
7. Drobny tekst warunkowy [R24]: „Zapamiętamy to w tej przeglądarce. Jeśli zmienisz telefon, wybierz swoje imię jeszcze raz.”
8. Link tekstowy: „Masz konto? Zaloguj się”.

### 3.4 Plan uczestnika: uprawnienia w części 2 [K, R4]

| Akcja | Organizator | Uczestnik | Obcy |
|---|---|---|---|
| `GET /api/trips/[id]` (odświeżenie planu) | tak | tak | 404 / ekran braku dostępu |
| `chat`, `packing-list`, `restaurants` | tak | tak, z limitu AI organizatora | 404 |
| `.ics` (po stronie klienta) | tak | tak | — |
| PDF | jak dziś | ukryty do etapu 2 Przepustki | — |
| `regenerate-day`, `swap-activity`, `PATCH ai_plan_json`, „Dodaj punkt”, „Usuń punkt” | tak | **nie, 403** | 404 |
| Budżet (`BudgetTracker`, `localStorage`) | tak | ukryty (zastąpią go rozliczenia) | — |
| Nowy link, usuwanie uczestników, cudze imiona, usuwanie wyjazdu, `is_public` | tak | **nie, 403** | 404 |

Ukryte dla uczestnika: „Zamień punkt”, „Zmień dzień”, „Dodaj punkt”, „← Zmień kierunek” (prowadzi do quizu organizatora), „Udostępnij w galerii Odkryj”, kłódka PDF, widżet opinii, baner Pack/Pro, „Plan zapisany na Twoim koncie”. Zostaje „Zaplanuj nową podróż →” (nazwa z kodu, prowadzi do `/quiz`) i zapis na zrzut na dole. Konsekwencja: w części 2 ekipa „ogląda i pyta AI”, nie „zmienia”.
Zmiana API: `packing-list` i `restaurants` nie mają dziś `tripId` (sprawdzają tylko sesję). Dostają `tripId` i `getTripAccess`, inaczej nie da się autoryzować gościa.

## 4. Teksty (głos BRAND.md: bez emoji, bez wykrzykników, bez „niestety”; formy bezosobowe, bez rodzaju)

**Nagłówek:** „Zapraszasz 3 osoby” / „Zaproś ekipę”; po zaproszeniu: „Ty, Ania, Michał, Ola” + „Czekają: Michał, Ola” + „Zarządzaj”. Rodzina: „Jedziecie razem? Zaproś resztę”.
**Panel:** „Zaproś ekipę”. Lead: „Wklej link na grupę. Każdy wybiera swoje imię i widzi ten sam plan. Konta nie trzeba.” Przyciski: „Utwórz zaproszenie”, „Wyślij na WhatsAppa”, „Kopiuj zaproszenie”, „Udostępnij…”. Po skopiowaniu: „Skopiowano. Wklej na grupę.” Statusy (imię w mianowniku, bez czasownika osobowego): „Ty · organizator”, „Ania · jest w środku”, „Ola · czeka na link”, „Tomek · nowe”. Ostrzeżenie (nieblokujące): „Dwa miejsca mają jeszcze nazwy domyślne. Gość zobaczy „Osoba 3”.” Błąd imienia: „Wpisz imię, najwyżej 40 znaków, bez adresów.” Duplikat: „To imię już jest na liście. Dodaj literę albo nazwisko.”
**Nowy link:** „Stary link przestanie działać. Osoby, które już dołączyły, zostają w wyjeździe.” / „Zrób nowy” / „Zostaw stary”.
**Usunięcie [K]:** „Usunąć z wyjazdu: Michał? Straci dostęp do planu, a link zmieni się na nowy, żeby nie wrócił tym samym.” / „Usuń i zrób nowy link” / „Zostaw”. Po usunięciu panel od razu pokazuje nowy link z „Kopiuj zaproszenie”.
**Zgłoszenie składu [K, U20]:** dwie nazwy w całym UI: „skład” (liczba w planie i cenie) i „ekipa” (miejsca na liście). „Skład w planie: 4. Ekipa na liście: 5. Zaktualizować skład?” / „Zaktualizuj” / „Zostaw”.
**Tekst zaproszenia (domyślnie bez dat), znajomi:**
```
Barcelona, 3 dni. Plan jest rozpisany dzień po dniu. Zajrzyj i zajmij swoje miejsce:
https://wloczykij.me/dolacz/…
Konta nie trzeba, wybierasz swoje imię z listy.
```
Z potwierdzoną datą: „Barcelona, 20–22 lut. …” (wstępną oznaczamy „(wstępnie)”). Rodzina: „Wyjazd: Barcelona. Plan jest rozpisany dzień po dniu. Zajrzyj tutaj:” + ta sama stopka. Miasto w mianowniku (brak tablicy odmiany dla celów) [R18]. Generuje to `groupMessage("invite", ctx)` z 2.7; link jest zawsze w tekście. Teksty z innych części (przypomnienie o głosowaniu itd.) linkują do `/dolacz/{token}`, bo to jedyny link, który działa każdemu (6.15).
**`/dolacz`:** „Zaproszenie: Barcelona”; „Plan dzień po dniu jest już gotowy. Wybierz swoje imię i wchodzisz.”; „Kim jesteś?”; „Nie ma mnie na liście”; „Jak masz na imię?” / „Dołącz”. Zajęte: „To Ty na nowym telefonie?” — „Ania ma już ten wyjazd na innym urządzeniu. Jeśli to Ty, możesz przenieść dostęp tutaj albo zostawić oba urządzenia. Jeśli jesteście dwie osoby na jednym telefonie, wybierz „Nie ma mnie na liście”.” Wybór: „Przenieś tutaj” (domyślnie; na starym urządzeniu wyjazd się zamknie) / „Zostaw też tamto urządzenie” / „Nie, wróć do listy”. Przy trzecim urządzeniu: „To miejsce ma już dwa urządzenia. Dodanie tego zamknie wyjazd na najstarszym.” [U10] Po dołączeniu: „Jesteś w środku jako Ania. To nie Ty? Zmień”.
**Błędy:**
- Stary lub nieznany link: „Ten link już nie działa. Poproś organizatora o nowy.” W trakcie wyboru po zmianie linku: „Ten link został zmieniony. Poproś o nowy.” [R19]
- Usunięty uczestnik: „Nie jesteś już w tym wyjeździe.”
- Wyparty przez przejęcie: „Twoje imię zostało wybrane na innym urządzeniu. Jeśli to Ty, otwórz zaproszenie i wybierz je jeszcze raz.” [R6, U5]
- Wyjazd usunięty [K]: „Ten wyjazd już nie istnieje.”
- Obcy bez sesji na `/plan/{id}`: „Nie masz tu dostępu. Otwórz zaproszenie z grupy albo zaloguj się.” (jeden ekran dla wszystkich wyjazdów, nie ujawnia, czy wyjazd jest grupowy) [R15]
- Miejsce organizatora: „To miejsce organizatora. Zaloguj się, żeby wejść.” Miejsce z kontem: „To miejsce jest powiązane z kontem. Zaloguj się, żeby je przenieść.” [R12]
- Miejsce zablokowane: „To miejsce jest chwilowo zablokowane. Poproś organizatora o odblokowanie.”
- Lista pełna: „Lista jest pełna. Napisz do organizatora.” [R24]
- Za dużo prób: „Za dużo prób naraz. Poczekaj chwilę i spróbuj jeszcze raz.”
- Błąd serwera: „Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim.” Zapis (np. zmiana imienia): „Nie zapisało się. Spróbuj jeszcze raz — zwykle działa za drugim.” [U17]
- **Reguła głosu [K-kontroler: U5]:** imię zawsze w mianowniku (po dwukropku, w nawiasie, jako podmiot); czasowniki bezosobowe, w 1. osobie liczby mnogiej lub w czasie teraźniejszym; bez końcówek „-łem/-łeś/-ła/-ł” i bez odmiany imion. Teksty zależne od innych części (termin, loty, wydatki) pokazują się tylko przy włączonym kluczu tej części w `features.ts` [U16]; panel i zaproszenie bez zdania o wydatkach, dopóki ich nie ma.
- Ciasteczka zablokowane: „Ta przeglądarka blokuje ciasteczka, a bez nich nie zapamiętamy, kim jesteś. Otwórz link w Safari albo Chrome.”
- Przeglądarka wbudowana (nad listą): „Ten link otwarty w aplikacji może nie zapamiętać, kim jesteś. Otwórz go w Safari albo Chrome: menu „…” i „Otwórz w przeglądarce”.”
- Miejsce zajęte w międzyczasie: „To imię właśnie zostało zajęte. Wybierz inne albo dopisz się jako nowa osoba.”

## 5. Widoczność i odkrywalność [P]

1. **Plan:** „Zaproś ekipę” w slocie «Nagłówek» (3.1). Przy pierwszym wejściu na plan grupowy bez zaproszenia ma dopisek: „Znajomi dołączają linkiem, bez konta.” Kroku „Ekipa” w pasku stanu nie dodajemy (ekipa jest w «Nagłówku»).
2. **Quiz:** w `GroupSizePicker` (znajomi/rodzina) linijka: „Potem wyślesz im link do planu. Konta nie potrzebują.”
3. **Profil → „Moje podróże”:** chip „Zaproś ekipę” lub inicjały na karcie wyjazdu grupowego. `/api/profile` wybiera dziś wyjazdy po `trips.user_id` z limitem 5; zapytanie trzeba rozszerzyć o `trip_members.user_id` (w zakresie tej części) [R19].
4. **Dół planu:** istniejące „Udostępnij” (link publiczny, tylko oglądanie) w wyjeździe grupowym zmienia etykietę na „Podgląd publiczny” z opisem „Dla osób spoza ekipy, tylko do oglądania” [K].
5. **Strona główna:** linijka pod przykładowym planem: „Jedziecie razem? Wyślij link, każdy wybiera swoje imię, konta nie trzeba.” (faktyczna funkcja, bez liczb).
6. Bez banerów, popupów i maili „zaproś znajomych”.

Miary (spec): `group_invite_created`, `group_joined` (`slot`: `reserved`/`new`/`takeover`). Dodatkowo [P]: `group_invite_share_click` z `channel` (`whatsapp`/`copy`/`share`); to kliknięcie, nie dowód wysłania.

## 6. Przypadki brzegowe i stany błędów

1. **Stary link po „Nowym linku”:** komunikat z sekcji 4; dołączeni mają dostęp dalej (ciasteczko). Nieznany i stary token dają ten sam kod (`404`) [R6].
2. **Usunięty uczestnik:** wiersz dostaje `removed_at` i **zachowuje imię oraz skrót urządzenia**, więc serwer go rozpoznaje i zwraca `MEMBER_REMOVED` (nie `401`). Plan **zawsze** odpytuje `GET /api/trips/[id]` przy wejściu (store tylko jako szybki pierwszy render) i czyści `currentTrip` z persystowanego store przy `403/404`. Dziś `plan/[tripId]/page.tsx` robi `if (currentTrip?.id === tripId && currentTrip.plan) return;` bez zapytania, więc usunięty nadal widziałby plan, a `!r.ok → router.replace("/")` połyka `403/404` [R5]. Usunięcie zawsze zmienia link [K].
3. **Wyczyszczone dane/nowy telefon:** otwiera link, wybiera swoje (zajęte) imię, „To Ty na nowym telefonie?”.
4. **Przeglądarki wbudowane (Instagram, Messenger, WhatsApp) [R3].** Ciasteczko z takiej przeglądarki może nie być widoczne po otwarciu planu w Safari/Chrome. WhatsApp na iOS prawdopodobnie otwiera linki w widoku bez wspólnych ciasteczek z Safari, a jego User-Agent wygląda jak Safari, więc po UA go nie wykryjemy. **Warunek wypuszczenia [K]:** test na 4 urządzeniach (iPhone: WhatsApp, Instagram, Messenger; Android: WhatsApp) z jedną stroną testową: czy ciasteczko ustawione w przeglądarce wbudowanej jest widoczne po otwarciu tego samego adresu w Safari/Chrome. Wynik wpisujemy do briefu jako fakt. Ostrzeżenie nad listą imion pokazujemy zawsze, gdy UA wskazuje Instagram/Facebook/Messenger, a dla WhatsAppa, jeśli test potwierdzi problem.
   **Link przywracający miejsce [K, warunkowo]:** budujemy go **tylko jeśli test potwierdzi problem**. Po dołączeniu przycisk „Skopiuj mój link do planu” daje osobisty adres odzyskania **jednego miejsca**: osobny token miejsca (32 bajty, skrót w bazie), nowy po każdym użyciu, z tymi samymi zabezpieczeniami co `/dolacz` (sekcja 7 pkt 1). Bez potwierdzenia testem go nie ma.
5. **Telefon i komputer jednej osoby [K-kontroler: U10, zmiana wobec wcześniejszego „jedno urządzenie na miejsce”]:** do **dwóch urządzeń na miejsce**, jedno urządzenie = jedno miejsce w wyjeździe. Drugie urządzenie dopisuje się przez „To Ty na nowym telefonie?” z opcją „Zostaw też tamto urządzenie” (domyślnie przeniesienie). Trzecie zastępuje najstarsze (komunikat w sekcji 4). Schemat: tabela `trip_member_devices` (`member_id`, `device_token_hash`, `added_at`) zamiast pojedynczej kolumny `device_token_hash`; limity i blokada z sekcji 7 pkt 2 liczą się na miejsce. Wariant zapasowy, jeśli kontroler zostawi jedno urządzenie: okno na komputerze mówi wprost „Na telefonie ten wyjazd się wtedy zamknie.” Para na jednym telefonie: druga osoba wybiera „Nie ma mnie na liście”. Urządzenie z miejscem, które wybiera inne, najpierw dostaje „To nie ja” (inaczej unikalny indeks daje błąd 500) [R8].
6. **Lista pełna / `MAX_GROUP`:** `MAX_GROUP = 9` to miejsca w samolocie (dorośli i dzieci od 2 lat; niemowlęta nie), a `isValidGroup` odrzuca też więcej niemowląt niż dorosłych. Miejsca na liście: dorośli **oraz dzieci od 12 lat** (lecą jako dorośli, mają telefon) [P, R10]. „Nie ma mnie na liście” dopuszczone, gdy liczba miejsc ≤ `MAX_GROUP` minus dzieci 2–11 lat.
7. **Skład a lista [K, R10]:** dopisanie przez gościa i usunięcie miejsca **nie zmieniają** `quiz_answers.group` ani cen. Organizator widzi baner „Skład w planie: 4. Ekipa na liście: 5. Zaktualizować skład?”. Ręczna aktualizacja uruchamia istniejące mechanizmy (cena „razem”, lot do odświeżenia) i nie może złamać `isValidGroup`.
8. **Wyścig o to samo miejsce [R8]:** `device_token_hash` żyje teraz w `trip_member_devices` (jedno wiersz na urządzenie, max 2 aktywne na miejsce, unikalny `(trip_id, device_token_hash)` dla aktywnych [K-kontroler: U10]), więc indeks pilnuje jednego miejsca na urządzenie, ale nie wyścigu o wolne miejsce. Zajęcie to warunkowy zapis w funkcji SQL (`update … where id = $1 and device_token_hash is null returning *`), która odróżnia „zajęte teraz” od „przejęcie”. Funkcje `SECURITY DEFINER` mają `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated` i `GRANT … TO service_role`, inaczej klucz anon zajmie miejsce bez limitów.
9. **Ciasteczko [P, nie D]:** 180 dni zamiast 90 [K, R13], przedłużane w trasie API `GET /api/trips/[tripId]` (Server Components nie ustawiają ciasteczek). Spec sam podpisał 90 dni jako propozycję Claude'a.
10. **Wyjazd lub konto organizatora usunięte:** „Ten wyjazd już nie istnieje” [K; bez tombstone’a, bo po kaskadzie nie ma skąd wziąć innego komunikatu]. Usuwanie konta w profilu ostrzega, że znika też wyjazd grupowy [D].
11. **Wygasanie zaproszeń [K]:** link przestaje działać 30 dni po zakończeniu wyjazdu (bez dat: 180 dni od utworzenia) [P: termin]. Dołączeni zostają.
12. **Logowanie gościa [R12, R1]:** (a) token **nie** idzie w `next`: serwer zapisuje go w krótkim ciasteczku `httpOnly` `wl_join` (15 min), a `next` to stała ścieżka powrotu; (b) `auth/callback` przypina miejsce do konta tylko po jawnym kliknięciu „Zaloguj się, żeby zachować ten wyjazd”, tylko gdy miejsce nie ma jeszcze `user_id`, a konto nie ma innego miejsca w tym wyjeździe (indeks `(trip_id, user_id)` dla aktywnych); (c) nigdy nie nadpisuje istniejącego `user_id` (partner logujący się na telefonie Ani nie przejmuje jej miejsca); (d) konto z miejscem na nowym urządzeniu wchodzi bez pytania.
13. **Organizator otwiera własny link w przeglądarce wbudowanej:** „To miejsce organizatora. Zaloguj się, żeby wejść”. Zalogowany organizator: przekierowanie na plan.
14. **Bot (podgląd WhatsApp/Messenger/Slack):** `GET` bez skutków ubocznych i bez limitu na IP (zablokowałby podgląd); odpowiedź cachowana po stronie serwera (skrót tokenu → metadane). Dołączanie tylko `POST`.
15. **Link do `/plan/{id}` bez roli:** ekran braku dostępu (sekcja 4), nie `/login`.
16. **Brak dat:** domyślny wariant zaproszenia i szkiców to „3 dni”.
17. **Imiona:** wśród aktywnych unikalne (`lower(btrim(name))`, NFC, bez znaków formatujących, max 40, bez URL). `/share/{id}` jest niezależne od grupy.
18. **Link odtwarzalny [K-kontroler: U2; odstępstwo od spec i DECYZJA KACPRA].** Spec trzyma w bazie tylko skrót tokenu zaproszenia, więc po zamknięciu panelu organizator nie mógłby ponownie skopiować linku, a każdy późniejszy tekst na grupę (przypomnienie o głosowaniu, lot, rozliczenia) wymagałby nowego linku, który unieważnia stary. Przyjęte: token zapisany także **zaszyfrowany kluczem serwera** (AES-256-GCM, kolumny `token_enc`, `key_version`), obok skrótu do wyszukiwania. Każdy przycisk „Skopiuj … na grupę” (termin, loty, rozliczenia) wstawia **ten sam aktualny link bez skutków ubocznych**; „Zrób nowy link” istnieje tylko w panelu ekipy. Zabezpieczenia: klucz w zmiennej środowiskowej (nie w repo), rotacja przez `key_version` z ponownym szyfrowaniem, odszyfrowanie tylko po stronie serwera. **Token wraca do klienta tylko w odpowiedzi na jawne żądanie gotowego tekstu (`POST /api/trips/{id}/group-message` z rodzajem tekstu), dla każdej roli z dostępem; nigdy w `GET` planu, w logach ani w GA4.** Uczestnik nie widzi pola z linkiem ani „Zrób nowy link” [N3, K-kontroler]. **Wariant zapasowy** (jeśli Kacper się nie zgodzi): tylko skrót, a teksty z innych części bez linku („Wejdźcie w plan z wcześniejszego linku”) — wyraźnie gorszy. Pytanie 1.

## 7. Zależności i ryzyka

**Zależności**
- Token urządzenia `wl_owner` i skrót SHA-256 (Przepustka, etap 3, pkt 3.1): kto pierwszy, buduje [D]. Część 2 tworzy `getTripAccess`/`TripAccess` z samymi rolami [D].
- `GET /api/trips/[tripId]`, `chat`, `packing-list`, `restaurants` przez `getTripAccess`; zmiana ładowania w `plan/[tripId]/page.tsx`, `/api/profile`, `auth/callback`.
- **Poprawka spec do zatwierdzenia [K]:** spec 2.5 („Wpuszczają każdego z rolą: … zapisy planu, `regenerate-day`, `swap-activity`, `modify-day`, `chat`, …”) zastąpić: *„W części 2 uczestnika wpuszczają `GET /api/trips/[tripId]`, `chat`, `packing-list`, `restaurants`. Trasy zapisujące plan wpuszczają uczestnika dopiero z częścią 5 (5.2).”* Spec 2.3 („Pierwsze kliknięcie zakłada wiersz organizatora…”) zastąpić jawną akcją „Utwórz zaproszenie”. Spec 2.1: ważność 180 dni.
- **Schemat `trip_members` uzgodniony z briefami planu i rozliczeń:** kolumny spec (`id`, `trip_id`, `name`, `role`, `user_id`, `device_token_hash`, `joined_at`, `removed_at`, `created_at`) plus `added_by` (`organizer`/`guest`) i `acknowledged_at` (etykieta „Nowe”) [P]; `device_token_hash` przechodzi do `trip_member_devices` (6.5). **Znaczniki „od ostatniej wizyty” liczone na serwerze, przy miejscu [K-kontroler: U6]:** plan używa `trip_members.last_seen_change_at`, rozliczenia `ledger_seen_*` (`ledger_seen_at`, `ledger_seen_balance_minor`). Kolumny dodaje migracja części, która ich używa, więc część 2 ich nie dodaje i nie rośnie; ten brief wymaga tylko, żeby znaczniki były na miejscu (nie na urządzeniu) i **dziedziczone po przejęciu i dopisaniu drugiego urządzenia**. Nazwy do uzgodnienia z właścicielami planu i rozliczeń. `updated_*` należą do `expenses` (część 4/6), nie do `trip_members`. Usunięty wiersz **zostaje z imieniem**, bo wydatki, reakcje i głosy odwołują się do `member_id`; unikalność imienia dotyczy tylko aktywnych. `activateGroup(tripId)` jest jedynym punktem wejścia dla haków planu (id punktów) i rozliczeń (wydatek `pass` z kluczem idempotencji `source`).
- **Tabela zdarzeń [P, R6, R7]:** `trip_member_events` (`join`, `takeover`, `remove`, `leave`, `rename`, `new_link`; przy `takeover` skrót poprzedniego urządzenia). Część 5 (`plan_changes.member_takeover`, widoczność dla grupy) ją absorbuje; w części 2 zdarzenia widzi tylko organizator jako znacznik „zmieniono urządzenie”.
- Prawnik: polityka prywatności, `/cookies`, §2 regulaminu.

**Ryzyka i środki**
1. **Link jest sekretem; token może wyciec** [R1, R22]. (a) `sanitizeUrl()` w `Analytics.tsx` dla `page_path`, `page_location`, `click_url`, `page_title`, `scroll_depth`, `affiliate_click` (`/dolacz/*` i `next=` z `/dolacz/` → `/dolacz/[token]`); (b) na `/dolacz` stałe `data-track` na przyciskach imion, żeby `click_label` nie niósł imienia (albo bez `ui_click` na tej ścieżce); (c) logowanie bez tokenu w `next` (6.12); (d) `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`, `Cache-Control: no-store` dla `/dolacz/:path*` w `next.config.ts` (dziś nagłówki są tylko dla `/api/*`) i w `metadata`; `noindex` meta zamiast `robots.txt`, żeby podglądy działały (`/plan/` ma `Disallow`, `/dolacz` celowo nie); (e) trasa `og:image` dla tokenu to nowy plik (istnieje tylko główny `opengraph-image.tsx`); (f) w bazie skrót, a zaszyfrowany token tylko za zgodą Kacpra (6.18, pytanie 1); klucz w env, rotacja `key_version`, token nigdy w logach ani GA4.
2. **Przejęcie miejsca przez kogoś z linkiem** [D: ryzyko przyjęte; K: zawężenia przyjęte]. Miejsca organizatora i miejsca z `user_id` nie do przejęcia z linku bez zalogowania na to konto. Limity (liczone na miejsce, bez zmian mimo dwóch urządzeń) **w bazie, atomowe** (jak `consume_ai_call`), bo `checkRateLimit` to pamięć instancji i na serverless nie działa [R2]: próby per urządzenie (hash + IP, np. 5/h), dołączanie per IP szeroko (np. 30/h, bo ekipa siedzi w jednym Wi-Fi), po 3 przejęciach jednego miejsca w godzinę blokada do „Odblokuj” u organizatora. Bez limitu „na wyjazd” (napastnik zablokowałby prawowitego), `GET` bez limitu IP.
2a. **Dwa urządzenia na miejsce [K-kontroler: U10]:** większa powierzchnia ataku (drugie urządzenie dopisuje się tą samą ścieżką co przejęcie, więc podlega tym samym limitom, blokadzie i zdarzeniom `trip_member_events`) oraz więcej migracji (`trip_member_devices`). Zysk: wpisywanie wydatków wieczorem na laptopie bez utraty telefonu.
3. **Link znają wszyscy uczestnicy [K-kontroler]:** każdy może go przekazać dalej, więc wyciek jest realny; remedium to „Zrób nowy link” u organizatora (dołączeni zostają). **Uczestnicy nie zapisują planu do części 5** [K]; zużywają dzienny limit AI organizatora (30 dziennie) przez `chat`/`packing-list`/`restaurants`, których wyniki nie są wspólne, więc każdy płaci własnym wywołaniem [D: akceptujemy]. Komunikat: „Dzienny limit AI dla tego wyjazdu się skończył. Wróćcie jutro.”
4. **Ciasteczko w przeglądarkach wbudowanych** (6.4): główne ryzyko obietnicy „link + imię + ciasteczko”. Warunek wypuszczenia: wynik testu na 4 urządzeniach.
5. **Nadużycia:** obraźliwe imiona widoczne dla grupy (organizator usuwa; filtr z 6.17); zalew miejscami (limit miejsc, usuwanie, etykieta „Nowe”); enumeracja tokenów (32 bajty).
6. **Prywatność:** imiona nie trafiają do Gemini [D]; dane to imię, skrót tokenu, opcjonalnie `user_id`. Imię organizatora na `/dolacz` tylko jeśli je wpisał [K]. Link pokazuje miasto i imiona każdemu, kto go ma; lekarstwem jest „Zrób nowy link”.
7. **Zakup Przepustki przez uczestnika** dopiero po etapie 3 Przepustki [D]; gość nie widzi ścieżki zakupu.

## 8. Kryteria akceptacji (z metodą sprawdzenia)

1. (e2e) `friends`/`family` z jawnym składem widzą „Zaproś ekipę” w slocie «Nagłówek»; solo, para i stare wyjazdy bez `group` nie widzą go bez pola „Ilu was jedzie?”.
2. (test) Otwarcie panelu niczego nie zapisuje; „Utwórz zaproszenie” zakłada organizatora i miejsca (dorośli + dzieci od 12 lat − 1) i wywołuje `activateGroup` raz; drugie wywołanie niczego nie duplikuje; „Usuń zaproszenie” przed dołączeniem cofa stan.
3. (jedn.) Token 32 bajty base64url, w bazie skrót i (jeśli Kacper się zgodzi) szyfrogram. „Nowy link” unieważnia stary: `404` i „Ten link już nie działa…”. Test: kolejne „Skopiuj … na grupę” z różnych briefów zwracają ten sam link i nie zmieniają stanu w bazie; klucz i token nie pojawiają się w logach.
4. (jedn.) Tekst zaproszenia zawiera link; `wa.me/?text=` bez numeru; „Udostępnij…” tylko przy `navigator.share`; brak `navigator.clipboard` ma zastępcze pole.
5. (jedn./HTTP) `og:title`/`og:image` bez imion, wariant bez dat poprawny; odpowiedź `/dolacz/*` ma `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`, `Cache-Control: no-store`.
6. (e2e) Wolne imię: jedno dotknięcie → ciasteczko + `router.replace` na `/plan/{id}`; token nie wraca po „wstecz”.
7. (test współbieżności) Dwa równoległe zajęcia tego samego wolnego miejsca: jedno wygrywa, drugie dostaje „To imię właśnie zostało zajęte…”. Test `REVOKE`: klucz anon nie wywoła funkcji zajęcia.
8. (jedn.) Urządzenie z miejscem wybierające inne: bez błędu 500 (najpierw „To nie ja”).
9. (jedn.) Przejęcie: nowe urządzenie ma dostęp; stare (jeśli zostało zastąpione) dostaje „Twoje imię zostało wybrane na innym urządzeniu…”; zdarzenie `takeover` w `trip_member_events`; znacznik u organizatora.
10. (jedn.) Miejsca organizatora i z `user_id` nie do przejęcia bez zalogowania na to konto; komunikaty z sekcji 4.
11. (test, 2 procesy) Limity w bazie: 6 prób przejęcia z różnych instancji kończy się odmową; 3 przejęcia miejsca w godzinę blokują je do „Odblokuj”; podgląd (GET) nie jest limitowany.
12. (jedn.) Tabela 3.4: uczestnik `403` na trasy zapisujące i akcje organizatora, obcy `404`; ukryte „Zamień punkt”, „Zmień dzień”, „Dodaj punkt”.
13. (e2e) Usunięty uczestnik z wcześniej załadowanym store dostaje „Nie jesteś już w tym wyjeździe.”, nie widzi planu, nie ląduje na `/login`; usunięcie zmienia link.
14. (jedn.) Dopisanie gościa i usunięcie miejsca nie zmieniają `quiz_answers.group` ani cen; baner „Skład w planie…” się pojawia; aktualizacja nie łamie `isValidGroup`.
15. (jedn.) Imiona: trim, NFC, unikalność wśród aktywnych, 40 znaków, bez URL; „Zmień imię” własnego miejsca działa.
16. (e2e) Logowanie z `/dolacz`: `next` bez tokenu, ciasteczko `wl_join`; przypięcie tylko po kliknięciu, bez nadpisania istniejącego `user_id`; `/api/profile` zwraca wyjazd uczestnika.
17. (e2e, `gtag`/`dataLayer`) Po wejściu na `/dolacz/{token}` i kliknięciu imienia żadne wywołanie nie zawiera tokenu ani imienia; test jednostkowy `sanitizeUrl`; przegląd wszystkich `trackEvent`.
18. (e2e) `/plan/{id}` bez roli i sesji: ekran braku dostępu, bez przekierowania; wyjazd usunięty: „Ten wyjazd już nie istnieje.”
19. (ręczny, urządzenia) Test 4 urządzeń z 6.4 wykonany, wynik zapisany w briefie; decyzja o linku przywracającym podjęta na jego podstawie. **Warunek wypuszczenia.**
20. (ręczny) iPhone/Safari i Android/Chrome: zaproszenie → dołączenie → przejęcie; link z WhatsAppa i z Instagrama; 375 px bez poziomego przewijania; cele ≥ 44 px; kontrast WCAG 2.1 AA; baner ciasteczek nie zasłania listy imion.
21. (jedn.) Ciasteczko 180 dni przedłużane przez `GET /api/trips/[tripId]`; zdarzenia GA4 bez imion.
22. (e2e) Urządzenie z aktywnym miejscem otwierające `/dolacz/{token}` trafia na plan w ≤ 1 przekierowaniu, bez listy imion, według `?do=termin|lot|wydatki` → `#bok-termin`, `#bok-lot`, `/plan/{id}/wydatki`; na telefonie kotwica rozwija właściwą kartę [U9, N4].
23. (jedn./e2e) Do dwóch urządzeń na miejsce: drugie dopisuje się z opcją „Zostaw też tamto urządzenie”; trzecie zastępuje najstarsze; znaczniki „od ostatniej wizyty” zostają przy miejscu [U10, U6].
24. (e2e, 375 × 667) Arkusz panelu ekipy nie nakłada się na inne elementy `fixed`, z klawiaturą i bez; `/dolacz` nie ma `GlobalMenu` [U11].
25. (skan tekstów) Wszystkie teksty tego briefu i kodu funkcji: brak form „-łem/-łeś/-ła/-ł” (z wyjątkiem słów nieosobowych typu „został”, wymienionych na liście dozwolonych) i brak odmienionych imion na danych testowych (Ola, Kuba, Nikola, Michał) [U5].
26. (jedn.) Na listach widz to „Ty” (pierwszy), pozostali po imieniu; statusy bez czasownika osobowego [U15]. Ekrany z liczbą osób nazywają ją „skład” albo „ekipa” [U20].
27. (e2e/jedn.) Uczestnik kopiuje przypomnienie o głosowaniu i tekst rozliczenia z działającym linkiem (`POST /api/trips/{id}/group-message`); odpowiedź `GET /api/trips/{id}` nie zawiera tokenu [N3].

## 9. Otwarte pytania do Kacpra

1. **DECYZJA KACPRA: odzyskiwanie linku (6.18).** Token zaszyfrowany kluczem serwera obok skrótu (odstępstwo od spec, przyjęte przez kontrolera dla potrzeb projektu), czy wariant zapasowy: tylko skrót i teksty bez linku?
2. **Poprawka spec 2.1, 2.3, 2.5** (sekcja 7): zatwierdzasz brzmienie?
3. **Nastolatki 12–17 lat:** miejsca także dla nich (liczone jak dorośli, rekomendacja), czy tylko przez „Nie ma mnie na liście”?
4. **Blokada miejsca po 3 przejęciach w godzinę** do ręcznego „Odblokuj” (organizator dowie się dopiero po wejściu w panel): akceptujesz, czy bez blokady, tylko limity i dziennik zdarzeń?
5. **Wygasanie zaproszeń** 30 dni po wyjeździe (bez dat: 180 dni od utworzenia): termin w porządku?
6. **Test na 4 urządzeniach:** kto go robi i kiedy (warunek wypuszczenia, kryterium 19)?
7. **Para bez „Zaproś”** w tej wersji [K]: zostaje, czy dodać „Zaproś drugą osobę” później?
8. **Dwa urządzenia na miejsce (U10):** potwierdzasz zmianę względem wcześniejszego „jedno urządzenie na miejsce” (nowa tabela `trip_member_devices`)?

## 10. Odpowiedzi na recenzję (zgoda częściowa lub sprzeciw)

- **R8 (jedno dotknięcie):** zostawiam [D] jedno dotknięcie bez potwierdzenia przy wolnym imieniu, ale dodaję natychmiastowe „To nie Ty? Zmień” oraz „Zmień imię”/„To nie ja” (recenzja dopuszcza tę wersję). Okno „Zgadza się?” wydłużałoby ścieżkę, która ma być krótka.
- **R3 pkt 3 (link przywracający):** nie wpisuję go bezwarunkowo, tylko jako obejście zależne od testu, zgodnie z [K].
- **R6 (tombstone):** nie dodaję `deleted_trips`; zgodnie z [K] komunikat to „Ten wyjazd już nie istnieje”.
- **R13 (400 dni):** biorę 180 dni z [K]; przedłużanie przy każdej wizycie zostaje.
- **R10 (miejsca dla nastolatków):** przyjmuję jako [P] i pytanie 3, bo zmienia liczbę miejsc względem spec.
- **R14:** nie zmieniam układu planu w części 2; zdanie „nie proponuję przebudowy” zastąpiło odwołanie do wspólnego komponentu z briefem planu.
- **R9(a):** ostrzeżenie o domyślnych nazwach jest nieblokujące, bo wymuszanie imion utrudniałoby szybkie wysłanie linku.
- Pozostałe uwagi (R1, R2, R4, R5, R7, R11, R12, R15–R24) przyjęte. R20 rozbite na 21 kryteriów z metodą sprawdzenia.

## 11. Odpowiedzi na recenzję UX

- **U1:** zgoda. Zrezygnowałem z własnego „paska ekipy między zdjęciem a kartą kosztu”; cytuję slot „nagłówek” i opisuję tylko jego treść (3.1).
- **U2:** zgoda, odstępstwo od spec opisane jawnie jako DECYZJA KACPRA z zabezpieczeniami i wariantem zapasowym (6.18). Uczestnik też może używać przycisków „Skopiuj … na grupę” [K-kontroler]: zna link, bo przez niego dołączył; nie widzi pola „link zaproszenia” ani „Zrób nowy link”, a skopiowany tekst wstawia ten sam aktualny link.
- **U5:** zgoda. Poprawiłem „Ktoś inny wybrał…”, „Ktoś właśnie zajął…”, „Ten link się zmienił”; dodałem regułę i kryterium 25 (skan). Zostawiam podmiot w mianowniku przy „Ania ma już ten wyjazd…” i „Michał zaprasza…”, bo to nie odmiana ani forma rodzajowa.
- **U6:** zgoda. Zdanie o `localStorage` usunięte; znaczniki na serwerze przy miejscu, kolumny dodają migracje planu i rozliczeń, część 2 tylko wymaga dziedziczenia po przejęciu i dopisaniu urządzenia.
- **U7:** przyjęte w części należącej do mnie: zdanie z najbliższą akcją po wejściu uczestnika. Pasek stanu wyjazdu należy do briefu planu.
- **U9:** zgoda, w przepływie (2) i kryterium 22. Kotwice `#termin` i `#wydatki` muszą uwzględnić inne briefy.
- **U10:** zastosowane na polecenie kontrolera (do dwóch urządzeń na miejsce, `trip_member_devices`). Zastrzeżenie: rozszerza zakres części 2 i zmienia wcześniejsze [K] „jedno urządzenie na miejsce”; wariant zapasowy z tekstem „Na telefonie ten wyjazd się wtedy zamknie.” zostawiony.
- **U11:** zgoda. Ten brief nie dodaje żadnego stałego elementu poza arkuszem i oknem; `/dolacz` bez `GlobalMenu`; przeniesienie FAB „Menu” do nagłówka na trasach planu należy do planu.
- **U15, U20:** zgoda. Ty pierwszy, statusy bez czasownika osobowego, „skład” i „ekipa”.
- **U16, U17, U18, U19:** zgoda. Teksty o innych częściach tylko przy włączonym kluczu `features.ts`; „Dodaj punkt”/„Zamień punkt”; komunikaty ponowienia; arkusz na telefonie, okno 480 px od 1024 px.
- **Wątki, których nie dotyczy ten brief:** U3, U4, U8, U12–U14, U21, U22.
- **Link a uczestnicy [K-kontroler]:** przyciski „Skopiuj … na grupę” (przypomnienie o głosowaniu, rozliczenia) są dostępne dla wszystkich ról i wstawiają ten sam aktualny link. Uczestnik nie widzi pola linku ani „Zrób nowy link” (tylko panel organizatora). Ryzyko: każdy uczestnik może przekazać link dalej; remedium to „Zrób nowy link” u organizatora (6.1, ryzyko 6).
- **Druga runda UX [N3, N4, N6]:** przyjęte dosłownie. 6.18 i kryterium 27 (token tylko w odpowiedzi na `group-message`); głęboki link `?do=termin|lot|wydatki` (2, kryterium 22); cytaty slotów z planu 4.0 («Nagłówek»), bez wariantu „na górze obecnej kolumny” i bez kroku „Ekipa” w pasku stanu.
