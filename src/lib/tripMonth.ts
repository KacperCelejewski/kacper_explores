import { MONTH_NAMES } from "@/lib/constants";

// Jedno miejsce, w którym miesiąc z quizu (1-12) dostaje rok. Korzystają z niego picker w quizie,
// podsumowania, wyszukiwarka lotów (candidateDates) i prompty Gemini, więc wszędzie jest ten sam rok.
// Czysta logika bez zależności od serwera: bezpieczna do importu z komponentów klienckich.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Najwcześniejszy termin odlotu to dziś + tyle dni (loty bliżej nie są wyceniane). */
export const MIN_LEAD_DAYS = 3;

/** Dni miesiąca, na które szukamy lotów (ceny dla miesiąca bierzemy z tych dat). */
export const SEARCH_DAYS_OF_MONTH = [10, 15, 20, 25] as const;

const MONTH_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

/**
 * Rok najbliższego wystąpienia tego dnia miesiąca, które jest co najmniej MIN_LEAD_DAYS od `now`.
 * Nigdy nie zwraca terminu z przeszłości.
 */
export function resolveDepartureYear(month: number, day: number, now: Date = new Date()): number {
  const year = now.getUTCFullYear();
  return Date.UTC(year, month - 1, day) < now.getTime() + MIN_LEAD_DAYS * DAY_MS ? year + 1 : year;
}

/**
 * Rok, w którym wypada podany miesiąc z quizu: rok najbliższego terminu wyszukiwania lotów
 * (dni 10, 15, 20, 25). Ta sama reguła liczy daty w `candidateDates`, więc quiz, ceny lotów i plan
 * zgadzają się co do roku. Przy `now` pod koniec miesiąca ten miesiąc przechodzi na rok następny.
 */
export function resolveTripYear(month: number, now: Date = new Date()): number {
  return Math.min(...SEARCH_DAYS_OF_MONTH.map((day) => resolveDepartureYear(month, day, now)));
}

export type TripMonth = { month: number; year: number };

/** Dwanaście najbliższych miesięcy po kolei, każdy z rokiem (do pickera i nagłówków roku). */
export function upcomingMonths(now: Date = new Date()): TripMonth[] {
  return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, year: resolveTripYear(i + 1, now) }))
    .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
}

/** Te same miesiące pogrupowane rokiem: nagłówek roku nad każdą grupą w pickerze. */
export function upcomingMonthsByYear(now: Date = new Date()): { year: number; months: number[] }[] {
  const groups: { year: number; months: number[] }[] = [];
  for (const { month, year } of upcomingMonths(now)) {
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.months.push(month);
    else groups.push({ year, months: [month] });
  }
  return groups;
}

/** "grudzień 2026": pełna nazwa małą literą z rokiem. */
export function monthYearLabel(month: number, now: Date = new Date()): string {
  return `${MONTH_NAMES[month - 1].toLowerCase()} ${resolveTripYear(month, now)}`;
}

/** "gru 2026": skrót z rokiem do wąskich podsumowań. */
export function monthYearShort(month: number, now: Date = new Date()): string {
  return `${MONTH_SHORT[month - 1]} ${resolveTripYear(month, now)}`;
}
