# Opinia o briefie: Zaproszenia i uczestnicy (część 2)

Data: 2026-11-15 · Recenzowany plik: `docs/superpowers/feature-briefs/2026-11-15-zaproszenia.md` · Kod sprawdzany na `origin/main` (`ac37e25`)
Odwołania "l. N" dotyczą numerów linii briefu. Odwołania do kodu mają postać `plik:linia` z `origin/main`.

Decyzji Kacpra (znajomi bez konta, link + imię + ciasteczko, własny token i klucz serwisowy, jedna Przepustka, tekst do wklejenia) nie podważam. Wskazuję tylko skutki.

## Streszczenie

Brief jest dobrze zorganizowany i uczciwie oznacza [D]/[P]/[?]. Poprawnie sprawdził kilka rzeczy w kodzie: `MAX_GROUP = 9` liczy miejsca z dziećmi od 2 lat (`src/lib/group.ts:10,24-26,41-52`), plan na `401` przenosi na `/login` (`plan/[tripId]/page.tsx:333`), `.app-shell` ma 448 px (`globals.css:107-108`). Ma jednak cztery wady krytyczne: zabezpieczenie tokenu przed GA4 jest niewystarczające, limity prób opierają się na mechanizmie, który na serverless nie działa (i da się nim zablokować uczciwych użytkowników), główny kanał (WhatsApp) najpewniej psuje ciasteczko tak, że wykrywanie po User-Agent tego nie złapie, a zakres uprawnień uczestnika jest w briefie sprzeczny sam ze sobą. Do tego kilka kryteriów akceptacji nie da się spełnić w zakresie części 2.

---

## Uwagi

### Krytyczne

**1. [Krytyczna] Token wycieka do GA4 także po proponowanej poprawce**
Brief: l. 162, 167, 191 (kryterium 15), 195 (kryterium 19). Brief proponuje "zamaskować ścieżkę w `Analytics.tsx` dla `/dolacz`" i sprawdzić `page_path`.
Co jest nie tak (`src/app/components/Analytics.tsx`):
- l. 20-24: `page_view` wysyła `page_path: pathname` **i** `page_location: window.location.href`, czyli pełny adres z tokenem. Maskowanie samego `page_path` niczego nie zamyka.
- l. 40-47: `ui_click` wysyła `click_label` z `textContent` klikniętego elementu. Na `/dolacz` to będzie imię ("Ania"), więc imiona trafią do GA4. Kryterium 19 ("bez imion") przejdzie na zdarzeniach `group_*`, a wycieknie przez ogólny `ui_click`. `click_url` zawiera pełny href linków.
- l. 76 i 51: `scroll_depth` i `affiliate_click` używają `window.location.pathname`, więc też niosą token.
- GA4 przy `analytics_storage: denied` nadal dostaje anonimowe pingi (komentarz w `src/lib/analytics.ts:5-6`), więc brak zgody nie chroni.
- Token ucieka jeszcze innym torem: logowanie gościa (l. 35, 81, 168 pkt 7) idzie przez `/login?next=...`, a `login/page.tsx:35,48` wkłada `next` do `emailRedirectTo` i `redirectTo`, a `auth/callback/route.ts:11-15` do adresu przekierowania. Jeśli `next=/dolacz/{token}`, to token jest w adresie `/login` (wysyłanym do GA4 jako `page_location`), w mailu logowania, w logach Supabase i w historii przeglądarki.
Poprawka:
1. Jedna funkcja `sanitizeUrl()` w `Analytics.tsx` stosowana do `page_path`, `page_location`, `click_url` i `page_title` (`/dolacz/*` i `next=`/`redirect` zawierające `/dolacz/` zamieniają się na `/dolacz/[token]`).
2. Na `/dolacz` wymusić stałe `data-track` na przyciskach imion (np. `data-track="join_seat"`), żeby `textContent` nie szedł do GA4. Alternatywnie nie renderować w ogóle `ui_click` dla `/dolacz`.
3. Logowanie z `/dolacz` nie może przenosić tokenu w `next`. Serwer zapisuje token w krótkotrwałym ciasteczku `httpOnly` (np. `wl_join`, 15 min) i ustawia `next=/dolacz/dolacz-po-logowaniu`; po powrocie strona czyta ciasteczko.
4. Kryterium 15 przepisać na test: po wejściu na `/dolacz/{token}` i kliknięciu imienia żadne wywołanie `window.gtag` ani `dataLayer.push` nie zawiera tokenu ani imienia (test e2e lub jednostkowy `sanitizeUrl` plus przegląd wszystkich `trackEvent`).

**2. [Krytyczna] Limity prób nie istnieją na serverless, a limit "na wyjazd" pozwala zablokować prawowitego użytkownika**
Brief: l. 168 (c), 171 pkt 5, 193 (kryterium 17), l. 21 w sekcji "Zależności" (`checkRateLimit`).
Co jest nie tak:
- `src/lib/rateLimit.ts:1-4` mówi wprost: pamięć instancji, "resets on cold starts". Na Vercelu każda instancja ma własny licznik, więc "5 przejęć na godzinę" w praktyce nie istnieje, a kryterium 17 da się spełnić testem jednostkowym bez realnej ochrony. Brief traktuje `checkRateLimit` jak twardy hamulec (l. 168 "Bez tego każdy, kto zna link, może wykopać organizatora").
- Limit "na wyjazd" odwraca zagrożenie: napastnik (albo ktoś klikający z ciekawości) wyczerpuje 5 prób na godzinę, a Ania, która naprawdę zmieniła telefon, dostaje "Za dużo prób naraz" na godzinę przed wylotem. Limit na IP z kolei uderza w ekipę siedzącą razem w jednej sieci Wi-Fi lub za CGNAT operatora (6 osób dołącza w ciągu 10 minut z jednego IP).
- Limit na `GET /dolacz` (l. 171 "rate limit na GET /dolacz") trafi też w podglądy linków. WhatsApp i Messenger pobierają stronę z kilku adresów Mety. Zablokowany podgląd psuje `og:image`.
Poprawka:
- Liczniki prób w bazie, atomowo, tak jak `consume_ai_call` (`20261112100000_ai_daily_limit.sql`): tabela lub funkcja SQL z oknem czasu i kluczem `(trip_id, device_token_hash)` oraz osobno `(IP)`.
- Przejęcie nie powinno być ograniczane liczbą prób na wyjazd. Ograniczać próby **urządzenia** (np. 5 na godzinę na hash urządzenia + IP, szczodrzej dla IP) i **liczbę przejęć jednego miejsca** (np. po 3 przejęciach w godzinie miejsce blokuje się do potwierdzenia przez organizatora z paska "zmieniono urządzenie").
- Limit dołączania na IP ustawić szeroko (np. 30 na godzinę), bo prawdziwe ryzyko to zalew miejscami, a ten ogranicza już `MAX_GROUP`.
- `GET /dolacz` nie limitować na IP, tylko odpowiedzi cachować po stronie serwera (hash tokenu → metadane) i bronić się kosztem zapytania, a nie blokadą.
- Zaktualizować kryterium 17: "limity w bazie, test: 6 przejęć z różnych instancji (dwa równoległe procesy) kończy się odmową".

