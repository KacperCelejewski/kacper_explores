import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Karty kierunków nie mają cen lotów (Gemini ich nie zna), więc quiz nie może ich obiecywać.
describe("quiz promise", () => {
  const source = readFileSync(join(__dirname, "page.tsx"), "utf8");

  it("does not promise real flight prices on the destination cards", () => {
    expect(source).not.toMatch(/prawdziwe ceny lotów/i);
  });

  it("still tells what the quiz ends with", () => {
    expect(source).toContain("Dobierzemy kierunek i plan wyjazdu.");
    expect(source).toContain("Cenę lotu potwierdzisz u sprzedawcy");
  });
});

describe("pytanie o rodzaj wyjazdu", () => {
  const source = readFileSync(join(__dirname, "page.tsx"), "utf8");

  it("ma tytuł z uwagi właściciela, jest podpięte jako krok i pozwala je pominąć", () => {
    expect(source).toContain('title="Jaki to wyjazd?"');
    expect(source).toContain('stepId === "tripType" && <StepTripType');
    expect(source).toMatch(/stepId === "tripType" && !quizAnswers\.tripType\) \? "Pomiń to pytanie"/);
  });

  it("pokazuje wszystkie rodzaje z quizOptions (etykiety w jednym miejscu)", () => {
    expect(source).toContain("TRIP_TYPE_OPTIONS.map");
    expect(source).not.toMatch(/label: "Narty"/); // etykiety nie są dublowane w quizie
  });

  it("podpowiedź mówi, co się dzieje bez wyboru, bez wykrzykników", () => {
    const hint = source.match(/title="Jaki to wyjazd\?" hint="([^"]+)"/)?.[1] ?? "";
    expect(hint).toMatch(/Bez wyboru układamy zwiedzanie/);
    expect(hint).not.toMatch(/!/);
  });
});
