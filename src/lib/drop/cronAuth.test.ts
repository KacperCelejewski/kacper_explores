import { describe, it, expect, afterEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import { isAuthorizedCron } from "./cronAuth";

const req = (auth?: string) =>
  ({ headers: new Headers(auth ? { authorization: auth } : {}) }) as unknown as NextRequest;

afterEach(() => vi.unstubAllEnvs());

describe("isAuthorizedCron", () => {
  it("odrzuca każde żądanie, gdy CRON_SECRET nie jest ustawiony", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isAuthorizedCron(req())).toBe(false);
    expect(isAuthorizedCron(req("Bearer undefined"))).toBe(false);
    expect(isAuthorizedCron(req("Bearer "))).toBe(false);
  });

  it("odrzuca błędny lub brakujący Bearer", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isAuthorizedCron(req())).toBe(false);
    expect(isAuthorizedCron(req("Bearer nope"))).toBe(false);
    expect(isAuthorizedCron(req("s3cret"))).toBe(false);
  });

  it("przepuszcza poprawny Bearer", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isAuthorizedCron(req("Bearer s3cret"))).toBe(true);
  });
});
