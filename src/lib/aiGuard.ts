import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isPro } from "@/lib/userProfile";

// Dzienny limit wywołań AI na konto: zamiana aktywności, nowy dzień, restauracje, lista pakowania, czat.
// Generowanie planu ma własny licznik (credits.ts), ale podlega globalnemu bezpiecznikowi.
export const AI_CALLS_PER_DAY = 30;
export const AI_CALLS_PER_DAY_PRO = 200;
// Bezpiecznik: gdy w ostatniej dobie wszyscy razem zrobili tyle wywołań Gemini, darmowe konta czekają do jutra.
// Normalny dzień to dziś pojedyncze wywołania, więc próg łapie dopiero nadużycie albo skok kosztów.
export const GLOBAL_FREE_AI_CALLS_PER_DAY = 1500;

export function dailyLimitFor(pro: boolean): number {
  return pro ? AI_CALLS_PER_DAY_PRO : AI_CALLS_PER_DAY;
}

type GuardResult = { allow: true } | { allow: false; status: number; code: string; error: string };

// Czysta decyzja: bezpiecznik globalny najpierw (nie zużywa licznika konta), potem dzienny limit konta
export function evaluateAiGuard(input: { isPro: boolean; globalCalls24h: number | null; consumed: boolean }): GuardResult {
  if (!input.isPro && input.globalCalls24h !== null && input.globalCalls24h >= GLOBAL_FREE_AI_CALLS_PER_DAY) {
    return {
      allow: false,
      status: 503,
      code: "AI_BUSY",
      error: "Dziś mamy rekordowy ruch i darmowe konta na chwilę odpoczywają. Wróć jutro, Pro działa bez przerwy.",
    };
  }
  if (!input.consumed) {
    return {
      allow: false,
      status: 429,
      code: "AI_DAILY_LIMIT",
      error: input.isPro
        ? "Na dziś to wszystko: wykorzystano dzienny limit zapytań do AI. Wróć jutro."
        : "Na dziś to wszystko: wykorzystano dzienny limit zapytań do AI. Wróć jutro albo przejdź na Pro.",
    };
  }
  return { allow: true };
}

function toResponse(res: Extract<GuardResult, { allow: false }>) {
  return NextResponse.json({ error: res.error, code: res.code }, { status: res.status });
}

async function globalCallsLast24h(db: ReturnType<typeof createServiceClient>): Promise<number | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await db
    .from("gemini_usage_log")
    .select("id", { count: "exact", head: true })
    .gte("called_at", since);
  if (error) {
    console.error("[aiGuard] gemini_usage_log", error.message);
    return null;
  }
  return count;
}

async function isProAccount(db: ReturnType<typeof createServiceClient>, userId: string): Promise<boolean> {
  const { data } = await db
    .from("user_profiles")
    .select("subscription_tier, subscription_expires_at")
    .eq("id", userId)
    .maybeSingle();
  return data ? isPro(data as Parameters<typeof isPro>[0]) : false;
}

// Wołaj po sprawdzeniu użytkownika, a przed wywołaniem Gemini. Zwraca odpowiedź do oddania albo null, gdy można iść dalej.
// Błąd bazy nie blokuje użytkownika (płatne funkcje ważniejsze niż limit), ale trafia do logów.
export async function guardAiCall(userId: string): Promise<NextResponse | null> {
  const db = createServiceClient();
  const pro = await isProAccount(db, userId);

  const fuse = evaluateAiGuard({ isPro: pro, globalCalls24h: pro ? null : await globalCallsLast24h(db), consumed: true });
  if (!fuse.allow) return toResponse(fuse);

  const { data, error } = await db.rpc("consume_ai_call", { p_user_id: userId, p_daily_limit: dailyLimitFor(pro) });
  if (error) {
    console.error("[aiGuard] consume_ai_call", error.message);
    return null;
  }
  const res = evaluateAiGuard({ isPro: pro, globalCalls24h: null, consumed: data === true });
  return res.allow ? null : toResponse(res);
}

// Tylko bezpiecznik globalny, dla generowania planu (ma własny licznik planów)
export async function guardGlobalFuse(userId: string): Promise<NextResponse | null> {
  const db = createServiceClient();
  if (await isProAccount(db, userId)) return null;
  const res = evaluateAiGuard({ isPro: false, globalCalls24h: await globalCallsLast24h(db), consumed: true });
  return res.allow ? null : toResponse(res);
}
