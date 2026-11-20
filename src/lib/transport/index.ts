import type { GroundTransport, QuizAnswers, Transport, TravelEstimate, TravelStyle } from "@/types";
import { effectiveTransport, transportLabel } from "@/lib/quizOptions";
import { AIRPORT_BY_CODE } from "@/lib/airports";
import { GROUND_PLACES, ORIGIN_COORDS, findGroundPlace, normalizePlaceName, type Coords, type GroundPlace } from "./places";

// Dojazd bez samolotu (etap 1): kierunki w zasięgu, orientacyjny czas i koszt, linki do wyszukiwarek tras.
// Wszystko liczymy sami, z odległości w linii prostej: bez zewnętrznych API i bez cen przewoźników.

export const GROUND_MODES: readonly GroundTransport[] = ["auto", "pociag_bus", "rower"];

export const isGroundMode = (mode: Transport): mode is GroundTransport => mode !== "samolot";

/** Czy wybrano samolot (brak wyboru też znaczy samolot, jak przed dodaniem pytania). */
export function usesFlights(a: Pick<QuizAnswers, "transport">): boolean {
  return effectiveTransport(a).includes("samolot");
}

/** Wybrane środki lądowe, w stałej kolejności. */
export function groundModes(a: Pick<QuizAnswers, "transport">): GroundTransport[] {
  const chosen = effectiveTransport(a);
  return GROUND_MODES.filter((mode) => chosen.includes(mode));
}

/**
 * Środek, według którego powstaje plan. Gdy wybrano kilka, a nie wskazano jednego (stary klient, wywołanie API),
 * zostaje samolot, a bez samolotu pierwszy lądowy: zachowanie sprzed pytania o transport nie zmienia się.
 */
export function planTransport(a: Pick<QuizAnswers, "transport">): Transport {
  return usesFlights(a) ? "samolot" : groundModes(a)[0];
}

// ── Założenia kosztowe (szacunek, nie cennik) ────────────────────────────────
// Założenia własne z 2026-11-20, NIEZWERYFIKOWANE z zewnętrznym źródłem: do sprawdzenia przez właściciela.
// Stąd widełki ±15% i jawny dopisek "szacunek" w każdym miejscu, gdzie kwota trafia do użytkownika.
export const TRAVEL_ASSUMPTIONS = {
  assumedOn: "2026-11-20",
  /** Droga po drogach jest dłuższa niż linia prosta */
  roadFactor: { auto: 1.35, pociag_bus: 1.4, rower: 1.3 } satisfies Record<GroundTransport, number>,
  /** Średnia prędkość z postojami, km/h */
  speedKmh: { auto: 80, pociag_bus: 60, rower: 15 } satisfies Record<GroundTransport, number>,
  fuelLitresPer100Km: 7,
  fuelPricePlnPerLitre: 6.5,
  /** Cena biletu pociągu lub busa za km, zł, od–do */
  ticketPlnPerKm: [0.2, 0.4] as const,
  costMargin: 0.15,
  bikeHoursPerDay: 6,
  seatsPerCar: 4,
} as const;

/** Znak ostrożności pokazywany przy każdej kwocie dojazdu. */
export const TRAVEL_ESTIMATE_NOTE =
  "Szacunek z odległości w linii prostej, bez opłat drogowych, parkingu i dokładnych cen biletów. Cenę i godziny sprawdź przed wyjazdem.";

const round = (value: number, step: number) => Math.round(value / step) * step;

export function haversineKm(a: Coords, b: Coords): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Współrzędne miasta startu z kodów lotnisk z quizu (pierwszy znany kod z listy). */
export function originCoords(airports: readonly string[] | undefined): Coords | null {
  for (const code of airports ?? []) {
    const coords = ORIGIN_COORDS[code];
    if (coords) return coords;
  }
  return null;
}

/** Nazwa miasta startu do linków i opisów (pierwsze znane lotnisko z listy). */
export function originCityName(airports: readonly string[] | undefined): string | null {
  for (const code of airports ?? []) {
    const airport = AIRPORT_BY_CODE.get(code);
    if (airport && ORIGIN_COORDS[code]) return airport.city;
  }
  return null;
}

