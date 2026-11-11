import { POLISH_AIRPORTS } from "@/lib/airports";
import type { BudgetLevel } from "@/types";

export const DROP_MAX_PRICES = [200, 300, 500] as const;
export type DropMaxPrice = (typeof DROP_MAX_PRICES)[number];
export const DROP_MAX_AIRPORTS = 3;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POLISH_CODES = new Set(POLISH_AIRPORTS.map((a) => a.code));

export function normalizePrefs(
  input: unknown,
): { airports: string[]; max_price: DropMaxPrice } | { error: string } {
  if (!input || typeof input !== "object") return { error: "Nieprawidłowe dane." };
  const d = input as Record<string, unknown>;

  if (!Array.isArray(d.airports) || d.airports.length === 0) {
    return { error: "Wybierz przynajmniej jedno lotnisko." };
  }
  const airports: string[] = [];
  for (const a of d.airports) {
    const code = typeof a === "string" ? a.trim().toUpperCase() : "";
    if (!POLISH_CODES.has(code)) return { error: "Nie znamy takiego lotniska." };
    if (!airports.includes(code)) airports.push(code);
  }
  if (airports.length > DROP_MAX_AIRPORTS) {
    return { error: `Wybierz maksymalnie ${DROP_MAX_AIRPORTS} lotniska.` };
  }

  const maxPrice = DROP_MAX_PRICES.find((p) => p === d.max_price);
  if (maxPrice === undefined) return { error: "Wybierz budżet: 200, 300 albo 500 zł." };

  return { airports, max_price: maxPrice };
}

export function normalizeSignup(
  input: unknown,
): { email: string; airports: string[]; max_price: DropMaxPrice } | { error: string } {
  if (!input || typeof input !== "object") return { error: "Nieprawidłowe dane." };
  const d = input as Record<string, unknown>;

  const email = typeof d.email === "string" ? d.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) return { error: "Podaj prawidłowy adres e-mail." };

  const prefs = normalizePrefs(d);
  if ("error" in prefs) return prefs;
  return { email, ...prefs };
}

// Web Crypto zamiast node:crypto, bo plik importuje też formularz po stronie klienta
export function newUnsubscribeToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function budgetToMaxPrice(b: BudgetLevel): 300 | 500 {
  return b === "low" ? 300 : 500;
}

type ExistingSubscriber = {
  verified: boolean;
  drop_disabled_reason: string | null;
  unsubscribe_token: string | null;
};

// Skarga i odbicie maila blokują zrzut na stałe: żadna ścieżka ich nie zdejmuje.
export function isHardDisabled(reason: string | null | undefined): boolean {
  return reason === "complaint" || reason === "bounce";
}

// Zrzut włącza się od razu tylko dla potwierdzonego adresu; nowy włącza route weryfikacji.
// Zawsze ustawia max_price i token, bo wysyłka wymaga obu.
export function buildSubscriberUpsert(
  existing: ExistingSubscriber | null,
  s: { airports: string[]; max_price: number },
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    airports: s.airports,
    max_price: s.max_price,
    unsubscribe_token: existing?.unsubscribe_token ?? newUnsubscribeToken(),
    drop_enabled: false,
  };
  if (existing?.verified && !isHardDisabled(existing.drop_disabled_reason)) {
    fields.drop_enabled = true;
    fields.drop_disabled_reason = null;
  }
  return fields;
}

export type SubscribeAction =
  | "insert"
  | "resend_verification"
  | "send_manage_link"
  | "update_profile"
  | "blocked";

// Anonim nigdy nie zmienia potwierdzonego wiersza (dostaje link do ustawień mailem).
// Konto zmienia wiersz, ale nie zdejmuje skargi ani odbicia.
export function decideSubscribeAction(
  existing: ExistingSubscriber | null,
  opts: { fromProfile: boolean },
): SubscribeAction {
  if (!existing) return "insert";
  if (opts.fromProfile) return isHardDisabled(existing.drop_disabled_reason) ? "blocked" : "update_profile";
  return existing.verified ? "send_manage_link" : "resend_verification";
}

// Zdarzenie Resend -> powód wyłączenia zrzutu. Odbicie liczy się tylko trwałe (Permanent):
// chwilowe (np. pełna skrzynka) nie może na stałe blokować kogoś, kto o nic nie prosił.
export function disableReasonFor(event: { type: string; data?: unknown }): "bounce" | "complaint" | null {
  if (event.type === "email.complained") return "complaint";
  if (event.type === "email.bounced") {
    const bounce = (event.data as { bounce?: { type?: unknown } } | undefined)?.bounce;
    return bounce?.type === "Permanent" ? "bounce" : null;
  }
  return null;
}

// Do limitu wypisu liczą się tylko próby z nieprawidłowym lub nieznanym tokenem;
// poprawny token (np. one-click z serwerów Gmaila) nigdy nie jest limitowany.
export function countsTowardUnsubscribeLimit(tokenValid: boolean, rowMatched: boolean): boolean {
  return !tokenValid || !rowMatched;
}

export const HARD_DISABLED_MESSAGE =
  "Ten adres jest wyłączony po zgłoszeniu spamu lub odbiciu maila. Napisz do nas: hej@wloczykij.me.";
export const NOT_VERIFIED_MESSAGE = "Najpierw potwierdź zapis z maila.";

// Token to dowód własności: ustawienia zmieniają lotniska, budżet i przełącznik zrzutu.
// Włączenie zdejmuje tylko powód "user"; skarga i odbicie zostają, a niepotwierdzony adres nie dostaje maili.
export function computeSettingsUpdate(
  row: { verified: boolean; drop_disabled_reason: string | null },
  input: unknown,
): { update: Record<string, unknown> } | { error: string; status: number } {
  const prefs = normalizePrefs(input);
  if ("error" in prefs) return { error: prefs.error, status: 400 };

  const enabled = (input as Record<string, unknown>).drop_enabled;
  if (enabled !== undefined && typeof enabled !== "boolean") {
    return { error: "Nieprawidłowe dane.", status: 400 };
  }

  const update: Record<string, unknown> = { airports: prefs.airports, max_price: prefs.max_price };
  if (enabled === true) {
    if (isHardDisabled(row.drop_disabled_reason)) return { error: HARD_DISABLED_MESSAGE, status: 403 };
    if (!row.verified) return { error: NOT_VERIFIED_MESSAGE, status: 403 };
    update.drop_enabled = true;
    update.drop_disabled_reason = null;
  } else if (enabled === false) {
    update.drop_enabled = false;
    if (!isHardDisabled(row.drop_disabled_reason)) update.drop_disabled_reason = "user";
  }
  return { update };
}
