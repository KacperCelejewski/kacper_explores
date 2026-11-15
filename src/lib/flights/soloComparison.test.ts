import { describe, it, expect } from "vitest";
import { soloComparisonNote } from "./soloComparison";

describe("soloComparisonNote", () => {
  it("podaje tekst przy różnicy dokładnie 5 zł", () => {
    expect(soloComparisonNote(405, 400, 3)).toBe(
      "Jedna osoba poleci za 400 zł, ale w tej cenie nie ma już 3 miejsc."
    );
  });

  it("zwraca null przy różnicy 4 zł", () => {
    expect(soloComparisonNote(404, 400, 3)).toBeNull();
  });

  it("zwraca null dla jednej osoby", () => {
    expect(soloComparisonNote(500, 300, 1)).toBeNull();
  });

  it("zwraca null bez ceny dla jednej osoby", () => {
    expect(soloComparisonNote(500, null, 3)).toBeNull();
  });

  it("zwraca null, gdy solo jest droższe", () => {
    expect(soloComparisonNote(400, 500, 2)).toBeNull();
  });

  it("zaokrągla do pełnych złotych", () => {
    expect(soloComparisonNote(500.4, 399.6, 2)).toBe(
      "Jedna osoba poleci za 400 zł, ale w tej cenie nie ma już 2 miejsc."
    );
  });
});
