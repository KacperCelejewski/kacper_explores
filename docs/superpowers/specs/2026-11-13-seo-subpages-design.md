# Podstrony pod SEO: projekt

**Data:** 2026-11-13 · **Rozmiar:** projekt (kilka powiązanych stron) · **Autor założeń:** Claude (Kacper poprosił o brainstorming i wykonanie bez pytań, więc wszystkie decyzje poniżej to moje wybory do poprawienia)

## Po co

Włóczykij ma dziś jedno realne wejście z Google: 5 artykułów na blogu i 7 stron `/okazje/[lotnisko]`. Test okazji weekendowych (media + afiliacja) potrzebuje ruchu, który **sam przychodzi z wyszukiwarki** i trafia na zapis na Czwartkowy zrzut albo w link partnerski. Intencje, które da się obsłużyć uczciwie, to: „tanie loty na weekend z {miasto}”, „weekend w {miasto}” i „gdzie polecieć na weekend”.

## Co wiemy z kodu i danych

- `catalog.ts` ma 55 miast z opisami, ale **ceny w nim są ręcznie wpisane** (np. Lizbona 390 zł). Nie wolno ich publikować jako faktów.
- Prawdziwe ceny są tylko w `drop_deals` (Travelpayouts), w tej chwili jeden tydzień, 80 miast, 7 lotnisk. Zmieniają się co tydzień.
- `/okazje/[lotnisko]` istnieje, ale nie ma wstępu, FAQ ani danych strukturalnych, a sitemap zawiera je dopiero od ostatniego PR. Nie ma strony zbiorczej `/okazje`.
- Blog ma 5 artykułów, wszystkie o podróżowaniu solo; żaden nie celuje w „weekend w {miasto}”.

## Cele

1. Strona zbiorcza `/okazje` (hub) jako wejście dla „tanie loty na weekend” i punkt linkowania do 7 lotnisk.
2. Mocniejsze `/okazje/[lotnisko]`: unikalny wstęp o lotnisku, FAQ, dane strukturalne (BreadcrumbList, ItemList, FAQPage), opis meta z prawdziwą najniższą ceną.
3. Strony miast `/weekend/[miasto]` dla europejskich miast z katalogu: stała treść z katalogu plus **żywy blok** „loty w tym tygodniu” z prawdziwych danych, z zapisem na zrzut i quizem.
4. Linkowanie wewnętrzne (stopka, hub, blog → miasta) i wpisy w sitemap.

## Nie-cele i anty-cele

- Nie publikujemy cen z `catalog.ts`, liczby użytkowników, opinii ani „najlepszych” rankingów bez źródła.
- Nie dodajemy znaczników `Offer` z ceną (ceny są chwilowe i nie sprzedajemy biletów).
- Nie generujemy dziesiątek niemal identycznych stron: **anty-cel to strony-bramy (doorway pages)**. Strona miasta musi mieć własną treść i własne dane albo nie powstaje.
- Brak nowych funkcji produktu i zmian cennika (kierunek testu okazji).

## Podejścia

| | Opis | Zaleta | Wada |
|---|---|---|---|
| A | Tylko hub + wzbogacenie stron lotnisk | Mało ryzyka, szybkie | Nie łapie fraz „weekend w {miasto}” |
| **B (wybrane)** | A + strony miast dla miast z katalogu, żywy blok z `drop_deals`, pomijamy miasta spoza weekendowego zasięgu | Pokrywa długi ogon, dane prawdziwe | Ryzyko cienkiej treści; ograniczone zasadami poniżej |
| C | Strony tras „Wrocław → Barcelona” | Bardzo precyzyjna fraza | Adresy zależą od chwilowych danych, niestabilne |
| D | Więcej artykułów blogowych | Najlepsza unikalna treść | Pisanie bez weryfikacji faktów niesie ryzyko błędów; wolne |

**Wybieram B**, z A jako fundamentem. D zostaje na później jako osobne zadanie redakcyjne, bo wymaga Twojej wiedzy i sprawdzenia faktów.

## Zasady przeciw cienkiej treści (część B)

- Miasto dostaje stronę tylko, gdy jest w katalogu **i** jest osiągalne na weekend z Polski (wyłączamy m.in. Bali, Bangkok, Dubaj, Nowy Jork, Tokio, Singapur, Kair, Tel Awiw, Marrakesz, Antalya).
- Treść stała: opis z katalogu, dla kogo (z `vibes` i `tags`), kiedy warto (z `placeTypes`), plus FAQ. Treść żywa: najniższe ceny z każdego lotniska z `drop_deals`, jeśli są; jeśli ich nie ma, blok mówi o tym wprost i oferuje zapis na zrzut.
- Strona bez żywych danych ma `noindex, follow` i nie wchodzi do sitemap; wraca do indeksu, gdy dane się pojawią (adres zostaje stały). Poprawka po review kodu, bo taka strona jest cienka.

## Czego nie rozstrzygam (zostaje do decyzji)

- Czy dopisywać artykuły (podejście D) i kto sprawdza fakty.
- Czy po kilku tygodniach `noindex` na stronach bez danych nie powoduje zbyt częstego „migania” w indeksie (do sprawdzenia w Search Console).