**3. [Krytyczna] Główny kanał (WhatsApp) najpewniej psuje ciasteczko, a User-Agent tego nie pokaże**
Brief: l. 143 (6.4), 122, 121, 194 (kryterium 18). Brief wykrywa tylko `Instagram`, `FBAN`/`FBAV`, a o WhatsAppie na iOS pisze "do sprawdzenia ręcznie".
Co jest nie tak:
- Cała obietnica ("link + ciasteczko") zależy od tego, że ciasteczko ustawione po kliknięciu w link zostaje po powrocie do planu. Brief zakłada, że problem dotyczy Instagrama i Messengera. Spec (l. 55 i ręczne testy) uznaje WhatsApp za podstawowy kanał, a to właśnie jego sytuacja jest niepewna.
- Z mojej wiedzy (do potwierdzenia na urządzeniu, zanim cokolwiek zbudujecie): WhatsApp na iOS otwiera linki w przeglądarce wbudowanej opartej na SFSafariViewController, która od iOS 11 **nie współdzieli** ciasteczek z Safari. Taka przeglądarka ma User-Agent identyczny z Safari, więc wykrycie po UA jest niemożliwe. Człowiek dołącza, wyłącza WhatsApp, klika link jeszcze raz (już w Safari) i jest "nikim". Na Androidzie WhatsApp używa zwykle Chrome Custom Tabs, które współdzielą ciasteczka z Chrome, ale zachowanie zależy od ustawień i producenta.
- Banner pokazywany **po** dołączeniu (l. 122) ostrzega za późno. Ostrzeżenie "otwórz w Safari" trzeba pokazać przed wyborem imienia, a brief nie podaje, jak to zrobić (Instagram: menu "..." i "Otwórz w przeglądarce systemowej"; na iOS nie ma intent URL).
- Sprawa ITP (Safari): ciasteczko ustawione nagłówkiem `Set-Cookie` z tego samego hosta, `httpOnly`, nie podlega ograniczeniu 7 dni (dotyczy zapisów ze skryptu i odpowiedzi z innego adresu IP/CNAME). Wniosek: sama trwałość 90 dni jest realna. Realnie ITP dotyczy `localStorage` (np. znacznik "od Twojej ostatniej wizyty" z briefu planu), a nie `wl_owner`.
- Brief nie przewiduje żadnego odzyskania dostępu bez ciasteczka poza ponownym wyborem imienia, co dla miejsca z kontem lub organizatora jest zablokowane przez własne zawężenia z l. 168 (b).
Poprawka:
1. Przed budową test na 4 urządzeniach (iPhone: WhatsApp, Instagram, Messenger; Android: WhatsApp) z jedną stroną testową: czy ciasteczko ustawione w przeglądarce wbudowanej jest widoczne po otwarciu tego samego adresu w Safari/Chrome. Wynik wpisać do briefu jako fakt, nie jako "do sprawdzenia".
2. Na `/dolacz`, jeśli UA wskazuje Instagram/Facebook/Messenger **albo** jeśli test z pkt 1 potwierdzi problem dla WhatsAppa: ostrzeżenie nad listą imion ("Ten link otwarty w aplikacji może nie zapamiętać, kim jesteś. Otwórz go w Safari lub Chrome") z instrukcją "Otwórz w przeglądarce".
3. Kopia zapasowa niezależna od ciasteczka (**decyzja Kacpra**, bo rozszerza model "link + imię + ciasteczko"): po dołączeniu przycisk "Skopiuj mój link do planu" prowadzący do osobistego, jednorazowo użytecznego adresu przywracającego dostęp do **tego jednego miejsca** (token miejsca, skrót w bazie, nowy token przy każdym przywróceniu). To zdejmuje ciężar z przejęcia miejsca.
4. Do kryteriów dodać wynik testu z pkt 1 jako warunek wypuszczenia.

