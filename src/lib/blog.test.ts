import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { getAllPosts } from "./blog";
import { POLISH_AIRPORTS } from "./airports";
import { citySlug, weekendCities } from "./seo/cities";

const DIR = path.join(process.cwd(), "src/content/blog");
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".mdx"));
const slugs = new Set(files.map((f) => f.replace(/\.mdx$/, "")));
const citySlugs = new Set(weekendCities().map(citySlug));
const airportSlugs = new Set(POLISH_AIRPORTS.map((a) => a.code.toLowerCase()));
const STATIC_ROUTES = new Set(["/", "/quiz", "/quick", "/pricing", "/okazje", "/blog", "/login"]);
const COVER_ICONS = new Set(["compass", "globe", "coin", "plane", "mountain"]);

// \b w JS zna tylko ASCII, więc „zł” i polskie słowa łapiemy przez granice liter z flagą u
export const PRICE_RE = /\d[\d\s.,\u00a0]*\s*(zł|zlotych|złotych|pln|eur|euro|usd|gbp|czk|huf)(?![\p{L}])|[€£$]\s*\d|\d\s*(€|£|\$|%)|(?<![\p{L}])(procent|procentów)(?![\p{L}])/iu;
export const FIRST_PERSON_RE = /(?<![\p{L}])(oceniłem|oceniłam|zebrałem|zebrałam|sprawdziłem|sprawdziłam|przetestowałem|przetestowałam|byłem|byłam|wybrałem|wybrałam|polecam|uważam|mój|moja|moje|moim zdaniem)(?![\p{L}])|od 6 lat/iu;

function validRoute(href: string): boolean {
  const [pathname] = href.replace(/\/$/, "").split(/[?#]/);
  if (STATIC_ROUTES.has(pathname)) return true;
  let m = pathname.match(/^\/blog\/([^/]+)$/);
  if (m) return slugs.has(m[1]);
  m = pathname.match(/^\/weekend\/([^/]+)$/);
  if (m) return citySlugs.has(m[1]);
  m = pathname.match(/^\/okazje\/([^/]+)$/);
  if (m) return airportSlugs.has(m[1]);
  return false;
}

describe.each(files)("artykuł %s", (file) => {
  const raw = fs.readFileSync(path.join(DIR, file), "utf-8");
  const { data, content } = matter(raw);

  it("ma komplet pól we frontmatterze", () => {
    expect(data.title).toBeTruthy();
    expect(data.description).toBeTruthy();
    // gray-matter zamienia niecytowaną datę YAML na obiekt Date; wymagamy napisu, jak w pozostałych artykułach
    expect(typeof data.date, `${file}: date musi być w cudzysłowie`).toBe("string");
    expect(String(data.date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(COVER_ICONS.has(data.coverIcon)).toBe(true);
    expect(Array.isArray(data.tags) && data.tags.length > 0).toBe(true);
    // literówka w author po cichu zmieniłaby podpis na głos założyciela
    expect([undefined, "redakcja"]).toContain(data.author);
    expect(data.readingTime).toBeGreaterThan(0);
  });

  it("opis mieści się w sensownej długości dla wyszukiwarki", () => {
    expect(String(data.description).length).toBeLessThanOrEqual(200);
  });

  it("wszystkie linki wewnętrzne prowadzą do istniejących stron", () => {
    const links = [...content.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]);
    for (const href of links) expect(validRoute(href), `${file}: ${href}`).toBe(true);
  });

  if (data.author === "redakcja") {
    it("tekst redakcji nie podaje cen ani liczb, których nie da się sprawdzić", () => {
      expect(content).not.toMatch(PRICE_RE);
    });
    it("nie mówi głosem założyciela w pierwszej osobie", () => {
      expect(content).not.toMatch(FIRST_PERSON_RE);
    });
    it("ma linki do okazji lub stron miast (linkowanie wewnętrzne)", () => {
      expect(content).toMatch(/\]\(\/(okazje|weekend)/);
    });
  }
});

describe("reguły treści redakcji", () => {
  it("wykrywają ceny i waluty, także z kropką i twardą spacją", () => {
    for (const t of ["100 zł", "50 zł.", "5zł", "50\u00a0zł", "około 200 EUR", "€20", "kosztuje 15%", "10 procent"]) {
      expect(PRICE_RE.test(t), t).toBe(true);
    }
  });
  it("nie łapią zwykłych słów podobnych do waluty", () => {
    for (const t of ["zły plan", "złoty środek", "złotych zasad", "trzy pytania", "Europa Środkowa"]) {
      expect(PRICE_RE.test(t), t).toBe(false);
    }
  });
  it("wykrywają pierwszą osobę liczby pojedynczej", () => {
    for (const t of ["Oceniłem miasta", "moim zdaniem", "polecam ten hostel", "podróżuje solo od 6 lat", "Mój plan"]) {
      expect(FIRST_PERSON_RE.test(t), t).toBe(true);
    }
    expect(FIRST_PERSON_RE.test("polecamy sprawdzić regulamin")).toBe(false);
  });
});

describe("getAllPosts", () => {
  it("zwraca wszystkie artykuły z poprawnym autorem", () => {
    const posts = getAllPosts();
    expect(posts.length).toBe(files.length);
    for (const p of posts) expect(["founder", "editorial"]).toContain(p.author);
  });
});
