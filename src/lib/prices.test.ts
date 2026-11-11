import { describe, expect, it } from "vitest";
import { planPrice } from "./prices";

describe("planPrice", () => {
  it("returns the gross PLN amount for each plan key", () => {
    expect(planPrice("pack_5")).toBe(14.99);
    expect(planPrice("pro_monthly")).toBe(19.99);
    expect(planPrice("pro_yearly")).toBe(149.99);
  });

  it("returns undefined for an unknown key", () => {
    expect(planPrice("nope")).toBeUndefined();
  });
});
