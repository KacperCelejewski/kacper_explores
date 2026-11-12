import { describe, expect, it } from "vitest";
import { dropOrigins } from "./origins";

describe("dropOrigins", () => {
  it("fetches every Polish airport even when nobody subscribed", () => {
    expect(dropOrigins([]).sort()).toEqual(["GDN", "KRK", "KTW", "POZ", "WAW", "WMI", "WRO"]);
  });

  it("puts subscribers' airports first so they win when the time budget runs out", () => {
    const origins = dropOrigins([["GDN"], ["WRO", "KTW"]]);
    expect(origins.slice(0, 3)).toEqual(["GDN", "WRO", "KTW"]);
  });

  it("does not repeat an airport", () => {
    const origins = dropOrigins([["WRO"], ["WRO", "KRK"]]);
    expect(new Set(origins).size).toBe(origins.length);
  });

  it("keeps a subscriber's hub airport after the Polish ones are not required before it", () => {
    const origins = dropOrigins([["BER"]]);
    expect(origins[0]).toBe("BER");
    expect(origins).toContain("WRO");
  });

  it("ignores empty or missing airport lists", () => {
    expect(dropOrigins([[], null as unknown as string[]]).length).toBe(7);
  });
});
