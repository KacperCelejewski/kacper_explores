import { describe, expect, it } from "vitest";
import { FEATURES, isOn, type FeatureKey } from "./features";

describe("features", () => {
  it("ma wszystkie klucze wyłączone, bo części 2–6 jeszcze nie istnieją", () => {
    const keys: FeatureKey[] = ["invites", "datePoll", "groupFlights", "groupPlan", "settlements", "tripMap"];
    for (const k of keys) expect(FEATURES[k]).toBe(false);
  });

  it("isOn zwraca wartość z FEATURES", () => {
    expect(isOn("invites")).toBe(FEATURES.invites);
  });
});
