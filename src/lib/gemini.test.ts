import { describe, expect, it, vi } from "vitest";
import { parseNdjsonStream, parsePlanResponse, validateAndFixPlan } from "./gemini";
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
