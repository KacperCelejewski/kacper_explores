import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HomePage from "../page";
import SiteFooter from "./SiteFooter";
import { getDealsForOrigin } from "@/lib/drop/read";
import { HOME, homeSubtitle } from "@/lib/homeCopy";

vi.mock("@/lib/drop/read", () => ({
  getCitiesWithDeals: vi.fn(async () => []),
  getDealsForOrigin: vi.fn(),
}));

// Vitest's default TSX transform uses the classic React runtime.
vi.stubGlobal("React", React);

async function renderHome(withDeals: boolean) {
  vi.mocked(getDealsForOrigin).mockResolvedValue({
    deals: withDeals ? [{ week: "2027-W01", origin: "WRO", city_code: "BCN", city_name: "Barcelona", price: 150,
      departure_at: "2027-01-08T06:00:00Z", return_at: "2027-01-10T20:00:00Z",
      airline: "FR", transfers: 0, link: "/", fetched_at: "2027-01-01T12:00:00Z" }] : [],
    teasers: new Map(), week: withDeals ? "2027-W01" : null,
  });
  return renderToStaticMarkup(await HomePage());
}

describe("homepage server-rendered content", () => {
  it("keeps the footer quiz link on other pages by default", () => {
    expect(renderToStaticMarkup(React.createElement(SiteFooter))).toContain('href="/quiz"');
  });
  for (const withDeals of [false, true]) {
    it(`keeps at most seven quiz links, including navigation and footer (deals: ${withDeals})`, async () => {
      const html = await renderHome(withDeals);
      expect(html).toContain('data-page="home"');
      const quizHrefs = [...html.matchAll(/<a\b[^>]*href="(\/quiz(?:\?[^\"]*)?)"/g)]
        .map((match) => match[1].replaceAll("&amp;", "&"));
      expect(quizHrefs.length).toBeGreaterThan(0);
      // Reserve one link for the global menu when it is opened.
      expect(quizHrefs.length).toBeLessThanOrEqual(6);
      expect(quizHrefs.filter((href) => href === HOME.ctaTeamHref)).toHaveLength(2);
      expect(quizHrefs.filter((href) => href === HOME.ctaSoloHref)).toHaveLength(2);
      expect(html).toContain(HOME.h1);
      expect(html).toContain(HOME.micro);
      expect(html.match(/<h1\b/g)).toHaveLength(1);

      // Pierwszy ekran: tylko H1 i dwa przyciski, bez znaczka, podtytułu, mikrokopii i linków pomocniczych
      const first = html.match(/<div class="[^"]*home-hero-first[^"]*">([\s\S]*?)<\/div><div class="home-container home-hero-grid">/)?.[1];
      expect(first).toBeDefined();
      expect(first).toContain(`>${HOME.h1}</h1>`);
      expect([...first!.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => m[1].replaceAll("&amp;", "&")))
        .toEqual([HOME.ctaTeamHref, HOME.ctaSoloHref]);
      expect(first).not.toContain("<p");
      expect(first).not.toContain(HOME.micro);
      expect(first).not.toContain("#zrzut");

      // Reszta tekstu hero (słowa kluczowe, podtytuł, mikrokopia, linki) jest w DOM-ie pod zgięciem, nie schowana CSS-em
      const rest = html.match(/<div class="home-container home-hero-grid">([\s\S]*?)<\/section>/)?.[1];
      expect(rest).toContain(`>${HOME.lead}</h2>`);
      expect(rest).toContain(homeSubtitle());
      expect(rest).toContain(HOME.micro);
      expect(rest).toContain(`href="${HOME.quickHref}"`);
      expect(rest).toContain(`href="${HOME.dropHref}"`);
      expect(rest).toContain("home-chat-frame");
      expect(html).not.toContain("Dla ekipy i dla tych, co jadą sami");
      expect(html).toContain("home-destinations");
      const hero = html.match(/<section class="home-hero">([\s\S]*?)<\/section>/)?.[1];
      expect(hero).toContain("home-chat-frame");
      expect(hero).toContain("ok. 450 zł na osobę (szacunek)");
      expect(hero).toContain("Przykład, nie Wasz wyjazd");
      expect(hero).not.toContain("home-poster-art");
      expect(html).not.toContain("hero-hop");
      expect(html).not.toContain("scroll-snap");
      expect(html).not.toContain("images.unsplash.com");
      // Sections stay readable without hydration or an IntersectionObserver.
      expect(html.replace(/<style[\s\S]*?<\/style>/g, "")).not.toMatch(/opacity:0(?:;|")/);
    });
  }
});
