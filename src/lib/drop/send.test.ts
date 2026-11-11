import { describe, it, expect } from "vitest";
import { chunk, isQuotaError, selectRecipients } from "./send";
import type { DropDeal, DropSubscriber } from "./types";

function deal(code: string, price: number, origin = "KRK"): DropDeal {
  return {
    week: "2026-W46", origin, city_code: code, city_name: code, price,
    departure_at: "2026-11-13T19:05:00+01:00", return_at: "2026-11-15T21:40:00+01:00",
    airline: "FR", transfers: 0, link: "/x", fetched_at: "2026-11-11T21:00:00Z",
  };
}

function sub(id: string, over: Partial<DropSubscriber> = {}): DropSubscriber {
  return { id, email: `${id}@example.com`, airports: ["KRK"], max_price: 300, unsubscribe_token: `t-${id}`, ...over };
}

const deals = [deal("MIL", 201), deal("BCN", 250)];

describe("selectRecipients", () => {
  it("pomija tych, którzy już dostali zrzut", () => {
    const out = selectRecipients([sub("a"), sub("b")], new Set(["a"]), deals);
    expect(out.map((r) => r.sub.id)).toEqual(["b"]);
  });

  it("pomija subskrybentów bez dopasowania", () => {
    const out = selectRecipients(
      [sub("a", { airports: ["GDN"] }), sub("b", { max_price: 100 }), sub("c")],
      new Set(),
      deals,
    );
    expect(out.map((r) => r.sub.id)).toEqual(["c"]);
  });

  it("zachowuje kolejność i nigdy nie zwraca pustej listy okazji", () => {
    const out = selectRecipients([sub("c"), sub("a"), sub("b")], new Set(), deals);
    expect(out.map((r) => r.sub.id)).toEqual(["c", "a", "b"]);
    for (const r of out) expect(r.deals.length).toBeGreaterThan(0);
    expect(out[0].deals.map((d) => d.city_code)).toEqual(["MIL", "BCN"]);
  });
});

describe("chunk", () => {
  it("dzieli 250 elementów na partie 100/100/50", () => {
    const items = Array.from({ length: 250 }, (_, i) => i);
    expect(chunk(items, 100).map((c) => c.length)).toEqual([100, 100, 50]);
  });

  it("zwraca pustą listę dla pustego wejścia", () => {
    expect(chunk([], 100)).toEqual([]);
  });
});

describe("isQuotaError", () => {
  it("rozpoznaje limity dzienny, miesięczny i 429", () => {
    expect(isQuotaError({ name: "daily_quota_exceeded", statusCode: 429 })).toBe(true);
    expect(isQuotaError({ name: "monthly_quota_exceeded", statusCode: 429 })).toBe(true);
    expect(isQuotaError({ name: "rate_limit_exceeded", statusCode: 429 })).toBe(true);
    expect(isQuotaError({ name: "application_error", statusCode: 429 })).toBe(true);
  });

  it("nie myli innych błędów z limitem", () => {
    expect(isQuotaError({ name: "validation_error", statusCode: 422 })).toBe(false);
    expect(isQuotaError({ name: "application_error", statusCode: null })).toBe(false);
  });
});
