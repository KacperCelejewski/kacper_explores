import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const state = vi.hoisted(() => ({
  event: null as unknown,
  insertError: null as null | { code: string },
  rpcError: null as null | { message: string },
  calls: [] as string[],
  deleted: 0,
  signatureError: false,
  serviceClients: 0,
  verified: [] as unknown[][],
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { webhooks: { constructEvent: (...args: unknown[]) => {
    state.verified.push(args);
    if (state.signatureError) throw new Error("bad signature");
    return state.event;
  } } },
  PLANS: {
    pack_5: { priceId: "price_pack", credits: 5, type: "payment" },
    pro_monthly: { priceId: "price_m", credits: 0, type: "subscription" },
    pro_yearly: { priceId: "price_y", credits: 0, type: "subscription" },
  },
}));
vi.mock("@/lib/slack", () => ({ sendSlack: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => {
    state.serviceClients++;
    return ({
    from: (table: string) => ({
      insert: async () => {
        state.calls.push(`insert:${table}`);
        return { error: state.insertError };
      },
      update: () => ({
        eq: async () => {
          state.calls.push(`update:${table}`);
          return { error: null };
        },
      }),
      delete: () => ({
        eq: async () => {
          state.deleted++;
          return { error: null };
        },
      }),
      select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }),
    }),
    rpc: async (name: string) => {
      state.calls.push(`rpc:${name}`);
      return { error: state.rpcError };
    },
  }); },
}));

import { POST } from "./route";

function session(over: Record<string, unknown> = {}) {
  return {
    id: "cs_1",
    payment_status: "paid",
    amount_total: 1499,
    currency: "pln",
    metadata: { supabase_user_id: "user-1", plan_key: "pack_5" },
    ...over,
  };
}
function send(type: string, object: unknown, id = "evt_1") {
  state.event = { id, created: 1794787200, livemode: false, type, data: { object } };
  return POST(
    new Request("http://x/api/webhook", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "sig" },
    }) as never,
  );
}

beforeEach(() => {
  state.event = null;
  state.insertError = null;
  state.rpcError = null;
  state.calls = [];
  state.deleted = 0;
  state.signatureError = false;
  state.serviceClients = 0;
  state.verified = [];
});
afterEach(() => vi.restoreAllMocks());

describe("webhook: checkout.session.completed", () => {
  it("przyznaje kredyty za opłaconą sesję", async () => {
    const res = await send("checkout.session.completed", session());
    expect(res.status).toBe(200);
    expect(state.calls).toContain("rpc:add_credits");
  });

  it("nie przyznaje niczego za niezapłaconą sesję (opóźniona metoda płatności)", async () => {
    const res = await send("checkout.session.completed", session({ payment_status: "unpaid" }));
    expect(res.status).toBe(200);
    expect(state.calls).toEqual([]);
  });

  it("przyznaje przy no_payment_required (kod 100%)", async () => {
    await send("checkout.session.completed", session({ payment_status: "no_payment_required" }));
    expect(state.calls).toContain("rpc:add_credits");
  });

  it("jest idempotentny: powtórzona sesja nie dodaje kredytów drugi raz", async () => {
    state.insertError = { code: "23505" };
    const res = await send("checkout.session.completed", session());
    expect(res.status).toBe(200);
    expect(state.calls).not.toContain("rpc:add_credits");
  });

  it("gdy przyznanie się nie uda, cofa wpis płatności i prosi Stripe o ponowienie", async () => {
    state.rpcError = { message: "boom" };
    const res = await send("checkout.session.completed", session());
    expect(res.status).toBe(500);
    expect(state.deleted).toBe(1);
  });
});

describe("webhook: płatności asynchroniczne", () => {
  it("async_payment_succeeded przyznaje kredyty", async () => {
    const res = await send("checkout.session.async_payment_succeeded", session());
    expect(res.status).toBe(200);
    expect(state.calls).toContain("rpc:add_credits");
  });

  it("async_payment_failed niczego nie przyznaje", async () => {
    const res = await send("checkout.session.async_payment_failed", session({ payment_status: "unpaid" }));
    expect(res.status).toBe(200);
    expect(state.calls).toEqual([]);
  });
});


function refundedCharge(over: Record<string, unknown> = {}) {
  return {
    id: "ch_1",
    payment_intent: "pi_1",
    customer: "cus_1",
    amount: 1499,
    amount_refunded: 1499,
    refunded: true,
    currency: "pln",
    ...over,
  };
}

