import { describe, expect, it } from "vitest";
import { EDGE_COPY, EDGE_FORBIDDEN, ServerMessage, edgeCopyStrings, friendlyError } from "./edgeCopy";

describe("EDGE_COPY: głos marki w stanach brzegowych", () => {
  const strings = edgeCopyStrings();

  it("zbiera wszystkie teksty", () => {
    expect(strings.length).toBeGreaterThan(15);
  });

  it.each(strings.map((s) => [s]))("nie łamie zasad: %s", (s) => {
    for (const re of EDGE_FORBIDDEN) expect(s, String(re)).not.toMatch(re);
  });

  it("zachowuje sformułowanie marki w błędach do ponowienia", () => {
    expect(EDGE_COPY.chatFailed).toContain("zwykle działa za drugim");
    expect(EDGE_COPY.generateFailed).toContain("zwykle działa za drugim");
    expect(EDGE_COPY.error.body).toContain("zwykle działa za drugim");
  });

  it("tytuł 500 ma nazwę z polskimi znakami", () => {
    expect(EDGE_COPY.error.pageTitle).toContain("Włóczykij");
  });
});

describe("friendlyError", () => {
  it("przepuszcza komunikat serwera", () => {
    expect(friendlyError(new ServerMessage("Plany na ten miesiąc się skończyły."), "x")).toBe("Plany na ten miesiąc się skończyły.");
  });
  it("zastępuje surowe błędy tekstem marki", () => {
    expect(friendlyError(new Error("HTTP 500"), EDGE_COPY.generateFailed)).toBe(EDGE_COPY.generateFailed);
    expect(friendlyError(new TypeError("Failed to fetch"), EDGE_COPY.generateFailed)).toBe(EDGE_COPY.generateFailed);
    expect(friendlyError(null, EDGE_COPY.generateFailed)).toBe(EDGE_COPY.generateFailed);
  });
  it("pusty komunikat serwera wraca do tekstu marki", () => {
    expect(friendlyError(new ServerMessage("  "), "ciepło")).toBe("ciepło");
  });
});
