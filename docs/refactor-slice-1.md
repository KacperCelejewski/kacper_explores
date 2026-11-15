# Refaktor, plaster 1: martwy kod

## Kandydaci sprawdzeni na `origin/main` (2026-11-15)

- `src/lib/whatsapp.ts` — usunięto. Wyszukiwanie `sendWhatsApp` i importów z `whatsapp` w kodzie (`rg`, z wyłączeniem zależności i dokumentacji) znalazło wyłącznie definicję eksportowanej funkcji w tym pliku; brak wywołań.
- `src/lib/flights/travelpayouts.ts` — nie jest kandydatem do usunięcia: ten plik nie istnieje na bieżącej gałęzi. Integracja zrzutu nadal jest używana: `src/app/api/cron/drop-prepare/route.ts` odczytuje `TRAVELPAYOUTS_TOKEN`, a trasy crona importują moduły `src/lib/drop/*`. Pozostawiono bez zmian.

Zakres celowo ograniczono do potwierdzonego martwego helpera. Nie zmieniono zachowania aplikacji ani tras API.
