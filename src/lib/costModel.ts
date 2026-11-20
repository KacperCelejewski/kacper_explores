import { extractBudgetNumbers, groupSize, mapBudgetNumbers, scaleBudgetText } from "./group";
import type { QuizAnswers, TripPlan } from "@/types";
import { PLAN_TOTAL_LABEL, isFreshDeal } from "./priceTrust";

/**
 * Jeden model prezentacji kosztu wyjazdu: z czego składa się kwota, co jest prawdziwe z datą,
 * a co szacunkiem modelu, i co wchodzi do której sumy. Czysta logika, bez UI i bez sieci.
 */

export type CostKey = "flight" | "accommodation" | "food" | "attractions" | "localTransport" | "access";

/** verified = cena z wyszukiwania z datą; estimate = szacunek (model AI lub orientacyjny); unknown = brak kwoty. */
export type CostStatus = "verified" | "estimate" | "unknown";

export interface CostComponent {
  key: CostKey;
  label: string;
  /** Kwota lub zakres jako tekst; null, gdy nie ma kwoty. */
  value: string | null;
  /** Tekst do wyświetlenia w miejscu kwoty: kwota albo wprost powód jej braku. */
  display: string;
  status: CostStatus;
  /** Krótka etykieta statusu pod kwotą: "cena z 14.11", "szacunek", "orientacyjnie", "brak ceny". */
  statusLabel: string;
  /** Czy składnik jest w sumie "Razem na miejscu (bez lotu)". Lot i dojazd są zawsze poza nią. */
  inOnSiteTotal: boolean;
  /** Jednozdaniowe wyjaśnienie, co ta pozycja znaczy i do czego się liczy. */
  note: string;
  /** Krótko, do której sumy należy: "w sumie na miejscu", "poza sumą na miejscu" (starszy plan: "w szacunku planu"). */
  scope: string;
}

/** Prawdziwa cena lotu: z wyszukiwania (cache lub okazja), z datą pobrania. */
export interface FlightQuote {
  pricePerPerson: number;
  /** Kiedy cenę pobraliśmy (ms). */
  checkedAt: number;
  /** Czy cenę wolno pomnożyć przez liczbę osób (cache tak, okazja dotyczy 1 dorosłego: nie). */
  multiplyByGroup: boolean;
}

/** Dojazd innym środkiem niż lot (auto, bus, pociąg): zawsze orientacyjny, zawsze poza sumą na miejscu. */
export interface AccessCost {
  label?: string;
  value: string;
}

export interface PlanCostInput {
  breakdown: { flights?: string; accommodation?: string; food?: string; attractions?: string; transport?: string };
  /** Szacunek planu na osobę, bez lotu ("1200-1500 PLN"). */
  totalEstimate: string;
  /** Liczba osób, na którą policzono kwoty "na osobę" (1 dla solo i pary liczonych na osobę). */
  people: number;
  /** Czy pokazać "na osobę" i "razem" (grupa znajomych lub rodzina z jawnym składem). */
  group: boolean;
  /** Założenia zapisane w planie (`plan.costBasis`); null dla planów sprzed ich zapisywania. */
  basis?: CostBasis | null;
  flight?: FlightQuote | null;
  access?: AccessCost | null;
  now?: number;
}

export interface CostTotal {
  label: string;
  /** Kwota na osobę; null, gdy nie ma z czego jej odczytać. */
  perPerson: string | null;
  /** Kwota dla całej grupy; null poza grupą albo gdy nie da się jej uczciwie policzyć. */
  groupTotal: string | null;
  note: string;
}

export interface PlanCostModel {
  components: CostComponent[];
  onSite: CostTotal;
  /** Tylko przy prawdziwej, świeżej cenie lotu; inaczej null (nigdy z lotu z głowy). */
  withFlight: CostTotal | null;
  flightLine: string;
  assumptions: string;
  /** Starszy plan: suma mogła zawierać lot, więc nie pokazujemy notatki "lotu tu nie wliczamy". */
  legacy: boolean;
}

export const ON_SITE_TOTAL_LABEL = PLAN_TOTAL_LABEL;
export const WITH_FLIGHT_TOTAL_LABEL = "Razem z lotem";
/** Plany sprzed 2026-11-19 liczyły sumę z lotem od modelu (pole flights z kwotą): nie wolno ich nazwać "bez lotu". */
export const LEGACY_TOTAL_LABEL = "Szacunek planu (starszy plan, może zawierać lot)";
export const FLIGHT_UNKNOWN_LINE = "Lot: sprawdź w wyszukiwarce";
export const ESTIMATE_LABEL = "szacunek";
export const ROUGH_LABEL = "orientacyjnie";
export const PER_PERSON = "na osobę";
export const TOGETHER = "razem";

