import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  event: null as unknown,
  insertError: null as null | { code: string },
  rpcError: null as null | { message: string },
  calls: [] as string[],
  deleted: 0,
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { webhooks: { constructEvent: () => state.event } },
  PLANS: {
    pack_5: { priceId: "price_pack", credits: 5, type: "payment" },
    pro_monthly: { priceId: "price_m", credits: 0, type: "subscription" },
    pro_yearly: { priceId: "price_y", credits: 0, type: "subscription" },
  },
}));
vi.mock("@/lib/slack", () => ({ sendSlack: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
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
  }),
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
function send(type: string, object: unknown) {
  state.event = { type, data: { object } };
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
});

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
