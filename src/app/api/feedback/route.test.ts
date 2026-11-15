import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  claimed: { id: "t1" } as { id: string } | null,
  rpcError: null as null | { message: string },
  updates: [] as Record<string, unknown>[],
  rpcCalls: [] as string[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      update: (patch: Record<string, unknown>) => {
        state.updates.push(patch);
        const chain: Record<string, unknown> = {
          eq: () => chain,
          is: () => chain,
          select: () => ({ maybeSingle: async () => ({ data: state.claimed }) }),
          then: (r: (v: unknown) => void) => r({ error: null }),
        };
        return chain;
      },
    }),
    rpc: async (name: string) => {
      state.rpcCalls.push(name);
      return { error: state.rpcError };
    },
  }),
}));

import { POST } from "./route";

const post = (body: unknown) =>
  POST(new Request("http://x/api/feedback", { method: "POST", body: JSON.stringify(body) }) as never);

beforeEach(() => {
  state.user = { id: "u1" };
  state.claimed = { id: "t1" };
  state.rpcError = null;
  state.updates = [];
  state.rpcCalls = [];
});

describe("feedback: nagroda", () => {
  it("daje kredyt raz, przez klucz serwisowy, po zajęciu wyjazdu", async () => {
    const res = await post({ tripId: "t1", rating: "up", type: "full" });
    expect(await res.json()).toEqual({ success: true, creditAdded: true });
    expect(state.rpcCalls).toEqual(["add_credits"]);
  });

  it("nie daje kredytu, gdy wyjazd był już nagrodzony", async () => {
    state.claimed = null;
    const res = await post({ tripId: "t1", rating: "up", type: "full" });
    expect(await res.json()).toEqual({ success: true, creditAdded: false });
    expect(state.rpcCalls).toEqual([]);
  });

  it("zwalnia zajęty wyjazd, gdy add_credits się nie uda", async () => {
    state.rpcError = { message: "boom" };
    const res = await post({ tripId: "t1", rating: "up", type: "full" });
    expect(await res.json()).toEqual({ success: true, creditAdded: false });
    expect(state.updates.at(-1)).toEqual({ feedback_credited_at: null });
  });
});
