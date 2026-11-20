import type { DayPlan, TripPlan, TripType } from "@/types";
import { DEFAULT_TRIP_TYPE, isTripType, tripTypeLabel } from "@/lib/quizOptions";

// Rodzaj wyjazdu (narty, góry, plaża...) jako cel całego planu, nie tło.
// Przyczyna błędu z uwagi 8: prompty kierunków i planu znały tylko styl i energię, więc narciarski
// wyjazd do Zakopanego dostał program "zwiedzanie miasta". Tu jest jedno miejsce z regułami:
// treść bloków do promptów, sezonowość, filtr kierunków i kontrola zgodności planu z rodzajem.
// Czysta logika bez serwera, bezpieczna do importu z komponentów klienckich.

/** Rodzaj wyjazdu, który zmienia prompt. Brak odpowiedzi i "zwiedzanie" działają jak dotąd. */
export function activeTripType(tripType: TripType | null | undefined): TripType | null {
  return isTripType(tripType) && tripType !== DEFAULT_TRIP_TYPE ? tripType : null;
}

// ── Sezonowość ────────────────────────────────────────────────────────────────

export type SeasonFit = "ok" | "marginal" | "off";

export interface SeasonCheck {
  fit: SeasonFit;
  /** Komunikat dla człowieka (quiz, lista kierunków); null, gdy termin pasuje. */
  message: string | null;
}

const OK: SeasonCheck = { fit: "ok", message: null };

/**
 * Czy miesiąc (1-12) pasuje do rodzaju wyjazdu. Reguły ogólne, bez obietnic o konkretnym ośrodku:
 * komunikat mówi, co zwykle jest prawdą w Polsce i Europie, i odsyła do sprawdzenia warunków.
 */
export function tripTypeSeason(tripType: TripType | null | undefined, month: number | null | undefined): SeasonCheck {
  if (!month || month < 1 || month > 12) return OK;
  switch (tripType) {
    case "narty":
      if ([12, 1, 2, 3].includes(month)) return OK;
      if ([11, 4].includes(month)) {
        return { fit: "marginal", message: "O tej porze śnieg bywa niepewny, a część wyciągów jeszcze lub już nie działa. Warunki w ośrodku warto sprawdzić przed rezerwacją." };
      }
      return { fit: "off", message: "Sezon narciarski to zwykle grudzień–marzec, a w tym miesiącu wyciągi w większości ośrodków nie działają. Pokażemy tylko miejsca, gdzie narty są realne w tym terminie (na przykład lodowce), albo zmień termin lub rodzaj wyjazdu." };
    case "plaza":
      if ([6, 7, 8, 9].includes(month)) return OK;
      if ([5, 10].includes(month)) {
        return { fit: "marginal", message: "Poza latem woda bywa chłodna, a pogoda nie gwarantuje plażowania. Najlepiej wybrać cieplejsze kierunki na południu." };
      }
      return { fit: "off", message: "W Polsce i na północy Europy plażowanie o tej porze roku odpada. Szukamy cieplejszych kierunków i zaznaczamy, gdy pogoda nie gwarantuje kąpieli." };
    case "gory":
      if ([11, 4].includes(month)) {
        return { fit: "marginal", message: "Wyższe szlaki bywają o tej porze pod śniegiem albo zamknięte. Przed wyjazdem warto sprawdzić warunki na trasie." };
      }
      return OK;
    default:
      return OK;
  }
}

// ── Prompt kierunków ──────────────────────────────────────────────────────────

const DESTINATION_BLOCK: Partial<Record<TripType, string>> = {
  narty: `- Cel wyjazdu: jazda na nartach lub snowboardzie. Proponuj WYŁĄCZNIE miejscowości z ośrodkiem narciarskim (działające wyciągi i trasy). Nie proponuj "miast do zwiedzania" ani miejscowości bez wyciągów.
- W "description" nazwij ośrodek lub rejon narciarski i napisz, co jest na stoku. W "highlights" opisuj narciarską stronę wyjazdu (trasy, wyciągi, dojazd na stok), nie zabytki.
- Nie podawaj cen karnetów.`,
  gory: `- Cel wyjazdu: góry i piesze trasy. Proponuj miejsca z dobrą bazą szlaków i noclegiem blisko trasy, nie miasta do zwiedzania.
- W "highlights" opisuj szlaki, widoki i bazę wypadową.`,
  plaza: `- Cel wyjazdu: plaża i morze. Proponuj wyłącznie miejsca z plażą nadającą się do plażowania w podanym miesiącu.
- W "description" napisz, jaka jest tam plaża i czego można się spodziewać po pogodzie w tym terminie.`,
  wypoczynek: `- Cel wyjazdu: odpoczynek w spokojnym tempie. Proponuj miejsca, w których nie trzeba nic zaliczać (termy, spokojne miasteczka, jeziora, wybrzeże).`,
  aktywny: `- Cel wyjazdu: aktywność ruchowa przez cały dzień (rower, kajak, bieganie, wspinaczka). Proponuj miejsca, które mają do tego warunki w podanym miesiącu.`,
  wieczory: `- Cel wyjazdu: wieczory i życie nocne (bary, muzyka na żywo, kluby). Proponuj miasta z żywą sceną wieczorną, w których łatwo wrócić na nocleg.`,
};

