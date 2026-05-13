import type { QuizAnswers, DestinationRecommendation } from "@/types";

const VALID_BUDGETS = new Set(["low", "medium"]);
const VALID_STYLES = new Set(["nature", "history", "architecture", "food", "beach", "nightlife"]);
const VALID_DURATIONS = new Set([3, 5, 7, 10]);

export function validateQuizAnswers(data: unknown): data is Partial<QuizAnswers> {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;

  if (d.budget !== undefined && !VALID_BUDGETS.has(d.budget as string)) return false;
  if (d.styles !== undefined) {
    if (!Array.isArray(d.styles)) return false;
    if (d.styles.length > 6) return false;
    if (!d.styles.every((s) => VALID_STYLES.has(s))) return false;
  }
  if (d.month !== undefined) {
    const m = Number(d.month);
    if (!Number.isInteger(m) || m < 1 || m > 12) return false;
  }
  if (d.duration !== undefined && !VALID_DURATIONS.has(d.duration as number)) return false;

  return true;
}

export function validateDestination(data: unknown): data is DestinationRecommendation {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;

  if (typeof d.city !== "string" || d.city.length > 60) return false;
  if (typeof d.country !== "string" || d.country.length > 60) return false;
  if (!d.bestOffer || typeof d.bestOffer !== "object") return false;

  return true;
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}
