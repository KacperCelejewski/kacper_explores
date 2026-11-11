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

const QUOTA_ERRORS = new Set(["daily_quota_exceeded", "monthly_quota_exceeded", "rate_limit_exceeded"]);

// Limit dzienny/miesięczny albo 429 z Resend: dalsze partie i tak nie przejdą
export function isQuotaError(err: { name?: string; statusCode?: number | null }): boolean {
  return err.statusCode === 429 || (err.name !== undefined && QUOTA_ERRORS.has(err.name));
}
