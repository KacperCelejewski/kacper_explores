# Rozbudowa bloga: plan

**Cel:** artykuły pod intencje „tanie loty na weekend” i „weekend w {miasto}”, linkowane do `/okazje` i `/weekend/[miasto]`, bez wymyślonych faktów.

**Zasady (egzekwowane testem `src/lib/blog.test.ts`):** teksty redakcji (`author: redakcja`) nie zawierają cen, walut ani procentów, nie mówią głosem założyciela, linkują do okazji lub miast; każdy link wewnętrzny prowadzi do istniejącej strony.

1. Infrastruktura: pole `author`, podpis „Redakcja Włóczykija”, stylowane linki w MDX, test spójności treści.
2. Pięć artykułów tematycznych (tani lot na weekend, z czego składa się budżet weekendu, bagaż w tanich liniach, wybór kierunku, czwartek wieczorem czy piątek rano).
3. Trzy przewodniki 48 h (Praga, Wilno, Rzym): tylko dobrze znane miejsca, bez godzin otwarcia i cen.
4. Linki „Zobacz też” w pięciu istniejących artykułach; daty istniejących tekstów bez zmian (nie odświeżamy dat bez przeglądu treści).
5. Review kodu i review treści; poprawki; PR.

**Do weryfikacji przez właściciela:** fakty w tekstach redakcji (ogólne zasady działania linii, miejsca w przewodnikach) przed publikacją na dużą skalę.
