import { describe, it, expect } from "vitest";
import { chunk, classifyBatchError, mapBatchResult, selectRecipients } from "./send";
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

describe("classifyBatchError", () => {
  it("limity dzienny i miesięczny to quota", () => {
    expect(classifyBatchError({ name: "daily_quota_exceeded", statusCode: 429 })).toBe("quota");
    expect(classifyBatchError({ name: "monthly_quota_exceeded", statusCode: 429 })).toBe("quota");
  });

  it("rate_limit_exceeded to rate_limit", () => {
    expect(classifyBatchError({ name: "rate_limit_exceeded", statusCode: 429 })).toBe("rate_limit");
  });

  it("inne 4xx to rejected", () => {
    expect(classifyBatchError({ name: "validation_error", statusCode: 422 })).toBe("rejected");
    expect(classifyBatchError({ name: "invalid_api_key", statusCode: 403 })).toBe("rejected");
  });

  it("brak statusu i 5xx to unknown", () => {
    expect(classifyBatchError({ name: "application_error", statusCode: null })).toBe("unknown");
    expect(classifyBatchError({ name: "internal_server_error", statusCode: 503 })).toBe("unknown");
    expect(classifyBatchError({})).toBe("unknown");
  });
});

describe("mapBatchResult", () => {
  it("maps ids to successful indices and reports failed ones", () => {
    const out = mapBatchResult(4, [{ id: "a" }, { id: "b" }, { id: "c" }], [{ index: 1 }]);
    expect(out.failed).toEqual([1]);
    expect(out.sent).toEqual([
      { index: 0, id: "a" },
      { index: 2, id: "b" },
      { index: 3, id: "c" },
    ]);
  });

  it("treats a batch without errors as fully sent", () => {
    const out = mapBatchResult(2, [{ id: "a" }, { id: "b" }], undefined);
    expect(out.failed).toEqual([]);
    expect(out.sent.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("returns a null id when Resend returned fewer ids than expected", () => {
    expect(mapBatchResult(2, [{ id: "a" }], []).sent[1]).toEqual({ index: 1, id: null });
  });
});
