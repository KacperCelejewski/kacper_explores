import { describe, expect, it } from "vitest";
import { BRAND_MARK_DATA_URI, BRAND_MARK_RATIO } from "./brandMark";

describe("brandMark", () => {
  it("jest poprawnym base64 z samego ASCII (btoa nie znosi znaków spoza Latin-1)", () => {
    expect(BRAND_MARK_DATA_URI.startsWith("data:image/svg+xml;base64,")).toBe(true);
    const svg = atob(BRAND_MARK_DATA_URI.split(",")[1]);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(/^[\x00-\x7F]*$/.test(svg)).toBe(true);
  });
  it("proporcje odpowiadają viewBox 186 × 296", () => {
    expect(BRAND_MARK_RATIO).toBeCloseTo(186 / 296, 5);
  });
});
