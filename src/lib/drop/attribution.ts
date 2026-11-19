// Atrybucja wejścia z maila zrzutu do planu, bez danych osobowych: tylko tydzień, medium i miasto.
// Zdarzenia trafiają do quiz_events przez /api/track jako "drop_start:<medium>:<tydzień>"
// i "drop_plan:<medium>:<tydzień>" (ta sama sesja). To agregat, nie dowód: /api/track przyjmuje zdarzenia od każdego.
const WEEK_RE = /^\d{4}-W\d{2}$/;
const KEY = "wloczykij:drop-attribution";

export type DropMedium = "email" | "web" | "other";
export interface DropAttribution {
  week: string;
  medium: DropMedium;
  city: string;
  sessionId: string;
}

export function dropAttributionFromParams(p: { get(name: string): string | null }, sessionId: string): DropAttribution | null {
  if (p.get("src") !== "drop") return null;
  const week = p.get("utm_campaign");
  const city = p.get("city")?.trim();
  if (!week || !WEEK_RE.test(week) || !city) return null;
  const m = p.get("utm_medium");
  return { week, medium: m === "email" || m === "web" ? m : "other", city, sessionId };
}

export const dropEventName = (kind: "start" | "plan", a: Pick<DropAttribution, "week" | "medium">) =>
  `drop_${kind}:${a.medium}:${a.week}`;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function rememberDropAttribution(store: Store | null, a: DropAttribution) {
  try { store?.setItem(KEY, JSON.stringify(a)); } catch { /* storage zablokowany */ }
}

// Zwraca atrybucję tylko raz i tylko dla planu na miasto z maila; potem ją usuwa (brak podwójnego liczenia).
export function takeDropPlanAttribution(store: Store | null, planCity: string): DropAttribution | null {
  try {
    const raw = store?.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as DropAttribution;
    if (!a || !WEEK_RE.test(a.week) || typeof a.city !== "string" || typeof a.sessionId !== "string") return null;
    if (a.city.trim().toLowerCase() !== planCity.trim().toLowerCase()) return null;
    store?.removeItem(KEY);
    return a;
  } catch {
    return null;
  }
}

export function reportDropEvent(event: string, sessionId: string) {
  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, event }),
  }).catch(() => {});
}
