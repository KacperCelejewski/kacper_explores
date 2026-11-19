import { describe, it, expect } from "vitest";
import { dropAttributionFromParams, dropEventName, rememberDropAttribution, takeDropPlanAttribution } from "./attribution";

const p = (q: string) => new URLSearchParams(q);
function store() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}
const email = "src=drop&city=Rzym&utm_source=drop&utm_medium=email&utm_campaign=2026-W47";

describe("dropAttributionFromParams", () => {
  it("czyta tydzień, medium i miasto z linku z maila", () => {
    expect(dropAttributionFromParams(p(email), "s1")).toEqual({ week: "2026-W47", medium: "email", city: "Rzym", sessionId: "s1" });
  });
  it("odrzuca inne src, zły tydzień i brak miasta", () => {
    expect(dropAttributionFromParams(p(email.replace("src=drop", "src=x")), "s")).toBeNull();
    expect(dropAttributionFromParams(p(email.replace("2026-W47", "x;drop")), "s")).toBeNull();
    expect(dropAttributionFromParams(p("src=drop&utm_campaign=2026-W47"), "s")).toBeNull();
  });
  it("nieznane medium to other", () => {
    expect(dropAttributionFromParams(p(email.replace("email", "evil")), "s")?.medium).toBe("other");
  });
});

describe("plan z atrybucją", () => {
  const attr = { week: "2026-W47", medium: "email" as const, city: "Rzym", sessionId: "s1" };
  it("nazwa zdarzenia", () => expect(dropEventName("plan", attr)).toBe("drop_plan:email:2026-W47"));
  it("liczy plan raz, tylko dla miasta z maila", () => {
    const s = store();
    rememberDropAttribution(s, attr);
    expect(takeDropPlanAttribution(s, "Barcelona")).toBeNull();
    expect(takeDropPlanAttribution(s, " rzym ")).toEqual(attr);
    expect(takeDropPlanAttribution(s, "Rzym")).toBeNull();
  });
  it("uszkodzony zapis i brak storage nie rzucają", () => {
    const s = store();
    s.setItem("wloczykij:drop-attribution", "{nie json");
    expect(takeDropPlanAttribution(s, "Rzym")).toBeNull();
    expect(takeDropPlanAttribution(null, "Rzym")).toBeNull();
  });
});
