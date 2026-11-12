import { describe, expect, it } from "vitest";
import { getClientIp, validateDestination, validateQuizAnswers, validatePlan } from "./validate";

describe("validateQuizAnswers", () => {
  it("accepts a complete, valid quiz", () => {
    expect(
      validateQuizAnswers({
        budget: "low",
        styles: ["food", "history"],
        vibe: "chill",
        placeType: "charming",
        month: 6,
        duration: 4,
        airports: ["WRO", "KRK"],
      }),
    ).toBe(true);
  });

  it("accepts a partial quiz", () => {
    expect(validateQuizAnswers({ budget: "medium" })).toBe(true);
  });

  it.each([
    ["non-object input", null],
    ["unknown budget", { budget: "luxury" }],
    ["unknown style", { styles: ["shopping"] }],
    ["styles not an array", { styles: "food" }],
    ["month out of range", { month: 13 }],
    ["fractional duration", { duration: 3.5 }],
    ["duration above max", { duration: 22 }],
    ["empty airport list", { airports: [] }],
    ["unsupported airport", { airports: ["JFK"] }],
  ])("rejects %s", (_, input) => {
    expect(validateQuizAnswers(input)).toBe(false);
  });
});

describe("validateDestination", () => {
  it("accepts a city and country", () => {
    expect(validateDestination({ city: "Lizbona", country: "Portugalia" })).toBe(true);
  });

  it("rejects missing fields and oversized strings", () => {
    expect(validateDestination({ city: "Lizbona" })).toBe(false);
    expect(validateDestination({ city: "x".repeat(61), country: "PT" })).toBe(false);
  });
});

describe("getClientIp", () => {
  it("takes the first address from x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });

    expect(getClientIp(req)).toBe("203.0.113.7");
  });

  it("falls back to 'unknown' without the header", () => {
    expect(getClientIp(new Request("https://example.com"))).toBe("unknown");
  });
});

describe("validatePlan", () => {
  const activity = {
    time: "10:00",
    title: "Stare Miasto",
    description: "Spacer",
    type: "attraction",
    cost: "Free",
    emoji: "📍",
  };
  const plan = (days: unknown[] = [{ day: 1, date: "Dzień 1", theme: "Centrum", activities: [activity] }]) => ({
    city: "Lizbona",
    country: "Portugalia",
    duration: days.length,
    days,
  });

  it("accepts a normal plan", () => {
    expect(validatePlan(plan())).toBe(true);
  });

  it("accepts activities without optional fields, like the ones Gemini sometimes returns", () => {
    expect(validatePlan(plan([{ day: 1, date: "Dzień 1", theme: "x", activities: [{ time: "09:00", title: "Kawa" }] }]))).toBe(true);
  });

  it("rejects non-objects and plans without days", () => {
    expect(validatePlan(null)).toBe(false);
    expect(validatePlan("plan")).toBe(false);
    expect(validatePlan({ city: "x" })).toBe(false);
    expect(validatePlan(plan([]))).toBe(false);
  });

  it("rejects more than 21 days", () => {
    const days = Array.from({ length: 22 }, (_, i) => ({ day: i + 1, date: "d", theme: "t", activities: [activity] }));
    expect(validatePlan(plan(days))).toBe(false);
  });

  it("rejects a day whose activities are not an array", () => {
    expect(validatePlan(plan([{ day: 1, date: "d", theme: "t", activities: "brak" }]))).toBe(false);
  });

  it("rejects too many activities in one day", () => {
    const many = Array.from({ length: 41 }, () => activity);
    expect(validatePlan(plan([{ day: 1, date: "d", theme: "t", activities: many }]))).toBe(false);
  });

  it("rejects activities with a missing or non-string title or time", () => {
    expect(validatePlan(plan([{ day: 1, date: "d", theme: "t", activities: [{ time: "09:00" }] }]))).toBe(false);
    expect(validatePlan(plan([{ day: 1, date: "d", theme: "t", activities: [{ time: 9, title: "x" }] }]))).toBe(false);
    expect(validatePlan(plan([{ day: 1, date: "d", theme: "t", activities: [{ time: "09:00", title: { a: 1 } }] }]))).toBe(false);
  });

  it("rejects over-long text fields", () => {
    const long = "x".repeat(2001);
    expect(validatePlan(plan([{ day: 1, date: "d", theme: "t", activities: [{ ...activity, description: long }] }]))).toBe(false);
    expect(validatePlan(plan([{ day: 1, date: "d", theme: "t", activities: [{ ...activity, title: "x".repeat(301) }] }]))).toBe(false);
  });

  it("rejects a plan that is huge as a whole", () => {
    const big = { ...plan(), junk: "x".repeat(250_000) };
    expect(validatePlan(big)).toBe(false);
  });
});
