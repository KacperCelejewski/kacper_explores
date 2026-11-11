import { POLISH_AIRPORTS } from "@/lib/airports";
import type { BudgetLevel } from "@/types";

export const DROP_MAX_PRICES = [200, 300, 500] as const;
export type DropMaxPrice = (typeof DROP_MAX_PRICES)[number];
export const DROP_MAX_AIRPORTS = 3;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POLISH_CODES = new Set(POLISH_AIRPORTS.map((a) => a.code));

export function normalizeSignup(
  input: unknown,
): { email: string; airports: string[]; max_price: DropMaxPrice } | { error: string } {
  if (!input || typeof input !== "object") return { error: "Nieprawidłowe dane." };
  const d = input as Record<string, unknown>;

  const email = typeof d.email === "string" ? d.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) return { error: "Podaj prawidłowy adres e-mail." };

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

  return { email, airports, max_price: maxPrice };
}

// Web Crypto zamiast node:crypto, bo plik importuje też formularz po stronie klienta
function newUnsubscribeToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function budgetToMaxPrice(b: BudgetLevel): 300 | 500 {
  return b === "low" ? 300 : 500;
}

// Zrzut włącza się od razu tylko dla potwierdzonego adresu; nowy włącza route weryfikacji.
// Zawsze ustawia max_price i token, bo wysyłka wymaga obu.
export function buildSubscriberUpsert(
  existing: { verified: boolean; drop_disabled_reason: string | null; unsubscribe_token: string | null } | null,
  s: { airports: string[]; max_price: number },
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    airports: s.airports,
    max_price: s.max_price,
    unsubscribe_token: existing?.unsubscribe_token ?? newUnsubscribeToken(),
    drop_enabled: false,
  };
  if (existing?.verified) {
    fields.drop_enabled = true;
    fields.drop_disabled_reason = null;
  }
  return fields;
}
