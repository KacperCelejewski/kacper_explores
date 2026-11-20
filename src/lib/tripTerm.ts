import type { FlightDetails, QuizAnswers } from "@/types";
import { monthYearLabel } from "@/lib/tripMonth";

/**
 * Jedno źródło prawdy o terminie wyjazdu.
 *
 * Termin podaje się na dwa sposoby:
 *  - zakres dat (przylot i powrót): liczba dni = dni od przylotu do powrotu, oba liczone;
 *  - sam miesiąc + jawna liczba dni (`quiz.month`, `quiz.duration`).
 * Zakres dat zawsze wygrywa z `quiz.duration`. Ta sama zasada stoi za wyszukiwarką lotów
 * (`candidateDates`: powrót = wylot + duration − 1), więc ceny, plan, kalendarz i mail
 * mówią o tych samych dniach.
 */

export const MIN_TRIP_DAYS = 2;
export const MAX_TRIP_DAYS = 21;
const DEFAULT_TRIP_DAYS = 3;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];

export type Season = "zima" | "wiosna" | "lato" | "jesień";

/** "YYYY-MM-DD" jako dzień kalendarzowy w UTC (bez przesunięć zmiany czasu); null, gdy to nie prawdziwa data. */
function parseUTC(value: string | undefined | null): number | null {
  const m = typeof value === "string" ? ISO_DATE.exec(value) : null;
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  return d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? t : null;
}