**4. [Krytyczna] Uprawnienia uczestnika w części 2: brief mówi dwie sprzeczne rzeczy i nie nazywa tego, co trzeba ukryć**
Brief: l. 35-36 (krok 4 "takie same narzędzia jak organizator"), l. 88-92 (3.4), l. 169, 188 (kryterium 12), l. 199 (pytanie 1).
Co jest nie tak:
- Krok 4 (l. 35) i spec 2.5 dają uczestnikowi wszystko ("takie same narzędzia"; spec wymienia `regenerate-day`, `swap-activity`, zapisy planu, `chat`, `packing-list`, `restaurants`, PDF). Rekomendacja z l. 169/199 mówi, że w części 2 uczestnicy "tylko czytają". Kryterium 12 sprawdza tylko ukrywanie akcji **organizatora**, nie akcji zapisujących plan. Budowniczy nie wie, czy przycisk "Zamień" i "Dodaj aktywność" ma być widoczny.
- Rekomendacja "czytają plan, czat, pakowanie i restauracje" jest myląca. W kodzie `/api/packing-list` i `/api/restaurants` w ogóle nie mają `tripId` (sprawdzają tylko sesję, `guardAiCall(user.id)`; `packing-list/route.ts:13-30`, `restaurants/route.ts:20-32`). To nie jest "czytanie" wyjazdu, tylko wywołanie Gemini za dzienny limit organizatora. Czat (`chat/route.ts:34-50`) sprawdza `tripId` i `user_id`, ale historię wysyła klient (spec l. 11), więc to też zapis kosztów, nie odczyt. Wyniki pakowania i restauracji żyją tylko w stanie komponentu (`page.tsx:100-111`), nie są wspólne, więc każdy uczestnik płaci własnym wywołaniem z limitu organizatora (30 dziennie, `aiGuard.ts:7`).
- Rozdział części 2 i 5 jest poprawny co do zasady (zapis dnia i `409 DAY_CHANGED` to 5.2, `plan` brief to potwierdza w pkt 5 zależności), ale brief musi zapisać go wprost, bo spec 2.5 wpuszcza zapisy już w części 2. Rekomendacja jest rozsądna, tylko odstępuje od spec 2.5 i z decyzji "plan zmieniają wszyscy" robi decyzję "wszyscy, od części 5". To jest decyzja Kacpra, nie ustalenie.
Poprawka:
- Zapisać tabelę uprawnień dla części 2: GET planu (tak), `chat`, `packing-list`, `restaurants`, PDF (tak, ale z `tripId` w żądaniu i kontrolą `getTripAccess`, płatne z limitu organizatora), `regenerate-day`, `swap-activity`, `PATCH ai_plan_json`, "Dodaj aktywność", budżet (nie, `403`/przyciski ukryte). Nazwać wprost, że ukryte są: "Zamień", "Zmień dzień", "Dodaj aktywność".
- Rozstrzygnąć kwestię `packing-list`/`restaurants`: bez dodania `tripId` do żądania `getTripAccess` nie ma jak autoryzować gościa. To zmiana API w części 2.
- Kryterium 12 rozszerzyć o te trasy. Dla obcych (brak roli) zwracać `404` jak w spec Przepustki ("jeśli nie, 404"), dla uczestnika `403`.
- Zachować rekomendację jako **decyzję Kacpra** (pyt. 1), z konsekwencją opisaną wprost: w części 2 ekipa "ogląda i czatuje z AI", nie "zmienia".

### Ważne

**5. [Ważna] Plan ładuje się "store-first", więc usunięty, wyrzucony i stary uczestnik zobaczy cudzy plan bez komunikatu**
Brief: l. 141 (6.2), 185 (kr. 9), 187 (kr. 11).
`plan/[tripId]/page.tsx:327` robi `if (currentTrip?.id === tripId && currentTrip.plan) return;` bez zapytania do API, a `currentTrip` jest w persystowanym store (`store.ts:192-198`, klucz `kacper-explores-store`). Skutki: (a) usunięty uczestnik, który wcześniej otworzył plan, nadal widzi go w całości i nigdy nie dostaje `MEMBER_REMOVED`; (b) uczestnik widzi starą wersję planu po zmianach organizatora aż do wyczyszczenia danych. Kryteria 9 i 11 przy takim ładowaniu nie przejdą.
Poprawka: dla wyjazdów grupowych (i uczestników w ogóle) zawsze odpytać `GET /api/trips/[tripId]` przy wejściu, store traktować tylko jako szybki pierwszy render; przy `403 MEMBER_REMOVED` / `410` wyczyścić `currentTrip` z `localStorage`. Dopisać do briefu jako zmianę w `plan/[tripId]/page.tsx`, bo brief mówi o niej tylko od strony `401`.

**6. [Ważna] Brak śladu w bazie dla stanów "przejęte", "usunięty wyjazd" i "stary link" (kryteria 9, 14)**
Brief: l. 116-117, 185, 190; spec "Błędy" l. 528-531.
- Przejęcie nadpisuje `device_token_hash` w tym samym wierszu (spec 2.4). Po tym stare urządzenie nie ma żadnego wiersza, więc serwer nie odróżni go od obcego i nie pokaże "Nie jesteś już w tym wyjeździe" (kryterium 9). Treść jest też myląca: Ania nie została usunięta, tylko wyparta. Przejęcie powinno zostawiać ślad (osobna tabela `trip_member_devices` z hashami i `replaced_at` albo wiersz historii), a komunikat brzmieć "Ktoś inny wybrał Twoje imię na innym urządzeniu. Jeśli to Ty, wybierz je jeszcze raz".
- Spec mówi, że usunięcie wyjazdu "kasuje się kaskadowo" i jednocześnie "link i plan pokazują 'Organizator usunął ten wyjazd'". To się wyklucza: po kaskadzie nie ma wiersza zaproszenia, członków ani wyjazdu, a `/dolacz/{token}` i `/plan/{id}` wyglądają jak "nie istnieje". Dotyczy też usunięcia konta organizatora. Brief przepisał to jako [D] bez zauważenia.
- Stary link po "Nowym linku" i token, którego nigdy nie było, są nie do odróżnienia (stary skrót jest podmieniony). Dla komunikatu to bez znaczenia, ale kod odpowiedzi (`404`/`410`) trzeba ujednolicić.
Poprawka: (a) tabela śladu urządzeń; (b) **decyzja Kacpra**: tombstone przy usunięciu wyjazdu (`deleted_trips` z `trip_id`, `deleted_at`, skrótem tokenu zaproszenia, trzymane np. 30 dni), albo rezygnacja z komunikatu "Organizator usunął ten wyjazd" na rzecz ogólnego "Ten wyjazd już nie istnieje".

**7. [Ważna] "Historia zawiera wpis" (kryterium 9) wymaga tabeli, której część 2 nie tworzy**
Brief: l. 112, 185. `plan_changes` z rodzajem `member_takeover` jest w spec 5.3, czyli w części 5. W części 2 nie ma gdzie zapisać zdarzenia ani czym je pokazać ("Ostatnie zmiany" też są z części 5). Brief mówi o "wpisie widocznym dla grupy" i o znaczniku "zmieniono urządzenie" tylko w panelu organizatora (l. 168 d).
Poprawka: albo część 2 tworzy małą tabelę zdarzeń uczestników (`trip_member_events`: join, takeover, remove, new_link) którą 5.3 później absorbuje, albo kryterium 9 ogranicza się do "zdarzenie zapisane w bazie i widoczne w panelu organizatora jako znacznik", a "widoczne dla grupy" przechodzi do części 5. Treść z l. 112 ("wpis do historii jest widoczny dla grupy") usunąć z zakresu części 2.

