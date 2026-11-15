import { describe, expect, it } from "vitest";
import { articleLd, articleBreadcrumbLd } from "./articleLd";
import { getPost } from "../blog";

const base = {
  slug: "x",
  title: "Tytuł",
  description: "Opis",
  date: "2026-11-15",
  coverIcon: "globe",
  tags: ["a", "b"],
  readingTime: 5,
};

describe("articleLd", () => {
  it("podpisuje artykuł jako Redakcja Włóczykija (Organization, nie osoba)", () => {
    const ld = articleLd(base, "x") as { author: { "@type": string; name: string } };
    expect(ld.author).toMatchObject({ "@type": "Organization", name: "Redakcja Włóczykija" });
  });
  it("dateModified bierze pole updated, a bez niego datę publikacji", () => {
    expect((articleLd(base, "x") as { dateModified: string }).dateModified).toBe("2026-11-15");
    expect((articleLd({ ...base, updated: "2026-12-01" }, "x") as { dateModified: string }).dateModified).toBe("2026-12-01");
  });
});

describe("articleBreadcrumbLd", () => {
  it("buduje Strona główna → Blog Włóczykija → tytuł", () => {
    const ld = articleBreadcrumbLd("Tytuł", "x") as { itemListElement: { name: string; item: string }[] };
    expect(ld.itemListElement.map((i) => i.name)).toEqual(["Strona główna", "Blog Włóczykija", "Tytuł"]);
    expect(ld.itemListElement[2].item).toBe("https://wloczykij.me/blog/x");
  });
});

describe("artykuł o wyjeździe ze znajomymi", () => {
  const post = getPost("wyjazd-ze-znajomymi-jak-ustalic-budzet-i-kierunek");
  it("istnieje i ma FAQ z frontmattera", () => {
    expect(post).not.toBeNull();
    expect(post!.faq!.length).toBe(5);
  });
  it("FAQ we frontmatterze jest zgodne z widoczną sekcją „Najczęstsze pytania”", () => {
    const section = post!.content.split("## Najczęstsze pytania")[1].split("\n## ")[0];
    const strip = (s: string) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();
    const visible = strip(section);
    for (const { q, a } of post!.faq!) {
      expect(visible, q).toContain(q);
      expect(visible, q).toContain(strip(a));
    }
  });
});
