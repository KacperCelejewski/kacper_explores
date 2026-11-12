import type { QuizAnswers, DestinationRecommendation, TripPlan } from "@/types";

const VALID_BUDGETS = new Set(["low", "medium"]);
const VALID_STYLES = new Set(["nature", "history", "architecture", "food", "beach", "nightlife"]);
const VALID_VIBES = new Set(["chill", "intense", "social", "active"]);
const VALID_PLACE_TYPES = new Set(["big_city", "charming", "beach_sun"]);
// Duration is now a free integer in [2, 21] (slider)
const VALID_AIRPORTS = new Set(["WRO", "KTW", "KRK", "WAW", "WMI", "POZ", "GDN", "BER", "BUD", "VIE", "AMS", "LGW", "IST"]);

export function validateQuizAnswers(data: unknown): data is Partial<QuizAnswers> {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;

  if (d.budget !== undefined && !VALID_BUDGETS.has(d.budget as string)) return false;
  if (d.vibe !== undefined && d.vibe !== null && !VALID_VIBES.has(d.vibe as string)) return false;
  if (d.placeType !== undefined && d.placeType !== null && !VALID_PLACE_TYPES.has(d.placeType as string)) return false;
  if (d.styles !== undefined) {
    if (!Array.isArray(d.styles)) return false;
    if (d.styles.length > 6) return false;
    if (!d.styles.every((s) => VALID_STYLES.has(s))) return false;
  }
  if (d.month !== undefined) {
    const m = Number(d.month);
    if (!Number.isInteger(m) || m < 1 || m > 12) return false;
  }
  if (d.duration !== undefined) {
    const dur = d.duration as number;
    if (!Number.isInteger(dur) || dur < 2 || dur > 21) return false;
  }
  if (d.airports !== undefined) {
    if (!Array.isArray(d.airports)) return false;
    if (d.airports.length === 0 || d.airports.length > 8) return false;
    if (!d.airports.every((a) => VALID_AIRPORTS.has(a))) return false;
  }

  return true;
}

export function validateDestination(data: unknown): data is DestinationRecommendation {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;

  if (typeof d.city !== "string" || d.city.length > 60) return false;
  if (typeof d.country !== "string" || d.country.length > 60) return false;

  return true;
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

// Plan zapisywany z przeglądarki (PATCH wyjazdu): sprawdzamy kształt, typy i rozmiary, nie treść.
// Pola opcjonalne mogą nie istnieć, bo plany z Gemini nie zawsze je mają, a lista typów aktywności nie jest sztywna.
const MAX_PLAN_JSON = 200_000;
const MAX_DAYS = 21;
const MAX_ACTIVITIES_PER_DAY = 40;

export function validatePlan(data: unknown): data is TripPlan {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.days) || d.days.length < 1 || d.days.length > MAX_DAYS) return false;

  for (const day of d.days) {
    if (!day || typeof day !== "object") return false;
    const activities = (day as Record<string, unknown>).activities;
    if (!Array.isArray(activities) || activities.length > MAX_ACTIVITIES_PER_DAY) return false;
    for (const a of activities) {
      if (!a || typeof a !== "object") return false;
      const act = a as Record<string, unknown>;
      if (typeof act.title !== "string" || act.title.length < 1 || act.title.length > 300) return false;
      if (typeof act.time !== "string" || act.time.length > 20) return false;
      for (const key of ["description", "type", "cost", "location", "emoji"]) {
        const v = act[key];
        if (v !== undefined && (typeof v !== "string" || v.length > 2000)) return false;
      }
    }
  }

  try {
    return JSON.stringify(data).length <= MAX_PLAN_JSON;
  } catch {
    return false;
  }
}