const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", timeZone: "Europe/Warsaw" });
export const costDate = (ms: number) => dateFmt.format(ms);

const plnFmt = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });
const pln = (amount: number) => `${plnFmt.format(amount)} zł`;

function plural(n: number, one: string, few: string, many: string): string {
  return n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;
}

const hasAmount = (text: string | undefined | null): text is string =>
  typeof text === "string" && extractBudgetNumbers(text).length > 0;

const STANDARD_LABEL = { low: "budżetowy", medium: "komfortowy" } as const;

/** Noce z liczby dni: wyjazd na N dni to zwykle N-1 nocy (min. 1). Ta sama liczba trafia do promptu. */
export function nightsFor(duration: number): number {
  return Math.max(1, Math.round(duration) - 1);
}

export type CostBasis = NonNullable<TripPlan["costBasis"]>;

/**
 * Założenia kosztów dla danego quizu i długości planu. Ten sam obiekt trafia do promptu, jest zapisywany w planie
 * i pokazywany pod kwotą, więc użytkownik widzi dokładnie to, co dostał model. Osoby liczymy tylko w grupie
 * znajomych lub rodziny z jawnym składem, poza nią kwoty są dla jednej osoby (jak w prompcie).
 */
export function costBasisFor(
  quiz: Pick<QuizAnswers, "budget" | "companion" | "group">,
  duration: number,
): CostBasis {
  const grouped = (quiz.companion === "friends" || quiz.companion === "family") && !!quiz.group;
  return {
    nights: nightsFor(duration),
    seats: grouped && quiz.group ? groupSize(quiz.group) : 1,
    standard: quiz.budget ?? null,
  };
}

const OLD_PLAN_ASSUMPTIONS = "Założeń szacunku (noce, osoby, standard) nie zapisaliśmy przy tym planie. Kwoty to szacunek modelu AI, nie rezerwacja ani oferta.";

/** Założenia szacunku: liczba nocy, osób i standard. Bez zapisanych założeń mówimy to wprost. */
export function costAssumptions(basis: CostBasis | null | undefined, perPerson = false): string {
  // Plan z konta może zostać zmieniony przez PATCH: zły kształt traktujemy jak brak zapisanych założeń
  const valid = !!basis && Number.isInteger(basis.nights) && basis.nights >= 1 && basis.nights <= 60
    && Number.isInteger(basis.seats) && basis.seats >= 1 && basis.seats <= 50
    && (basis.standard === null || basis.standard === "low" || basis.standard === "medium");
  if (!basis || !valid) return OLD_PLAN_ASSUMPTIONS;
  const persons = Math.max(1, Math.round(basis.seats));
  const parts = [
    `${basis.nights} ${plural(basis.nights, "noc", "noce", "nocy")}`,
    `${persons} ${plural(persons, "osoba", "osoby", "osób")}`,
    ...(basis.standard ? [`standard ${STANDARD_LABEL[basis.standard]}`] : []),
    ...(perPerson && persons > 1 ? ["kwoty na osobę"] : []),
  ];
  return `Założenia szacunku: ${parts.join(", ")}. Kwoty to szacunek modelu AI, nie rezerwacja ani oferta.`;
}

/** Prawdziwa i świeża cena lotu albo null: stara lub niepoprawna cena nie wchodzi do żadnej sumy. */
export function usableFlight(flight: FlightQuote | null | undefined, now: number): FlightQuote | null {
  if (!flight || !Number.isFinite(flight.checkedAt)) return null;
  const fresh = isFreshDeal({ price: flight.pricePerPerson, fetched_at: new Date(flight.checkedAt).toISOString() }, now);
  return fresh ? flight : null;
}

type Draft = Omit<CostComponent, "scope">;

function estimateComponent(key: CostKey, label: string, value: string | undefined, note: string): Draft {
  const known = hasAmount(value);
  return {
    key, label,
    value: known ? value!.trim() : null,
    display: known ? value!.trim() : "brak szacunku",
    status: known ? "estimate" : "unknown",
    statusLabel: known ? ESTIMATE_LABEL : "brak szacunku",
    inOnSiteTotal: true,
    note: known ? note : "Brak kwoty w planie.",
  };
}

function totals(perPerson: string, people: number, group: boolean): { perPerson: string; groupTotal: string | null } {
  return { perPerson, groupTotal: group ? scaleBudgetText(perPerson, people) : null };
}

