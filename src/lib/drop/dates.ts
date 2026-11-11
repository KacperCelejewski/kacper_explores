import type { WeekKey, WeekendVariant } from "./types";

const TZ = "Europe/Warsaw";
const THURSDAY = 4;
const DAY_MS = 86_400_000;

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Dzisiejsza data kalendarzowa w Warszawie jako UTC-północ tego dnia.
function warsawDay(now: Date): Date {
  const [y, m, d] = dateFmt.format(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(day: Date, n: number): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + n));
}

function iso(day: Date): string {
  return day.toISOString().slice(0, 10);
}

// Dzisiejszy czwartek, jeśli now wypada w czwartek; w przeciwnym razie następny.
function nextThursday(now: Date): Date {
  const today = warsawDay(now);
  return addDays(today, (THURSDAY - today.getUTCDay() + 7) % 7);
}

export function weekKey(now: Date): WeekKey {
  const wednesday = addDays(nextThursday(now), -1);
  // ISO: tydzień należy do roku, w którym wypada jego czwartek
  const thursday = addDays(wednesday, 4 - (wednesday.getUTCDay() || 7));
  const year = thursday.getUTCFullYear();
  const dayOfYear = Math.round((thursday.getTime() - Date.UTC(year, 0, 1)) / DAY_MS);
  const week = Math.floor(dayOfYear / 7) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function weekendDates(now: Date): WeekendVariant[] {
  const thu = nextThursday(now);
  const fri = addDays(thu, 1);
  const sun = addDays(thu, 3);
  const mon = addDays(thu, 4);
  return [
    { label: "czw-nd", depart: iso(thu), return: iso(sun) },
    { label: "pt-nd", depart: iso(fri), return: iso(sun) },
    { label: "pt-pn", depart: iso(fri), return: iso(mon) },
  ];
}
