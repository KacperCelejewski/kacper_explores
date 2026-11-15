import type { Companion, GroupComposition } from "@/types";

export interface FlightPassengers {
  adults: number;
  children: number;
  infants: number;
}

// Maksymalna liczba miejsc w samolocie w jednej rezerwacji.
export const MAX_GROUP = 9;

const INFANT_BELOW = 2;
const ADULT_FROM = 12;

const DEFAULT_ADULTS: Record<Companion, number> = { solo: 1, couple: 2, friends: 4, family: 2 };

// Skład grupy: jawnie podany liczy się tylko dla znajomych i rodziny, w przeciwnym razie wynika z typu towarzystwa.
export function groupFromCompanion(companion: Companion | null, group?: GroupComposition): GroupComposition {
  if (group && (companion === "friends" || companion === "family")) return group;
  return { adults: companion ? DEFAULT_ADULTS[companion] : 1, childrenAges: [] };
}

// Liczba miejsc w samolocie: niemowlęta jej nie zwiększają.
export function groupSize(group: GroupComposition): number {
  return group.adults + group.childrenAges.filter((age) => age >= INFANT_BELOW).length;
}

// Dziecko od 12 lat leci jako dorosły, do 2 lat jako niemowlę.
export function toFlightPassengers(group: GroupComposition): FlightPassengers {
  let adults = group.adults;
  let children = 0;
  let infants = 0;
  for (const age of group.childrenAges) {
    if (age < INFANT_BELOW) infants++;
    else if (age < ADULT_FROM) children++;
    else adults++;
  }
  return { adults, children, infants };
}

export function isValidGroup(value: unknown): value is GroupComposition {
  if (typeof value !== "object" || value === null) return false;
  const { adults, childrenAges } = value as Record<string, unknown>;
  if (!Number.isInteger(adults) || (adults as number) < 1 || (adults as number) > MAX_GROUP) return false;
  if (!Array.isArray(childrenAges)) return false;
  if (!childrenAges.every((a) => Number.isInteger(a) && a >= 0 && a <= 17)) return false;
  // Niemowlę leci na kolanach dorosłego, więc nie może być ich więcej niż dorosłych.
  if (childrenAges.length > MAX_GROUP) return false;
  const infants = childrenAges.filter((a) => a < INFANT_BELOW).length;
  if (infants > (adults as number)) return false;
  return groupSize({ adults: adults as number, childrenAges }) <= MAX_GROUP;
}

const formatThousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// Liczba z separatorem tysięcy (spacja, twarda spacja, kropka lub przecinek przed dokładnie trzema cyframi)
// i opcjonalnym ułamkiem po przecinku lub kropce.
const NUMBER_RE = /(\d{1,3}(?:[ \u00a0.,]\d{3}(?!\d))+)([.,]\d+)?|\d+(?:[.,]\d+)?/g;

function parseNumber(match: string, thousands?: string, decimals?: string): number {
  if (thousands) return Number(thousands.replace(/[ \u00a0.,]/g, "") + (decimals ? `.${decimals.slice(1)}` : ""));
  return Number(match.replace(",", "."));
}

// Wszystkie liczby z tekstu budżetu, np. "1 200–1 500 PLN" daje [1200, 1500].
export function extractBudgetNumbers(text: string): number[] {
  return Array.from(text.matchAll(NUMBER_RE), (m) => parseNumber(m[0], m[1], m[2]));
}

// Przekształca każdą liczbę w tekście budżetu; zakresy zapisuje przez en dash, tyldę zachowuje.
export function mapBudgetNumbers(text: string, fn: (n: number) => number): string {
  return text
    .replace(/(\d)\s*[-–]\s*(\d)/g, "$1–$2")
    .replace(NUMBER_RE, (m, th?: string, dec?: string) => formatThousands(Math.round(fn(parseNumber(m, th, dec)))));
}

// Czy wyjazd ma jawnie zapisaną grupę, czyli plan liczony jest na osobę.
export function isGroupTrip(companion: Companion | null, group?: GroupComposition): boolean {
  return (companion === "friends" || companion === "family") && group != null;
}

// Czy nagłówek budżetu ma pokazać "na osobę" i "razem".
export function showGroupBudget(companion: Companion | null, group?: GroupComposition): boolean {
  return isGroupTrip(companion, group) && group != null && groupSize(group) > 1;
}

// Mnoży liczby w tekście budżetu, np. "1200-1500 PLN" x 4 daje "4 800–6 000 PLN".
export function scaleBudgetText(text: string, factor: number): string | null {
  if (!Number.isFinite(factor) || factor <= 0) return null;
  if (!/\d/.test(text)) return null;
  if (factor === 1) return text;
  return text
    .replace(/(\d)\s*[-–]\s*(\d)/g, "$1–$2")
    .replace(NUMBER_RE, (m, th?: string, dec?: string) => formatThousands(Math.round(parseNumber(m, th, dec) * factor)))
    .replace(/~/g, "")
    .trim();
}

const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;

export function groupLabel(group: GroupComposition): string {
  const ages = group.childrenAges;
  if (ages.length === 0) return `${group.adults} ${plural(group.adults, "osoba", "osoby", "osób")}`;
  const adults = `${group.adults} ${group.adults === 1 ? "dorosły" : "dorosłych"}`;
  if (ages.length === 1) return `${adults}, dziecko: ${ages[0]} ${plural(ages[0], "rok", "lata", "lat")}`;
  const head = ages.slice(0, -1).join(", ");
  return `${adults}, dzieci: ${head} i ${ages[ages.length - 1]} lat`;
}