export function buildPlanCostModel(input: PlanCostInput): PlanCostModel {
  const now = input.now ?? Date.now();
  const people = Math.max(1, Math.round(input.people));
  const flight = usableFlight(input.flight, now);
  const group = input.group && people > 1;
  // Starszy plan: model wpisał w "flights" kwotę, więc jego suma mogła zawierać lot.
  const legacy = hasAmount(input.breakdown.flights);

  const drafts: Draft[] = [
    estimateComponent("accommodation", "Nocleg", input.breakdown.accommodation, "Szacunek modelu AI, wliczony w sumę na miejscu."),
    estimateComponent("food", "Jedzenie", input.breakdown.food, "Szacunek modelu AI, wliczony w sumę na miejscu."),
    estimateComponent("attractions", "Atrakcje", input.breakdown.attractions, "Szacunek modelu AI, wliczony w sumę na miejscu."),
  ];

  // Transport na miejscu jest w sumie, ale starsze plany nie mają osobnej kwoty: mówimy to wprost.
  if (hasAmount(input.breakdown.transport)) {
    drafts.push(estimateComponent("localTransport", "Transport na miejscu", input.breakdown.transport, "Szacunek modelu AI, wliczony w sumę na miejscu."));
  } else {
    drafts.push({
      key: "localTransport", label: "Transport na miejscu", value: null, display: "wliczony", status: "unknown",
      statusLabel: "bez osobnej kwoty", inOnSiteTotal: true,
      note: "Wliczony w sumę na miejscu, ale bez osobnej kwoty.",
    });
  }

  // Lot: nigdy tekst od modelu (mógłby być wymyślony), tylko prawdziwa cena z datą albo "sprawdź w wyszukiwarce".
  drafts.push(flight
    ? {
        key: "flight", label: "Lot", value: pln(flight.pricePerPerson), display: pln(flight.pricePerPerson), status: "verified",
        statusLabel: `cena z ${costDate(flight.checkedAt)}`, inOnSiteTotal: false,
        note: "Za osobę, w obie strony, z wyszukiwania. Poza sumą na miejscu.",
      }
    : {
        key: "flight", label: "Lot", value: null, display: "sprawdź w wyszukiwarce", status: "unknown", statusLabel: "brak ceny",
        inOnSiteTotal: false, note: "Cenę sprawdź w wyszukiwarce. Poza sumą na miejscu.",
      });

  // Miejsce na P9: dojazd autem, busem lub pociągiem zamiast lotu. Zawsze orientacyjny, zawsze poza sumą.
  if (input.access && hasAmount(input.access.value)) {
    drafts.push({
      key: "access", label: input.access.label ?? "Dojazd", value: input.access.value.trim(), display: input.access.value.trim(), status: "estimate",
      statusLabel: ROUGH_LABEL, inOnSiteTotal: false,
      note: "Orientacyjnie, w obie strony. Poza sumą na miejscu.",
    });
  }

  const components: CostComponent[] = drafts.map((c) => ({
    ...c,
    scope: c.inOnSiteTotal
      ? (legacy ? "w szacunku planu" : "w sumie na miejscu")
      : legacy && c.key === "flight" ? (flight ? "osobno od szacunku planu" : "mógł być w szacunku planu")
      : "poza sumą na miejscu",
  }));

  const onSiteText = hasAmount(input.totalEstimate) ? input.totalEstimate.trim() : null;
  const onSite: CostTotal = onSiteText
    ? legacy
      ? { label: LEGACY_TOTAL_LABEL, ...totals(onSiteText, people, group), note: "Ten plan powstał, zanim liczyliśmy sumę bez lotu: model mógł wliczyć do niej lot." }
      : { label: ON_SITE_TOTAL_LABEL, ...totals(onSiteText, people, group), note: "Nocleg, jedzenie, atrakcje i transport na miejscu. Bez lotu." }
    : { label: legacy ? LEGACY_TOTAL_LABEL : ON_SITE_TOTAL_LABEL, perPerson: null, groupTotal: null, note: "Plan nie podaje szacunku." };

  let withFlight: CostTotal | null = null;
  // Starszego planu nie łączymy z lotem: nie wiemy, czy lot nie siedzi już w jego sumie.
  if (flight && onSiteText && !legacy) {
    // Lot (z wyszukiwania) plus szacunek modelu: łączymy tylko z jawnym oznaczeniem, skąd co pochodzi.
    const perPerson = mapBudgetNumbers(onSiteText, (n) => n + flight.pricePerPerson);
    withFlight = {
      label: WITH_FLIGHT_TOTAL_LABEL,
      perPerson,
      groupTotal: group && flight.multiplyByGroup ? scaleBudgetText(perPerson, people) : null,
      note: `Lot: cena z ${costDate(flight.checkedAt)}, z wyszukiwania. Reszta: szacunek modelu AI.`,
    };
  }

  return {
    components, onSite, withFlight,
    flightLine: flight
      ? `Lot: ${pln(flight.pricePerPerson)} za osobę, w obie strony, cena z ${costDate(flight.checkedAt)}`
      : FLIGHT_UNKNOWN_LINE,
    assumptions: costAssumptions(input.basis, group),
    legacy,
  };
}
