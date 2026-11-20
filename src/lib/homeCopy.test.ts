import fs from "fs";
import { QUIZ_QUESTION_COUNT } from "./quizSteps";
import path from "path";
import { describe, expect, it } from "vitest";
import { FORBIDDEN_COPY, HOME, META, homeSubtitle } from "./homeCopy";
import type { FeatureKey } from "./features";

const ALL_OFF: Record<FeatureKey, boolean> = {
  invites: false, datePoll: false, groupFlights: false, groupPlan: false, settlements: false, tripMap: false,
};

const strings = (): string[] => Object.values(HOME) as string[];

describe("HOME", () => {
  it("ma nagłówek zgodny z bio na Instagramie (pytanie, bez wykrzyknika)", () => {
    expect(HOME.h1).toBe("Brakuje Ci czasu na organizację wyjazdu?");
    expect(HOME.h1.length).toBeLessThanOrEqual(48);
  });

  it("słowa kluczowe poprzedniego H1 zostają w nagłówku sekcji pod hero", () => {
    expect(HOME.lead).toBe("Wyjazd ze znajomymi: dokąd, za ile i jaki plan.");
    expect(HOME.lead).toBe(`${META.title}.`);
  });

  it("podtytuł bez włączonych funkcji nie obiecuje części 2–6", () => {
    expect(homeSubtitle(ALL_OFF)).toBe(
      "Powiedz, ilu Was jedzie. Dostaniesz kierunki w Waszym budżecie, koszt na osobę i razem oraz plan do wysłania ekipie.",
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
    expect(META.description).toContain(`${QUIZ_QUESTION_COUNT} pytań`);
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
