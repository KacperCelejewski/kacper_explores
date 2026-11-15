import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FREE_PLANS_PER_MONTH } from "./credits";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

// Fakty, które marketing cytuje: 2 darmowe plany miesięcznie i 6 kierunków z quizu.
describe("spójność faktów produktu", () => {
  it("darmowe plany: kod, PRODUCT.md, README i FAQ mówią o 2 miesięcznie", () => {
    expect(FREE_PLANS_PER_MONTH).toBe(2);
    expect(read("PRODUCT.md")).toContain("2 free plans per month");
    expect(read("README.md")).toContain("2 free plans per month");
    expect(read("src/app/components/HomeFAQ.tsx")).toMatch(/[Dd]wa plany w miesiącu/);
    expect(read("PRODUCT.md")).not.toMatch(/5 free (plans|credits)/i);
  });

  it("kierunki: prompt prosi o dokładnie 6, PRODUCT.md mówi o sześciu", () => {
    const route = read("src/app/api/destinations/route.ts");
    expect(route).toContain("DOKŁADNIE 6 destynacji");
    expect(route).toContain("dokładnie 6 obiektami");
    expect(read("PRODUCT.md")).toContain("six destinations");
    expect(read("PRODUCT.md")).not.toMatch(/\bthree destinations\b|\b3 destinations\b/i);
  });
});
