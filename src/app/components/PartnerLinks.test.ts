import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TicketsLink, LuggageTile } from "./PartnerLinks";
import { AffiliateProvider } from "./AffiliateProvider";
import { FORBIDDEN_COPY } from "@/lib/homeCopy";
import type { DayActivity } from "@/types";

const activity: DayActivity = { time: "10:00", title: "Muzeum", description: "Zwiedzanie", type: "attraction", cost: "~10 EUR", emoji: "" };

describe("partner link UI", () => {
  it("offers Tiqets for paid attractions, with a direct fallback before consent", () => {
    const html = renderToStaticMarkup(createElement(AffiliateProvider, { config: { marker: "728414", projectId: "999" } }, createElement(TicketsLink, { activity, city: "Rzym" })));
    expect(html).toContain("https://www.tiqets.com/en/search");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("tp.media");
    expect(html).not.toContain("link partnerski");
  });
  it("does not offer tickets for free attractions or meals", () => {
    expect(renderToStaticMarkup(createElement(TicketsLink, { activity: { ...activity, cost: "Bezpłatnie" }, city: "Rzym" }))).toBe("");
    expect(renderToStaticMarkup(createElement(TicketsLink, { activity: { ...activity, type: "food" }, city: "Rzym" }))).toBe("");
  });
  it("uses brand-safe link copy without promises about group features", () => {
    const html = renderToStaticMarkup(createElement(LuggageTile, { city: "Rzym" })) + renderToStaticMarkup(createElement(TicketsLink, { activity, city: "Rzym" }));
    const text = html.replace(/<[^>]*>/g, "");
    for (const forbidden of FORBIDDEN_COPY) expect(text).not.toMatch(forbidden);
    expect(text).not.toMatch(/najtaniej|bez kolejki|głosowan|rozliczen|zaproś|wspólny lot/i);
    expect(text).toContain("Przechowalnia bagażu");
    expect(text).toContain("Sprawdź bilety");
  });
});
