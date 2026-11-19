import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type DbError = { code?: string; message: string };
const state = vi.hoisted(() => ({
  event: null as unknown,
  insertErrors: [] as (DbError | null)[],
  rpcError: null as DbError | null,
  rpcData: { outcome: "applied", status: "applied", reason: "full_pack_refund", credits_debited: 5 } as unknown,
  grantData: "applied",
  calls: [] as string[],
  rpcArgs: [] as { name: string; args: unknown }[],
  inserts: [] as Record<string, unknown>[],
  deleteFilters: [] as unknown[][],
  signatureError: false,
  serviceClients: 0,
  verified: [] as unknown[][],
  sessions: [{ id: "cs_1", mode: "payment" }] as Record<string, unknown>[],
  invoicePayments: [] as unknown[],
  stripeCalls: [] as unknown[],
  lookupError: false,
  rpcThrows: false,
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: (...args: unknown[]) => {
      state.verified.push(args);
      if (state.signatureError) throw new Error("bad signature");
      return state.event;
    } },
    checkout: { sessions: { list: async (args: unknown) => {
      state.stripeCalls.push(args);
      if (state.lookupError) throw new Error("private data from provider");
      return { data: state.sessions };
    } } },
    invoicePayments: { list: async (args: unknown) => {
      state.stripeCalls.push(args);
      return { data: state.invoicePayments };
    } },
  },
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
    return {
      from: (table: string) => ({
        insert: async (value: Record<string, unknown>) => {
          state.calls.push(`insert:${table}`);
          state.inserts.push(value);
          return { error: state.insertErrors.shift() ?? null };
        },
        update: () => ({ eq: async () => {
          state.calls.push(`update:${table}`);
          return { error: null };
        } }),
        delete: () => {
          state.calls.push(`delete:${table}`);
          const query = {
            eq: (...args: unknown[]) => { state.deleteFilters.push(args); return query; },
            then: (resolve: (result: { error: null }) => unknown) => Promise.resolve(resolve({ error: null })),
          };
          return query;
        },
        select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }),
      }),
      rpc: async (name: string, args: unknown) => {
        state.calls.push(`rpc:${name}`);
        state.rpcArgs.push({ name, args });
        if (state.rpcThrows) throw new Error("connection lost");
        return { data: name === "process_credit_refund" ? state.rpcData : state.grantData, error: state.rpcError };
      },
    };
  },
}));

import { POST } from "./route";

function session(over: Record<string, unknown> = {}) {
  return {
    id: "cs_1", payment_intent: "pi_1", payment_status: "paid", amount_total: 1499, currency: "pln",
    metadata: { supabase_user_id: "user-1", plan_key: "pack_5" }, ...over,
  };
}
function send(type: string, object: unknown, id = "evt_1") {
  state.event = { id, created: 1794787200, livemode: false, type, data: { object } };
  return POST(new Request("http://x/api/webhook", {
    method: "POST", body: "{}", headers: { "stripe-signature": "sig" },
  }) as never);
}
function refundedCharge(over: Record<string, unknown> = {}) {
  return {
    id: "ch_1", payment_intent: "pi_1", customer: "cus_1", amount: 1499,
    amount_refunded: 1499, refunded: true, currency: "pln", ...over,
  };
}
const missingColumns = { code: "PGRST204", message: "Could not find stripe_payment_intent_id in payments" };

beforeEach(() => {
  state.event = null;
  state.insertErrors = [];
  state.rpcError = null;
  state.rpcData = { outcome: "applied", status: "applied", reason: "full_pack_refund", credits_debited: 5 };
  state.grantData = "applied";
  state.calls = [];
  state.rpcArgs = [];
  state.inserts = [];
  state.deleteFilters = [];
  state.signatureError = false;
  state.serviceClients = 0;
  state.verified = [];
  state.sessions = [{ id: "cs_1", mode: "payment" }];
  state.invoicePayments = [];
  state.stripeCalls = [];
  state.lookupError = false;
  state.rpcThrows = false;
});
afterEach(() => vi.restoreAllMocks());

