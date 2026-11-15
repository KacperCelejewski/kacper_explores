import { describe, expect, it } from "vitest";
import { droppedPassengersNote } from "./droppedPassengers";

const TEXT = "Dzieci dodasz na stronie wyszukiwarki.";

describe("droppedPassengersNote", () => {
  it("Skyscanner z dziećmi lub niemowlętami pokazuje notkę", () => {
    expect(droppedPassengersNote("skyscanner", { adults: 2, children: 1, infants: 0 })).toBe(TEXT);
    expect(droppedPassengersNote("skyscanner", { adults: 2, children: 0, infants: 1 })).toBe(TEXT);
  });
  it("Skyscanner bez dzieci nie pokazuje nic", () => {
    expect(droppedPassengersNote("skyscanner", { adults: 1, children: 0, infants: 0 })).toBeNull();
  });
  it("Aviasales z dziećmi, ale bez niemowląt, nie pokazuje nic", () => {
    expect(droppedPassengersNote("aviasales", { adults: 2, children: 2, infants: 0 })).toBeNull();
  });
  it("Aviasales z niemowlętami pokazuje notkę", () => {
    expect(droppedPassengersNote("aviasales", { adults: 2, children: 0, infants: 1 })).toBe(TEXT);
  });
  it("brak pasażerów nie pokazuje nic", () => {
    expect(droppedPassengersNote("aviasales", undefined)).toBeNull();
    expect(droppedPassengersNote("skyscanner", undefined)).toBeNull();
  });
});
