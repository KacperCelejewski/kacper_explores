import { describe, it, expect } from "vitest";
import { normalizeSignup, budgetToMaxPrice, buildSubscriberUpsert, decideSubscribeAction, disableReasonFor, computeSettingsUpdate, countsTowardUnsubscribeLimit } from "./signup";

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

  it.each(["complaint", "bounce"])("powód %s nie jest zdejmowany", (reason) => {
    const r = buildSubscriberUpsert(
      { verified: true, drop_disabled_reason: reason, unsubscribe_token: "t" }, s);
    expect(r.drop_enabled).toBe(false);
    expect(r).not.toHaveProperty("drop_disabled_reason");
  });
});

describe("decideSubscribeAction", () => {
  const row = (verified: boolean, reason: string | null = null) =>
    ({ verified, drop_disabled_reason: reason, unsubscribe_token: "t" });

  it("brak wiersza: insert", () => {
    expect(decideSubscribeAction(null, { fromProfile: false })).toBe("insert");
    expect(decideSubscribeAction(null, { fromProfile: true })).toBe("insert");
  });

  it("niepotwierdzony: anonim dostaje nowy link, konto aktualizuje", () => {
    expect(decideSubscribeAction(row(false), { fromProfile: false })).toBe("resend_verification");
    expect(decideSubscribeAction(row(false), { fromProfile: true })).toBe("update_profile");
  });

  it("potwierdzony anonim: tylko link do ustawień, także po skardze", () => {
    expect(decideSubscribeAction(row(true), { fromProfile: false })).toBe("send_manage_link");
    expect(decideSubscribeAction(row(true, "user"), { fromProfile: false })).toBe("send_manage_link");
    expect(decideSubscribeAction(row(true, "complaint"), { fromProfile: false })).toBe("send_manage_link");
  });

  it("potwierdzony z konta: aktualizuje, z blokadą dla skargi i odbicia", () => {
    expect(decideSubscribeAction(row(true), { fromProfile: true })).toBe("update_profile");
    expect(decideSubscribeAction(row(true, "user"), { fromProfile: true })).toBe("update_profile");
    expect(decideSubscribeAction(row(true, "complaint"), { fromProfile: true })).toBe("blocked");
    expect(decideSubscribeAction(row(true, "bounce"), { fromProfile: true })).toBe("blocked");
  });
});

describe("disableReasonFor", () => {
  it("trwałe odbicie i skarga wyłączają zrzut", () => {
    expect(disableReasonFor({ type: "email.bounced", data: { bounce: { type: "Permanent" } } })).toBe("bounce");
    expect(disableReasonFor({ type: "email.complained", data: {} })).toBe("complaint");
  });

  it("chwilowe lub nieznane odbicie jest ignorowane", () => {
    expect(disableReasonFor({ type: "email.bounced", data: { bounce: { type: "Transient" } } })).toBeNull();
    expect(disableReasonFor({ type: "email.bounced", data: { bounce: { type: "Undetermined" } } })).toBeNull();
    expect(disableReasonFor({ type: "email.bounced", data: {} })).toBeNull();
    expect(disableReasonFor({ type: "email.bounced" })).toBeNull();
  });

  it("inne zdarzenia są ignorowane", () => {
    expect(disableReasonFor({ type: "email.delivered", data: {} })).toBeNull();
  });
});

describe("countsTowardUnsubscribeLimit", () => {
  it("liczy tylko nieprawidłowy lub nieznany token", () => {
    expect(countsTowardUnsubscribeLimit(true, true)).toBe(false);
    expect(countsTowardUnsubscribeLimit(true, false)).toBe(true);
    expect(countsTowardUnsubscribeLimit(false, false)).toBe(true);
  });
});

describe("computeSettingsUpdate", () => {
  const base = { airports: ["WRO"], max_price: 300 };
  const ok = { verified: true, drop_disabled_reason: null };

  it("zmienia lotniska i budżet bez ruszania przełącznika", () => {
    expect(computeSettingsUpdate(ok, { ...base, max_price: 500 })).toEqual({
      update: { airports: ["WRO"], max_price: 500 },
    });
  });

  it("włączenie zdejmuje powód user", () => {
    expect(computeSettingsUpdate({ verified: true, drop_disabled_reason: "user" }, { ...base, drop_enabled: true })).toEqual({
      update: { airports: ["WRO"], max_price: 300, drop_enabled: true, drop_disabled_reason: null },
    });
  });

  it("nie włącza po skardze ani odbiciu", () => {
    for (const reason of ["complaint", "bounce"]) {
      expect(computeSettingsUpdate({ verified: true, drop_disabled_reason: reason }, { ...base, drop_enabled: true })).toMatchObject({
        status: 403,
      });
    }
  });

  it("nie włącza niepotwierdzonego adresu", () => {
    expect(computeSettingsUpdate({ verified: false, drop_disabled_reason: null }, { ...base, drop_enabled: true })).toEqual({
      error: "Najpierw potwierdź zapis z maila.",
      status: 403,
    });
  });

  it("wyłączenie ustawia powód user, ale nie nadpisuje skargi", () => {
    expect(computeSettingsUpdate(ok, { ...base, drop_enabled: false })).toMatchObject({
      update: { drop_enabled: false, drop_disabled_reason: "user" },
    });
    const r = computeSettingsUpdate({ verified: true, drop_disabled_reason: "complaint" }, { ...base, drop_enabled: false });
    expect(r).toEqual({ update: { airports: ["WRO"], max_price: 300, drop_enabled: false } });
  });

  it("odrzuca złe dane", () => {
    expect(computeSettingsUpdate(ok, { airports: [], max_price: 300 })).toMatchObject({ status: 400 });
    expect(computeSettingsUpdate(ok, { ...base, drop_enabled: "tak" })).toMatchObject({ status: 400 });
  });
});