/** Orientacyjny dojazd w jedną stronę i koszt w obie strony. */
export function estimateTravel(mode: GroundTransport, from: Coords, to: Coords): TravelEstimate {
  const t = TRAVEL_ASSUMPTIONS;
  const roadKm = haversineKm(from, to) * t.roadFactor[mode];
  const hours = Math.max(0.5, round(roadKm / t.speedKmh[mode], 0.5));
  const distanceKm = Math.max(10, round(roadKm, 10));

  if (mode === "rower") {
    return { mode, distanceKm, hours, days: Math.max(1, Math.ceil(roadKm / t.speedKmh.rower / t.bikeHoursPerDay)), costFrom: 0, costTo: 0 };
  }
  if (mode === "auto") {
    const fuel = (roadKm * 2 * t.fuelLitresPer100Km * t.fuelPricePlnPerLitre) / 100;
    return { mode, distanceKm, hours, costFrom: round(fuel * (1 - t.costMargin), 10), costTo: round(fuel * (1 + t.costMargin), 10) };
  }
  return {
    mode, distanceKm, hours,
    costFrom: round(roadKm * 2 * t.ticketPlnPerKm[0], 10),
    costTo: round(roadKm * 2 * t.ticketPlnPerKm[1], 10),
  };
}

/** Najdłuższy sensowny dojazd w jedną stronę (godziny), zależnie od długości wyjazdu. Weekend: ok. 10 h. */
export function maxOneWayHours(mode: GroundTransport, duration: number | null): number {
  const days = duration ?? 0;
  if (mode === "rower") return days <= 3 ? 8 : days <= 7 ? 16 : 24;
  return days <= 3 ? 10 : days <= 7 ? 14 : 18;
}

/** Odległość mniejsza niż to nie jest wyjazdem: to to samo miasto. */
const MIN_DISTANCE_KM = 25;

export interface GroundCandidate {
  place: GroundPlace;
  travel: TravelEstimate[];
}

function travelInReach(modes: readonly GroundTransport[], from: Coords, to: Coords, duration: number | null): TravelEstimate[] {
  const straight = haversineKm(from, to);
  if (straight < MIN_DISTANCE_KM) return [];
  return modes.flatMap((mode) => {
    const estimate = estimateTravel(mode, from, to);
    return estimate.hours <= maxOneWayHours(mode, duration) ? [estimate] : [];
  });
}

/** Dojazd do konkretnego miasta wybranymi środkami lądowymi; pusta lista, gdy miasta nie znamy albo jest poza zasięgiem. */
export function travelFor(answers: Pick<QuizAnswers, "transport" | "airports" | "duration">, city: string): TravelEstimate[] {
  const modes = groundModes(answers);
  const from = originCoords(answers.airports);
  const place = findGroundPlace(city);
  if (modes.length === 0 || !from || !place) return [];
  return travelInReach(modes, from, place.coords, answers.duration);
}

/** Dojazd dla planu: środek planu (patrz `planTransport`) i miasto; `null` dla lotu albo nieznanego miasta. Bez filtra zasięgu. */
export function planTravel(a: Pick<QuizAnswers, "transport" | "airports">, city: string): TravelEstimate | null {
  const mode = planTransport(a);
  if (!isGroundMode(mode)) return null;
  const from = originCoords(a.airports);
  const place = findGroundPlace(city);
  return from && place ? estimateTravel(mode, from, place.coords) : null;
}