/** Blok do promptu kierunków; pusty ciąg dla zwiedzania i braku odpowiedzi (prompt bez zmian). */
export function destinationTripTypePrompt(tripType: TripType | null | undefined, month: number | null | undefined): string {
  const active = activeTripType(tripType);
  if (!active) return "";
  const season = tripTypeSeason(active, month);
  const seasonLine = season.fit === "ok"
    ? ""
    : season.fit === "off"
      ? `\n- UWAGA, termin nie pasuje do rodzaju wyjazdu. Proponuj tylko miejsca, w których ten rodzaj wyjazdu jest realny w podanym miesiącu. To wyjątek od reguły \"dokładnie 6\": jeśli takich miejsc jest mniej niż 6, zwróć mniej, nie dopychaj listy miejscami niepasującymi.`
      : `\n- Termin jest graniczny dla tego rodzaju wyjazdu: wybieraj miejsca z pewniejszymi warunkami i napisz w "description", co może się nie udać.`;
  return `\nRODZAJ WYJAZDU: ${tripTypeLabel(active)} (to cel całego wyjazdu, ma pierwszeństwo przed zainteresowaniami):\n${DESTINATION_BLOCK[active]}${seasonLine}\n`;
}

// ── Prompt planu ──────────────────────────────────────────────────────────────

const PRICE_RULE_SKI =
  "- Ceny: nie podawaj cen karnetu ani wypożyczenia jako faktu. W polu cost wpisz \"sprawdź cennik ośrodka\" albo zakres z dopiskiem \"orientacyjnie\". Do budżetu karnet i sprzęt dolicz tylko jako zakres orientacyjny i zaznacz to w generalTips.";

const PLAN_BLOCK: Partial<Record<TripType, string>> = {
  narty: `Cały plan jest podporządkowany jeździe na nartach lub snowboardzie. Miejscowość i zabytki to tło, nie program.
- Dzień pełny: dojazd lub dojście na stok (nazwa ośrodka, wyciągu lub stacji), jazdy od otwarcia wyciągów, przerwa w schronisku lub barze przy stoku, jazdy do zamknięcia wyciągów, wieczorem odpoczynek (sauna, termy, kolacja) i przygotowanie na następny dzień.
- Dzień 1: wypożyczalnia sprzętu, karnet (godzinowy, dzienny lub wielodniowy), łatwy stok na rozgrzewkę. Ostatni dzień: krótka jazda tylko jeśli czas na to pozwala, resztę zostaw na wyjazd.
- Podawaj prawdziwe nazwy ośrodka, wyciągów i tras. Godzin działania wyciągów nie zgaduj: jeśli ich nie znasz, wpisz "godziny wyciągów: sprawdź w ośrodku".
- NIE układaj programu dnia ze zwiedzania miejscowości (spacer po deptaku, starówka, muzea, zamek). Krótki wieczorny spacer jest dopuszczalny najwyżej raz w całym planie, jako dodatek po nartach.
${PRICE_RULE_SKI}`,
  gory: `Cały plan jest podporządkowany chodzeniu po górach. Miejscowość to baza wypadowa, nie cel.
- Dzień pełny: wyjście na szlak rano, konkretna trasa (nazwa szlaku lub szczytu, orientacyjny czas przejścia), przerwa w schronisku, powrót przed zmrokiem, wieczorem regeneracja.
- Pogoda i bezpieczeństwo: w każdym dniu jedna wskazówka (sprawdź prognozę, ubiór, wcześniejszy start), plan awaryjny na zły dzień.
- NIE układaj programu dnia ze zwiedzania miasta. Krótki spacer po miejscowości najwyżej raz, po powrocie ze szlaku.`,
  plaza: `Cały plan jest podporządkowany plażowaniu i morzu.
- Dzień pełny: plaża rano lub przed południem, przerwa w cieniu i obiad blisko wody, popołudnie na plaży albo nad wodą (snorkeling, spacer brzegiem), wieczorem kolacja z widokiem.
- Nazwij konkretne plaże i zatoki. Pogodę i temperaturę wody opisuj ostrożnie, nie obiecuj kąpieli, której pora roku nie gwarantuje.
- NIE układaj programu dnia ze zwiedzania zabytków i muzeów. Jedna wycieczka do miasta w całym planie jest dopuszczalna.`,
  wypoczynek: `Cały plan ma niskie tempo i dużo odpoczynku.
- Najwyżej dwie aktywności dziennie, późne śniadania, długie przerwy, spa, termy, spacery bez celu, jedna dobra kolacja.
- Żadnych godzin startu przed 9:00 i żadnego zaliczania listy atrakcji.`,
  aktywny: `Cały plan opiera się na aktywności ruchowej.
- Dzień pełny: jedna lub dwie aktywności ruchowe (rower, kajak, bieganie, wspinaczka, pływanie), konkretne trasy i wypożyczalnie z nazwami, posiłek regeneracyjny, lekki wieczór.
- NIE układaj programu dnia ze zwiedzania muzeów i zabytków; zwiedzanie tylko jako dodatek w trakcie trasy.`,
  wieczory: `Cały plan jest ułożony wokół wieczorów i nocy.
- Dzień zaczyna się późno (po 10:00), w ciągu dnia lekki program (kawa, jedzenie, spokojny spacer), główny punkt to wieczór: kolacja w dobrym lokalu, bary, muzyka na żywo, kluby, z konkretnymi nazwami i dzielnicami.
- Wskaż, jak bezpiecznie wrócić na nocleg po nocy (taksówka, nocny autobus, nocleg blisko lokali).`,
};