**8. [Ważna] Zajmowanie miejsca: unikalny indeks nie rozwiązuje wyścigu, "zmień" nie jest zdefiniowane, jedno dotknięcie nie ma odwrotu**
Brief: l. 31, 35 ("Znaczenie 'zmień' w 6.5"), 147 (6.8).
- 6.8 twierdzi, że przy dwóch urządzeniach klikających to samo wolne imię "wygrywa pierwszy zapis (unikalny indeks)". Indeks z spec 2.2 jest na `(trip_id, device_token_hash)`: pilnuje, by **jedno urządzenie** miało jedno miejsce, a nie by **jedno miejsce** miało jedno urządzenie. Dwa urządzenia zajmujące to samo miejsce zapiszą się oba (drugie nadpisze pierwsze jako "przejęcie"). Potrzebny jest zapis warunkowy `update ... where id = $1 and device_token_hash is null returning *`, z kodem odpowiedzi odróżniającym "zajęte teraz" od "przejęcie".
- Urządzenie, które ma już miejsce w wyjeździe i wybiera drugie, uderza w ten sam unikalny indeks (błąd 500, jeśli nie obsłużony). Brief tego nie opisuje.
- "Znaczenie 'zmień' w 6.5" (l. 35): 6.5 to "Dwa telefony tej samej osoby", nie definicja. W briefie planu "Jesteś jako Ania · zmień" też nie jest zdefiniowane. Krok "Jedno dotknięcie, bez formularza" (l. 31) usuwa możliwość poprawienia pomyłki z spec 2.4 ("Można poprawić imię"); omyłkowy wybór cudzego imienia wyrzuca potem prawdziwą Anię przez przejęcie.
- Funkcje SQL zajmujące i przenoszące miejsce będą `SECURITY DEFINER`. Migracja `close_rls_gaps` pokazuje, że Supabase domyślnie wystawia je roli `anon`: trzeba `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` i `GRANT ... TO service_role`, inaczej klucz anon wywoła zajęcie miejsca bez trasy API i bez limitów.
Poprawka: zdefiniować w briefie: "zmień" = zwolnienie własnego miejsca i powrót do listy (jedna akcja, jedno miejsce na urządzenie); dodać potwierdzenie przy dotknięciu **zajętego** imienia (już jest) i krótkie "Wejdziesz jako Ania. Zgadza się?" przy wolnym, albo zostawić jedno dotknięcie, ale z dostępnym "Nie ja" od razu po wejściu na plan (jak "zmień"). Dodać do kryteriów test współbieżności (dwa równoległe zapisy tego samego wolnego miejsca) i test `REVOKE`.

**9. [Ważna] Nazwy miejsc: "Osoba 2…" widoczne dla gości, brak unikalności i brak reguł**
Brief: l. 21-22, 78, 98, 171 pkt 5.
- Jeśli organizator nie poprawi imion, gość widzi listę "Osoba 2, Osoba 3". Brief zakłada, że organizator poprawi (l. 22), ale panel pozwala wysłać zaproszenie bez tego. Brak ostrzeżenia ani blokady.
- Nikt poza organizatorem nie może zmienić nazwy miejsca (l. 25: "poprawia cudze imię. Tylko organizator"), a krok "jedno dotknięcie" odbiera gościowi poprawę własnego imienia. Uczestnik, który wszedł jako "Osoba 3", zostaje nim.
- Brak unikalności: dwie "Ania" są nie do rozróżnienia; spacje, wielkość liter, znaki podobne do liter. Brief mówi o filtrze (URL, znaki sterujące, 40 znaków), ale nie o `trim`, normalizacji ani unikalności.
Poprawka: (a) przycisk "Wyślij" w panelu aktywny, gdy żadne miejsce nie ma domyślnej nazwy, albo ostrzeżenie "Dwa miejsca mają jeszcze nazwy domyślne"; (b) uczestnik może zmienić **własne** imię po wejściu ("zmień imię" w menu "Jesteś jako…"); (c) unikalny indeks `(trip_id, lower(btrim(name))) where removed_at is null` i walidacja po `trim`, `NFC`, bez znaków formatujących.

**10. [Ważna] "Nie ma mnie na liście" zmienia skład wyjazdu organizatora, a model miejsc nie obejmuje nastolatków**
Brief: l. 145-146 (6.6, 6.7), 184 (kryterium 8), 203 (pyt. 5).
- Dopisanie osoby zwiększa `adults` w `quiz_answers.group` (spec 2.4), czyli **dane organizatora zmienia każdy z linkiem**, bez jego wiedzy. To zmienia ceny "razem" i wyszukiwanie lotów dla całej ekipy. Brief opisuje to jako [P] bez ryzyka nadużycia: obcy z linkiem (lub ciekawski) podnosi skład do 9.
- Dziecko 12-17 lat leci jako dorosły (`toFlightPassengers`, `group.ts:36`), ale brief nadaje miejsca tylko dorosłym (dzieci bez miejsc, l. 21). Nastolatek w rodzinie (telefon ma) nie ma swojego imienia na liście. Wybierze "Nie ma mnie na liście", co doda dorosłego, a `childrenAges` nadal zawiera jego wiek: ta sama osoba liczy się dwa razy w `groupSize`.
- Odwrotnie: usunięcie miejsca (pyt. 5) może złamać `isValidGroup` (`group.ts:49-50`: niemowląt nie może być więcej niż dorosłych), np. usunięcie jednego z dwóch dorosłych przy dwóch niemowlętach.
Poprawka: **decyzja Kacpra** (powiązana z pyt. 5): liczba miejsc i `adults` to dwie osobne rzeczy. Rekomendacja: dopisanie przez gościa dodaje miejsce, ale **nie** zmienia `quiz_answers.group`; panel pokazuje organizatorowi "Skład w planie: 4. Na liście jest 5 osób. Zaktualizować?" z jednym przyciskiem. Nastolatki 12-17: albo miejsca także dla nich (liczone jako dorosły), albo wprost zapisane, że dołączają jako "Nie ma mnie na liście" z konwersją wieku z `childrenAges`.

