import { describe, expect, it } from "vitest";
import { getClientIp, validateDestination, validateQuizAnswers } from "./validate";

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