/** Blok do promptu planu; pusty ciąg dla zwiedzania i braku odpowiedzi (prompt bez zmian). */
export function planTripTypePrompt(tripType: TripType | null | undefined): string {
  const active = activeTripType(tripType);
  if (!active) return "";
  return `\nRODZAJ WYJAZDU: ${tripTypeLabel(active).toUpperCase()} (pole "tripType": "${active}"). Ten blok ma pierwszeństwo przed STYLEM PLANOWANIA, zainteresowaniami i zasadą o darmowych atrakcjach, gdy się z nimi kłóci. Motyw (theme) każdego dnia musi pasować do tego rodzaju wyjazdu.\n${PLAN_BLOCK[active]}\n`;
}

// ── Kontrola słów kluczowych ──────────────────────────────────────────────────

interface Keywords {
  /** Fragmenty (małe litery), po których aktywność jest "w temacie" rodzaju wyjazdu. */
  on: readonly string[];
  /** Fragmenty zwiedzania miasta, które nie mogą być główną osią planu. */
  cityAxis?: readonly string[];
}

// Słowa kluczowe dopasowujemy od początku wyrazu (żeby "spa" nie łapało "Hiszpanii"); "|" na końcu
// oznacza całe słowo ("bar|" łapie "bar", nie "Barcelonę").
const CITY_SIGHTSEEING: readonly string[] = [
  "krupówk", "starówk", "stare miasto", "starego miasta", "muze", "zamek", "zamku", "katedr", "bazylik",
  "kościół", "kościoła", "ratusz", "rynek", "rynku", "zwiedza", "free tour", "galeri", "pomnik", "deptak",
];

const KEYWORDS: Partial<Record<TripType, Keywords>> = {
  narty: {
    on: ["narty|", "nart", "narciar", "stok", "wyciąg", "karnet", "snowboard", "skipass", "ski pass", "gondol", "wypożyczaln", "instruktor", "kolejk", "snowpark", "trasa zjazd", "trasy zjazd", "zjazd"],
    cityAxis: CITY_SIGHTSEEING,
  },
  gory: {
    on: ["szlak", "szczyt", "góry|", "górsk", "schroni", "dolin", "wędrów", "trekking", "przełęcz", "turyst", "wodospad", "grań", "wejści"],
    cityAxis: CITY_SIGHTSEEING,
  },
  plaza: {
    on: ["plaż", "morz", "morsk", "kąpiel", "kąpa", "leżak", "zatok", "wybrzeż", "snorkel", "nurk", "brzeg", "klif"],
    cityAxis: CITY_SIGHTSEEING,
  },
  wypoczynek: {
    on: ["spa|", "relaks", "odpoczyn", "odpoczy", "termy|", "termach|", "termal", "sauna", "basen", "masaż", "leniw", "spacer", "kawiar", "śniadani", "wolny czas", "widok", "ogród", "jezior"],
  },
  aktywny: {
    on: ["rower", "kajak", "biegan", "bieg|", "wspinacz", "pływ", "tras", "szlak", "wypożyczaln", "sup|", "żagl", "nurk", "trening", "siłown", "narty|", "jazda"],
    cityAxis: CITY_SIGHTSEEING,
  },
  wieczory: {
    on: ["bar|", "bary|", "barze|", "baru|", "klub", "koncert", "muzyk", "kolacj", "wieczór", "wieczor", "drink", "koktajl", "pub|", "pubie|", "dj|", "nocn", "impre", "degustac", "winiarn", "piw", "browar"],
  },
};