**11. [Ważna] Stare wyjazdy bez `group` dostaną domyślne cztery osoby**
Brief: l. 20, 177 (kryterium 1), 21 (N-1 miejsc).
Kryterium 1 mówi: `friends`/`family` z ≥2 dorosłymi. `groupFromCompanion` (`group.ts:15-21`) dla `friends` bez `group` zwraca **4 dorosłych** (domyślnie), a `isGroupTrip` (`group.ts:66-68`) rozróżnia wyjazd z jawnym składem. Plany ze starej bazy (sprzed części 1) nie mają `group`, więc pasek zapyta "Jedziecie w 4?" i panel założy trzy miejsca "Osoba 2-4" na podstawie domysłu, a nie wyboru organizatora. To sprzeczne z "Honest by default" (PRODUCT.md, zasada 4).
Dla rodziny (2 dorosłych, 2 dzieci) pasek "Jedziecie w 4?" liczy miejsca w samolocie, a miejsc do zajęcia jest dwa. Treść ma pasować do miejsc, nie do `groupSize`.
Poprawka: warunek paska i tworzenia miejsc oprzeć na `isGroupTrip` (jawny skład). Dla starych wyjazdów pokazać pole "Ilu was jedzie?" przed utworzeniem miejsc. W pasku liczyć dorosłych ("Zapraszasz 3 osoby"), nie `groupSize`.

**12. [Ważna] Logowanie gościa i przypinanie po logowaniu: brief nie opisuje zmiany w `auth/callback` ani konfliktów**
Brief: l. 35 (krok 7), 150 (6.11), 189 (kr. 13). Spec 2.4 ostatni akapit.
- Spec każe `auth/callback/route.ts` przypiąć do konta miejsca z tokenem **tego urządzenia**. W briefie tego nie ma ani w zakresie, ani w kryteriach, a kryterium 13 ("po zalogowaniu na nowym urządzeniu wchodzi bez pytania") z tego wynika. Obecny `callback` w ogóle nie czyta ciasteczek urządzenia (`route.ts:1-60`).
- Wspólne urządzenie: jeśli zaloguje się druga osoba (partner na telefonie Ani), jej konto zostanie przypięte do miejsca Ani. Od tej chwili reguła 168 (b) wymaga, by Ania logowała się na **koncie partnera**. Przypinać tylko wtedy, gdy miejsce nie ma jeszcze `user_id`, a konto nie ma innego miejsca w tym wyjeździe (indeks z 6.11), i tylko po jawnym kliknięciu "Zaloguj się, żeby zachować ten wyjazd", nie przy każdym logowaniu.
- Miejsce z `user_id` bez zalogowania: brief nie podaje komunikatu. Gość na nowym telefonie, który nie jest zalogowany, widzi "To Ty na nowym telefonie?" i po potwierdzeniu dostaje odmowę. Potrzebny tekst i ścieżka ("To miejsce jest powiązane z kontem. Zaloguj się, żeby je przenieść") oraz powrót na `/dolacz` bez tokenu w `next` (patrz uwaga 1).
Poprawka: dopisać do zakresu zmianę `auth/callback`, regułę pierwszeństwa oraz test: przypięcie nie nadpisuje istniejącego `user_id`, nie łamie indeksu `(trip_id, user_id)`.

**13. [Ważna] Ciasteczko: 90 dni vs czas do wyjazdu, oznaczenie [D], implementacja**
Brief: l. 148 (6.9), 163.
- Brief oznacza ważność 90 dni i przedłużanie jako **[D: czas]** i **[D]**. W spec (l. 142) te dwie rzeczy są wprost podpisane "propozycja Claude'a". Oznaczenie [D] jest zawyżone.
- Realny scenariusz: plan w listopadzie, wylot w lutym, a wyjazd trwa kolejne dni. Uczestnik, który nie wchodził 91 dni (nie ma powodu, skoro aplikacja nie wysyła powiadomień, l. 134), wraca jako "nikt" i trafia w ścieżkę przejęcia, która zapisuje fałszywe zdarzenie "Ania przeniosła wyjazd na nowe urządzenie" (hałas w historii). Dla miejsc z kontem i organizatora ścieżka jest zablokowana (l. 168).
- Przedłużanie przy każdej wizycie: Server Components w Next nie mogą ustawiać ciasteczek. Przedłużenie musi iść z middleware lub trasy API przy ładowaniu planu. Brief tego nie zapisuje.
Poprawka: **decyzja Kacpra**: wydłużyć ważność (np. do 400 dni, limit Chrome) albo do "koniec wyjazdu + 30 dni"; zmienić etykietę na [P]. Dopisać do zależności, gdzie następuje przedłużenie (np. `GET /api/trips/[tripId]`).

**14. [Ważna] Konflikt układu i zakresu z briefem planu**
Brief: l. 41 ("Nie proponuję przebudowy układu"), l. 48-55 (3.1), l. 59-70 (3.2).
- Brief planu (`2026-11-15-plan.md`, sekcja 4.1) proponuje szeroki układ komputerowy `/plan/*` ze sticky prawą kolumną z zakładką "Ekipa", nagłówek "Jesteś jako Ania · zmień [Zaproś ekipę]" nad układem i `[Zmiany] [Czat] [Ekipa]`. Brief zaproszeń projektuje panel w modalu 480 px (komputer) i pasek pod zdjęciem w kolumnie 448 px. Dwa briefy definiują ten sam element dwoma różnymi miejscami.
- Brief planu (pkt 1 w sekcji "Zależności", l. 25) przypisuje do pierwszego "Zaproś ekipę" nadanie `id` punktom planu i włączenie reakcji/historii. Brief zaproszeń tego nie ma w kryterium 2 (które mówi tylko o wierszach). Pierwsze otwarcie panelu ma więc ukryte skutki uboczne (przemiana wyjazdu w grupowy, migracja `id`), a brief opisuje je jako zwykłe "otwarcie". Nie ma też drogi odwrotnej (organizator otwiera panel przypadkiem i wyjazd jest już "grupowy").
Poprawka: w briefie zaproszeń zapisać: panel ekipy to komponent współdzielony z briefem planu; w części 2 pasek i modal, w części 5 przeniesienie na prawą kolumnę; pierwsze utworzenie miejsc to jawna akcja ("Utwórz zaproszenie") z zapisem skutków (id punktów, flaga grupowa), a nie samo otwarcie. Uzgodnić z właścicielem briefu planu i usunąć zdanie "Nie proponuję przebudowy układu" lub zastąpić odwołaniem.

