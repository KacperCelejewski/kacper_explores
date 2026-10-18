import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rateLimit";

const HOUR = 60 * 60 * 1000;

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit and reports what is left", () => {
    const key = `test:${crypto.randomUUID()}`;

    expect(checkRateLimit(key, 2, HOUR)).toMatchObject({ allowed: true, remaining: 1 });
    expect(checkRateLimit(key, 2, HOUR)).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("blocks once the limit is reached and says when to retry", () => {
    const key = `test:${crypto.randomUUID()}`;
    checkRateLimit(key, 1, HOUR);

    vi.advanceTimersByTime(10 * 60 * 1000);
    const result = checkRateLimit(key, 1, HOUR);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetInSeconds).toBe(50 * 60);
  });

  it("frees a slot once the oldest request leaves the sliding window", () => {
    const key = `test:${crypto.randomUUID()}`;
    checkRateLimit(key, 1, HOUR);

    vi.advanceTimersByTime(HOUR + 1);

    expect(checkRateLimit(key, 1, HOUR).allowed).toBe(true);
  });

  it("keeps separate budgets per key", () => {
    const a = `test:${crypto.randomUUID()}`;
    const b = `test:${crypto.randomUUID()}`;
    checkRateLimit(a, 1, HOUR);

    expect(checkRateLimit(b, 1, HOUR).allowed).toBe(true);
  });
});
