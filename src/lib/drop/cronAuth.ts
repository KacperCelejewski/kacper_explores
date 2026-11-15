import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

// Fail-closed: bez CRON_SECRET żadne żądanie nie przechodzi (brak sekretu wyłącza zadanie, nie ochronę).
export function isAuthorizedCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
