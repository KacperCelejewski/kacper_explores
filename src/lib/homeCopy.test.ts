import { describe, expect, it } from "vitest";
import { FORBIDDEN_COPY, HOME, homeSubtitle } from "./homeCopy";
import type { FeatureKey } from "./features";

const ALL_OFF: Record<FeatureKey, boolean> = {
  invites: false, datePoll: false, groupFlights: false, groupPlan: false, settlements: false, tripMap: false,
};

const strings = (): string[] => Object.values(HOME) as string[];

describe("HOME", () => {
  it("ma nagłówek zgodny z briefem", () => {
    expect(HOME.h1).toBe("Wyjazd ze znajomymi: dokąd, za ile i jaki plan.");
    expect(HOME.h1.length).toBeLessThanOrEqual(48);
  });

  it("podtytuł bez włączonych funkcji nie obiecuje części 2–6", () => {
    expect(homeSubtitle(ALL_OFF)).toBe(
      "Powiedz, kto jedzie. Dostaniesz kierunki w Waszym budżecie i plan godzina po godzinie.",
    );
  });

  it("podtytuł z włączonym invites mówi o linku na grupę", () => {
    expect(homeSubtitle({ ...ALL_OFF, invites: true })).toBe(
      "Ustalacie to w jednym miejscu, a na grupie wklejacie tylko link.",
    );
  });

  it("dwa CTA prowadzą do quizu z parametrami", () => {
    expect(HOME.ctaTeamHref).toBe("/quiz?companion=friends&src=home-ekipa");
    expect(HOME.ctaSoloHref).toBe("/quiz?src=home-solo");
  });

  it("żaden tekst nie łamie reguł głosu marki", () => {
    for (const s of [...strings(), homeSubtitle(ALL_OFF), homeSubtitle({ ...ALL_OFF, invites: true })]) {
      for (const re of FORBIDDEN_COPY) expect(s, `"${s}" vs ${re}`).not.toMatch(re);
    }
  });

  it("przy wyłączonych funkcjach nie wspomina terminu, biletów, rozliczeń ani zaproszeń", () => {
    const re = /termin|bilet|rozliczen|bez konta|zaproś/i;
    for (const s of [...strings(), homeSubtitle(ALL_OFF)]) expect(s).not.toMatch(re);
  });
});
