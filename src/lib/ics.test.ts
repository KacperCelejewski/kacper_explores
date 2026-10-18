import { describe, expect, it } from "vitest";
import { generateICS } from "./ics";
import type { TripPlan } from "@/types";

const plan: TripPlan = {
  city: "San Sebastián",
  country: "Hiszpania",
  duration: 2,
  totalBudgetEstimate: "~1500 PLN",
  budgetBreakdown: { flights: "", accommodation: "", food: "", attractions: "" },
  generalTips: [],
  days: [
    {
      day: 1,
      date: "Dzień 1",
      theme: "Pintxos, plaża",
      activities: [
        { time: "10:00", title: "La Concha", description: "", type: "attraction", cost: "Free", emoji: "🏖️" },
        { time: "20:00", title: "Pintxos", description: "", type: "food", cost: "~60 PLN", emoji: "🍤" },
      ],
    },
    { day: 2, date: "Dzień 2", theme: "Monte Igueldo", activities: [] },
  ],
};

const events = (ics: string) => ics.split("BEGIN:VEVENT").slice(1);

describe("generateICS", () => {
  it("wraps one all-day event per trip day in a calendar", () => {
    const ics = generateICS(plan, "2026-06-12");

    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR")).toBe(true);
    expect(events(ics)).toHaveLength(2);
  });

  it("dates consecutive days from the start date", () => {
    const [day1, day2] = events(generateICS(plan, "2026-06-12"));

    expect(day1).toContain("DTSTART;VALUE=DATE:20260612");
    expect(day1).toContain("DTEND;VALUE=DATE:20260613");
    expect(day2).toContain("DTSTART;VALUE=DATE:20260613");
  });

  it("escapes commas in text fields", () => {
    const [day1] = events(generateICS(plan, "2026-06-12"));

    expect(day1).toContain("SUMMARY:San Sebastián – Dzień 1: Pintxos\\, plaża");
    expect(day1).toContain("LOCATION:San Sebastián\\, Hiszpania");
  });

  it("encodes activity line breaks as a single ICS newline escape", () => {
    const [day1] = events(generateICS(plan, "2026-06-12"));
    const description = day1.split("\r\n").find((l) => l.startsWith("DESCRIPTION:"));

    expect(description).toBe(
      "DESCRIPTION:10:00 🏖️ La Concha (Free)\\n20:00 🍤 Pintxos (~60 PLN)",
    );
  });

  it("builds a stable, slugified UID", () => {
    const [day1] = events(generateICS(plan, "2026-06-12"));

    expect(day1).toMatch(/UID:kacper-explores-san-sebastián-day1-\d+/);
  });
});
