# Agenci funkcji (sesja 2026-11-15)
Owners (sonnet): home=a9e16bb1d383f4ee8, zaproszenia=aa7343186ca370992, termin=a0260bb48234a772d, loty=a70008d88e9a29903, plan=aed8fa5a09d047341, rozliczenia=ad61d7a58fec9ce1b
Briefy: docs/superpowers/feature-briefs/2026-11-15-{strona-glowna,zaproszenia,termin,loty,plan,rozliczenia}.md
Etapy: 1 briefy -> 2 recenzenci (*-review.md) -> 3 poprawki przez właścicieli -> 4 agent UI/UX (conversation do zgody) -> 5 podsumowanie
Reviewers (sonnet): termin=a9e0082fb031a2cef (DONE, 32 uwagi: 2 kryt., 21 waż., 9 drob.; werdykt Z poprawkami), strona-glowna=a1de13c12be553904, loty=aadf62d57ba47e8ba, plan=abc6ef00bc44c5988, zaproszenia=a3738684c95d4c581, rozliczenia=a788b76e3b36eb08a
Rulings (kontroler): termin: plan-fit przyciskiem; własny termin = ta sama długość; ankieta bez cen w pierwszym PR; "wszyscy mogą" tylko gdy zagłosowali wszyscy aktywni (odstępstwo od spec 3.4); lotnisko wskazuje organizator; daty w przykładach 2027.
Status: termin -> poprawki wysłane do właściciela (a0260bb48234a772d).
UWAGA: folder kacper-explores przemianowany na wloczykij-app (ten sam repo). Worktree kacper-explores-grupa ma teraz zepsuty wskaźnik gitdir (gałąź i tak zmergowana, PR #29).
Status 2026-11-15 07:50: reviews gotowe: termin, loty, plan, zaproszenia; w toku: strona-glowna-review (a1de13c12be553904), rozliczenia-review (a788b76e3b36eb08a).
Poprawki wysłane do właścicieli (z rozstrzygnięciami kontrolera [K-kontroler]): termin, loty, plan, zaproszenia. Home i rozliczenia czekają na opinie.
Rulings kontrolera (do wymienienia w podsumowaniu dla Kacpra):
- loty: karta z licznikiem i blokadą w bazie; odświeżanie tylko w ostatnich 14 dniach; wyszukiwanie lotów dla solo/par dopiero po kliknięciu; bez wierszy "cena spadła"; koszt po równo na dorosłych; link z pełnym składem; bramka flight tylko organizator; /share bez liczby osób; pole "Kto płacił".
- plan: cofnij z powtórzeniem późniejszych punktów (zmiana spec 5.3); darmowe "Usuń punkt"; split liczy się do limitu z licznikiem; szeroki układ tylko dla grup, dwie kolumny, bez mapy; touched_ids zawężone; "Użyj mojej wersji" po 409; Postgres w CI = decyzja Kacpra.
- zaproszenia: uczestnicy tylko czytają w cz. 2 (odstępstwo od spec 2.5); link przywracający miejsce tylko po potwierdzonym teście; "Ten wyjazd już nie istnieje"; dopisanie osoby tylko zgłasza; ciasteczko 180 dni [P]; zaproszenie wymaga konta organizatora.
strona-glowna-review gotowa (25 uwag: 5 kryt., 14 waż., 6 drob.). Poprawki wysłane do właściciela a9e16bb1d383f4ee8. Rulings: H1 bez "Bez czatu"; animacja R1 uczciwa (tylko szacunek kosztu, podpis "Przykład, nie Wasz wyjazd"); "od A do Z" w R1, bez "wkrótce"; zrzut zostaje pod hero do końca testu; menu w nagłówku poza zakresem; ?companion=friends w R1; plakat z hero znika; podział R1a/b/c + features.ts; układ bez hydracji.
rozliczenia-review gotowa (31 uwag: 3 kryt., 19 waż., 9 drob.). Poprawki wysłane do właściciela ad61d7a58fec9ce1b. Rulings: kurs zachowany przy zmianie kwoty (zmiana spec 6.3), brak tabeli = poprzednia z podpisem; serwer zapisuje ostatnio widziane saldo; "Oddane" z faktyczną kwotą i potwierdzeniem odbiorcy; usunięcie niedołączonego miejsca zdejmuje udziały; v1 bez wag; "Czeka na kurs" z blokadą "Oddane"; osobna trasa /plan/{id}/wydatki; wydatek pass tylko przy płatnej Przepustce; formy bezosobowe; dokładny algorytm.
WSZYSTKIE 6 opinii gotowe, 6 poprawek zleconych. Dalej: poprawione briefy -> agent UI/UX (conversation do zgody).
ETAP UI/UX (2026-11-15): wszystkie 6 briefów poprawionych (wersja 2). Agent UI/UX (opus) pisze 2026-11-15-ux-review.md (werdykt per brief + wątki U1..Un). Potem: wątki -> właściciele (SendMessage) -> poprawki -> UX agent ponownie (SendMessage) do zgody.
Znane sprzeczności międzybriefowe do rozstrzygnięcia: (1) "od ostatniej wizyty" localStorage (zaproszenia) vs serwer (plan, rozliczenia); (2) odmiana imion (loty) vs formy bezosobowe (rozliczenia); (3) szeroki układ tylko dla grup vs trzy briefy zakładające wąską kolumnę; (4) pola migracji części 4 (rozliczenia vs loty); (5) token zaproszenia: hasz vs szyfrowany (decyzja Kacpra, odstępstwo od spec).
UX agent (opus, a7eb66f96754e836e): 22 wątki (3 blok., 13 waż., 6 drob.), wszystkie 6 werdyktów "Zgadzam się z zastrzeżeniami". Plik: 2026-11-15-ux-review.md.
Rulings kontrolera po UX (runda 3 poprawek wysłana do 6 właścicieli):
- U1: jeden szkielet strony planu ze stałymi slotami pisze brief plan, inne cytują sloty.
- U2: token zaproszenia szyfrowany kluczem serwera obok skrótu (odstępstwo od spec = DECYZJA KACPRA; wariant zapasowy: tylko skrót + teksty bez linku).
- U3: w R1 każde pytanie z czatu ma odpowiedź na karcie.
- U4: ZMIANA: szeroki układ planu dla WSZYSTKICH planów, wczesny PR po R1b, jeden mechanizm (znacznik SSR + :has()), wspólne progi.
- U5: reguła głosu: imię w mianowniku, formy bezosobowe, bez odmiany imion.
- U6: "od ostatniej wizyty" na serwerze przy miejscu.
- U7: komponent "stan wyjazdu" (Kiedy · Lot · Plan · Wydatki) należy do planu.
- U8: jedna karta "Kiedy lecimy?" z dwiema drogami (ankieta / znam termin), owner: termin; karta lotu po datach.
Po poprawkach: UX agent ponownie (SendMessage a7eb66f96754e836e) do zgody.
UX runda 2 (ux-review-2.md): 19 z 22 wątków zamkniętych, 3 częściowo (U1,U7,U21), 0 otwartych; nowe N1..N7 (3 ważne, 4 drobne). Werdykty: strona główna ZGADZAM SIĘ; zaproszenia, termin, loty, plan, rozliczenia z zastrzeżeniami.
Runda 3 poprawek wysłana do wszystkich 6 właścicieli (N1 plan: kroki paska stanu zamiast zwiniętych linii na telefonie, N2 termin cytuje loty (FlightState, saveTripDates), N3 token tylko przez POST group-message, N4 /dolacz/{token}?do=..., N5 status "bilet jest"/"jeszcze bez biletu", N6 cytaty slotów dosłownie, N7 drobne).
Dalej: UX agent runda 3 (SendMessage a7eb66f96754e836e) -> jeśli "Zgadzam się" dla wszystkich = cel; potem podsumowanie dla Kacpra z listą decyzji.
CEL SPEŁNIONY (2026-11-15): UX runda 3: 0 wątków otwartych; strona główna, zaproszenia, plan "Zgadzam się"; termin, loty, rozliczenia "Zgadzam się po wprowadzeniu listy" — lista (4 poprawki zdań) wprowadzona przez właścicieli. Pliki: *-review.md, ux-review.md, ux-review-2.md, ux-review-3.md.
