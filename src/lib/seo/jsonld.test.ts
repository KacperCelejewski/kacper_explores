import { describe, expect, it } from "vitest";
import { breadcrumbLd, faqLd, itemListLd, jsonLdScript } from "./jsonld";

type ListLd = { "@type": string; itemListElement: { position: number; item?: string; url?: string }[] };
type FaqLd = { "@type": string; mainEntity: { acceptedAnswer: { text: string } }[] };

describe("jsonLdScript", () => {
  it("zamienia < na \\u003c, żeby tekst nie zamknął znacznika script", () => {
    const out = jsonLdScript({ text: "</script><b>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).text).toBe("</script><b>");
  });
  it("jest poprawnym JSON-em dla cudzysłowów", () => {
    expect(JSON.parse(jsonLdScript({ q: 'Co to "weekend"?' })).q).toBe('Co to "weekend"?');
  });
});

describe("breadcrumbLd", () => {
  it("numeruje od 1 i buduje pełne adresy", () => {
    const ld = breadcrumbLd([{ name: "Strona główna", path: "/" }, { name: "Okazje", path: "/okazje" }]) as ListLd;
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[1].item).toBe("https://wloczykij.me/okazje");
  });
});

describe("faqLd i itemListLd", () => {
  it("faqLd składa pytania i odpowiedzi", () => {
    const ld = faqLd([{ q: "Pytanie?", a: "Odpowiedź." }]) as FaqLd;
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity[0].acceptedAnswer.text).toBe("Odpowiedź.");
  });
  it("itemListLd numeruje pozycje", () => {
    const ld = itemListLd([{ name: "A", path: "/a" }, { name: "B", path: "/b" }]) as ListLd;
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(ld.itemListElement[1].url).toBe("https://wloczykij.me/b");
  });
});
