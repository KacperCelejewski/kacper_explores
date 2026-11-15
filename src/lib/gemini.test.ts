import { describe, expect, it, vi } from "vitest";
import { buildPlanPrompt, parseNdjsonStream, parsePlanResponse, validateAndFixPlan } from "./gemini";
import type { DayPlan, TripPlan } from "@/types";

const day = (n: number): DayPlan => ({ day: n, date: `Dzień ${n}`, theme: "", activities: [] });

const plan = (days: number): TripPlan => ({
  city: "Porto",
  country: "Portugalia",
  duration: days,
  totalBudgetEstimate: "",
  budgetBreakdown: { flights: "", accommodation: "", food: "", attractions: "" },
  generalTips: [],
  days: Array.from({ length: days }, (_, i) => day(i + 1)),
});

async function* chunks(...parts: string[]) {
  for (const p of parts) yield { text: () => p };
}

describe("parseNdjsonStream", () => {
  it("reassembles lines split across chunks and reports each day as it arrives", async () => {
    const onDay = vi.fn();
    const result = await parseNdjsonStream(
      chunks(
        '{"type":"header","city":"Porto"}\n{"type":"da',
        'y","day":1,"theme":"Ribeira"}\n',
        '{"type":"day","day":2,"theme":"Gaia"}',
      ),
      onDay,
    );

    expect(result.header).toMatchObject({ city: "Porto" });
    expect(result.days.map((d) => d.day)).toEqual([1, 2]);
    expect(onDay).toHaveBeenNthCalledWith(2, expect.objectContaining({ day: 2 }), 2);
  });

  it("ignores markdown fences and malformed lines from the model", async () => {
    const result = await parseNdjsonStream(
      chunks('```json\n{"type":"header","city":"Porto"}\nnot json\n{"type":"day","day":1}\n```\n'),
      () => {},
    );

    expect(result.days).toHaveLength(1);
  });

  it("fails loudly when the header line never arrives", async () => {
    await expect(parseNdjsonStream(chunks('{"type":"day","day":1}\n'), () => {})).rejects.toThrow(
      "NDJSON header missing",
    );
  });
});

describe("parsePlanResponse", () => {
  it("strips a ```json fence before parsing", () => {
    expect(parsePlanResponse('```json\n{"city":"Porto"}\n```')).toEqual({ city: "Porto" });
  });
});

describe("validateAndFixPlan", () => {
  it("returns the plan untouched when the day count matches", () => {
    const p = plan(3);

    expect(validateAndFixPlan(p, 3)).toBe(p);
  });

  it("trims extra days", () => {
    const fixed = validateAndFixPlan(plan(5), 3);

    expect(fixed.days).toHaveLength(3);
    expect(fixed.duration).toBe(3);
  });

  it("pads missing days with free-time stubs", () => {
    const fixed = validateAndFixPlan(plan(2), 4);

    expect(fixed.days.map((d) => d.day)).toEqual([1, 2, 3, 4]);
    expect(fixed.days[3].theme).toBe("Czas wolny");
  });
});

describe("buildPlanPrompt", () => {
  const destination = {
    city: "Rzym",
    country: "Włochy",
    countryFlag: "🇮🇹",
    tags: ["history"],
    budgetLevel: "low",
    coverImage: "🏛️",
    description: "Wieczne miasto",
    estimatedFlightCost: "350–550 PLN",
  } as unknown as Parameters<typeof buildPlanPrompt>[0];
  const quiz = { budget: "low", styles: ["history"], duration: 3, month: 6 } as unknown as Parameters<typeof buildPlanPrompt>[1];

  it("does not hand the model a flight price nobody checked", () => {
    const prompt = buildPlanPrompt(destination, quiz, null);
    expect(prompt).not.toContain("350–550");
    expect(prompt).not.toContain("Szacowany koszt lotów");
  });

  it("tells the model the flight price is unknown and keeps flights out of the total", () => {
    const prompt = buildPlanPrompt(destination, quiz, null);
    expect(prompt).toContain('"flights":"Sprawdź w wyszukiwarce"');
    expect(prompt).toMatch(/BEZ lotów/);
  });

  it("solo prompt keeps the unchanged companion line and has no group wording", () => {
    const prompt = buildPlanPrompt(destination, { ...quiz, companion: "solo" } as never, null);
    expect(prompt).toContain("Kto podróżuje: solo (samotny podróżnik)");
    expect(prompt).not.toContain("za osobę");
    expect(prompt).not.toContain("Skład grupy");
  });

  it("friends prompt shows the composition and asks for per-person costs", () => {
    const prompt = buildPlanPrompt(
      destination,
      { ...quiz, companion: "friends", group: { adults: 4, childrenAges: [] } } as never,
      null,
    );
    expect(prompt).toContain("Skład grupy: 4 osoby");
    expect(prompt).toContain("za osobę");
    expect(prompt).toMatch(/taksówk/i);
    expect(prompt).toMatch(/apartament/i);
    expect(prompt).toMatch(/rezerwacj\w+ stolika/i);
  });

  it("family prompt lists children's ages and hints at family tickets", () => {
    const prompt = buildPlanPrompt(
      destination,
      { ...quiz, companion: "family", group: { adults: 2, childrenAges: [4, 7] } } as never,
      null,
    );
    expect(prompt).toContain("4 i 7 lat");
    expect(prompt).toContain("bilety rodzinne");
    expect(prompt).toMatch(/darmow\w+ wejści\w+ dla dzieci/);
    expect(prompt).toContain("za osobę");
  });

  it("group prompt states the cost basis in seats, excluding infants", () => {
    const prompt = buildPlanPrompt(
      destination,
      { ...quiz, companion: "family", group: { adults: 2, childrenAges: [1, 4, 7] } } as never,
      null,
    );
    expect(prompt).toContain("Koszty licz na jedno z 4 miejsc (niemowlęta poniżej 2 lat się nie liczą)");
  });

  it("group prompt carries no names, only numbers", () => {
    const prompt = buildPlanPrompt(
      destination,
      { ...quiz, companion: "family", group: { adults: 2, childrenAges: [4, 7] } } as never,
      null,
    );
    expect(prompt).not.toMatch(/\b(Ania|Kasia|Tomek)\b/);
  });
});
