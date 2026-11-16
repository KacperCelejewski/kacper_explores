import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HomeDreams, { getDreamPreview } from "./HomeDreams";
import { FORBIDDEN_COPY } from "@/lib/homeCopy";

vi.stubGlobal("React", React);

describe("dream examples, separate from live deals", () => {
  it.each([
    [400, []],
    [600, []],
    [650, ["Budapeszt"]],
    [1000, ["Budapeszt"]],
    [1050, ["Budapeszt", "Lizbona"]],
    [1100, ["Budapeszt", "Lizbona"]],
    [1400, ["Budapeszt", "Lizbona", "Porto"]],
    [2000, ["Budapeszt", "Lizbona", "Porto"]],
  ])("shows only examples within a per-person limit of %i", (budget, cities) => {
    const { cards } = getDreamPreview(budget as number, 4);
    expect(cards.filter((card) => card.visible).map((card) => card.city)).toEqual(cities);
  });

  it("uses people for group totals without changing the per-person cost or eligibility", () => {
    const pair = getDreamPreview(2000, 2);
    const group = getDreamPreview(2000, 9);
    expect(group.groupLimit).toBe(18000);
    expect(group.cards.map((card) => card.total)).toEqual([5850, 9450, 12600]);
    expect(pair.cards.map(({ cost, visible }) => ({ cost, visible })))
      .toEqual(group.cards.map(({ cost, visible }) => ({ cost, visible })));
  });

  it("renders honest, labelled, usable static content before JavaScript", () => {
    const html = renderToStaticMarkup(React.createElement(HomeDreams));
    expect(html).toContain('for="home-dream-budget"');
    expect(html).toContain('for="home-dream-people"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain("Przykład: 2 z 3 kierunków");
    expect(html).toMatch(/<article[^>]*hidden=""/);
    expect(html).toContain("nie oferta ani wyszukiwanie lotów");
    expect(html).toContain("<noscript>");
    expect(html).not.toContain('href="/quiz');
    const text = html.replace(/<[^>]*>/g, " ");
    for (const pattern of FORBIDDEN_COPY) expect(text).not.toMatch(pattern);
  });
});