**15. [Ważna] Odwiedzający bez roli na `/plan/{id}` i jaki link niosą teksty do grupy**
Brief: l. 141, 157. Spec 2.7; brief terminu l. 22 (`groupMessage('vote')`, "link do planu").
`/plan/{id}` dla niezalogowanego bez ciasteczka kończy dziś na `/login` (`page.tsx:333`). Brief obsługuje tylko usuniętego uczestnika (`MEMBER_REMOVED`). Brak scenariusza "mam link do planu, ale nie mam ciasteczka" (np. przypomnienie o głosowaniu z briefu terminu zawiera link do planu). Taki gość trafia na stronę logowania zamiast na wybór imienia.
Poprawka: brak roli i brak sesji na `/plan/{id}` = ekran "Nie masz tu dostępu. Otwórz zaproszenie z grupy" bez przekierowania na `/login` (dla wyjazdów, które są grupowe; dla zwykłych zostaje obecne zachowanie, ale nie ujawniaj, czy wyjazd jest grupowy). Uzgodnić z briefami terminu/rozliczeń, że teksty do grupy zawierają link do `/dolacz/{token}` (jedyny, który zawsze działa), nie do planu.

**16. [Ważna] Prywatność organizatora: prefiks maila, imię w podglądzie, organizator bez konta**
Brief: l. 22 (krok 3), 112, 202 (pyt. 4), 208 (pyt. 10).
- Pole imienia organizatora wypełniane "częścią maila przed @" (l. 22) trafia potem na `/dolacz` jako "Michał zaprasza" dla każdego z linkiem. Prefiks maila to dane osobowe (np. `kacper.celejewski92`), których organizator nie wpisał. Podpowiedź bez wymuszenia potwierdzenia jest ryzykowna.
- Organizator bez konta (po etapie 3 Przepustki): wiersz organizatora ma `user_id = trips.user_id`, a tam jest `null`. Krok 2 (l. 21) nie zadziała, a ekipa zginie razem z urządzeniem (pyt. 4).
Poprawka: imię organizatora wymaga **jawnego wpisania** (pole puste albo imię z profilu, jeśli profil ma imię; nigdy prefiks maila). W tym miejscu rekomendacja do pyt. 10: pokazywać imię organizatora tylko jeśli je wpisał. Do pyt. 4: **decyzja Kacpra**, rekomendacja: zaproszenie wymaga konta organizatora (tak jak "Udostępnij" w etapie 3), co upraszcza modele tożsamości.

**17. [Ważna] "Usuń" bez nowego linku jest bez efektu, a nowe osoby nie dają żadnego sygnału organizatorowi**
Brief: l. 141, 171 pkt 5, 205 (pyt. 7).
- Usunięty uczestnik z tym samym linkiem wchodzi z powrotem jako nowa osoba (rekomendacja do pyt. 7). Link leży na grupie WhatsApp, w której ta osoba nadal jest. "Usuń" nie ma więc skutku bez rotacji linku, a brief w obu miejscach prezentuje to jako dwie niezależne akcje.
- Włóczykij nie wysyła powiadomień (decyzja), więc organizator dowie się o zalewie miejscami ("Lista pełna") dopiero od znajomego. Kto dopisał się przez "Nie ma mnie na liście", nie jest oznaczony.
Poprawka: okno usuwania z opcją "Usuń i zrób nowy link" (domyślnie zaznaczona przy usunięciu osoby, która już dołączyła); w panelu etykieta "Nowe" przy miejscach dopisanych przez gościa do czasu, aż organizator je zobaczy. Wygasanie zaproszenia: link bez daty ważności działa po zakończeniu wyjazdu, można dodać domyślne wyłączenie po np. 30 dniach od zakończenia (**decyzja Kacpra**).

**18. [Ważna] Teksty z danymi dynamicznymi nie dadzą się wygenerować bez odmiany; daty w praktyce nie istnieją**
Brief: l. 104-112, 98, 153 (6.14).
- "Michał zaprasza Cię do Barcelony", "Jedziemy do Barcelony": potrzebny dopełniacz miasta. W repozytorium istnieje tylko `ORIGIN_GENITIVE` dla lotnisk wylotu (`src/lib/drop/email.ts`, używane w `DealsStrip`, `DropSignup`), nie dla celów. Dla Lizbony, Wiednia, Krakowa itd. trzeba tablicy odmiany albo sformułowania neutralnego ("Zaproszenie na wyjazd: Barcelona").
- Odmiana imion: "Usunąć Michała z wyjazdu?", "Czekamy na: Olę" nie da się zrobić automatycznie dla dowolnych imion (Kuba, Ola, imiona obce). "Ania przeniosła wyjazd" zakłada rodzaj. "Dołączył(a)" (l. 66) jest sprzeczne z "Jest w środku" (l. 98) i z zasadą bez rodzajów.
- Daty: loty brief (`2026-11-15-loty.md`, l. 25-27) potwierdza, że nic nie ustawia `bestOffer`, więc `flight_data` jest dziś puste, a daty w planie zwykle nie istnieją. Typowa wersja zaproszenia to "Barcelona, 3 dni", a wszystkie szkice z "20–22 lut" pokazują przypadek rzadki. Jeśli daty pochodzą później z części 3, tekst wysłany na grupę z datami wstępnymi może okazać się nieprawdziwy.
Poprawka: formy bezosobowe ("Usunąć z wyjazdu: Michał?", "Czeka na: Ola", "Ania: nowe urządzenie"), tytuł `/dolacz` w mianowniku ("Zaproszenie: Barcelona"), szkice ekranów pokazują wariant **bez dat** jako domyślny. Tekst zaproszenia z datą tylko jeśli są potwierdzone; wstępne daty oznaczyć "wstępnie".

