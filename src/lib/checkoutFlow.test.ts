import { describe, expect, it } from "vitest";
import { checkoutErrorMessage, safeReturnPath, successUrl } from "./checkoutFlow";

describe("safeReturnPath", () => {
  it("accepts in-app paths", () => {
    expect(safeReturnPath("/plan/porto-123")).toBe("/plan/porto-123");
  });
  it("rejects other hosts, protocol-relative and backslash paths", () => {
    expect(safeReturnPath("https://evil.com")).toBeNull();
    expect(safeReturnPath("//evil.com")).toBeNull();
    expect(safeReturnPath("/\\evil.com")).toBeNull();
    expect(safeReturnPath(undefined)).toBeNull();
    expect(safeReturnPath(42)).toBeNull();
  });
});

describe("successUrl", () => {
  it("sends the buyer back to the plan after paying", () => {
    expect(successUrl("https://wloczykij.me", "/plan/porto-123")).toBe(
      "https://wloczykij.me/payment/success?session_id={CHECKOUT_SESSION_ID}&return=%2Fplan%2Fporto-123",
    );
  });
  it("has no return link when they came from pricing or nowhere", () => {
    expect(successUrl("https://wloczykij.me", null)).toBe(
      "https://wloczykij.me/payment/success?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(successUrl("https://wloczykij.me", "/pricing")).toBe(
      "https://wloczykij.me/payment/success?session_id={CHECKOUT_SESSION_ID}",
    );
  });
});

describe("checkoutErrorMessage", () => {
  it("shows the server's own message for rate limits and bad requests", () => {
    expect(checkoutErrorMessage(429, { error: "Za dużo prób. Spróbuj za chwilę." })).toBe("Za dużo prób. Spróbuj za chwilę.");
    expect(checkoutErrorMessage(400, { error: "Nieprawidłowy plan." })).toBe("Nieprawidłowy plan.");
  });
  it("keeps a generic line for server errors and unreadable bodies", () => {
    expect(checkoutErrorMessage(500, { error: "stripe: No such price: price_123" })).toMatch(/Płatność się nie otworzyła/);
    expect(checkoutErrorMessage(502, null)).toMatch(/Płatność się nie otworzyła/);
    expect(checkoutErrorMessage(200, {})).toMatch(/Płatność się nie otworzyła/);
  });
});
