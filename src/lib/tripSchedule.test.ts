import { describe, expect, it } from "vitest";
import { calcTripSchedule, formatScheduleForPrompt } from "./tripSchedule";
import type { FlightDetails } from "@/types";

const flight = (arrivalTime: string, returnTime: string): FlightDetails => ({
  arrivalDate: "2026-06-12",
  arrivalTime,
  returnDate: "2026-06-15",
  returnTime,
});

describe("calcTripSchedule", () => {
  it("builds arrival, full and departure days for a multi-day trip", () => {
    const schedule = calcTripSchedule(4, flight("10:00", "18:00"));

    expect(schedule.days.map((d) => d.type)).toEqual(["arrival", "full", "full", "departure"]);
    expect(schedule.days.map((d) => d.dayNumber)).toEqual([1, 2, 3, 4]);
  });

  it("starts the arrival day 1.5h after landing", () => {
    const [arrival] = calcTripSchedule(3, flight("10:00", "18:00")).days;

    expect(arrival.availableFrom).toBe("11:30");
    expect(arrival.availableTo).toBe("23:00");
  });

  it("limits a late-night arrival to check-in and dinner", () => {
    const [arrival] = calcTripSchedule(3, flight("20:00", "18:00")).days;

    expect(arrival.instruction).toContain("BEZ zwiedzania");
  });

  it("ends the departure day 3h before the return flight", () => {
    const { days } = calcTripSchedule(3, flight("10:00", "18:00"));

    expect(days.at(-1)?.availableTo).toBe("15:00");
  });

  it("never schedules checkout before 06:00 for a dawn flight", () => {
    const { days } = calcTripSchedule(3, flight("10:00", "07:00"));

    expect(days.at(-1)?.availableTo).toBe("06:00");
    expect(days.at(-1)?.instruction).toContain("bardzo wczesny wylot");
  });

  it("assumes a 14:30 arrival and 11:00 checkout when flight times are unknown", () => {
    const { days, arrivalTime } = calcTripSchedule(3, null);

    expect(arrivalTime).toBe("14:00");
    expect(days[0].availableFrom).toBe("14:30");
    expect(days.at(-1)?.availableTo).toBe("11:00");
  });

  it("collapses a one-day trip into a single arrival-and-departure day", () => {
    const schedule = calcTripSchedule(1, flight("08:00", "21:00"));

    expect(schedule.days).toHaveLength(1);
    expect(schedule.days[0]).toMatchObject({
      type: "arrival_and_departure",
      availableFrom: "09:30",
      availableTo: "18:00",
    });
    expect(schedule.usefulDays).toBe(1);
  });

  it("counts only days with at least 4 usable hours", () => {
    // arrival 11:30–23:00 (useful), 2 full days, departure 07:00–06:00 (not useful)
    const schedule = calcTripSchedule(4, flight("10:00", "07:00"));

    expect(schedule.usefulDays).toBe(3);
  });
});

describe("formatScheduleForPrompt", () => {
  it("joins day instructions in order, separated by blank lines", () => {
    const schedule = calcTripSchedule(3, null);
    const prompt = formatScheduleForPrompt(schedule);

    expect(prompt.split("\n\n")).toHaveLength(3);
    expect(prompt.indexOf("DZIEŃ 1")).toBeLessThan(prompt.indexOf("DZIEŃ 3"));
  });
});
