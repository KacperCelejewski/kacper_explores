import { describe, it, expect, vi, beforeEach } from "vitest";

const st = vi.hoisted(() => ({
  event: null as null | { type: string; data: Record<string, unknown> },
  verifyFails: false,
  sendRow: null as null | { week: string; subscriber_id: string },
  events: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
  updateError: null as null | { message: string },
}));

vi.mock("resend", () => ({
  Resend: class {
    webhooks = { verify: () => { if (st.verifyFails) throw new Error("bad"); return st.event; } };
  },
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from(table: string) {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.maybeSingle = async () => ({ data: st.sendRow, error: null });
      b.upsert = async (rows: Record<string, unknown>[]) => { st.events.push(...rows); return { error: null }; };
      b.update = (u: Record<string, unknown>) => { st.updates.push({ table, ...u }); return b; };
      b.or = () => b;
      b.then = (res: (v: unknown) => unknown) => res({ error: st.updateError });
      return b;
    },
  }),
}));

import { POST } from "./route";

const call = () =>
  POST(new Request("http://x", { method: "POST", body: "{}", headers: { "svix-id": "msg_1", "svix-timestamp": "1", "svix-signature": "v1,x" } }) as never);

beforeEach(() => {
  process.env.RESEND_WEBHOOK_SECRET = "whsec_x";
  Object.assign(st, { verifyFails: false, sendRow: { week: "2026-W47", subscriber_id: "sub-1" }, events: [], updates: [], updateError: null });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("webhook Resend", () => {
  it("zły podpis: 400 i brak zapisu", async () => {
    st.verifyFails = true;
    expect((await call()).status).toBe(400);
    expect(st.events).toHaveLength(0);
  });

  it("delivered zrzutu trafia do dziennika z tygodniem i subskrybentem", async () => {
    st.event = { type: "email.delivered", data: { email_id: "r1", to: ["a@b.pl"] } };
    expect((await call()).status).toBe(200);
    expect(st.events).toEqual([expect.objectContaining({ event: "delivered", week: "2026-W47", subscriber_id: "sub-1", resend_id: "r1", source_id: "resend:msg_1" })]);
    expect(st.updates).toHaveLength(0);
  });

  it("zdarzenie bez wiersza w drop_sends (wyprzedza zapis resend_id) jest zachowane jako unmatched", async () => {
    st.sendRow = null;
    st.event = { type: "email.delivered", data: { email_id: "r9", to: ["a@b.pl"] } };
    expect((await call()).status).toBe(200);
    expect(st.events).toEqual([expect.objectContaining({ event: "delivered", resend_id: "r9", week: null, subscriber_id: null, detail: { unmatched: true } })]);
    expect(JSON.stringify(st.events)).not.toContain("a@b.pl");
  });

  it("odbicie trwałe: zapis zdarzenia i dalej wyłączenie zrzutu", async () => {
    st.event = { type: "email.bounced", data: { email_id: "r1", to: ["a@b.pl"], bounce: { type: "Permanent" } } };
    expect((await call()).status).toBe(200);
    expect(st.events[0]).toMatchObject({ event: "bounced" });
    expect(st.updates).toEqual([{ table: "newsletter_subscribers", drop_enabled: false, drop_disabled_reason: "bounce" }]);
  });

  it("błąd wyłączenia nadal daje 500 (Resend ponowi)", async () => {
    st.event = { type: "email.complained", data: { email_id: "r1", to: ["a@b.pl"] } };
    st.updateError = { message: "db" };
    expect((await call()).status).toBe(500);
  });

  it("otwarcie jest ignorowane", async () => {
    st.event = { type: "email.opened", data: { email_id: "r1" } };
    expect((await call()).status).toBe(200);
    expect(st.events).toHaveLength(0);
  });
});
