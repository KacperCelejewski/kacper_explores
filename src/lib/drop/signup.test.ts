import { describe, it, expect } from "vitest";
import { normalizeSignup, budgetToMaxPrice, buildSubscriberUpsert } from "./signup";

describe("normalizeSignup", () => {
  it("normalizuje e-mail i zwraca dane", () => {
    expect(normalizeSignup({ email: "  Marek@Gmail.COM ", airports: ["WRO"], max_price: 300 })).toEqual({
      email: "marek@gmail.com",
      airports: ["WRO"],
      max_price: 300,
    });
  });

  it("usuwa duplikaty lotnisk", () => {
    const r = normalizeSignup({ email: "a@b.pl", airports: ["WRO", "wro", "KRK"], max_price: 200 });
    expect(r).toMatchObject({ airports: ["WRO", "KRK"] });
  });

  it("odrzuca zły e-mail", () => {
    expect(normalizeSignup({ email: "marek", airports: ["WRO"], max_price: 300 })).toEqual({
      error: "Podaj prawidłowy adres e-mail.",
    });
  });

  it("odrzuca puste lotniska", () => {
    expect(normalizeSignup({ email: "a@b.pl", airports: [], max_price: 300 })).toEqual({
      error: "Wybierz przynajmniej jedno lotnisko.",
    });
  });

  it("odrzuca kod spoza POLISH_AIRPORTS", () => {
    expect(normalizeSignup({ email: "a@b.pl", airports: ["BER"], max_price: 300 })).toHaveProperty("error");
    expect(normalizeSignup({ email: "a@b.pl", airports: ["XXX"], max_price: 300 })).toHaveProperty("error");
  });

  it("odrzuca budżet spoza 200/300/500", () => {
    expect(normalizeSignup({ email: "a@b.pl", airports: ["WRO"], max_price: 250 })).toHaveProperty("error");
    expect(normalizeSignup({ email: "a@b.pl", airports: ["WRO"], max_price: "300" })).toHaveProperty("error");
  });

  it("odrzuca więcej niż 3 lotniska", () => {
    expect(
      normalizeSignup({ email: "a@b.pl", airports: ["WRO", "KRK", "WAW", "POZ"], max_price: 300 }),
    ).toEqual({ error: "Wybierz maksymalnie 3 lotniska." });
  });

  it("odrzuca nie-obiekt", () => {
    expect(normalizeSignup(null)).toHaveProperty("error");
    expect(normalizeSignup("x")).toHaveProperty("error");
  });
});

describe("budgetToMaxPrice", () => {
  it("mapuje budżet z quizu", () => {
    expect(budgetToMaxPrice("low")).toBe(300);
    expect(budgetToMaxPrice("medium")).toBe(500);
  });
});

describe("buildSubscriberUpsert", () => {
  const s = { airports: ["WRO"], max_price: 300 };

  it("nowy adres: token, drop wyłączony do weryfikacji", () => {
    const r = buildSubscriberUpsert(null, s);
    expect(r).toMatchObject({ airports: ["WRO"], max_price: 300, drop_enabled: false });
    expect(r.unsubscribe_token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("zweryfikowany: włącza zrzut i zostawia token", () => {
    const r = buildSubscriberUpsert(
      { verified: true, drop_disabled_reason: null, unsubscribe_token: "t" }, s);
    expect(r).toMatchObject({ drop_enabled: true, unsubscribe_token: "t" });
  });

  it("zweryfikowany bez tokenu: tworzy token", () => {
    const r = buildSubscriberUpsert(
      { verified: true, drop_disabled_reason: null, unsubscribe_token: null }, s);
    expect(r.drop_enabled).toBe(true);
    expect(r.unsubscribe_token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("zweryfikowany po wypisaniu: czyści powód, nie rusza kodu rabatowego", () => {
    const r = buildSubscriberUpsert(
      { verified: true, drop_disabled_reason: "user", unsubscribe_token: "t" }, s);
    expect(r).toMatchObject({ drop_enabled: true, drop_disabled_reason: null, unsubscribe_token: "t" });
    expect(r).not.toHaveProperty("discount_code");
  });

  it("niezweryfikowany istniejący: drop wyłączony", () => {
    const r = buildSubscriberUpsert(
      { verified: false, drop_disabled_reason: null, unsubscribe_token: "t" }, s);
    expect(r).toMatchObject({ drop_enabled: false, unsubscribe_token: "t" });
  });
});
