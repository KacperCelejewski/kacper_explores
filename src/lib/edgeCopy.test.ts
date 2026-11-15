import { describe, expect, it } from "vitest";
import { EDGE_COPY, EDGE_FORBIDDEN, edgeCopyStrings } from "./edgeCopy";

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
