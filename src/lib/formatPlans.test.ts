import { describe, expect, it } from "vitest";
import { formatPlans } from "./formatPlans";

describe("formatPlans", () => {
  it.each([
    [0, "0 planów"],
    [1, "1 plan"],
    [2, "2 plany"],
    [4, "4 plany"],
    [5, "5 planów"],
    [12, "12 planów"],
    [14, "14 planów"],
    [22, "22 plany"],
  ])("%i → %s", (n, expected) => {
    expect(formatPlans(n)).toBe(expected);
  });
});
