import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { FORBIDDEN_COPY, HOME, META, homeSubtitle } from "./homeCopy";
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

  it("link do poradnika prowadzi do istniejącego artykułu i ma etykietę z briefu", () => {
    expect(HOME.guideLink).toBe("Jak ustalić budżet i kierunek, gdy jedzie ekipa");
    const slug = HOME.guideHref.replace("/blog/", "");
    expect(HOME.guideHref.startsWith("/blog/")).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "src/content/blog", `${slug}.mdx`))).toBe(true);
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

describe("META", () => {
  it("title to nagłówek strony bez sufiksu (dodaje go szablon z layoutu)", () => {
    expect(META.title).toBe("Wyjazd ze znajomymi: dokąd, za ile i jaki plan");
  });

  it("opis wymienia 6 pytań, plan godzina po godzinie i 7 polskich lotnisk", () => {
    expect(META.description).toMatch(/6 pytań/);
    expect(META.description).toMatch(/plan godzina po godzinie/);
    expect(META.description).toMatch(/7 polskich lotnisk/);
  });

  it("nie mówi o solo w Europie ani nie obiecuje części 2–6", () => {
    for (const s of Object.values(META)) {
      expect(s).not.toMatch(/solo w Europie|budżetowy weekend solo/i);
      expect(s).not.toMatch(/termin|bilet|rozliczen|bez konta|zaproś/i);
      for (const re of FORBIDDEN_COPY) expect(s).not.toMatch(re);
    }
  });
});
