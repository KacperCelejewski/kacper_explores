import { describe, expect, it } from "vitest";
import { BRAND_MARK_DATA_URI, BRAND_MARK_RATIO } from "./brandMark";

describe("brandMark", () => {
  it("składa się mimo polskich znaków w opisie SVG", () => {
    expect(BRAND_MARK_DATA_URI.startsWith("data:image/svg+xml,")).toBe(true);
    expect(decodeURIComponent(BRAND_MARK_DATA_URI.split(",")[1])).toContain("Włóczykij");
  });
  it("proporcje odpowiadają viewBox 186 × 296", () => {
    expect(BRAND_MARK_RATIO).toBeCloseTo(186 / 296, 5);
  });
});
