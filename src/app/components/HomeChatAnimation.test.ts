import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HomeChatAnimation from "./HomeChatAnimation";
import { FEATURES } from "@/lib/features";
import { FORBIDDEN_COPY } from "@/lib/homeCopy";
import { HOME_ANIMATION_ALT, homeAnimationPairs } from "@/lib/homeAnimation";

vi.stubGlobal("React", React);

describe("messenger scene D", () => {
  it("ships the complete final frame and an accessible caption in SSR", () => {
    const html = renderToStaticMarkup(React.createElement(HomeChatAnimation));
    for (const text of ["Ania", "Marek", "Tomek", "Kuba", "Grudniowy wyjazd", "online", "18:02", "18:03", "dostarczono", "+1", "Scenka", "Czat grupowy, dziś", "Włóczykij zbiera to tak", "Barcelona", "ok. 450 zł na osobę, bez lotu (szacunek)", "ok. 1 800 zł razem", "Plan na 3 dni, godzina po godzinie", HOME_ANIMATION_ALT]) expect(html).toContain(text);
    expect(html).not.toContain('hidden=""');
    expect(html).not.toContain('<style'); // Safari: no runtime CSS / keyframes in body.
    expect(html).toContain('<noscript><link rel="stylesheet" href="/home-chat-static.css"/></noscript>');
    expect(html).toMatch(/<\/div><\/div><div class="home-chat-caption"><p>Przykład, nie Wasz wyjazd/);
    expect(html).toMatch(/<button[^>]*aria-label="Wstrzymaj"/);
    expect(html).not.toMatch(/feTurbulence|<img|https?:\/\//);
  });

  it("draws four distinct reusable portraits, author avatars and three-dot typing for every message", () => {
    const html = renderToStaticMarkup(React.createElement(HomeChatAnimation));
    expect(html.match(/<symbol /g)).toHaveLength(4);
    for (const name of ["Ania", "Marek", "Tomek", "Kuba"]) {
      expect(html).toContain(`id="home-friend-${name}"`);
      expect(html.match(new RegExp(`href="#home-friend-${name}"`, "g"))).toHaveLength(2);
      expect(html.match(new RegExp(`class="home-chat-name">${name}<`, "g"))).toHaveLength(1);
    }
    expect(html.match(/class="home-chat-typing"><span><\/span><span><\/span><span><\/span>/g)).toHaveLength(4);
    expect(html.match(/class="home-chat-connector home-chat-connector-/g)).toHaveLength(3);
    expect(html.match(/class="home-chat-delivered"/g)).toHaveLength(1);
  });

  it("shows only supported pairs while group flags stay off", () => {
    expect(Object.values(FEATURES).every((value) => !value)).toBe(true);
    expect(homeAnimationPairs().map((pair) => pair.key)).toEqual(["destination", "cost", "plan"]);
    const html = renderToStaticMarkup(React.createElement(HomeChatAnimation));
    expect(html).not.toMatch(/to kiedy lecimy|kto ma bilety|apartament 1140|kto komu oddaje|Cena lotu|285 zł|pt–nd/);
  });

  it("uses the agreed copy without forbidden voice, emoji or inflected names", () => {
    const texts = homeAnimationPairs().flatMap((pair) => [pair.name, pair.question, pair.answer, "detail" in pair ? pair.detail : ""]).join(" ") + HOME_ANIMATION_ALT;
    for (const pattern of FORBIDDEN_COPY) expect(texts).not.toMatch(pattern);
    expect(texts).not.toMatch(/[!]|\p{Extended_Pictographic}|\b(Ani|Anię|Marka|Markowi|Tomka|Tomkowi|Kuby|Kubie)\b/u);
  });
});
