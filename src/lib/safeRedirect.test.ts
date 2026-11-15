import { describe, it, expect } from "vitest";
import { safeNextPath } from "./safeRedirect";

describe("safeNextPath", () => {
  it("przepuszcza ścieżki wewnętrzne razem z zapytaniem i hashem", () => {
    expect(safeNextPath("/plan/abc")).toBe("/plan/abc");
    expect(safeNextPath("/quiz?afterLogin=1&x=y")).toBe("/quiz?afterLogin=1&x=y");
    expect(safeNextPath("/pricing#pro")).toBe("/pricing#pro");
  });

  it.each([
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r/evil.example",
    "\\\\evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "evil.example",
    "",
    "/%09/evil.example/../..//evil.example".replace("%09", "\t"),
    "/a\u0000b",
    "/ /evil.example",
  ])("odrzuca %j", (raw) => {
    expect(safeNextPath(raw)).toBe("/");
  });

  it("używa podanej wartości zapasowej", () => {
    expect(safeNextPath("//evil.example", "/pricing")).toBe("/pricing");
    expect(safeNextPath(null, "/pricing")).toBe("/pricing");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(42 as unknown)).toBe("/");
  });

  it("nie zmienia hosta po sparsowaniu", () => {
    for (const raw of ["/@evil.example", "/.//evil.example", "/..//evil.example"]) {
      const out = safeNextPath(raw);
      expect(new URL(out, "https://wloczykij.me").origin).toBe("https://wloczykij.me");
    }
  });
});
