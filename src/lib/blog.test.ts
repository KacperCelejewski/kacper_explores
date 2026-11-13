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

function validRoute(href: string): boolean {
  const [pathname] = href.split("#");
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
    expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(COVER_ICONS.has(data.coverIcon)).toBe(true);
    expect(Array.isArray(data.tags) && data.tags.length > 0).toBe(true);
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
      expect(content).not.toMatch(/\bzł\b|PLN|EUR|€|\d\s?%/);
    });
    it("nie mówi głosem założyciela w pierwszej osobie", () => {
      expect(content).not.toMatch(/\b(oceniłem|zebrałem|sprawdziłem|polecam|moim zdaniem|od 6 lat)\b/i);
    });
    it("ma linki do okazji lub stron miast (linkowanie wewnętrzne)", () => {
      expect(content).toMatch(/\]\(\/(okazje|weekend)/);
    });
  }
});

describe("getAllPosts", () => {
  it("zwraca wszystkie artykuły z poprawnym autorem", () => {
    const posts = getAllPosts();
    expect(posts.length).toBe(files.length);
    for (const p of posts) expect(["founder", "editorial"]).toContain(p.author);
  });
});
