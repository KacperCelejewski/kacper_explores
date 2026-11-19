import { describe, it, expect } from "vitest";
import { makeTripId, tripIdCandidates } from "./tripId";

describe("tripId", () => {
  it("tworzy id ASCII bez polskich znaków i nawiasów", () => {
    expect(makeTripId("Tenerife (Południe)", 1)).toBe("tenerife-poludnie-1");
    expect(makeTripId("Łódź", 2)).toBe("lodz-2");
    expect(makeTripId("???", 3)).toBe("plan-3");
  });
  it("podaje postać surową i zdekodowaną", () => {
    expect(tripIdCandidates("tenerife-(po%C5%82udnie)-1")).toEqual(["tenerife-(po%C5%82udnie)-1", "tenerife-(południe)-1"]);
    expect(tripIdCandidates("rzym-1")).toEqual(["rzym-1"]);
    expect(tripIdCandidates("%E0%A4%A")).toEqual(["%E0%A4%A"]);
  });
});
