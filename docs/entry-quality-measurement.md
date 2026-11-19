# Pomiar jakości wejść: materiał → quiz → plan

Cel: policzyć, ile osób z konkretnego materiału (artykuł, strona okazji lub miasta, link z IG, mail zrzutu, przyciski na stronie głównej) dochodzi do ukończonego quizu i wygenerowanego planu. Kod: `src/lib/entryAttribution.ts`. Pomiar działa tylko po zgodzie na analitykę (GA4); bez zgody nic nie jest zapisywane w urządzeniu ani wysyłane.

## Parametry (bez danych osobowych)
- `entry_channel`: `ig`, `blog`, `okazje`, `weekend`, `drop`, `home`, `direct` lub znormalizowane `utm_source` (np. `swiat`).
- `entry_material`: konkretny materiał, małe litery: `blog:<slug>`, `okazje:<lotnisko>`, `weekend:<miasto>`, `ig:<campaign>:<content>` (np. `ig:bio:ekipa`), `drop:<tydzień>:<kod miasta>` (z `utm_campaign` i `utm_content` w linku zrzutu; sam `src=drop` bez utm da tylko `drop:drop`), `home:home-ekipa`. `direct` = brak rozpoznanego źródła (menu, wejście bezpośrednie).
- Dozwolone tylko znaki `a-z 0-9 _ . - :`, do 100 znaków, bez ciągów 7+ cyfr; wszystko inne jest odrzucane. To filtr znaków, nie biała lista: nazwy kampanii w linkach mają być neutralne (bez imion i numerów), a `utm_source` jest dowolny, więc pilnować liczności wartości w GA4.

## Skąd bierze się wejście (kolejność)
1. Parametry `entry_*` w adresie (powrót z logowania linkiem z e-maila, także w innej przeglądarce).
2. Strona treści, z której kliknięto link do `/quiz` (zapamiętana przy kliknięciu na 30 min; działa dla linków w artykułach, bez zmiany treści) albo ta sama witryna jako `document.referrer`, ale tylko gdy karta została załadowana od razu na `/quiz` (po nawigacji w aplikacji referrer jest nieaktualny i jest pomijany).
3. `utm_*` w adresie (linki IG: `instagram` → `ig`), potem `src` (`home-*`, `ig-*`, `blog-ekipa`, `drop`).
4. Wejście zapamiętane w sesji (1 h; także gdy ktoś wraca do quizu z `/destinations`), np. powrót do quizu z `/destinations`.
5. `direct`.

## Zdarzenia GA4
| Zdarzenie | Kiedy | Parametry |
|---|---|---|
| `entry_click` (nowe) | kliknięcie linku do `/quiz` ze strony `/blog`, `/okazje`, `/weekend` | `entry_channel`, `entry_material`, `target=quiz` |
| `quiz_entry` (nowe) | wejście na `/quiz`, przy każdym załadowaniu strony quizu (odświeżenie liczy ponownie; do konwersji używać unikalnych użytkowników) | `entry_*`, `has_src`, `flow_version` |
| `quiz_step_view`, `quiz_step_complete`, `quiz_complete` | kroki quizu (nazwy bez zmian) | dotychczasowe + `entry_*` |
| `from_*` | bez zmian (tylko `src` z listy) | dotychczasowe + `entry_*` |
| `drop_plan_started` | wejście ze zrzutu z danymi lotu | `city` + `entry_*` |
| `login_gate_view` | ekran logowania po quizie | `entry_*` |
| `plan_generated` | gotowy plan (`/destinations`, `/quick`) | `city`, `days`, `group_size`, `entry_*` |

Po `plan_generated` wejście jest czyszczone: jedno wejście = jeden plan. Kolejny plan bez nowego źródła dostaje `direct`, więc kilka planów z jednego wejścia liczy tylko pierwszy. `entry_*` w adresie można podrobić; służą do powrotu z logowania, nie jako dowód.

## Jak czytać
Eksploracja GA4 → Lejek: `entry_click` (lub `page_view` ze `page_path` materiału) → `quiz_entry` → `quiz_complete` → `plan_generated`, rozbicie po `entry_material`. Konwersja materiału = `plan_generated` / `quiz_entry` z tym samym `entry_material`.

## Wymagania i ograniczenia
- **Przed użyciem** zarejestrować `entry_channel` i `entry_material` w GA4 jako wymiary własne zakresu zdarzenia (Administrator → Definicje niestandardowe). Dane zbierają się od wdrożenia, wstecz nie.
- Wejście rozpoznane przed zgodą na baner jest trzymane tylko w pamięci karty (nic w urządzeniu) i dopisane do zdarzeń po akceptacji; samo `quiz_entry` sprzed zgody nie wysyła się, więc dla osób akceptujących baner dopiero w quizie mianownik `quiz_entry` bywa niższy niż `quiz_complete`. Odrzucenie zgody kasuje ślady.
- `quiz_entry` nie liczy powrotu z logowania (`afterLogin=1`); `entry_*` w adresie logowania dopisujemy tylko po zgodzie.
- Strony treści ze slugiem spoza `a-z0-9._-` (np. stare linki z polskimi znakami) i listy (`/blog`) dają materiał równy kanałowi.
- Tylko zdarzenia ze zgodą. Licznik serwerowy `quiz_events` (bez zgody) jest bez zmian i nie ma materiału (bez migracji).
- Bez wdrożenia tego kodu nie ma historii; `quiz_complete` sprzed 2026-11-15 ma stare nazwy (patrz `quizGaEventName`).
- Wejście z IG i z maila przez przeglądarkę wbudowaną w aplikację lub inną kartę po logowaniu linkiem: przeżywa tylko przez `entry_*` w adresie powrotu, nie przez sessionStorage.
- Kliknięcie środkowym przyciskiem myszy nie jest łapane jako `entry_click`; wejście i tak rozpoznaje referrer.