**19. [Ważna] Brakujące przypadki brzegowe**
Brief: sekcja 6.
- **Organizator otwiera własny link w przeglądarce wbudowanej** (testuje, co wysłał): nie jest tam zalogowany, a jego miejsce jest zablokowane (l. 79), więc widzi listę, w której "nie ma go" i nie może wejść. 6.12 zakłada, że organizator zawsze jest zalogowany na tym urządzeniu. Dopisać ekran dla zablokowanego miejsca organizatora ("To miejsce organizatora. Zaloguj się, żeby wejść").
- **Strona `/dolacz` otwarta, gdy organizator zrobił nowy link:** `POST` z nieaktualnego tokenu daje "Ten link już nie działa" w środku wyboru. Komunikat powinien być miękki ("Ten link się zmienił, poproś o nowy"), bez utraty wyboru.
- **Konto ma już miejsce w wyjeździe i wybiera inne** (z innego urządzenia): brief mówi "wchodzi od razu" (l. 35), ale nie co z wyborem innego imienia.
- **Dwie osoby na jednym telefonie** (l. 144): brief mówi, że komunikat "mówi to wprost", ale tekst z l. 112 tego nie robi. Dopisać zdanie.
- **Przycisk wstecz po przekierowaniu** z `/dolacz/{token}` na `/plan/{id}`: użyć `router.replace`, nie `push`, żeby token nie wracał do paska adresu po cofnięciu.
- **Dołączenie do wyjazdu ze statusem `is_public`:** niewymagane, ale warto jedno zdanie, że `/share/{id}` jest niezależne.
- **Zalogowany uczestnik w "Moje podróże":** `/api/profile` wybiera wyjazdy po `trips.user_id` i ma limit 5 (`api/profile/route.ts:17-22`). Uczestnik z `trip_members.user_id` ich nie zobaczy bez zmiany zapytania. Brief (l. 132, kryterium 13) obiecuje wyjazd w profilu, ale nie wymienia `profile` ani `/api/profile` jako zmienianych.

**20. [Ważna] Kryteria akceptacji: kilka nie do sprawdzenia lub niewykonalnych w części 2**
Brief: l. 175-195.
- Kr. 9 (historia) i 14 (komunikat o usuniętym wyjeździe): patrz uwagi 6 i 7, niewykonalne w obecnym kształcie.
- Kr. 11 (brak przekierowania na `/login`): patrz uwaga 5, nie przejdzie przez ładowanie "store-first".
- Kr. 15: "token nie ląduje w zdarzeniach GA4 (page_path)" sprawdza tylko jedno pole, patrz uwaga 1.
- Kr. 17: nieweryfikowalne, patrz uwaga 2.
- Brak kryteriów dla: ostrzeżenia w przeglądarce wbudowanej (UA Instagram/FB oraz wynik testu WhatsApp), kodów odpowiedzi dla obcych (`404`) vs uczestnika (`403`), nagłówka `Referrer-Policy` na `/dolacz` (test na odpowiedzi HTTP), `noindex`/`X-Robots-Tag`, jednego miejsca na urządzenie (obsługa naruszenia indeksu), współbieżnego zajmowania miejsca, `REVOKE` na funkcjach SQL, nadawania `id` punktom przy pierwszym utworzeniu zaproszenia.
- Kr. 8 "`groupSize` ≤ `MAX_GROUP` (9)" jest poprawne względem kodu (`isValidGroup`), ale trzeba dopisać, że `isValidGroup` odrzuca też skład, w którym niemowląt jest więcej niż dorosłych (`group.ts:49-50`).
- Kr. 18 (ręczne) zawiera wszystko naraz. Rozbić na listę z warunkiem wypuszczenia.
Poprawka: dopisać brakujące kryteria, każde z konkretnym sposobem sprawdzenia (test jednostkowy, e2e, ręczny z urządzeniem).

### Drobne

**21. [Drobna] Układ `/dolacz`: baner ciasteczek, menu i wysokość ekranu**
Brief: l. 72-83 (3.3). `layout.tsx:56-60` renderuje w `.app-shell` także `GlobalMenu` i `CookieBanner` na każdej stronie. Na `/dolacz` pierwszy ekran gościa to baner o ciasteczkach (zasłania listę imion w małym oknie przeglądarki wbudowanej), a menu `GlobalMenu` ma `position: fixed; bottom: 0`. Brief wymaga "minimalnej nawigacji" (l. 75), ale nie mówi, jak ją osiągnąć w istniejącym layoucie. Rozwiązanie: wyłączyć `GlobalMenu` i odłożyć `CookieBanner` na `/dolacz` (banner nie jest wymagany do działania `wl_owner`), albo osobny layout dla segmentu `/dolacz`.

**22. [Drobna] Nagłówki bezpieczeństwa: gdzie je ustawić**
Brief: l. 167. `next.config.ts:43-53` ma nagłówki tylko dla `/api/:path*`. `Referrer-Policy: no-referrer` i `X-Robots-Tag: noindex` dla `/dolacz/:path*` trzeba dodać tam albo w `metadata` (`referrer`, `robots`), jak w `plan/layout.tsx` (`robots: { index: false, follow: false }`). Dodatkowo `og:image` dla `/dolacz/[token]` to nowy route (istnieje tylko główny `opengraph-image.tsx`): budowniczy musi go napisać, nie "użyć istniejącego" (l. 164 sugeruje, że wystarczy). Zachowanie metody meta zamiast `robots.txt` jest poprawne (podglądy przeżyją), ale `robots.txt:7` ma już `Disallow: /plan/`, więc spójność wymaga zdania o tym, dlaczego `/dolacz` jest inaczej.

**23. [Drobna] Nieścisłości względem kodu i rozwiązań interfejsu**
- l. 91: przycisk w kodzie nazywa się "Zaplanuj nową podróż →" (`page.tsx:787`), nie "Zaplanuj własny wyjazd →".
- l. 44: kolejność sekcji planu pomija "Tips" (`page.tsx:519`), a "Zrzut" i "opinia" zależą od innych warunków; funkcje dla gościa (PDF z kłódką i feedbackiem `page.tsx:150`, widżet feedbacku `page.tsx:815`) nie są ujęte w 3.4. Gość bez konta zobaczy kłódkę PDF i prośbę o ocenę.
- l. 70: "Udostępnij… zwykle nie ma" na komputerze jest nieprawdziwe. `navigator.share` jest w Safari na macOS i w Chrome na Windows. Wybierać układ po wykryciu funkcji, nie po szerokości okna.
- Messenger nie ma odpowiednika `wa.me/?text=`; użytkownicy Messengera (grupa docelowa, l. 14) polegają na "Kopiuj" i "Udostępnij…". Na telefonie kolejność (WhatsApp główny) jest zasadna, ale warto dopisać dla Messengera.
- "Kopiuj link": nie wiadomo, czy kopiuje sam adres czy cały tekst z podglądu (l. 63). Sugestia: "Kopiuj zaproszenie" (tekst plus link). Dodać alternatywę, gdy `navigator.clipboard` jest niedostępne w przeglądarce wbudowanej.
- `group_invite_shared` (l. 136) mierzy kliknięcie w przycisk, nie faktyczne wysłanie. Nazwać `group_invite_share_click`.

