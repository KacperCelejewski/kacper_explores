import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CityPhoto from "@/app/components/CityPhoto";
import { CATALOG } from "@/lib/destinations/catalog";
import { CITY_ILLUSTRATION, FEATURED_DESTINATIONS, cityPhotoAlt, getCityPhoto, isBrokenImage } from "@/lib/cityPhotos";

// Quiz results come from Gemini, so the list also holds names outside the catalog (diacritics, English, blanks).
const OUTSIDE_CATALOG = ["Warszawa", "Kraków", "Gdańsk", "Wrocław", "Wiedeń", "Zagrzeb", "Kotor", "Lwów", "", "   ", "Nieznane miasto"];
const ALL_CITIES = [...new Set([...CATALOG.map((c) => c.city), ...FEATURED_DESTINATIONS.map((d) => d.city), ...OUTSIDE_CATALOG])];

function localFile(url: string) {
  return existsSync(path.join(process.cwd(), "public", url));
}

describe("every city always has a filled frame", () => {
  it.each(ALL_CITIES)("%s resolves to an attributed photo or a bundled illustration", (city) => {
    const photo = getCityPhoto(city);
    if (photo.source === "unsplash") {
      expect(photo.authorName).toBeTruthy();
      expect(photo.photoUrl).toContain("utm_source=wloczykij");
      expect(photo.url).toMatch(/^https:\/\/images\.unsplash\.com\//);
    } else {
      expect(photo).toEqual(CITY_ILLUSTRATION);
      expect(localFile(photo.url)).toBe(true);
    }
  });

  it.each(ALL_CITIES.filter((c) => c.trim()))("%s renders an image with a Polish description and a backdrop under it", (city) => {
    const html = renderToStaticMarkup(createElement(CityPhoto, { city }));
    expect(html).toMatch(/<img[^>]+src="[^"]+"/);
    expect(html).toMatch(/alt="[^"]*\S[^"]*"/);
    expect(html).toContain(city.replace(/&/g, "&amp;"));
    // The poster sits under the photo, so a slow, blocked or failed load never leaves a blank frame.
    expect(html).toContain(`url(${CITY_ILLUSTRATION.url})`);
  });

  it("detects an image that failed before hydration (the onError path)", () => {
    expect(isBrokenImage({ complete: true, naturalWidth: 0 })).toBe(true);
    expect(isBrokenImage({ complete: false, naturalWidth: 0 })).toBe(false); // still loading
    expect(isBrokenImage({ complete: true, naturalWidth: 800 })).toBe(false);
  });

  it("describes photos and illustrations in Polish", () => {
    expect(cityPhotoAlt(getCityPhoto("Budapeszt"), "Budapeszt")).toBe("Budapeszt: zdjęcie miasta");
    expect(cityPhotoAlt(CITY_ILLUSTRATION, "Wiedeń")).toBe("Ilustracja podróży: Wiedeń");
    expect(cityPhotoAlt(CITY_ILLUSTRATION, "  ")).toBe("Ilustracja podróży");
  });

  it("covers the whole catalog (guards against an empty list passing silently)", () => {
    expect(CATALOG.length).toBeGreaterThan(40);
  });
});