function toISO(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

/** Liczba dni od przylotu do powrotu włącznie; null dla błędnych dat albo powrotu przed przylotem. */
export function inclusiveDays(start: string | undefined | null, end: string | undefined | null): number | null {
  const a = parseUTC(start);
  const b = parseUTC(end);
  if (a === null || b === null || b < a) return null;
  return Math.round((b - a) / DAY_MS) + 1;
}

export function addDaysISO(date: string, days: number): string {
  const t = parseUTC(date);
  if (t === null) throw new Error(`Nieprawidłowa data: ${date}`);
  return toISO(t + days * DAY_MS);
}

export function weekdayPl(date: string): string {
  const t = parseUTC(date);
  if (t === null) throw new Error(`Nieprawidłowa data: ${date}`);
  return WEEKDAYS[new Date(t).getUTCDay()];
}

/** Pora roku na półkuli północnej (kierunki Włóczykija leżą w Europie i okolicach). */
export function seasonForMonth(month: number): Season {
  if (month === 12 || month <= 2) return "zima";
  if (month <= 5) return "wiosna";
  if (month <= 8) return "lato";
  return "jesień";
}

function dayMonthParts(date: string): { day: number; month: number; year: number } {
  const [y, m, d] = date.split("-").map(Number);
  return { day: d, month: m, year: y };
}

function dmy(date: string): string {
  const { day, month, year } = dayMonthParts(date);
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
}

function dm(date: string): string {
  const { day, month } = dayMonthParts(date);
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}`;
}

export type TermSource = "dates" | "month";

export type TripTerm =
  | {
      ok: true;
      /** Liczba dni planu: jedyna wartość, którą wolno przekazać generatorowi i walidacji planu. */
      duration: number;
      /** `dates`: zakres dat podany przez użytkownika; `month`: sam miesiąc + liczba dni z quizu. */
      source: TermSource;
      startDate: string | null;
      endDate: string | null;
      /** Miesiąc terminu (z dat, gdy są; inaczej z quizu); null, gdy nieznany. */
      month: number | null;
      /** Dane lotu po oczyszczeniu: poprawne daty, godziny HH:MM albo brak. */
      flightDetails: FlightDetails | null;
    }
  | { ok: false; error: string };

function cleanTime(value: unknown): string | undefined {
  return typeof value === "string" && HH_MM.test(value) ? value : undefined;
}

/** Długość zakresu dat albo czytelny komunikat, gdy wychodzi poza 2–21 dni lub powrót wypada przed przylotem. */
export function checkDateRange(
  start: string | undefined | null,
  end: string | undefined | null
): { ok: true; days: number } | { ok: false; error: string } {
  if (parseUTC(start) === null || parseUTC(end) === null) {
    return { ok: false, error: "Daty wyjazdu są nieprawidłowe. Podaj datę przylotu i datę powrotu." };
  }
  const days = inclusiveDays(start, end);
  if (days === null) {
    return { ok: false, error: "Daty wyjazdu są nieprawidłowe: powrót nie może wypadać przed przylotem." };
  }
  if (days < MIN_TRIP_DAYS || days > MAX_TRIP_DAYS) {
    return {
      ok: false,
      error: `Wyjazd może trwać od ${MIN_TRIP_DAYS} do ${MAX_TRIP_DAYS} dni, a z podanych dat wychodzi ${days} ${days === 1 ? "dzień" : "dni"}. Zmień daty przylotu lub powrotu.`,
    };
  }
  return { ok: true, days };
}

export function resolveTripTerm(
  quiz: QuizAnswers,
  flightDetails?: Partial<FlightDetails> | null
): TripTerm {
  const arrival = flightDetails?.arrivalDate;
  const back = flightDetails?.returnDate;

  // Użytkownik podał oba terminy: to jego wybór wyznacza długość planu.
  if (arrival && back) {
    const range = checkDateRange(arrival, back);
    if (!range.ok) return { ok: false, error: range.error };
    const days = range.days;
    return {
      ok: true,
      duration: days,
      source: "dates",
      startDate: arrival,
      endDate: back,
      month: dayMonthParts(arrival).month,
      flightDetails: {
        arrivalDate: arrival,
        returnDate: back,
        arrivalTime: cleanTime(flightDetails?.arrivalTime),
        returnTime: cleanTime(flightDetails?.returnTime),
      },
    };
  }

  const duration = quiz.duration ?? DEFAULT_TRIP_DAYS;
  const month = quiz.month ?? null;

  return { ok: true, duration, source: "month", startDate: null, endDate: null, month, flightDetails: null };
}

/** Kolejne dni planu z datą i dniem tygodnia; pusta lista, gdy termin zna tylko miesiąc. */
export function termDays(term: Extract<TripTerm, { ok: true }>): Array<{ day: number; date: string; weekday: string }> {
  if (!term.startDate) return [];
  const start = term.startDate;
  return Array.from({ length: term.duration }, (_, i) => {
    const date = addDaysISO(start, i);
    return { day: i + 1, date, weekday: weekdayPl(date) };
  });
}

/** Etykieta dnia do pola `date` planu: "Dzień 2 – niedziela 13.12" albo samo "Dzień 2". */
export function dayLabel(day: number, date: string | null): string {
  return date ? `Dzień ${day} – ${weekdayPl(date)} ${dm(date)}` : `Dzień ${day}`;
}

/** Blok promptu o terminie: daty, dni tygodnia, pora roku. Bez wydarzeń, tylko to, co wynika z kalendarza. */
export function tripTermPrompt(term: Extract<TripTerm, { ok: true }>): string {
  const season = term.month ? seasonForMonth(term.month) : null;
  const lines: string[] = [];

  if (term.startDate && term.endDate) {
    lines.push(
      `TERMIN WYJAZDU: ${dmy(term.startDate)} (${weekdayPl(term.startDate)}) – ${dmy(term.endDate)} (${weekdayPl(term.endDate)}), ${term.duration} dni łącznie z dniem przylotu i dniem powrotu.`
    );
    if (season) lines.push(`Pora roku: ${season}.`);
    lines.push("Dni planu:");
    for (const d of termDays(term)) lines.push(`- Dzień ${d.day}: ${d.weekday} ${dmy(d.date)}`);
  } else {
    const monthName = term.month ? monthYearLabel(term.month) : "nieokreślony";
    lines.push(
      `TERMIN WYJAZDU: ${monthName}, ${term.duration} dni łącznie z dniem przylotu i dniem powrotu. Konkretne daty i dni tygodnia nieznane.`
    );
    if (season) lines.push(`Pora roku: ${season}.`);
  }

  lines.push(
    "Uwzględnij tylko to, co wynika z kalendarza i pory roku. Nie wymyślaj wydarzeń, festiwali, świąt ani godzin otwarcia, których nie znasz."
  );
  if (term.startDate) {
    lines.push(
      "Dni tygodnia: gdy dzień planu wypada w niedzielę lub poniedziałek, dodaj uwagę, żeby sprawdzić godziny otwarcia wybranych miejsc, bo w te dni bywają zamknięte. Nie podawaj dni zamknięcia, których nie znasz."
    );
  }
  if (season === "zima") {
    lines.push("Zimą dzień jest krótszy: atrakcje na zewnątrz planuj w godzinach dziennych, a na wieczór zostaw miejsca pod dachem.");
  } else if (season === "lato") {
    lines.push("Latem w południe bywa gorąco: atrakcje na zewnątrz planuj rano i pod wieczór, a w środku dnia miejsca w cieniu lub pod dachem.");
  }
  return lines.join("\n");
}