describe("webhook: Checkout grant and rollback order", () => {
  it.each(["checkout.session.completed", "checkout.session.async_payment_succeeded"])("%s inserts before atomically granting", async (type) => {
    expect((await send(type, session())).status).toBe(200);
    expect(state.calls).toEqual(["insert:payments", "rpc:grant_credit_pack"]);
    expect(state.inserts[0]).toMatchObject({ grant_status: "pending", stripe_payment_intent_id: "pi_1" });
    expect(state.rpcArgs[0].args).toEqual({ p_session_id: "cs_1", p_payment_intent_id: "pi_1" });
  });
  it("ignores unpaid Checkout", async () => {
    expect((await send("checkout.session.completed", session({ payment_status: "unpaid" }))).status).toBe(200);
    expect(state.calls).toEqual([]);
  });
  it("grants a 100% discount without a PaymentIntent", async () => {
    await send("checkout.session.completed", session({ payment_status: "no_payment_required", payment_intent: null }));
    expect(state.rpcArgs[0].args).toMatchObject({ p_payment_intent_id: null });
  });
  it("a duplicate retries the idempotent grant to recover insert-before-grant crashes", async () => {
    state.insertErrors = [{ code: "23505", message: "duplicate session" }];
    state.grantData = "ignored";
    expect((await send("checkout.session.completed", session())).status).toBe(200);
    expect(state.calls).toEqual(["insert:payments", "rpc:grant_credit_pack"]);
  });
  it("rolls back only pending records on grant failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.rpcError = { message: "boom" };
    expect((await send("checkout.session.completed", session())).status).toBe(500);
    expect(state.calls).toEqual(["insert:payments", "rpc:grant_credit_pack", "delete:payments"]);
    expect(state.deleteFilters).toEqual([["stripe_session_id", "cs_1"], ["grant_status", "pending"]]);
  });
  it("never deletes an existing payment when a duplicate's RPC fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.insertErrors = [{ code: "23505", message: "duplicate session" }];
    state.rpcError = { message: "timeout" };
    expect((await send("checkout.session.completed", session())).status).toBe(500);
    expect(state.deleteFilters).toEqual([]);
  });
  it("does not fall back to add_credits when the grant function alone is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.rpcError = { code: "PGRST202", message: "Could not find public.grant_credit_pack" };
    expect((await send("checkout.session.completed", session())).status).toBe(500);
    expect(state.calls).toEqual(["insert:payments", "rpc:grant_credit_pack", "delete:payments"]);
  });
  it("requests a retry if the grant RPC returns no recognised result", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.grantData = "";
    expect((await send("checkout.session.completed", session())).status).toBe(500);
    expect(state.deleteFilters).toContainEqual(["grant_status", "pending"]);
  });
  it("keeps old Checkout working before migration without marking legacy grants applied", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    state.insertErrors = [missingColumns];
    expect((await send("checkout.session.completed", session())).status).toBe(200);
    expect(state.calls).toEqual(["insert:payments", "insert:payments", "rpc:add_credits"]);
    expect(state.inserts[1]).not.toHaveProperty("grant_status");
    expect(state.inserts[1]).not.toHaveProperty("stripe_payment_intent_id");
  });
  it("does not grant a duplicate on the legacy schema", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    state.insertErrors = [missingColumns, { code: "23505", message: "duplicate" }];
    expect((await send("checkout.session.completed", session())).status).toBe(200);
    expect(state.rpcArgs).toEqual([]);
  });
  it("does not fall back for unrelated insert errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.insertErrors = [{ code: "42501", message: "permission denied" }];
    expect((await send("checkout.session.completed", session())).status).toBe(500);
    expect(state.calls).toEqual(["insert:payments"]);
  });
  it.each(["pro_monthly", "pro_yearly"])("preserves %s grant order and duplicate handling", async (plan) => {
    const pro = session({ metadata: { supabase_user_id: "user-1", plan_key: plan } });
    expect((await send("checkout.session.completed", pro)).status).toBe(200);
    expect(state.calls).toEqual(["insert:payments", "update:user_profiles"]);
    state.insertErrors = [{ code: "23505", message: "duplicate" }];
    await send("checkout.session.completed", pro);
    expect(state.calls).toEqual(["insert:payments", "update:user_profiles", "insert:payments"]);
  });
  it("async_payment_failed grants nothing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await send("checkout.session.async_payment_failed", session({ payment_status: "unpaid" }));
    expect(state.calls).toEqual([]);
  });
});

