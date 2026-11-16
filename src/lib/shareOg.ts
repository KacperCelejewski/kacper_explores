import { CREW_COPY, crewSummary, crewTotalBudget, sharedCrewFromQuiz } from "@/lib/groupFlow";

// Dane do podglądu (Open Graph) udostępnionego planu. Bierzemy wyłącznie to, co i tak widać na publicznej
// stronie planu: miasto, kraj, długość, daty, budżet i liczbę osób w ekipie znajomych. Nic z quizu poza liczbą osób.

export interface ShareOgRow {
  city?: string | null;
  country?: string | null;
  ai_plan_json?: unknown;
  quiz_answers?: unknown;
}

export interface ShareOgModel {
  city: string;
  country: string;
  /** "27–29 listopada 2026", a bez daty "3 dni" */
  when: string | null;
  /** "Plan dla ekipy: 4 osoby" albo null */
  crewLine: string | null;
  /** "ok. 1 200 zł na osobę, razem ok. 4 800 zł" albo sama kwota */
  budgetLine: string | null;
  tagline: string;
}

const MONTHS_GEN = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];

export const SHARE_OG_TAGLINE = "Obudź w sobie Włóczykija.";
export const SHARE_OG_FALLBACK: ShareOgModel = {
  city: "Włóczykij",
  country: "",
  when: null,
  crewLine: null,
  budgetLine: null,
  tagline: "Wyjazd ze znajomymi: dokąd, za ile i jaki plan.",
};

function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) || d.getUTCMonth() !== Number(m[2]) - 1 ? null : d;
}

function daysWord(n: number): string {
  return n === 1 ? "dzień" : "dni";
}

// Daty wyjazdu do podglądu: "27–29 listopada 2026"; przy zmianie miesiąca "30 listopada – 2 grudnia 2026".
// Bez poprawnej daty startu albo długości wraca sama liczba dni, a bez niej null.
export function formatTripWhen(startDate: unknown, duration: unknown): string | null {
  const days = typeof duration === "number" && Number.isInteger(duration) && duration > 0 && duration <= 60 ? duration : null;
  const start = typeof startDate === "string" ? parseIsoDate(startDate) : null;
  if (!start) return days ? `${days} ${daysWord(days)}` : null;
  if (!days || days === 1) {
    return `${start.getUTCDate()} ${MONTHS_GEN[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  }
  const end = new Date(start.getTime() + (days - 1) * 86_400_000);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  if (sameMonth) {
    return `${start.getUTCDate()}–${end.getUTCDate()} ${MONTHS_GEN[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
  }
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const left = `${start.getUTCDate()} ${MONTHS_GEN[start.getUTCMonth()]}${sameYear ? "" : ` ${start.getUTCFullYear()}`}`;
  return `${left} – ${end.getUTCDate()} ${MONTHS_GEN[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const t = value.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

// Model podglądu z wiersza `trips`. Brak miasta oznacza brak planu, więc null (wtedy obraz ogólny marki).
export function buildShareOgModel(row: ShareOgRow | null | undefined): ShareOgModel | null {
  const city = clean(row?.city, 40);
  if (!row || !city) return null;
  const plan = (typeof row.ai_plan_json === "object" && row.ai_plan_json !== null ? row.ai_plan_json : {}) as {
    duration?: unknown;
    startDate?: unknown;
    totalBudgetEstimate?: unknown;
  };
  const crew = sharedCrewFromQuiz(row.quiz_answers);
  const summary = crew ? crewSummary(crew.companion, crew.group) : null;
  const perPerson = clean(plan.totalBudgetEstimate, 40);
  const together = crew ? crewTotalBudget(perPerson, crew) : null;

  let budgetLine: string | null = null;
  if (perPerson && together) budgetLine = `${perPerson} ${CREW_COPY.perPerson}, ${CREW_COPY.total} ${together}`;
  else if (perPerson) budgetLine = perPerson;

  return {
    city,
    country: clean(row.country, 40),
    when: formatTripWhen(plan.startDate, plan.duration),
    crewLine: summary ? `${CREW_COPY.shareCrewTitle}: ${summary.detail}` : null,
    budgetLine,
    tagline: SHARE_OG_TAGLINE,
  };
}

// Tytuł i opis strony planu (title, OG, Twitter) z tego samego modelu, żeby podgląd i karta mówiły to samo.
export function shareMetaText(model: ShareOgModel): { title: string; description: string } {
  const place = model.country ? `${model.city}, ${model.country}` : model.city;
  const title = model.crewLine
    ? `Plan dla ekipy: ${place}`
    : `Plan wyjazdu: ${place}`;
  const parts = [model.when, model.crewLine, model.budgetLine ? `koszt ${model.budgetLine}` : null].filter(Boolean);
  const description = parts.length > 0
    ? `${parts.join(" · ")}. Plan godzina po godzinie od Włóczykija, otwiera się bez konta.`
    : "Plan godzina po godzinie od Włóczykija, otwiera się bez konta.";
  return { title, description };
}
