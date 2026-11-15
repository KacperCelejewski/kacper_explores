import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Karty kierunków nie mają cen lotów (Gemini ich nie zna), więc quiz nie może ich obiecywać.
describe("quiz promise", () => {
  const source = readFileSync(join(__dirname, "page.tsx"), "utf8");

  it("does not promise real flight prices on the destination cards", () => {
    expect(source).not.toMatch(/prawdziwe ceny lotów/i);
  });

  it("still tells what the quiz ends with", () => {
    expect(source).toContain("Na końcu: kierunki w Twoim budżecie");
  });
});