**24. [Drobna] Głos marki i uczciwość: kilka zdań obiecuje więcej, niż kod zrobi**
Brief: l. 80, 112, 118, 144.
- "Zapamiętamy to w tej przeglądarce. Zmienisz telefon, otworzysz ten sam link jeszcze raz." (l. 80): nieprawda dla miejsc z kontem i dla organizatora (brief sam je zablokował, l. 168), a w przeglądarkach wbudowanych "zapamiętamy" bywa fałszem (uwaga 3). Zasada "Honest by default" (PRODUCT.md:73) wymaga sformułowania warunkowego.
- "Nie jesteś już w tym wyjeździe." dla urządzenia wypartego przez przejęcie (kr. 9) jest mylące (uwaga 6).
- "Lista jest pełna. W jednej rezerwacji lecimy najwyżej w 9 osób." (l. 118) wystawia techniczny limit i zakłada lot. Prościej: "Lista jest pełna. Napisz do organizatora."
- l. 112 "na wyjazd" (l. 30) vs "do Barcelony" (l. 112): ujednolicić (patrz uwaga 18).
- Brak emoji i wykrzykników w całym briefie: zgodne z BRAND.md:61-62. Brak "niestety": zgodne. Zdanie "Coś poszło nie tak… zwykle działa za drugim" (l. 120) jest przykładem z BRAND.md i pasuje do błędów sieci, ale nie do odmowy limitu ani przejęcia.

---

## Weryfikacja twierdzeń briefu o kodzie

| Twierdzenie briefu | Wynik |
|---|---|
| Analytics wysyła pełną ścieżkę do GA4 | Prawda, ale niedomówienie: wysyła także `page_location` (pełny URL), `click_url`, `click_label` (tekst przycisku). Patrz uwaga 1. |
| `MAX_GROUP = 9` liczy miejsca z dziećmi | Prawda (`group.ts:10`, `isValidGroup` l. 41-52, `groupSize` l. 24-26). Dzieci od 2 lat liczą się, niemowlęta nie. |
| Plan w wąskiej kolumnie 448 px | Prawda (`globals.css:107-108`), ale brief planu proponuje szeroki układ (uwaga 14). |
| Plan przy `401` idzie na `/login` | Prawda (`page.tsx:333`). Dodatkowo `!r.ok` → `router.replace("/")` (l. 334) połknie każdy `403`/`404`. |
| `opengraph-image.tsx` na main jest w palecie marki | Istnieje tylko główny `src/app/opengraph-image.tsx`; per-token trzeba zbudować. |
| "Udostępnij" dziś tylko kopiuje URL, gdy plan publiczny | Prawda (`page.tsx:125-138`), przy niepublicznym wyświetla nudge "Najpierw udostępnij plan". |
| `.app-shell` "także na desktopie" | Prawda, tylko strona główna ma `body.is-home` z odblokowaniem (`globals.css:230`). |
| Spec 2.4 "MAX_GROUP dorosłych" niedokładne | Prawda: spec się myli, kod liczy `groupSize`. Brief ma rację. |

## Werdykt

**Z poprawkami.** Struktura, podział odpowiedzialności z częścią 5 i ton są dobre. Przed budową muszą zostać rozwiązane uwagi 1-4 (krytyczne), a także 5-8 i 12, bo bez nich kryteria 9, 11, 13, 14 i 17 są niewykonalne lub pozorne. Brief nie wymaga przepisywania.

## Uwagi, które WYMAGAJĄ decyzji Kacpra

1. **Uwaga 4 (pyt. 1):** uczestnicy w części 2 tylko czytają i korzystają z AI za limit organizatora, zapis planu dopiero z 5.2. Rekomendacja: tak. Jest to odstępstwo od brzmienia spec 2.5, więc potrzebne jest jawne zatwierdzenie.
2. **Uwaga 3:** czy dopuszczamy osobisty link przywracający miejsce (poza ciasteczkiem) jako obejście dla WhatsAppa i Instagrama, jeśli test na urządzeniach potwierdzi problem. To rozszerza model "link + imię + ciasteczko".
3. **Uwaga 6:** tombstone przy usunięciu wyjazdu (spec obiecuje komunikat, ale przy kaskadzie nie ma skąd go wziąć), albo zrezygnowanie z komunikatu.
4. **Uwaga 10 (pyt. 5):** czy dopisanie osoby przez gościa i usunięcie miejsca zmieniają `adults` w składzie (i ceny), czy tylko zgłaszają zmianę organizatorowi. Rekomendacja: tylko zgłaszają.
5. **Uwaga 13:** długość ważności ciasteczka (rekomendacja: dłużej niż 90 dni) i poprawienie oznaczenia z [D] na [P].
6. **Uwaga 16 (pyt. 4, 10):** zaproszenie wymaga konta organizatora (rekomendacja: tak); imię organizatora na `/dolacz` tylko jeśli je wpisał.
7. **Uwaga 17 (pyt. 7, 8):** "Usuń" z automatycznym nowym linkiem; wygasanie zaproszeń po wyjeździe; czy uczestnik widzi link zaproszenia.
8. **Pyt. 2 z briefu (zawężenie przejęć):** popieram (organizator i miejsce z kontem nie do przejęcia z linku), pod warunkiem dopisania komunikatów z uwagi 12 i ochrony przed blokadą z uwagi 2.
9. **Pyt. 6, 3, 9:** zgadzam się z rekomendacjami briefu (jedno urządzenie na miejsce; para bez "Zaproś" w tej wersji; zmiana etykiety "Udostępnij" na "Podgląd publiczny"). Nie wymagają osobnej dyskusji, ale pozostają decyzjami Kacpra.