const text = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(" ").toLowerCase();

const WORD = "[\\p{L}\\p{N}]";
const matcherCache = new Map<readonly string[], RegExp>();
function matcher(needles: readonly string[]): RegExp {
  let re = matcherCache.get(needles);
  if (!re) {
    const parts = needles.map((n) => {
      const whole = n.endsWith("|");
      const stem = (whole ? n.slice(0, -1) : n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return `(?<!${WORD})${stem}${whole ? `(?!${WORD})` : ""}`;
    });
    re = new RegExp(parts.join("|"), "u");
    matcherCache.set(needles, re);
  }
  return re;
}
const hasAny = (haystack: string, needles: readonly string[]) => matcher(needles).test(haystack);

/** Pola kierunku używane do oceny; `highlights` przychodzi z odpowiedzi modelu. */
export interface DestinationLike {
  city: string;
  description?: string;
  highlights?: readonly string[];
}

/** Czy kierunek pasuje do rodzaju wyjazdu: dla nart musi wspominać o infrastrukturze narciarskiej. */
export function destinationMatchesTripType(d: DestinationLike, tripType: TripType | null | undefined): boolean {
  const active = activeTripType(tripType);
  if (!active) return true;
  const kw = KEYWORDS[active];
  // Surowa kontrola tylko tam, gdzie błąd jest oczywisty (narty, góry, plaża); reszta przechodzi.
  if (!kw || !(active === "narty" || active === "gory" || active === "plaza")) return true;
  const haystack = text(d.city, d.description, ...(d.highlights ?? []));
  return hasAny(haystack, kw.on);
}

/** Zostawia kierunki zgodne z rodzajem wyjazdu (dla zwiedzania i braku odpowiedzi: wszystkie). */
export function filterDestinationsForTripType<T extends DestinationLike>(
  destinations: readonly T[],
  tripType: TripType | null | undefined,
): T[] {
  return destinations.filter((d) => destinationMatchesTripType(d, tripType));
}

// ── Zgodność planu z rodzajem ─────────────────────────────────────────────────

export interface PlanTripTypeCheck {
  ok: boolean;
  issues: string[];
  /** Ile dni jest w temacie rodzaju wyjazdu. */
  onTopicDays: number;
}

const SUPPORT_TYPES = new Set(["food", "transport", "tip", "accommodation"]);

function dayIsOnTopic(day: DayPlan, kw: Keywords): boolean {
  if (hasAny(text(day.theme), kw.on)) return true;
  return day.activities.some((a) => hasAny(text(a.title, a.description, a.location), kw.on));
}

/**
 * Prosta kontrola: co najmniej połowa dni (zaokrąglona w górę) ma temat lub aktywność z rodzaju wyjazdu,
 * a zwiedzanie miasta nie przeważa nad aktywnościami w temacie. Pole `tripType` w odpowiedzi, jeśli jest,
 * musi zgadzać się z wybranym (brak pola nie jest błędem, uzupełnia je serwer).
 * Dla zwiedzania i braku odpowiedzi plan jest zawsze zgodny.
 */
export function checkPlanTripType(plan: Pick<TripPlan, "days"> & { tripType?: unknown }, tripType: TripType | null | undefined): PlanTripTypeCheck {
  const active = activeTripType(tripType);
  if (!active) return { ok: true, issues: [], onTopicDays: plan.days.length };
  const issues: string[] = [];
  if (plan.tripType !== undefined && plan.tripType !== active) issues.push(`tripType w odpowiedzi to "${String(plan.tripType)}", oczekiwano "${active}"`);

  const kw = KEYWORDS[active];
  if (!kw) return { ok: issues.length === 0, issues, onTopicDays: plan.days.length };

  const days = plan.days.length;
  const onTopicDays = plan.days.filter((d) => dayIsOnTopic(d, kw)).length;
  const need = Math.max(1, Math.ceil(days / 2));
  if (days > 0 && onTopicDays < need) issues.push(`tylko ${onTopicDays} z ${days} dni pasuje do rodzaju "${active}" (wymagane ${need})`);

  if (kw.cityAxis) {
    const activities = plan.days.flatMap((d) => d.activities).filter((a) => !SUPPORT_TYPES.has(a.type));
    const onTopic = activities.filter((a) => hasAny(text(a.title, a.description), kw.on)).length;
    const city = activities.filter((a) => {
      const t = text(a.title, a.description);
      return hasAny(t, kw.cityAxis!) && !hasAny(t, kw.on);
    }).length;
    if (city > onTopic) issues.push(`zwiedzanie miasta (${city}) przeważa nad aktywnościami w temacie "${active}" (${onTopic})`);
  }
  return { ok: issues.length === 0, issues, onTopicDays };
}
