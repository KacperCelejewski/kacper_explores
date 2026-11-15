import { describe, it, expect, vi } from "vitest";
import { readJsonBody, serverError, GENERIC_SERVER_ERROR } from "./http";

const req = (body: string, headers: Record<string, string> = {}) =>
  new Request("http://x/api", { method: "POST", body, headers }) as never;

describe("readJsonBody", () => {
  it("czyta poprawny JSON w limicie", async () => {
    const r = await readJsonBody(req('{"a":1}'), 100);
    expect(r).toEqual({ ok: true, body: { a: 1 } });
  });

  it("zwraca 400 dla niepoprawnego JSON-a", async () => {
    const r = await readJsonBody(req("{nope"), 100);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });

  it("zwraca 413, gdy Content-Length przekracza limit", async () => {
    const r = await readJsonBody(req("x".repeat(50), { "content-length": "5000" }), 100);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(413);
  });

  it("zwraca 413 także gdy nagłówek kłamie, a strumień jest za duży", async () => {
    const r = await readJsonBody(req(JSON.stringify({ a: "x".repeat(500) }), { "content-length": "10" }), 100);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(413);
  });

  it("zwraca 400 dla pustego body", async () => {
    const r = await readJsonBody(req(""), 100);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });
});

describe("serverError", () => {
  it("loguje szczegóły, a klientowi oddaje stały komunikat", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = serverError("chat", new Error("API key AIza... invalid for https://generativelanguage.googleapis.com"));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: GENERIC_SERVER_ERROR });
    expect(text).not.toContain("AIza");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
