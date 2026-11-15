import { describe, expect, it } from "vitest";
import { isRealPayment, splitPro, revenueCents } from "./adminRevenue";

const pay = (o: Partial<{ user_id: string; stripe_session_id: string; amount_cents: number | null; plan_type: string | null; created_at: string }> = {}) => ({
  user_id: "u1",
  stripe_session_id: "cs_live_a1",
  amount_cents: 1499,
  plan_type: "pack_5",
  created_at: "2026-11-10T10:00:00Z",
  ...o,
});

describe("isRealPayment", () => {
  it("liczy tylko sesje live z kwotą większą od zera", () => {
    expect(isRealPayment(pay())).toBe(true);
  });

  it("odrzuca sesje testowe Stripe, zamówienia 0 zł i wpisy bez kwoty", () => {
    expect(isRealPayment(pay({ stripe_session_id: "cs_test_a1" }))).toBe(false);
    expect(isRealPayment(pay({ amount_cents: 0 }))).toBe(false);
    expect(isRealPayment(pay({ amount_cents: null }))).toBe(false);
    expect(isRealPayment(pay({ stripe_session_id: "manual-grant-1" }))).toBe(false);
  });
});

describe("revenueCents", () => {
  it("sumuje tylko prawdziwe płatności, opcjonalnie od daty", () => {
    const rows = [pay(), pay({ stripe_session_id: "cs_test_b", amount_cents: 1999 }), pay({ stripe_session_id: "cs_live_c", amount_cents: 1999, created_at: "2026-10-01T00:00:00Z" })];
    expect(revenueCents(rows)).toBe(1499 + 1999);
    expect(revenueCents(rows, "2026-11-01T00:00:00Z")).toBe(1499);
  });
});

describe("splitPro", () => {
  it("Pro z prawdziwą płatnością planu pro_* jest opłacone, reszta nadana ręcznie", () => {
    const profiles = [
      { id: "u1", subscription_tier: "pro" },
      { id: "u2", subscription_tier: "pro" },
      { id: "u3", subscription_tier: "free" },
    ];
    const payments = [pay({ user_id: "u1", plan_type: "pro_monthly" }), pay({ user_id: "u2", plan_type: "pack_5" }), pay({ user_id: "u3", plan_type: "pro_yearly" })];
    expect(splitPro(profiles, payments)).toEqual({ paid: 1, manual: 1 });
  });

  it("płatność testowa nie robi z konta opłaconego Pro", () => {
    const profiles = [{ id: "u1", subscription_tier: "pro" }];
    expect(splitPro(profiles, [pay({ stripe_session_id: "cs_test_x", plan_type: "pro_monthly" })])).toEqual({ paid: 0, manual: 1 });
  });
});