/** Miejsca w zasięgu wybranych środków lądowych, od najlepiej dopasowanych do zainteresowań. */
export function reachablePlaces(
  answers: Pick<QuizAnswers, "transport" | "airports" | "duration" | "styles">,
  limit = 24,
  accept: (place: GroundPlace) => boolean = () => true,
): GroundCandidate[] {
  const modes = groundModes(answers);
  const from = originCoords(answers.airports);
  if (modes.length === 0 || !from) return [];
  const styles = new Set<TravelStyle>(answers.styles ?? []);
  const originKey = normalizePlaceName(originCityName(answers.airports) ?? "");

  return GROUND_PLACES.flatMap((place) => {
    if (normalizePlaceName(place.city) === originKey || !accept(place)) return [];
    const travel = travelInReach(modes, from, place.coords, answers.duration);
    return travel.length ? [{ place, travel }] : [];
  })
    .map((candidate) => ({
      candidate,
      fit: candidate.place.tags.filter((tag) => styles.has(tag)).length,
      distance: Math.min(...candidate.travel.map((t) => t.distanceKm)),
    }))
    .sort((a, b) => b.fit - a.fit || a.distance - b.distance)
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

// ── Opisy dla użytkownika ─────────────────────────────────────────────────────

const plHours = (hours: number) => (Number.isInteger(hours) ? String(hours) : String(hours).replace(".", ","));

export function travelDuration(estimate: TravelEstimate): string {
  if (estimate.mode === "rower") {
    const days = estimate.days ?? 1;
    return days > 1 ? `ok. ${plHours(estimate.hours)} h jazdy, czyli ${days} dni w siodle` : `ok. ${plHours(estimate.hours)} h jazdy`;
  }
  return `ok. ${plHours(estimate.hours)} h`;
}

const MODE_NAMES: Record<GroundTransport, string> = { auto: "Auto", pociag_bus: "Pociąg lub bus", rower: "Rower" };
export const travelModeName = (mode: Transport): string => (isGroundMode(mode) ? MODE_NAMES[mode] : transportLabel(mode));

const money = (from: number, to: number) => (from === to ? `${from}` : `${from}–${to}`);

export interface TravelCopy {
  mode: GroundTransport;
  /** "Auto" */
  title: string;
  /** "ok. 350 km, ok. 4,5 h w jedną stronę" */
  route: string;
  /** "paliwo ok. 270–370 zł za auto w obie strony" albo null (rower) */
  cost: string | null;
  /** "ok. 70–90 zł na osobę" przy większej grupie */
  perPerson: string | null;
}

/** Tekst dojazdu dla karty i planu. `seats` to liczba osób (1, gdy nieznana). */
export function travelCopy(estimate: TravelEstimate, seats = 1): TravelCopy {
  const title = MODE_NAMES[estimate.mode];
  const route = `ok. ${estimate.distanceKm} km, ${travelDuration(estimate)} w jedną stronę`;
  const people = Math.max(1, Math.floor(seats));
  if (estimate.mode === "rower") {
    return { mode: estimate.mode, title, route, cost: "bez opłat za przejazd", perPerson: null };
  }
  if (estimate.mode === "auto") {
    const cars = Math.ceil(people / TRAVEL_ASSUMPTIONS.seatsPerCar);
    const perPerson = people > 1
      ? `ok. ${money(round((estimate.costFrom * cars) / people, 10), round((estimate.costTo * cars) / people, 10))} zł na osobę`
      : null;
    return { mode: estimate.mode, title, route, cost: `paliwo ok. ${money(estimate.costFrom, estimate.costTo)} zł za auto w obie strony`, perPerson };
  }
  return {
    mode: estimate.mode, title, route,
    cost: `bilety ok. ${money(estimate.costFrom, estimate.costTo)} zł za osobę w obie strony`,
    perPerson: people > 1 ? `ok. ${money(estimate.costFrom * people, estimate.costTo * people)} zł razem dla ${people} osób` : null,
  };
}

/** Jedna linia do pola `budgetBreakdown` planu (pole zostaje pod kluczem `flights`; zgodność ze starymi planami). */
export function travelBudgetText(estimate: TravelEstimate | null, mode: GroundTransport): string {
  if (!estimate) return `${MODE_NAMES[mode]}: koszt dojazdu zależy od trasy, sprawdź ją przed wyjazdem`;
  const copy = travelCopy(estimate);
  return estimate.mode === "rower" ? `${copy.title}: ${copy.cost}` : `${copy.title}: ${copy.cost} (szacunek)`;
}

// ── Linki do wyszukiwarek tras (bez prowizji) ─────────────────────────────────

const GOOGLE_MAPS_MODE: Record<GroundTransport, string> = { auto: "driving", pociag_bus: "transit", rower: "bicycling" };

/**
 * Link do wyszukiwarki trasy w Mapach Google. Zwykły link, bez partnera, bez znacznika prowizji:
 * w tej wersji dojazd lądowy nie jest niczym monetyzowany i nie wolno tego sugerować.
 */
export function routeSearchUrl(mode: GroundTransport, origin: string, destination: string): string {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("travelmode", GOOGLE_MAPS_MODE[mode]);
  return url.toString();
}
