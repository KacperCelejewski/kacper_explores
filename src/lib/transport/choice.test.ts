import { describe, expect, it } from "vitest";
import type { DestinationRecommendation, QuizAnswers, TravelEstimate } from "@/types";
import { cardTransport, planChoices, withPlanTransport } from "./choice";

const est = (mode: TravelEstimate["mode"]): TravelEstimate => ({ mode, distanceKm: 290, hours: 4, costFrom: 100, costTo: 140 });
const dest = (travel?: TravelEstimate[]): Pick<DestinationRecommendation, "travel"> => ({ travel });
const quiz = (transport?: QuizAnswers["transport"]): QuizAnswers => ({
  budget: "low", vibe: "chill", styles: [], placeType: null, month: 6, duration: 3, airports: ["WRO"], companion: "solo", ...(transport ? { transport } : {}),
});

describe("karty kierunków a wybrany środek", () => {
  it("brak wyboru i sam samolot: karta lotu jak dziś, bez dojazdu", () => {
    for (const t of [undefined, ["samolot"] as const]) {
      expect(cardTransport(quiz(t ? [...t] : undefined), dest())).toEqual({ showFlight: true, travel: [] });
    }
  });
  it("bez samolotu: karta lotu ukryta, dojazd pokazany", () => {
    const c = cardTransport(quiz(["auto"]), dest([est("auto")]));
    expect(c.showFlight).toBe(false);
    expect(c.travel.map((t) => t.mode)).toEqual(["auto"]);
  });
  it("pokazuje tylko dojazd wybranych środków", () => {
    expect(cardTransport(quiz(["rower"]), dest([est("auto"), est("rower")])).travel.map((t) => t.mode)).toEqual(["rower"]);
  });
  it("samolot razem z autem: obie rzeczy", () => {
    const c = cardTransport(quiz(["samolot", "auto"]), dest([est("auto")]));
    expect(c.showFlight).toBe(true);
    expect(c.travel).toHaveLength(1);
  });
});

describe("środek planu", () => {
  it("jeden możliwy środek: bez wyboru", () => {
    expect(planChoices(quiz(), dest())).toEqual(["samolot"]);
    expect(planChoices(quiz(["auto"]), dest([est("auto")]))).toEqual(["auto"]);
  });
  it("kilka możliwych: samolot pierwszy, potem lądowe", () => {
    expect(planChoices(quiz(["rower", "samolot", "auto"]), dest([est("auto"), est("rower")]))).toEqual(["samolot", "auto", "rower"]);
  });
  it("miejsce spoza listy bez dojazdu zostaje przy pierwszym wybranym środku", () => {
    expect(planChoices(quiz(["auto"]), dest())).toEqual(["auto"]);
  });
  it("withPlanTransport: samolot bez wyboru zostaje bez zmian, reszta dostaje jeden środek", () => {
    const q = quiz();
    expect(withPlanTransport(q, "samolot")).toBe(q);
    expect(withPlanTransport(quiz(["samolot"]), "samolot")).toEqual(quiz(["samolot"]));
    expect(withPlanTransport(quiz(["samolot", "auto"]), "auto").transport).toEqual(["auto"]);
    expect(withPlanTransport(quiz(["samolot", "auto"]), "samolot").transport).toEqual(["samolot"]);
    expect(withPlanTransport(quiz(), "rower").transport).toEqual(["rower"]);
  });
});

import { withTravelBudget } from "./plan";
import type { TripPlan } from "@/types";

describe("podział kosztów planu", () => {
  const plan: TripPlan = {
    city: "Praga", country: "Czechy", duration: 3, totalBudgetEstimate: "1000 PLN",
    budgetBreakdown: { flights: "Sprawdź w wyszukiwarce", accommodation: "300 PLN", food: "200 PLN", attractions: "100 PLN" },
    generalTips: [], days: [],
  };
  it("samolot i brak wyboru: plan bez zmian", () => {
    expect(withTravelBudget(plan, quiz(), "Praga")).toBe(plan);
    expect(withTravelBudget(plan, quiz(["samolot"]), "Praga")).toBe(plan);
  });
  it("auto: pozycja dojazdu to nasz szacunek, reszta bez zmian", () => {
    const out = withTravelBudget(plan, quiz(["auto"]), "Praga");
    expect(out.budgetBreakdown.flights).toMatch(/^Auto: paliwo ok\. \d+–\d+ zł za auto w obie strony \(szacunek\)$/);
    expect(out.budgetBreakdown.accommodation).toBe("300 PLN");
    expect(out.totalBudgetEstimate).toBe("1000 PLN");
  });
  it("miasto spoza listy: bez liczby, z prośbą o sprawdzenie trasy", () => {
    expect(withTravelBudget(plan, quiz(["pociag_bus"]), "Nieznane").budgetBreakdown.flights).toMatch(/sprawdź/);
  });
});

import { readFileSync } from "node:fs";
import { PLAN_TOTAL_LABEL_GROUND, PLAN_TOTAL_NOTE_GROUND, PLAN_TOTAL_NOTE_SHARED_GROUND } from "@/lib/priceTrust";

describe("dojazd lądowy bez prowizji i bez obietnic ceny", () => {
  it("blok dojazdu nie ma linków partnerskich ani znaczników prowizji", () => {
    const src = readFileSync("src/app/components/TravelBlock.tsx", "utf8");
    expect(src).not.toMatch(/partnerLinkProps|data-affiliate|data-partner|travelpayouts|aviasales|marker|sponsored/i);
    expect(src).toContain('rel="noopener noreferrer"');
    expect(src).toContain("TRAVEL_ESTIMATE_NOTE");
  });
  it("karta kierunku pokazuje cenę lotu i linki lotów tylko w gałęzi z samolotem", () => {
    const src = readFileSync("src/app/destinations/page.tsx", "utf8");
    expect(src).toContain("{showFlight && <div");
    expect(src).toContain("flying && destinations.length");
    expect(src).toContain("_hasHydrated && !loading && flying");
  });
  it("teksty planu bez dojazdu: bez wykrzykników, mówią o szacunku i sprawdzeniu", () => {
    for (const text of [PLAN_TOTAL_LABEL_GROUND, PLAN_TOTAL_NOTE_GROUND, PLAN_TOTAL_NOTE_SHARED_GROUND]) {
      expect(text).not.toContain("!");
      expect(text).not.toMatch(/lot/i);
    }
    expect(PLAN_TOTAL_LABEL_GROUND).toMatch(/bez dojazdu/);
    expect(PLAN_TOTAL_NOTE_SHARED_GROUND).toMatch(/sprawdzić/);
  });
});
