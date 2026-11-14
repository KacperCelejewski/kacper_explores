import { describe, expect, it } from "vitest";
import { VISITED_KEY, loadVisited, saveVisited, toggleVisited, type KeyValueStorage } from "./storage";

function fake(initial: string | null): KeyValueStorage & { saved: Record<string, string> } {
  const saved: Record<string, string> = {};
  return {
    saved,
    getItem: (k) => (k === VISITED_KEY ? initial : null),
    setItem: (k, v) => { saved[k] = v; },
  };
}

describe("loadVisited", () => {
  it("returns a valid list without duplicates", () => {
    expect(loadVisited(fake('["PL","DE","PL"]'))).toEqual(["PL", "DE"]);
  });

  it("returns an empty list for anything that is not a list", () => {
    for (const raw of ["nie json", "42", '{"a":1}', "null", null]) expect(loadVisited(fake(raw))).toEqual([]);
  });

  it("keeps only known country codes", () => {
    expect(loadVisited(fake('["PL","XX",5,null,"GL"]'))).toEqual(["PL"]);
  });

  it("never throws when the storage is blocked", () => {
    const blocked: KeyValueStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => {} };
    expect(loadVisited(blocked)).toEqual([]);
    expect(loadVisited(null)).toEqual([]);
  });
});

describe("saveVisited", () => {
  it("writes the list as JSON under the visited key", () => {
    const s = fake(null);
    expect(saveVisited(["PL", "DE"], s)).toBe(true);
    expect(s.saved[VISITED_KEY]).toBe('["PL","DE"]');
  });

  it("returns false when the write fails", () => {
    const blocked: KeyValueStorage = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    expect(saveVisited(["PL"], blocked)).toBe(false);
    expect(saveVisited(["PL"], null)).toBe(false);
  });
});

describe("toggleVisited", () => {
  it("adds a missing country and removes a present one", () => {
    expect(toggleVisited(["PL"], "DE")).toEqual(["PL", "DE"]);
    expect(toggleVisited(["PL", "DE"], "PL")).toEqual(["DE"]);
  });

  it("ignores a code outside the list, like a dependent territory", () => {
    expect(toggleVisited(["PL"], "GL")).toEqual(["PL"]);
    expect(toggleVisited(["PL"], "zz")).toEqual(["PL"]);
  });
});
