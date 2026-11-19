import { describe, it, expect, vi, afterEach } from "vitest";
import { classifyClickLink, logDropEvents, mapResendEvent, scrubDetail } from "./events";

afterEach(() => vi.restoreAllMocks());

function db(error: { code?: string; message: string } | null) {
  const upsert = vi.fn(async () => ({ error }));
  return { upsert, client: { from: vi.fn(() => ({ upsert })) } };
}

describe("logDropEvents", () => {
  it("loguje linię i zapisuje z deduplikacją po source_id", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const d = db(null);
    const r = await logDropEvents(d.client, [{ event: "delivered", week: "2026-W47", source_id: "resend:x" }]);
    expect(r.stored).toBe(true);
    expect(log.mock.calls[0][0]).toContain("[drop-event]");
    expect(d.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ event: "delivered", week: "2026-W47", source_id: "resend:x", subscriber_id: null })],
      { onConflict: "source_id", ignoreDuplicates: true },
    );
  });

  it("brak tabeli nie rzuca i nie hałasuje błędem", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await logDropEvents(db({ code: "42P01", message: "no table" }).client, [{ event: "unsubscribed" }]);
    expect(r.stored).toBe(false);
    expect(err).not.toHaveBeenCalled();
  });

  it("wyjątek bazy nie rzuca", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const client = { from: () => { throw new Error("boom"); } };
    await expect(logDropEvents(client, [{ event: "unsubscribed" }])).resolves.toEqual({ stored: false });
  });
});

describe("classifyClickLink", () => {
  it("rozpoznaje rodzaje linków", () => {
    expect(classifyClickLink("https://wloczykij.me/quiz?src=drop")).toBe("plan");
    expect(classifyClickLink("https://www.aviasales.com/search/X?marker=1")).toBe("price");
    expect(classifyClickLink("https://wloczykij.me/zrzut/ustawienia?token=t")).toBe("settings");
    expect(classifyClickLink("https://wloczykij.me/api/drop/unsubscribe?token=t")).toBe("unsubscribe");
    expect(classifyClickLink("nie url")).toBe("other");
    expect(classifyClickLink(undefined)).toBe("other");
  });
});

describe("mapResendEvent", () => {
  it("mapuje dostarczenie z kluczem deduplikacji i bez adresu", () => {
    const m = mapResendEvent({ type: "email.delivered", data: { email_id: "r1", to: ["a@b.pl"] } }, "msg_1");
    expect(m).toEqual({ event: "delivered", resend_id: "r1", source_id: "resend:msg_1", detail: {} });
    expect(JSON.stringify(m)).not.toContain("a@b.pl");
  });

  it("klik zapisuje tylko rodzaj linku", () => {
    const m = mapResendEvent(
      { type: "email.clicked", data: { email_id: "r1", click: { link: "https://wloczykij.me/quiz?token=sekret" } } },
      "m",
    );
    expect(m?.detail).toEqual({ link_kind: "plan" });
  });

  it("zapisuje typ odbicia", () => {
    expect(mapResendEvent({ type: "email.bounced", data: { email_id: "r", bounce: { type: "Permanent" } } }, "m")?.detail)
      .toEqual({ bounce_type: "Permanent" });
  });

  it("pomija otwarcia, nieznane typy i zdarzenia bez email_id", () => {
    expect(mapResendEvent({ type: "email.opened", data: { email_id: "r" } }, "m")).toBeNull();
    expect(mapResendEvent({ type: "email.delivered", data: {} }, "m")).toBeNull();
  });
});

describe("scrubDetail", () => {
  it("maskuje adresy w tekstach błędów i skraca", () => {
    const d = scrubDetail({ message: "invalid to: jan.kowalski@example.com (rejected)", n: 3, long: "x".repeat(500) });
    expect(d.message).toBe("invalid to: [email] (rejected)");
    expect(d.n).toBe(3);
    expect((d.long as string).length).toBe(300);
  });
  it("logDropEvents nie zapisuje adresu z detail", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const d = db(null);
    await logDropEvents(d.client, [{ event: "send_failed", detail: { message: "bad a@b.pl" } }]);
    expect(JSON.stringify(d.upsert.mock.calls)).not.toContain("a@b.pl");
  });
});
