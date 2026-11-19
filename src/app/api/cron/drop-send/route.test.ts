import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, unknown>;
const st = vi.hoisted(() => ({
  deals: [] as Row[],
  subs: [] as Row[],
  sends: [] as Row[],
  events: [] as Row[],
  resendCalls: [] as { payload: Row[]; opts: Row }[],
  resendImpl: null as null | ((payload: Row[]) => Promise<unknown>),
  slack: [] as string[],
}));

vi.mock("@/lib/slack", () => ({ sendSlack: async (t: string) => void st.slack.push(t) }));
vi.mock("resend", () => ({
  Resend: class {
    batch = {
      send: async (payload: Row[], opts: Row) => {
        st.resendCalls.push({ payload, opts });
        return st.resendImpl!(payload);
      },
    };
  },
}));

// Minimalny fałszywy klient Supabase: łańcuch zapytań rozstrzyga się wg tabeli i operacji.
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from(table: string) {
      let op = "select";
      let payload: unknown;
      let head = false;
      const filters: Record<string, unknown> = {};
      const b: Record<string, unknown> = {};
      for (const m of ["eq", "lte", "not", "order", "range", "in", "is", "or"]) {
        b[m] = (col?: string, ...rest: unknown[]) => {
          if (m === "eq" && col) filters[col] = rest[0];
          if (m === "in" && col) filters[`in:${col}`] = rest[0];
          return b;
        };
      }
      b.select = (_c?: string, opts?: { head?: boolean }) => { head = !!opts?.head; return b; };
      b.upsert = (rows: unknown) => { op = "upsert"; payload = rows; return b; };
      b.update = (rows: unknown) => { op = "update"; payload = rows; return b; };
      b.delete = () => { op = "delete"; return b; };
      b.then = (res: (v: unknown) => unknown) => res(resolve());
      function resolve() {
        if (table === "drop_events") { st.events.push(...(payload as Row[])); return { error: null }; }
        if (table === "drop_deals") return { data: st.deals, error: null };
        if (table === "city_teasers") return { data: [], error: null };
        if (table === "newsletter_subscribers") return { data: st.subs, error: null };
        if (table === "drop_sends") {
          if (op === "upsert") {
            const fresh = (payload as Row[]).filter((r) => !st.sends.some((s) => s.subscriber_id === r.subscriber_id));
            st.sends.push(...fresh.map((r) => ({ ...r, sent_at: null, resend_id: null })));
            return { data: fresh.map((r) => ({ subscriber_id: r.subscriber_id })), error: null };
          }
          if (op === "delete") {
            const ids = filters["in:subscriber_id"] as string[];
            st.sends = st.sends.filter((s) => !ids.includes(s.subscriber_id as string));
            return { error: null };
          }
          if (op === "update") {
            const row = st.sends.find((s) => s.subscriber_id === filters.subscriber_id);
            Object.assign(row ?? {}, payload);
            return { error: null };
          }
          if (head) return { count: st.sends.filter((s) => s.sent_at == null).length, error: null };
          return { data: st.sends.map((s) => ({ subscriber_id: s.subscriber_id })), error: null };
        }
        return { data: [], error: null };
      }
      return b;
    },
  }),
}));

import { GET } from "./route";
import { weekKey } from "@/lib/drop/dates";

const week = weekKey(new Date());
const deal = {
  week, origin: "KRK", city_code: "MIL", city_name: "Mediolan", price: 199,
  departure_at: "2026-11-13T19:05:00+01:00", return_at: "2026-11-15T21:40:00+01:00",
  airline: "FR", transfers: 0, link: "/x", fetched_at: "2026-11-11T21:00:00Z",
};
const sub = (id: string) => ({ id, email: `${id}@example.com`, airports: ["KRK"], max_price: 300, unsubscribe_token: `t${id}` });
const req = (auth = "Bearer secret") => new Request("http://x/api/cron/drop-send", { headers: { authorization: auth } }) as never;
const types = () => st.events.map((e) => e.event);

beforeEach(() => {
  process.env.CRON_SECRET = "secret";
  process.env.RESEND_API_KEY = "re_dummy";
  Object.assign(st, { deals: [deal], subs: [sub("a"), sub("b")], sends: [], events: [], resendCalls: [], slack: [] });
  st.resendImpl = async (p) => ({ data: { data: p.map((_, i) => ({ id: `rid-${i}` })) }, error: null });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("cron drop-send (mock Resend, bez prawdziwych wywołań)", () => {
  it("bez sekretu 401 i brak wysyłki", async () => {
    expect((await GET(req("Bearer zle"))).status).toBe(401);
    expect(st.resendCalls).toHaveLength(0);
  });

  it("wysyła z List-Unsubscribe, zapisuje resend_id i podsumowanie", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(st.resendCalls).toHaveLength(1);
    const first = st.resendCalls[0].payload[0] as { headers: Record<string, string> };
    expect(first.headers["List-Unsubscribe"]).toContain("/api/drop/unsubscribe?token=");
    expect(first.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(st.sends.map((s) => s.resend_id)).toEqual(["rid-0", "rid-1"]);
    const summary = st.events.find((e) => e.event === "run_summary")!;
    expect(summary.detail).toMatchObject({ sent: 2, errors: 0, pendingReservations: 0 });
  });

  it("drugie uruchomienie nie wysyła drugi raz (idempotencja)", async () => {
    await GET(req());
    const res = await GET(req());
    expect(st.resendCalls).toHaveLength(1);
    expect((await res.json()).sent).toBe(0);
  });

  it("odrzucony adres zwalnia rezerwację i trafia do dziennika", async () => {
    st.resendImpl = async () => ({ data: { data: [{ id: "rid-0" }], errors: [{ index: 1, message: "invalid to" }] }, error: null });
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(types()).toContain("send_rejected");
    expect(st.sends.map((s) => s.subscriber_id)).toEqual(["a"]);
  });

  it("limit dzienny: zwalnia rezerwacje, nie ponawia, loguje send_failed", async () => {
    st.resendImpl = async () => ({ data: null, error: { name: "daily_quota_exceeded", message: "quota", statusCode: 429 } });
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(st.resendCalls).toHaveLength(1);
    expect(st.sends).toHaveLength(0);
    expect(types()).toContain("send_failed");
  });

  it("błąd 5xx: rezerwacje zostają (brak ryzyka podwójnej wysyłki), jest send_uncertain i licznik w Slacku", async () => {
    st.resendImpl = async () => ({ data: null, error: { name: "application_error", message: "boom", statusCode: 500 } });
    await GET(req());
    expect(st.sends).toHaveLength(2);
    expect(types().filter((t) => t === "send_uncertain")).toHaveLength(2);
    expect(st.slack.join(" ")).toContain("rezerwacje bez sent_at: 2");
    st.resendCalls.length = 0;
    await GET(req());
    expect(st.resendCalls).toHaveLength(0);
  });

  it("wyjątek z Resend nie przerywa crona i jest 'nie wiadomo'", async () => {
    st.resendImpl = async () => { throw new Error("network"); };
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(types()).toContain("send_uncertain");
  });
});
