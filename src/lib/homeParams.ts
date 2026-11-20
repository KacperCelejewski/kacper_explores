import type { BudgetLevel, Companion, GroupComposition } from "@/types";
import { groupFromCompanion, isValidGroup } from "@/lib/group";

// Parametry z linków na stronie głównej. Tylko dokładne wartości z listy dozwolonych,
// cokolwiek innego jest ignorowane, żeby nic z adresu nie trafiało do stanu ani do zdarzeń.
export type HomeSrc = "home-ekipa" | "home-solo" | "home-dream" | "ig-ekipa" | "ig-solo" | "blog-ekipa";

export interface HomeParams {
  companion: "friends" | null;
  src: HomeSrc | null;
}

export const SRC_VALUES: readonly HomeSrc[] = ["home-ekipa", "home-solo", "home-dream", "ig-ekipa", "ig-solo", "blog-ekipa"];

export function parseHomeParams(params: { get(name: string): string | null }): HomeParams {
  const companion = params.get("companion") === "friends" ? "friends" : null;
  const rawSrc = params.get("src");
  const src = SRC_VALUES.find((s) => s === rawSrc) ?? null;
  return { companion, src };
}

// GA4 przyjmuje w nazwach zdarzeń tylko litery, cyfry i podkreślniki
export function srcEventName(src: HomeSrc): string {
  return `from_${src.replace(/-/g, "_")}`;
}

// Odpowiedzi quizu po wejściu z „Jedziemy ekipą”. Liczba osób ustawiona wcześniej przez Znajomych zostaje,
// żeby odświeżenie strony albo powrót nie cofały jej do domyślnej.
export function homeFriendsAnswers(current: { companion: Companion | null; group: GroupComposition | undefined }): {
  companion: "friends";
  group: GroupComposition;
} {
  const group = current.companion === "friends" && current.group ? current.group : groupFromCompanion("friends");
  return { companion: "friends", group };
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const UTM_VALUE = /^[A-Za-z0-9_.\-]{1,100}$/;

// Quiz czyści adres po wejściu z linku (companion, src), ale UTM musi w nim zostać:
// GA4 odczytuje kampanię z adresu strony, a skrypt GA bywa gotowy dopiero po tym czyszczeniu.
// Zostają tylko cztery klucze utm_* i bezpieczne wartości.
export function keepUtmQuery(params: { get(name: string): string | null }): string {
  const out = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value && UTM_VALUE.test(value)) out.set(key, value);
  }
  const q = out.toString();
  return q ? `?${q}` : "";
}

// ── Karty-marzenia ze strony głównej ("Lizbona na próbę") ─────────────────────
// Karta niesie do quizu miasto, liczbę osób i budżet z suwaka. Do quizu trafiają tylko wartości z listy
// dozwolonych (miasto) i z zakresu selecta/suwaka (osoby, poziom budżetu), nic innego z adresu.
export const HOME_DREAM_CITIES = ["Budapeszt", "Lizbona", "Porto"] as const;

export interface HomeDream {
  city: string;
  people: number;
  budget: BudgetLevel;
}

const DREAM_MIN_PEOPLE = 2;
// Progi poziomów budżetu w quizie: "do 1 500 zł" (low) i "1 500–3 000 zł" (medium), na osobę.
const LOW_BUDGET_MAX_PLN = 1500;

export function dreamBudgetLevel(budgetPerPerson: number): BudgetLevel {
  return budgetPerPerson <= LOW_BUDGET_MAX_PLN ? "low" : "medium";
}

export function homeDreamHref(input: { city: string; people: number; budgetPerPerson: number; utmQuery?: string }): string {
  const query = [
    "src=home-dream",
    `city=${encodeURIComponent(input.city)}`,
    `people=${input.people}`,
    `budget=${dreamBudgetLevel(input.budgetPerPerson)}`,
  ];
  // utmQuery pochodzi z keepUtmQuery ("?utm_source=..."): kampania z wejścia na stronę główną dociera do quizu.
  const utm = input.utmQuery?.replace(/^\?/, "");
  if (utm) query.push(utm);
  return `/quiz?${query.join("&")}`;
}

export function parseHomeDream(params: { get(name: string): string | null }): HomeDream | null {
  if (parseHomeParams(params).src !== "home-dream") return null;
  const city = HOME_DREAM_CITIES.find((c) => c === params.get("city"));
  const rawPeople = params.get("people");
  const people = rawPeople !== null && /^\d{1,2}$/.test(rawPeople) ? Number(rawPeople) : NaN;
  const rawBudget = params.get("budget");
  const budget = rawBudget === "low" || rawBudget === "medium" ? rawBudget : null;
  if (!city || !budget || people < DREAM_MIN_PEOPLE || !isValidGroup({ adults: people, childrenAges: [] })) return null;
  return { city, people, budget };
}

// Odpowiedzi quizu po wejściu z karty: ekipa o wybranej liczebności, budżet i kierunek.
export function homeDreamAnswers(dream: HomeDream): {
  preferredCity: string;
  companion: "friends";
  group: GroupComposition;
  budget: BudgetLevel;
} {
  return { preferredCity: dream.city, companion: "friends", group: { adults: dream.people, childrenAges: [] }, budget: dream.budget };
}
