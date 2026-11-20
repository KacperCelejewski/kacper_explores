import type { QuizAnswers, Region, TripType, Transport } from "@/types";

// Jedno miejsce na wartości, etykiety i opisy pól quizu: region, rodzaj wyjazdu, transport.
// Klucze są techniczne (ASCII) i trafiają do walidacji, zapisu, adresów URL i analityki;
// polskie etykiety i opisy służą tylko do wyświetlania. Głos marki: bezosobowo, bez wykrzykników i emoji.

export interface QuizOption<T extends string> {
  value: T;
  label: string;
  /** Krótki opis pod etykietą */
  hint: string;
}

export const REGION_OPTIONS: readonly QuizOption<Region>[] = [
  { value: "europa", label: "Europa", hint: "Blisko, krótki lot, łatwo zmieścić w weekend." },
  { value: "ameryka_poludniowa", label: "Ameryka Południowa", hint: "Daleki lot, więcej dni na miejscu." },
  { value: "ameryka_polnocna", label: "Ameryka Północna", hint: "Daleki lot, wielkie miasta i parki narodowe." },
  { value: "azja", label: "Azja", hint: "Daleki lot, inna kuchnia i inny rytm dnia." },
  { value: "afryka", label: "Afryka", hint: "Od Maroka po safari, bardzo różne wyjazdy." },
  { value: "bliski_wschod", label: "Bliski Wschód", hint: "Pustynia, stare miasta i dobre jedzenie." },
  { value: "oceania", label: "Oceania", hint: "Najdalej od domu, wyjazd na kilka tygodni." },
];

export const TRIP_TYPE_OPTIONS: readonly QuizOption<TripType>[] = [
  { value: "zwiedzanie", label: "Zwiedzanie", hint: "Miasta, zabytki, jedzenie i spacery." },
  { value: "wypoczynek", label: "Wypoczynek", hint: "Spokojne tempo, mało planów, dużo odpoczynku." },
  { value: "narty", label: "Narty", hint: "Dni na stoku, karnet, wypożyczalnia i wieczory po nartach." },
  { value: "gory", label: "Góry", hint: "Szlaki, widoki i nocleg blisko trasy." },
  { value: "plaza", label: "Plaża", hint: "Morze, słońce i leżak bez pośpiechu." },
  { value: "aktywny", label: "Aktywnie", hint: "Ruch przez cały dzień: rower, kajak, bieganie." },
  { value: "wieczory", label: "Wieczory", hint: "Bary, muzyka na żywo i miasto po zmroku." },
];

export const TRANSPORT_OPTIONS: readonly QuizOption<Transport>[] = [
  { value: "samolot", label: "Samolot", hint: "Loty z polskich lotnisk." },
  { value: "auto", label: "Auto", hint: "Własny samochód i własna trasa." },
  { value: "pociag_bus", label: "Pociąg lub bus", hint: "Bez lotniska, prosto do miasta." },
  { value: "rower", label: "Rower", hint: "Wolniej, ale przygoda jest po drodze." },
];

export const REGION_VALUES: readonly Region[] = REGION_OPTIONS.map((o) => o.value);
export const TRIP_TYPE_VALUES: readonly TripType[] = TRIP_TYPE_OPTIONS.map((o) => o.value);
export const TRANSPORT_VALUES: readonly Transport[] = TRANSPORT_OPTIONS.map((o) => o.value);

/** Wartości domyślne: brak odpowiedzi działa jak przed dodaniem pól. */
export const DEFAULT_TRIP_TYPE: TripType = "zwiedzanie";
export const DEFAULT_TRANSPORT: readonly Transport[] = ["samolot"];

/** Limity: lista nie może mieć więcej pozycji niż jest wartości (bez powtórzeń). */
export const MAX_REGIONS = REGION_VALUES.length;
export const MAX_TRANSPORT = TRANSPORT_VALUES.length;

const REGION_SET: ReadonlySet<string> = new Set(REGION_VALUES);
const TRIP_TYPE_SET: ReadonlySet<string> = new Set(TRIP_TYPE_VALUES);
const TRANSPORT_SET: ReadonlySet<string> = new Set(TRANSPORT_VALUES);

export const isRegion = (v: unknown): v is Region => typeof v === "string" && REGION_SET.has(v);
export const isTripType = (v: unknown): v is TripType => typeof v === "string" && TRIP_TYPE_SET.has(v);
export const isTransport = (v: unknown): v is Transport => typeof v === "string" && TRANSPORT_SET.has(v);

const label = <T extends string>(options: readonly QuizOption<T>[], value: T) =>
  options.find((o) => o.value === value)?.label ?? value;

export const regionLabel = (v: Region) => label(REGION_OPTIONS, v);
export const tripTypeLabel = (v: TripType) => label(TRIP_TYPE_OPTIONS, v);
export const transportLabel = (v: Transport) => label(TRANSPORT_OPTIONS, v);

type FoundationFields = Pick<QuizAnswers, "regions" | "tripType" | "transport">;

/** Rodzaj wyjazdu z uwzględnieniem domyślnego (brak = zwiedzanie). */
export function effectiveTripType(a: Pick<QuizAnswers, "tripType">): TripType {
  return a.tripType ?? DEFAULT_TRIP_TYPE;
}

/** Transport z uwzględnieniem domyślnego (brak lub pusta lista = samolot). */
export function effectiveTransport(a: Pick<QuizAnswers, "transport">): readonly Transport[] {
  return a.transport && a.transport.length > 0 ? a.transport : DEFAULT_TRANSPORT;
}

/** Regiony; pusta lista oznacza "obojętnie". */
export function effectiveRegions(a: Pick<QuizAnswers, "regions">): readonly Region[] {
  return a.regions ?? [];
}

const unique = <T extends string>(list: readonly T[]): T[] => [...new Set(list)];

/**
 * Normalizacja do kluczy (cache, adresy URL, analityka): bez powtórzeń, posortowane według kolejności
 * opcji, puste listy i brak pola dają to samo (pominięte). Stare odpowiedzi bez tych pól dają pusty wynik,
 * więc nie zmieniają żadnego klucza.
 */
export function normalizeFoundation(a: Partial<FoundationFields>): FoundationFields {
  const out: FoundationFields = {};
  const regions = REGION_VALUES.filter((r) => a.regions?.includes(r));
  if (regions.length > 0) out.regions = regions;
  if (a.tripType !== undefined && isTripType(a.tripType)) out.tripType = a.tripType;
  const transport = TRANSPORT_VALUES.filter((t) => a.transport?.includes(t));
  if (transport.length > 0) out.transport = transport;
  return out;
}

/** Walidacja kształtu trzech pól; używa jej `validateQuizAnswers`. */
export function validateFoundationFields(d: Record<string, unknown>): boolean {
  if (d.regions !== undefined) {
    if (!Array.isArray(d.regions) || d.regions.length > MAX_REGIONS) return false;
    if (!d.regions.every(isRegion) || unique(d.regions).length !== d.regions.length) return false;
  }
  if (d.tripType !== undefined && !isTripType(d.tripType)) return false;
  if (d.transport !== undefined) {
    if (!Array.isArray(d.transport) || d.transport.length > MAX_TRANSPORT) return false;
    if (!d.transport.every(isTransport) || unique(d.transport).length !== d.transport.length) return false;
  }
  return true;
}
