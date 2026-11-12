import { describe, expect, it } from "vitest";
import { redirectsToCanonical } from "./canonicalHost";

describe("redirectsToCanonical", () => {
  it("sends visitors of the vercel.app address to the real domain", () => {
    expect(redirectsToCanonical("kacper-explores-abc123.vercel.app", "/pricing")).toBe(true);
    expect(redirectsToCanonical("kacper-explores.vercel.app", "/")).toBe(true);
  });

  it("leaves the real domain alone", () => {
    expect(redirectsToCanonical("wloczykij.me", "/pricing")).toBe(false);
    expect(redirectsToCanonical("localhost:3000", "/")).toBe(false);
  });

  it("does not redirect cron calls: Vercel calls the deployment address and a 301 means the job never runs", () => {
    expect(redirectsToCanonical("kacper-explores-nr8pyb9tu-kacpercelejewskis-projects.vercel.app", "/api/cron/drop-prepare")).toBe(false);
    expect(redirectsToCanonical("kacper-explores.vercel.app", "/api/cron/pre-trip-email")).toBe(false);
  });

  it("does not widen the exception to look-alike paths", () => {
    expect(redirectsToCanonical("kacper-explores.vercel.app", "/api/cronx")).toBe(true);
    expect(redirectsToCanonical("kacper-explores.vercel.app", "/api/cron")).toBe(true);
    expect(redirectsToCanonical("kacper-explores.vercel.app", "/api/webhook")).toBe(true);
  });
});
