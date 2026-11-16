import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import CityPhoto from "@/app/components/CityPhoto";
import { CITY_ILLUSTRATION, FEATURED_DESTINATIONS, getCityPhoto } from "./cityPhotos";
import { fetchCityPhoto } from "./unsplashApi";
import { GET } from "@/app/api/city-photo/route";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("honest city imagery", () => {
  it.each(["Wenecja", "Florencja", "Warszawa", "Kraków", "Wrocław", "Madryt", "Londyn", "Bruksela", "Mykonos", "Nieznane miasto"])("%s never borrows another city's photo", (city) => {
    expect(getCityPhoto(city)).toEqual(CITY_ILLUSTRATION);
  });

  it("keeps translations of the same place together", () => {
    expect(getCityPhoto("  LISBON ")).toEqual(getCityPhoto("Lizbona"));
    expect(getCityPhoto("Rome")).toEqual(getCityPhoto("Rzym"));
    expect(getCityPhoto("Prague")).toEqual(getCityPhoto("Praga"));
  });

  it("has attributable, distinct photos for all featured cities and no invented price", () => {
    const ids = new Set();
    for (const dest of FEATURED_DESTINATIONS) {
      expect(dest).not.toHaveProperty("priceFrom");
      const photo = getCityPhoto(dest.city);
      expect(photo.source).toBe("unsplash");
      if (photo.source !== "unsplash") throw Error("Missing photo");
      expect(photo.verifiedCity).toBe(dest.city);
      expect(photo.authorName).toBeTruthy();
      for (const link of [photo.authorUrl, photo.photoUrl]) {
        const url = new URL(link);
        expect(url.hostname).toBe("unsplash.com");
        expect(url.searchParams.get("utm_source")).toBe("wloczykij");
        expect(url.searchParams.get("utm_medium")).toBe("referral");
      }
      ids.add(photo.photoId);
    }
    expect(ids.size).toBe(FEATURED_DESTINATIONS.length);
  });

  it("renders a readable credit, separate from navigation, and hotlinks the CDN", () => {
    const html = renderToStaticMarkup(createElement(CityPhoto, { city: "Rzym" }, createElement("a", { href: "/quiz?city=Rzym" }, "Zaplanuj")));
    expect(html).toContain("Zdjęcie:");
    expect(html).toContain("Cristina Gottardi");
    expect(html).toContain("Unsplash</a>");
    expect(html).toContain('src="https://images.unsplash.com/');
    expect(html).not.toContain("/_next/image");
    expect(html).toMatch(/Zaplanuj<\/a><\/div><figcaption/);
  });

  it("describes an illustration honestly instead of labelling it as a city photo", () => {
    const html = renderToStaticMarkup(createElement(CityPhoto, { city: "Warszawa" }));
    expect(html).toContain(CITY_ILLUSTRATION.url);
    expect(html).toContain("Ilustracja podróży");
    expect(html).not.toContain("Zdjęcie:");
    expect(html).not.toContain("Unsplash");
  });
});

describe("Unsplash metadata to UI", () => {
  function apiPhoto() {
    const photo = getCityPhoto("Rzym");
    if (photo.source !== "unsplash") throw Error("Missing fixture");
    return { id: photo.photoId, urls: { regular: "https://images.unsplash.com/photo-test?ixid=keep-me&w=1080" },
      links: { html: photo.photoUrl }, user: { name: "Autorka API", links: { html: "https://unsplash.com/@autorka" } } };
  }

  it("uses the reviewed ID, preserves API tracking and passes author links through the endpoint", async () => {
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "test-key");
    const payload = apiPhoto();
    const fetchMock = vi.fn().mockResolvedValue(Response.json(payload));
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(new NextRequest("https://wloczykij.me/api/city-photo?city=Rzym"));
    const photo = await res.json();
    expect(photo.url).toBe(payload.urls.regular);
    expect(photo.authorName).toBe("Autorka API");
    expect(photo.authorUrl).toContain("utm_source=wloczykij&utm_medium=referral");
    expect(photo.photoUrl).toContain("utm_medium=referral");
    expect(photo.verifiedCity).toBe("Rzym");
    expect(fetchMock.mock.calls[0][0]).toBe(`https://api.unsplash.com/photos/${payload.id}`);
    expect(fetchMock.mock.calls[0][1].next).toEqual({ revalidate: 86400 });
  });

  it("requires no key or network for curated photos and never searches unknown places", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "");
    expect(await fetchCityPhoto("Rzym")).toEqual(getCityPhoto("Rzym"));
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "test-key");
    expect(await fetchCityPhoto("Warszawa")).toEqual(CITY_ILLUSTRATION);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["wrong-id", "no-author", "unsafe-link", "bad-image", "bad-json", "rate-limit", "timeout"])("falls back with full credits when API returns %s", async (failure) => {
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "test-key");
    const payload = apiPhoto();
    if (failure === "wrong-id") payload.id = "another-place";
    if (failure === "no-author") payload.user.name = "";
    if (failure === "unsafe-link") payload.user.links.html = "javascript:alert(1)";
    if (failure === "bad-image") payload.urls.regular = "https://other-site.example/photo.jpg";
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
      if (failure === "timeout") throw new Error("timeout");
      if (failure === "rate-limit") return new Response(null, { status: 429 });
      if (failure === "bad-json") return new Response("{");
      return Response.json(payload);
    }));
    expect(await fetchCityPhoto("Rzym")).toEqual(getCityPhoto("Rzym"));
  });

  it("rejects missing city without an external request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET(new NextRequest("https://wloczykij.me/api/city-photo"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
