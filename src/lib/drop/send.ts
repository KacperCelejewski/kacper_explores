import { pickDealsFor } from "./pick";
import type { DropDeal, DropSubscriber } from "./types";

export function selectRecipients(
  subs: DropSubscriber[],
  alreadySent: Set<string>,
  deals: DropDeal[],
): { sub: DropSubscriber; deals: DropDeal[] }[] {
  const out: { sub: DropSubscriber; deals: DropDeal[] }[] = [];
  for (const sub of subs) {
    if (alreadySent.has(sub.id)) continue;
    const picked = pickDealsFor(sub, deals);
    if (picked.length === 0) continue;
    out.push({ sub, deals: picked });
  }
  return out;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export type BatchErrorKind = "quota" | "rate_limit" | "rejected" | "unknown";

// quota: limit dzienny/miesięczny, na pewno nie wysłane. rate_limit: chwilowy 429, do ponowienia.
// rejected: Resend odrzucił żądanie (4xx), nie wysłane. unknown: brak statusu albo 5xx,
// Resend mógł przyjąć partię, więc nie wolno zwalniać rezerwacji.
export function classifyBatchError(err: { name?: string; statusCode?: number | null }): BatchErrorKind {
  if (err.name?.includes("quota")) return "quota";
  if (err.name === "rate_limit_exceeded") return "rate_limit";
  const status = err.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) return "rejected";
  return "unknown";
}
