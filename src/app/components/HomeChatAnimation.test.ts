import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HomeChatAnimation from "./HomeChatAnimation";
import { FEATURES } from "@/lib/features";
import { FORBIDDEN_COPY } from "@/lib/homeCopy";
import { HOME_ANIMATION, HOME_ANIMATION_ALT, homeAnimationCss, homeAnimationPairs } from "@/lib/homeAnimation";

vi.stubGlobal("React", React);

describe("animation D", () => {
  it("ships the complete final frame in SSR, with no client content gate", () => {
    const html = renderToStaticMarkup(React.createElement(HomeChatAnimation));
    for (const text of ["Ania:", "Marek:", "Tomek:", "Barcelona", "ok. 450 zł na osobę (szacunek)",
      "ok. 1 800 zł razem", "Plan na 3 dni, godzina po godzinie", HOME_ANIMATION_ALT]) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain('hidden=""');
    expect(html).not.toContain("opacity:0\"");
    expect(html).toContain("animation:none!important"); // no-JS final frame
    // The caption/control follow the closing aria-hidden drawing, not inside it.
    expect(html).toMatch(/<\/div><\/div><div class="home-chat-caption"><p>Przykład, nie Wasz wyjazd/);
    expect(html).toMatch(/<button[^>]*aria-label="Wstrzymaj"/);
    expect(html).not.toMatch(/feTurbulence|<img/);
  });

  it("has precisely the three supported pairs with all group flags false", () => {
    expect(Object.values(FEATURES).every((value) => !value)).toBe(true);
    expect(homeAnimationPairs().map((pair) => pair.key)).toEqual(["destination", "cost", "plan"]);
    const html = renderToStaticMarkup(React.createElement(HomeChatAnimation));
    expect(html).not.toMatch(/to kiedy lecimy|kto ma bilety|apartament 1140|kto komu oddaje|Cena lotu|285 zł|pt–nd/);
  });

  it("uses the agreed copy without forbidden voice or inflected names", () => {
    const texts = homeAnimationPairs().flatMap((pair) => [pair.name, pair.question, pair.answer,
      "detail" in pair ? pair.detail : ""]).join(" ") + HOME_ANIMATION_ALT;
    for (const pattern of FORBIDDEN_COPY) expect(texts).not.toMatch(pattern);
    expect(texts).not.toMatch(/\b(Ani|Anię|Marka|Markowi|Tomka|Tomkowi|Kuby|Kubie)\b/u);
  });

  it("keeps one 16s timeline, responds within 1s, fades twice and holds the third final frame", () => {
    expect(HOME_ANIMATION).toEqual({ cycle: 16, loops: 3, dim: 10, hold: 13.5, fade: 15, responseLag: 0.45, arrival: 0.25 });
    const pairs = homeAnimationPairs();
    expect(pairs.map((pair) => pair.questionAt)).toEqual([1, 4, 7]);
    for (const pair of pairs) {
      expect(pair.answerAt - pair.questionAt + 0.25).toBeLessThanOrEqual(1);
      expect(pair.answerAt).toBeLessThan(10);
    }
    const css = homeAnimationCss();
    expect(css).toContain("@media (prefers-reduced-motion:no-preference)");
    expect(css).toContain("animation:home-chat-fade 16s linear 2}"); // no forwards: opacity returns to 1
    expect(css).toContain("animation:home-chat-dim 16s linear 3 forwards");
    expect(css).toContain("0%,6.25%{opacity:0"); // first frame hides questions without hydration
  });

  it.each(["datePoll", "groupFlights", "settlements"] as const)("adds only the pair for enabled %s and compresses times", (key) => {
    const pairs = homeAnimationPairs({ ...FEATURES, [key]: true });
    expect(pairs).toHaveLength(4);
    expect(pairs.some((pair) => pair.key === ({ datePoll: "date", groupFlights: "flight", settlements: "settlement" }[key]))).toBe(true);
    expect(pairs.every((pair) => pair.answerAt + HOME_ANIMATION.arrival < 10)).toBe(true);
  });
});
