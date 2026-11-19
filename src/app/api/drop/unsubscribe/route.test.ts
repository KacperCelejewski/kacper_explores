import { describe, it, expect, vi, beforeEach } from "vitest";

const st = vi.hoisted(() => ({
  row: null as null | { id: string; drop_enabled: boolean; drop_disabled_reason: string | null },
  updates: [] as Record<string, unknown>[],
  events: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from(table: string) {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.or = () => b;
      b.maybeSingle = async () => ({ data: st.row, error: null });
      b.update = (u: Record<string, unknown>) => { st.updates.push(u); return b; };
      b.upsert = async (rows: Record<string, unknown>[]) => { if (table === "drop_events") st.events.push(...rows); return { error: null }; };
      b.then = (res: (v: unknown) => unknown) => res({ error: null });
      return b;
    },
  }),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";

const post = (token = "abc123") =>
  POST(new NextRequest(`http://x/api/drop/unsubscribe?token=${token}`, { method: "POST", headers: { "x-forwarded-for": "10.1.1.1" } }));

beforeEach(() => {
  Object.assign(st, { row: { id: "sub-1", drop_enabled: true, drop_disabled_reason: null }, updates: [], events: [] });
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("wypis ze zrzutu", () => {
  it("wyłącza zrzut i zapisuje zdarzenie unsubscribed", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(st.updates).toEqual([{ drop_enabled: false, drop_disabled_reason: "user" }]);
    expect(st.events).toEqual([expect.objectContaining({ event: "unsubscribed", subscriber_id: "sub-1", })]);
  });

  it("skarga/odbicie: nie nadpisuje powodu i nie zapisuje wypisu", async () => {
    st.row = { id: "sub-1", drop_enabled: false, drop_disabled_reason: "complaint" };
    await post();
    expect(st.updates).toHaveLength(0);
    expect(st.events).toHaveLength(0);
  });

  it("powtórny wypis (zrzut już wyłączony przez użytkownika) nie liczy się drugi raz", async () => {
    st.row = { id: "sub-1", drop_enabled: false, drop_disabled_reason: "user" };
    await post();
    expect(st.events).toHaveLength(0);
  });

  it("nieznany token: ta sama odpowiedź, brak zdarzenia", async () => {
    st.row = null;
    const res = await post("nieznany");
    expect(res.status).toBe(200);
    expect(st.events).toHaveLength(0);
  });
});