describe("webhook: charge.refunded (manual handling until an approved migration)", () => {
  function captureLog() {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    return {
      log,
      record: (index = 0) => JSON.parse(log.mock.calls[index][1] as string),
    };
  }

  it("logs a full Pack refund for manual review without changing entitlements", async () => {
    const { log, record } = captureLog();
    const res = await send("charge.refunded", refundedCharge());
    expect(res.status).toBe(200);
    expect(log).toHaveBeenCalledTimes(1);
    expect(record()).toEqual({
      status: "manual_review_required", event_id: "evt_1", event_created: 1794787200,
      livemode: false, charge_id: "ch_1", payment_intent_id: "pi_1", customer_id: "cus_1",
      amount_cents: 1499, amount_refunded_cents: 1499, currency: "pln", refund_scope: "full",
      automatic_entitlement_change: false,
    });
    expect(state.serviceClients).toBe(0);
    expect(state.calls).toEqual([]);
  });

  it("logs a partial refund even though Charge.refunded is false", async () => {
    const { record } = captureLog();
    await send("charge.refunded", refundedCharge({ amount_refunded: 500, refunded: false }));
    expect(record()).toMatchObject({ refund_scope: "partial", amount_refunded_cents: 500 });
    expect(state.serviceClients).toBe(0);
  });

  it("repeated event IDs have no database side effects (logs may repeat)", async () => {
    const { log, record } = captureLog();
    await send("charge.refunded", refundedCharge());
    await send("charge.refunded", refundedCharge());
    expect(log).toHaveBeenCalledTimes(2);
    expect(record(0)).toEqual(record(1));
    expect(state.serviceClients).toBe(0);
    expect(state.calls).toEqual([]);
  });

  it("retains cumulative amounts for successive partial refunds, including out-of-order delivery", async () => {
    const { record } = captureLog();
    await send("charge.refunded", refundedCharge({ amount_refunded: 900, refunded: false }), "evt_later");
    await send("charge.refunded", refundedCharge({ amount_refunded: 500, refunded: false }), "evt_earlier");
    expect(record(0)).toMatchObject({ event_id: "evt_later", amount_refunded_cents: 900 });
    expect(record(1)).toMatchObject({ event_id: "evt_earlier", amount_refunded_cents: 500 });
    expect(state.serviceClients).toBe(0);
  });

  it("logs an unknown payment without guessing a user or granting/removing anything", async () => {
    const { record } = captureLog();
    const res = await send("charge.refunded", refundedCharge({ payment_intent: null, customer: null }));
    expect(res.status).toBe(200);
    expect(record()).toMatchObject({ status: "manual_review_required", payment_intent_id: null, customer_id: null });
    expect(state.serviceClients).toBe(0);
  });

  it.each(["pro_monthly", "pro_yearly"])("leaves %s for an owner's decision, including renewal refunds", async (plan) => {
    const { record } = captureLog();
    await send("charge.refunded", refundedCharge({
      amount: 1999, amount_refunded: 1999,
      metadata: { plan_key: plan },
      payment_intent: { id: "pi_pro" }, customer: { id: "cus_pro" },
      billing_details: { email: "private@example.com" },
    }));
    expect(record()).toMatchObject({ status: "manual_review_required", payment_intent_id: "pi_pro", customer_id: "cus_pro" });
    expect(JSON.stringify(record())).not.toContain("private@example.com");
    expect(state.serviceClients).toBe(0);
  });

  it("verifies the raw request before accepting a refund", async () => {
    captureLog();
    await send("charge.refunded", refundedCharge());
    expect(state.verified[0].slice(0, 2)).toEqual(["{}", "sig"]);
  });

  it("rejects an invalid signature before logging or using the database", async () => {
    const { log } = captureLog();
    state.signatureError = true;
    expect((await send("charge.refunded", refundedCharge())).status).toBe(400);
    expect(log).not.toHaveBeenCalled();
    expect(state.serviceClients).toBe(0);
  });

  it("rejects a missing signature before constructing the event", async () => {
    const { log } = captureLog();
    const res = await POST(new Request("http://x/api/webhook", { method: "POST", body: "{}" }) as never);
    expect(res.status).toBe(400);
    expect(state.verified).toEqual([]);
    expect(log).not.toHaveBeenCalled();
    expect(state.serviceClients).toBe(0);
  });
});