describe("webhook: charge.refunded", () => {
  function captureLog() {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    return { log, record: () => JSON.parse(log.mock.calls[0][1] as string) };
  }
  it("sends a full refund to one atomic RPC without separate balance writes", async () => {
    const { log } = captureLog();
    expect((await send("charge.refunded", refundedCharge())).status).toBe(200);
    expect(state.calls).toEqual(["rpc:process_credit_refund"]);
    expect(state.rpcArgs[0].args).toEqual({
      p_event_id: "evt_1", p_charge_id: "ch_1", p_payment_intent_id: "pi_1", p_customer_id: "cus_1",
      p_livemode: false, p_event_created: 1794787200, p_currency: "pln", p_amount_cents: 1499,
      p_amount_refunded_cents: 1499, p_session_id: "cs_1", p_is_invoice_payment: false,
    });
    expect(state.stripeCalls).toEqual([{ payment_intent: "pi_1", limit: 1 }]);
    expect(log).not.toHaveBeenCalled();
  });
  it("leaves partial refunds to manual review", async () => {
    const { record } = captureLog();
    state.rpcData = { outcome: "skipped", status: "manual_review", reason: "partial_refund", credits_debited: 0 };
    expect((await send("charge.refunded", refundedCharge({ amount_refunded: 500, refunded: false }))).status).toBe(200);
    expect(record()).toMatchObject({ status: "manual_review", refund_scope: "partial", automatic_entitlement_change: false });
    expect(state.rpcArgs[0].args).toMatchObject({ p_amount_refunded_cents: 500 });
    expect(state.calls).toEqual(["rpc:process_credit_refund"]);
  });
  it("passes the same event ID on redelivery and accepts the RPC's idempotent result", async () => {
    await send("charge.refunded", refundedCharge());
    state.rpcData = { outcome: "skipped", status: "applied", reason: "full_pack_refund", credits_debited: 0 };
    expect((await send("charge.refunded", refundedCharge())).status).toBe(200);
    expect(state.rpcArgs[0]).toEqual(state.rpcArgs[1]);
    expect(state.calls).toEqual(["rpc:process_credit_refund", "rpc:process_credit_refund"]);
  });
  it("passes cumulative amounts unchanged, including reverse delivery order", async () => {
    await send("charge.refunded", refundedCharge({ amount_refunded: 900, refunded: false }), "evt_later");
    await send("charge.refunded", refundedCharge({ amount_refunded: 500, refunded: false }), "evt_earlier");
    expect(state.rpcArgs.map(({ args }) => (args as { p_amount_refunded_cents: number }).p_amount_refunded_cents)).toEqual([900, 500]);
  });
  it("records an unknown payment as pending without guessing from its customer", async () => {
    const { record } = captureLog();
    state.sessions = [];
    state.rpcData = { outcome: "missing_payment", status: "pending_payment", reason: "payment_not_found", credits_debited: 0 };
    expect((await send("charge.refunded", refundedCharge())).status).toBe(200);
    expect(record()).toMatchObject({ status: "pending_payment", reason: "payment_not_found" });
    expect(state.stripeCalls[1]).toEqual({ payment: { type: "payment_intent", payment_intent: "pi_1" }, limit: 1 });
    expect(state.calls).toEqual(["rpc:process_credit_refund"]);
  });
  it("records missing IDs without making Stripe calls", async () => {
    captureLog();
    state.rpcData = { outcome: "missing_payment", status: "pending_payment", reason: "payment_not_found" };
    await send("charge.refunded", refundedCharge({ payment_intent: null, customer: null }));
    expect(state.stripeCalls).toEqual([]);
    expect(state.rpcArgs[0].args).toMatchObject({ p_payment_intent_id: null, p_customer_id: null, p_session_id: null });
  });
  it.each(["pro_monthly", "pro_yearly"])("records %s refunds for review, leaving Pro untouched", async (plan) => {
    const { record } = captureLog();
    state.sessions = [{ id: "cs_pro", mode: "subscription" }];
    state.rpcData = { outcome: "skipped", status: "manual_review", reason: "subscription_or_invoice" };
    await send("charge.refunded", refundedCharge({
      metadata: { plan_key: plan }, payment_intent: { id: "pi_pro" }, customer: { id: "cus_pro" },
      billing_details: { email: "private@example.com" },
    }));
    expect(state.rpcArgs[0].args).toMatchObject({ p_is_invoice_payment: true, p_payment_intent_id: "pi_pro" });
    expect(record()).toMatchObject({ status: "manual_review", customer_id: "cus_pro", automatic_entitlement_change: false });
    expect(JSON.stringify(record())).not.toContain("private@example.com");
    expect(state.calls).toEqual(["rpc:process_credit_refund"]);
  });
  it("recognises subscription renewal refunds without a Checkout session", async () => {
    captureLog();
    state.sessions = [];
    state.invoicePayments = [{ invoice: "in_renewal" }];
    state.rpcData = { outcome: "skipped", status: "manual_review", reason: "subscription_or_invoice" };
    expect((await send("charge.refunded", refundedCharge())).status).toBe(200);
    expect(state.rpcArgs[0].args).toMatchObject({ p_is_invoice_payment: true, p_session_id: null });
    expect(state.calls).toEqual(["rpc:process_credit_refund"]);
  });
  it.each(["PGRST202", "42883"])("tolerates missing migration (%s) with an explicit manual-review log", async (code) => {
    const { record } = captureLog();
    state.rpcError = { code, message: "Could not find function public.process_credit_refund" };
    expect((await send("charge.refunded", refundedCharge())).status).toBe(200);
    expect(record()).toMatchObject({ status: "manual_review", reason: "refund_migration_missing", automatic_entitlement_change: false });
    expect(state.calls).toEqual(["rpc:process_credit_refund"]);
  });
  it.each(["40001", "42501", "XX000", "PGRST203", "42P01"])("returns 500 on RPC failure %s without extra database writes", async (code) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.rpcError = { code, message: "database error" };
    expect((await send("charge.refunded", refundedCharge())).status).toBe(500);
    expect(state.calls).toEqual(["rpc:process_credit_refund"]);
  });
  it("does not treat a missing nested SQL helper as a missing migration", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.rpcError = { code: "42883", message: "function other_function does not exist" };
    expect((await send("charge.refunded", refundedCharge())).status).toBe(500);
  });
  it.each(["Stripe", "RPC", "invalid result"])("returns 500 for %s failure", async (failure) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    state.lookupError = failure === "Stripe";
    state.rpcThrows = failure === "RPC";
    if (failure === "invalid result") state.rpcData = null;
    expect((await send("charge.refunded", refundedCharge())).status).toBe(500);
    expect(JSON.stringify(log.mock.calls)).not.toContain("private data from provider");
  });
  it("verifies the raw body before any side effects", async () => {
    await send("charge.refunded", refundedCharge());
    expect(state.verified[0].slice(0, 2)).toEqual(["{}", "sig"]);
  });
  it("rejects an invalid signature before Stripe lookups or the database", async () => {
    const { log } = captureLog();
    state.signatureError = true;
    expect((await send("charge.refunded", refundedCharge())).status).toBe(400);
    expect(log).not.toHaveBeenCalled();
    expect(state.serviceClients).toBe(0);
    expect(state.stripeCalls).toEqual([]);
  });
  it("rejects a missing signature before constructing the event", async () => {
    const { log } = captureLog();
    const res = await POST(new Request("http://x/api/webhook", { method: "POST", body: "{}" }) as never);
    expect(res.status).toBe(400);
    expect(state.verified).toEqual([]);
    expect(log).not.toHaveBeenCalled();
    expect(state.serviceClients).toBe(0);
    expect(state.stripeCalls).toEqual([]);
  });
});
