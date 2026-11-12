import { describe, expect, it } from "vitest";
import { AI_CALLS_PER_DAY, AI_CALLS_PER_DAY_PRO, GLOBAL_FREE_AI_CALLS_PER_DAY, dailyLimitFor, evaluateAiGuard } from "./aiGuard";

describe("dailyLimitFor", () => {
  it("gives Pro a higher daily limit than a free account", () => {
    expect(dailyLimitFor(false)).toBe(AI_CALLS_PER_DAY);
    expect(dailyLimitFor(true)).toBe(AI_CALLS_PER_DAY_PRO);
    expect(AI_CALLS_PER_DAY_PRO).toBeGreaterThan(AI_CALLS_PER_DAY);
  });
});

describe("evaluateAiGuard", () => {
  it("allows a call under every limit", () => {
    expect(evaluateAiGuard({ isPro: false, globalCalls24h: 10, consumed: true })).toEqual({ allow: true });
  });

  it("stops free accounts when the global fuse is tripped, before touching the daily counter", () => {
    const res = evaluateAiGuard({ isPro: false, globalCalls24h: GLOBAL_FREE_AI_CALLS_PER_DAY, consumed: true });
    expect(res).toMatchObject({ allow: false, status: 503, code: "AI_BUSY" });
  });

  it("lets Pro through when the global fuse is tripped", () => {
    expect(evaluateAiGuard({ isPro: true, globalCalls24h: GLOBAL_FREE_AI_CALLS_PER_DAY * 3, consumed: true })).toEqual({ allow: true });
  });

  it("refuses with 429 when the account's daily limit is used up", () => {
    const res = evaluateAiGuard({ isPro: false, globalCalls24h: 10, consumed: false });
    expect(res).toMatchObject({ allow: false, status: 429, code: "AI_DAILY_LIMIT" });
  });

  it("tells a free account that Pro lifts the limit, and does not tell Pro the same", () => {
    const free = evaluateAiGuard({ isPro: false, globalCalls24h: 0, consumed: false });
    const pro = evaluateAiGuard({ isPro: true, globalCalls24h: 0, consumed: false });
    expect(free.allow === false && free.error).toMatch(/Pro/);
    expect(pro.allow === false && pro.error).not.toMatch(/przejdź na Pro/);
  });

  it("treats an unknown global count as under the fuse", () => {
    expect(evaluateAiGuard({ isPro: false, globalCalls24h: null, consumed: true })).toEqual({ allow: true });
  });
});
